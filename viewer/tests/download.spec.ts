/** 使用真实 HTTP 响应和 ZIP 解包验证：下载范围必须与查看器扫描范围完全一致。 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ReadStream, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
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

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'viewer-download-'))
  put('skills/demo/SKILL.md', '# 源码\n')
  put('docs/skills/demo/中文版.md', '# 中文版\n')
  put('docs/ai-docs/笔记.md', Buffer.from([0xef, 0xbb, 0xbf, 0x23, 0x20, 0x41, 0x0d, 0x0a]))
  put('docs/collections/读书/第一章.md', '# 第一章\n')
  put('README.md', '# 根文档\n')
  put('viewer/ignored.md', '# 不在查看器目录\n')
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

it('将全部可浏览 Markdown 按原相对路径和原始字节打包，不收录扫描范围外文件', async () => {
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/zip')
  expect(response.headers.get('content-disposition')).toContain('.zip')
  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))
  expect(Object.keys(entries).sort()).toEqual([
    'README.md',
    'docs/ai-docs/笔记.md',
    'docs/collections/读书/第一章.md',
    'docs/skills/demo/中文版.md',
    'skills/demo/SKILL.md',
  ].sort())
  expect(Buffer.from(entries['docs/ai-docs/笔记.md'])).toEqual(
    Buffer.from([0xef, 0xbb, 0xbf, 0x23, 0x20, 0x41, 0x0d, 0x0a]),
  )
})

it('空项目也返回有效的空 ZIP', async () => {
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root)
  const response = await fetch(`${base}/api/download`)
  expect(response.status).toBe(200)
  expect(Object.keys(unzipSync(new Uint8Array(await response.arrayBuffer())))).toEqual([])
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
    expect((await response.json()).error).toContain('打包 Markdown 失败')
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
  put('README.md', randomBytes(16 * 1024 * 1024))
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
