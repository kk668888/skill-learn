/**
 * 上传 API 的端到端服务端测试。
 *
 * 每个用例都在系统临时目录启动一份真实 Express 应用，使用原生 FormData 发起
 * multipart 请求。这样能同时验证解析、路径映射、磁盘写入和已有只读接口，
 * 并保证测试绝不会把上传样本写进项目本身。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import { createApiApp } from '../server/api'
import type { DocResponse, RootGroupNode, SearchResponse, TreeRoot } from '../shared/types'

let root = ''
let server: Server
let baseUrl = ''

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'viewer-upload-'))
  mkdirSync(join(root, 'docs', 'ai-docs'), { recursive: true })
  server = createApiApp(root).listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('测试服务未取得端口')
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  rmSync(root, { recursive: true, force: true })
})

/** 统一构造浏览器会发送的单文件表单，同时允许针对非法输入替换每个字段。 */
async function upload(options: {
  bytes?: Uint8Array
  sourceName?: string
  targetName?: string
  groupId?: string
  newGroup?: string
} = {}): Promise<Response> {
  const form = new FormData()
  const bytes = options.bytes ?? new TextEncoder().encode('# 新文档\n')
  form.append('file', new Blob([new Uint8Array(bytes)]), options.sourceName ?? '新文档.md')
  form.append('targetName', options.targetName ?? '新文档.md')
  if (options.newGroup !== undefined) form.append('newGroup', options.newGroup)
  else form.append('groupId', options.groupId ?? 'ai-docs')
  return fetch(`${baseUrl}/api/upload`, { method: 'POST', body: form })
}

describe('POST /api/upload', () => {
  it('保存到原有 AI 文章目录，保留原始字节，并立即可读可搜索', async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('# 原始文档\r\n关键字\r\n')])
    const response = await upload({ bytes, sourceName: '原始.md', targetName: '原始.md' })
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ path: 'docs/ai-docs/原始.md' })
    expect(readFileSync(join(root, 'docs', 'ai-docs', '原始.md'))).toEqual(Buffer.from(bytes))

    const doc = await fetch(`${baseUrl}/api/doc?path=${encodeURIComponent('docs/ai-docs/原始.md')}`)
    expect(doc.status).toBe(200)
    expect(((await doc.json()) as DocResponse).content).toContain('关键字')
    const search = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent('关键字')}`)
    expect(((await search.json()) as SearchResponse).results[0]?.path).toBe('docs/ai-docs/原始.md')
  })

  it('新建中文分组后能从目录树找到文件，再上传到同一已有分组', async () => {
    const first = await upload({ newGroup: '读书笔记' })
    expect(first.status).toBe(201)
    expect(await first.json()).toEqual({ path: 'docs/collections/读书笔记/新文档.md' })

    const treeResponse = await fetch(`${baseUrl}/api/tree`)
    const tree = ((await treeResponse.json()) as { tree: TreeRoot }).tree
    const group = tree.find((node): node is RootGroupNode =>
      node.type === 'group' && node.id === 'collection:读书笔记')
    expect(group?.children[0]?.path)
      .toBe('docs/collections/读书笔记/新文档.md')

    const second = await upload({ groupId: 'collection:读书笔记', targetName: '第二篇.md' })
    expect(second.status).toBe(201)
    expect(readFileSync(join(root, 'docs', 'collections', '读书笔记', '第二篇.md'), 'utf8'))
      .toBe('# 新文档\n')
  })

  it('同名与仅大小写不同的文件都返回冲突，原文件内容不变', async () => {
    writeFileSync(join(root, 'docs', 'ai-docs', 'Notes.md'), '# 原文\n')
    for (const targetName of ['Notes.md', 'notes.md']) {
      const response = await upload({ targetName })
      expect(response.status).toBe(409)
      expect(((await response.json()) as { error: string }).error).toMatch(/同名/)
    }
    expect(readFileSync(join(root, 'docs', 'ai-docs', 'Notes.md'), 'utf8')).toBe('# 原文\n')
  })

  it('新分组名称已存在时要求选择已有分组', async () => {
    mkdirSync(join(root, 'docs', 'collections', 'Notes'), { recursive: true })
    const response = await upload({ newGroup: 'notes' })
    expect(response.status).toBe(409)
    expect(readdirSync(join(root, 'docs', 'collections', 'Notes'))).toEqual([])
  })

  it.each([
    { sourceName: '恶意.txt', targetName: '安全.md' },
    { sourceName: '安全.md', targetName: '../越界.md' },
    { sourceName: '安全.md', targetName: '草稿.MD' },
    { sourceName: '安全.md', newGroup: '../越界' },
    { sourceName: '安全.md', newGroup: '  ' },
    { sourceName: '安全.md', groupId: 'root' },
  ])('拒绝非法扩展名、路径或非普通分组：%j', async (options) => {
    const response = await upload(options)
    expect(response.status).toBe(400)
    expect(readdirSync(join(root, 'docs', 'ai-docs'))).toEqual([])
  })

  it('拒绝无效 UTF-8 和超过 5 MiB 的文件', async () => {
    const badUtf8 = await upload({ bytes: new Uint8Array([0xff, 0xfe]) })
    expect(badUtf8.status).toBe(400)
    const tooLarge = await upload({ bytes: new Uint8Array(5 * 1024 * 1024 + 1) })
    expect(tooLarge.status).toBe(413)
    expect(readdirSync(join(root, 'docs', 'ai-docs'))).toEqual([])
  })

  it('一个请求只能包含一份文件', async () => {
    const form = new FormData()
    form.append('file', new Blob(['# 一\n']), '一.md')
    form.append('file', new Blob(['# 二\n']), '二.md')
    form.append('targetName', '目标.md')
    form.append('groupId', 'ai-docs')
    const response = await fetch(`${baseUrl}/api/upload`, { method: 'POST', body: form })
    expect(response.status).toBe(400)
    expect(readdirSync(join(root, 'docs', 'ai-docs'))).toEqual([])
  })

  it('拒绝外部网页跨来源提交，且不创建目标文件', async () => {
    const form = new FormData()
    form.append('file', new Blob(['# 外部请求\n']), '外部.md')
    form.append('targetName', '外部.md')
    form.append('groupId', 'ai-docs')
    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Origin: 'https://other.example' },
      body: form,
    })
    expect(response.status).toBe(403)
    expect(readdirSync(join(root, 'docs', 'ai-docs'))).toEqual([])
  })

  it('拒绝非本机 Host，避免域名重绑定绕过同源检查', async () => {
    const form = new FormData()
    form.append('file', new Blob(['# 外部请求\n']), '外部.md')
    form.append('targetName', '外部.md')
    form.append('groupId', 'ai-docs')
    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Host: 'other.example', Origin: 'http://other.example' },
      body: form,
    })
    expect(response.status).toBe(403)
    expect(readdirSync(join(root, 'docs', 'ai-docs'))).toEqual([])
  })

  it('新分组请求在名称冲突时不留下空的 collections 根目录', async () => {
    const response = await upload({ newGroup: 'AI 文章' })
    expect(response.status).toBe(409)
    expect(existsSync(join(root, 'docs', 'collections'))).toBe(false)
  })

  it('拒绝指向普通文档目录之外的符号链接分组', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'viewer-upload-outside-'))
    try {
      mkdirSync(join(root, 'docs', 'collections'), { recursive: true })
      symlinkSync(outside, join(root, 'docs', 'collections', '外部'), 'dir')
      const response = await upload({ groupId: 'collection:外部' })
      expect(response.status).not.toBe(201)
      expect(readdirSync(outside)).toEqual([])
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })

  it('写入中断时清理新分组和不完整的文件', async () => {
    // 注入真实写入后抛错，模拟磁盘故障发生在文件已经创建之后。
    // 这比只测试“目录不可写”更能证明错误路径不会留下半成品。
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    server = createApiApp(root, {
      writeBytes(path, bytes, markCreated) {
        writeFileSync(path, bytes, { flag: 'wx' })
        markCreated()
        throw new Error('模拟写入中断')
      },
    }).listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('故障测试服务未取得端口')
    baseUrl = `http://127.0.0.1:${address.port}`

    const response = await upload({ newGroup: '失败分组' })
    expect(response.status).toBe(500)
    expect(existsSync(join(root, 'docs', 'collections'))).toBe(false)
  })

  it('写入前失败时不清理其他进程刚创建的同名文件', async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    server = createApiApp(root, {
      writeBytes(path) {
        // 模拟另一个进程在本请求检测重名之后先创建了目标文件。
        writeFileSync(path, '# 其他进程的内容\n', { flag: 'wx' })
        throw new Error('本请求尚未创建文件')
      },
    }).listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('故障测试服务未取得端口')
    baseUrl = `http://127.0.0.1:${address.port}`

    const response = await upload({ targetName: '并发.md' })
    expect(response.status).toBe(500)
    expect(readFileSync(join(root, 'docs', 'ai-docs', '并发.md'), 'utf8'))
      .toBe('# 其他进程的内容\n')
  })

  it('写入后文件被替换时不删除替换者的内容', async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    server = createApiApp(root, {
      writeBytes(path, bytes, markCreated) {
        writeFileSync(path, bytes, { flag: 'wx' })
        markCreated()
        rmSync(path)
        writeFileSync(path, '# 替换后的内容\n', { flag: 'wx' })
        throw new Error('写入后路径已被替换')
      },
    }).listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('故障测试服务未取得端口')
    baseUrl = `http://127.0.0.1:${address.port}`

    const response = await upload({ targetName: '替换.md' })
    expect(response.status).toBe(500)
    expect(readFileSync(join(root, 'docs', 'ai-docs', '替换.md'), 'utf8'))
      .toBe('# 替换后的内容\n')
  })

  it('并发上传大小写不同的同名文件，最多只保存一份', async () => {
    const [a, b] = await Promise.all([
      upload({ targetName: 'Parallel.md' }),
      upload({ targetName: 'parallel.md' }),
    ])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect(readdirSync(join(root, 'docs', 'ai-docs'))).toHaveLength(1)
  })

  it('应用重启后仍能扫描并读取已保存的项目文件', async () => {
    expect((await upload({ newGroup: '持久资料' })).status).toBe(201)
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    server = createApiApp(root).listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('重启后服务未取得端口')
    baseUrl = `http://127.0.0.1:${address.port}`
    const doc = await fetch(`${baseUrl}/api/doc?path=${encodeURIComponent('docs/collections/持久资料/新文档.md')}`)
    expect(doc.status).toBe(200)
    expect(((await doc.json()) as DocResponse).content).toBe('# 新文档\n')
  })
})
