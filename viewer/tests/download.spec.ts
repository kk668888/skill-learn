/** 使用真实 HTTP 响应和 ZIP 解包验证：完整资料含可浏览文档及技能安装文件。 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ReadStream, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createHash, randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Server } from 'node:http'
import { unzipSync } from 'fflate'
import { createApiApp } from '../server/api'
import { sendMarkdownArchive } from '../server/download'
import express from 'express'

let root = ''
let server: Server | null = null
let base = ''

function put(relative: string, bytes: Buffer | string): void {
  const path = join(root, ...relative.split('/'))
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, bytes)
}

/** 与生产环境相同的双层摘要，测试隐藏插件清单也确实进入 ZIP。 */
function putOfflineFixture(): void {
  const relative = 'payload/plugin/.claude-plugin/plugin.json'
  const bytes = Buffer.from('{"name":"demo"}\n')
  put(`offline/kit/${relative}`, bytes)
  const manifest = {
    format: 1,
    targets: [{ agent: 'claude', platform: 'win32-x64', bundles: ['demo'] }],
    bundles: [{ name: 'demo', method: 'plugin', version: '1.0.0', source: 'fixture', license: 'MIT' }],
    files: [{ path: relative, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }],
  }
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest)}\n`)
  put('offline/kit/manifest.json', manifestBytes)
  put('offline/kit/complete.json', `${JSON.stringify({ manifestSha256: createHash('sha256').update(manifestBytes).digest('hex') })}\n`)
}

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'viewer-download-'))
  put('skills/demo/SKILL.md', '# 源码\n')
  put('skills/demo/scripts/run.js', Buffer.from('console.log("运行技能")\n'))
  put('skills/demo/commands/example.md', '# 示例命令\n')
  put('skills/demo/.hidden.js', '不能进入下载包')
  put('skills/demo/node_modules/dependency.js', '不能进入下载包')
  put('offline/install-skills.mjs', '#!/usr/bin/env node\n')
  put('offline/offline-kit.mjs', 'export const fixture = true\n')
  put('offline/offline-installer.mjs', 'export const fixture = true\n')
  put('offline/rtk-install.mjs', 'export const fixture = true\n')
  putOfflineFixture()
  put('docs/skills/demo/中文版.md', '# 中文版\n')
  put('docs/ai-docs/笔记.md', Buffer.from([0xef, 0xbb, 0xbf, 0x23, 0x20, 0x41, 0x0d, 0x0a]))
  put('docs/collections/读书/第一章.md', '# 第一章\n')
  put('README.md', '# 根文档\n')
  put('.secret.md', '# 根级隐藏文档不应进入下载包\n')
  put('viewer/ignored.md', '# 不在查看器目录\n')
  put('viewer/ignored.js', '不能进入下载包')
  put('docs/ai-docs/.hidden.md', '# 隐藏\n')
  put('docs/ai-docs/附件.txt', '不是 Markdown')
  server = createApiApp(root).listen(0)
  await new Promise<void>((resolve) => server!.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('测试服务没有端口')
  base = `http://127.0.0.1:${address.port}`
})

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()))
  server = null
  rmSync(root, { recursive: true, force: true })
  vi.restoreAllMocks()
})

it('将全部可浏览 Markdown 与可安装的技能源码按原路径和原始字节打包', async () => {
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/zip')
  expect(response.headers.get('content-disposition')).toContain('skill-learn-bundle.zip')
  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))
  expect(Object.keys(entries).sort()).toEqual([
    'docs/ai-docs/笔记.md',
    'docs/collections/读书/第一章.md',
    'docs/skills/demo/中文版.md',
    'offline/install-skills.mjs',
    'offline/offline-kit.mjs',
    'offline/offline-installer.mjs',
    'offline/rtk-install.mjs',
    'offline/kit/complete.json',
    'offline/kit/manifest.json',
    'offline/kit/payload/plugin/.claude-plugin/plugin.json',
    'skills/demo/commands/example.md',
    'skills/demo/SKILL.md',
    'skills/demo/scripts/run.js',
  ].sort())
  // 下载只归档脚本，绝不在服务端运行；用原字节断言避免编码转换损坏安装文件。
  expect(Buffer.from(entries['skills/demo/scripts/run.js'])).toEqual(
    readFileSync(join(root, 'skills', 'demo', 'scripts', 'run.js')),
  )
  expect(Buffer.from(entries['docs/ai-docs/笔记.md'])).toEqual(
    Buffer.from([0xef, 0xbb, 0xbf, 0x23, 0x20, 0x41, 0x0d, 0x0a]),
  )
})

it('离线目录缺失或文件摘要不符时拒绝下载', async () => {
  rmSync(join(root, 'offline', 'kit', 'payload', 'plugin', '.claude-plugin', 'plugin.json'))
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(500)
  expect(response.headers.get('content-type')).toContain('application/json')
})

it('校验后离线文件被等长替换时 ZIP 仍使用校验过的字节', async () => {
  const relative = 'offline/kit/payload/plugin/.claude-plugin/plugin.json'
  const target = join(root, ...relative.split('/'))
  const original = readFileSync(target)
  const altered = Buffer.alloc(original.length, 0x58)
  const app = express()
  app.get('/api/download', (_request, response) => {
    // scanPaths 在离线目录校验之后调用，精确模拟校验与归档之间的等长替换。
    sendMarkdownArchive(root, response, () => {
      writeFileSync(target, altered)
      return []
    })
  })
  const isolated = app.listen(0)
  await new Promise<void>((resolve) => isolated.once('listening', resolve))
  try {
    const address = isolated.address()
    if (!address || typeof address === 'string') throw new Error('故障服务没有端口')
    const response = await fetch(`http://127.0.0.1:${address.port}/api/download`)
    expect(response.status).toBe(200)
    const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))
    expect(Buffer.from(entries[relative])).toEqual(original)
  } finally {
    await new Promise<void>((resolve) => isolated.close(() => resolve()))
  }
})

it('完整下载后删除用于固定归档字节的临时磁盘快照', async () => {
  const scratch = join(root, 'snapshot-temp')
  mkdirSync(scratch)
  const previousTemp = process.env.TEMP
  const previousTmp = process.env.TMP
  try {
    process.env.TEMP = scratch
    process.env.TMP = scratch
    const response = await fetch(`${base}/api/download`)
    expect(response.status).toBe(200)
    await response.arrayBuffer()
    await vi.waitFor(() => {
      expect(readdirSync(scratch).filter((name) => name.startsWith('skill-learn-snapshot-'))).toEqual([])
    })
  } finally {
    if (previousTemp === undefined) delete process.env.TEMP
    else process.env.TEMP = previousTemp
    if (previousTmp === undefined) delete process.env.TMP
    else process.env.TMP = previousTmp
  }
})

it('存在技能源码但安装脚本缺失时拒绝提供不可安装的 ZIP', async () => {
  rmSync(join(root, 'offline', 'install-skills.mjs'))
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(500)
  expect(response.headers.get('content-type')).toContain('application/json')
  expect((await response.json()).error).toContain('打包')
})

it('存在安装脚本但技能源码缺失时也拒绝提供空安装包', async () => {
  rmSync(join(root, 'skills'), { recursive: true, force: true })
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(500)
  expect((await response.json()).error).toContain('打包完整资料失败')
})

it('技能附属文件若为符号链接，不读取项目外的内容', async () => {
  const outside = mkdtempSync(join(tmpdir(), 'viewer-skill-secret-'))
  const secret = join(outside, 'secret.js')
  writeFileSync(secret, '项目外的私密内容')
  try {
    symlinkSync(secret, join(root, 'skills', 'demo', 'scripts', 'leak.js'))
    const response = await fetch(`${base}/api/download`)
    expect(response.status).toBe(200)
    const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))
    expect(entries['skills/demo/scripts/leak.js']).toBeUndefined()
    expect(Object.values(entries).some((bytes) => Buffer.from(bytes).toString().includes('项目外的私密内容'))).toBe(false)
  } finally {
    rmSync(outside, { recursive: true, force: true })
  }
})

it('空项目也返回有效的空 ZIP', async () => {
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root)
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(200)
  expect(Object.keys(unzipSync(new Uint8Array(await response.arrayBuffer())))).toEqual([])
})

it('包根的 Windows 双击安装入口随 ZIP 分发', async () => {
  put('安装.bat', '@echo off\r\nrem 离线安装向导入口\r\n')
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(200)
  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))
  expect(Buffer.from(entries['安装.bat']).toString()).toContain('向导入口')
})

it('根级工程文档不进下载包，子目录资料照常收录', async () => {
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(200)
  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))
  // 根级 README 只在目录树中浏览，ZIP 仅保留子目录资料与安装所需。
  expect(entries['README.md']).toBeUndefined()
  expect(entries['docs/skills/demo/中文版.md']).toBeDefined()
  expect(entries['skills/demo/SKILL.md']).toBeDefined()
  expect(entries['offline/install-skills.mjs']).toBeDefined()
})

it('上传成功后重新扫描并下载新文档，下载不修改原文件或创建 Git 状态', async () => {
  const form = new FormData()
  form.append('file', new Blob(['# 新文档\n'], { type: 'text/markdown' }), '新文档.md')
  form.append('targetName', '新文档.md')
  form.append('groupId', 'ai-docs')
  const upload = await fetch(`${base}/api/upload`, { method: 'POST', body: form })
  expect(upload.status).toBe(201)
  const before = readFileSync(join(root, 'docs', 'ai-docs', '新文档.md'))
  const zip = await fetch(`${base}/api/download`)
  const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()))
  expect(Buffer.from(entries['docs/ai-docs/新文档.md'])).toEqual(before)
  expect(readFileSync(join(root, 'docs', 'ai-docs', '新文档.md'))).toEqual(before)
  expect(readdirSync(root)).not.toContain('.git')
})

it('扫描后文件不可读取时返回明确错误，不提供残缺 ZIP', async () => {
  const failureApp = express()
  failureApp.get('/api/download', (_request, response) => {
    sendMarkdownArchive(root, response, () => ['docs/ai-docs/不存在.md'])
  })
  const failureServer = failureApp.listen(0)
  await new Promise<void>((resolve) => failureServer.once('listening', resolve))
  try {
    const address = failureServer.address()
    if (!address || typeof address === 'string') throw new Error('故障服务没有端口')
    const response = await fetch(`http://127.0.0.1:${address.port}/api/download`)
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect((await response.json()).error).toContain('打包完整资料失败')
  } finally {
    await new Promise<void>((resolve) => failureServer.close(() => resolve()))
  }
})

it('扫描后文件被换成符号链接时拒绝读取范围外内容', async () => {
  const outside = mkdtempSync(join(tmpdir(), 'viewer-secret-'))
  const secret = join(outside, 'secret.md')
  writeFileSync(secret, '不应泄露')
  const target = join(root, 'docs', 'ai-docs', '笔记.md')
  rmSync(target)
  try {
    symlinkSync(secret, target)
    const failureApp = express()
    failureApp.get('/api/download', (_request, response) => {
      sendMarkdownArchive(root, response, () => ['docs/ai-docs/笔记.md'])
    })
    const failureServer = failureApp.listen(0)
    await new Promise<void>((resolve) => failureServer.once('listening', resolve))
    try {
      const address = failureServer.address()
      if (!address || typeof address === 'string') throw new Error('故障服务没有端口')
      const response = await fetch(`http://127.0.0.1:${address.port}/api/download`)
      expect(response.status).toBe(500)
      expect(await response.text()).not.toContain('不应泄露')
    } finally {
      await new Promise<void>((resolve) => failureServer.close(() => resolve()))
    }
  } finally {
    rmSync(outside, { recursive: true, force: true })
  }
})

it('客户端取消较大的下载后关闭源流，服务仍可响应目录 API', async () => {
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root)
  // 大文件放在 docs/ 子目录：根级条目不进下载包，放这里才能占住传输窗口。
  put('docs/ai-docs/大文件.md', randomBytes(16 * 1024 * 1024))
  const destroy = vi.spyOn(ReadStream.prototype, 'destroy')
  const controller = new AbortController()
  const response = await fetch(`${base}/api/download`, { signal: controller.signal })
  expect(response.status).toBe(200)
  controller.abort()
  await response.body?.cancel().catch(() => undefined)
  await vi.waitFor(() => expect(destroy).toHaveBeenCalled())
  const tree = await fetch(`${base}/api/tree`)
  expect(tree.status).toBe(200)
})
