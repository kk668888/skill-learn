/** 上传客户端契约：确认表单字段与后端接口一致，并向界面传播服务端错误。 */
import { afterEach, expect, it, vi } from 'vitest'
import { uploadMarkdown } from '../src/api/client'

afterEach(() => vi.unstubAllGlobals())

it('提交单个文件与新分组名称，并返回可导航的相对路径', async () => {
  const request = vi.fn(async (_url: string, _options: RequestInit) =>
    new Response(JSON.stringify({ path: 'docs/collections/笔记/内容.md' }), { status: 201 }))
  vi.stubGlobal('fetch', request)
  const file = new File(['# 内容\n'], '源文件.md', { type: 'text/markdown' })

  const result = await uploadMarkdown(file, '内容.md', { kind: 'new', name: '笔记' })
  expect(result.path).toBe('docs/collections/笔记/内容.md')
  const [url, options] = request.mock.calls[0]!
  expect(url).toBe('/api/upload')
  expect(options.method).toBe('POST')
  const body = options.body as FormData
  expect(body.get('file')).toBe(file)
  expect(body.get('targetName')).toBe('内容.md')
  expect(body.get('newGroup')).toBe('笔记')
  expect(body.get('groupId')).toBeNull()
})

it('将同名冲突消息交给上传界面显示', async () => {
  vi.stubGlobal('fetch', async () =>
    new Response(JSON.stringify({ error: '同名文件已存在，请修改文件名' }), { status: 409 }))
  const file = new File(['# 内容\n'], '源文件.md')
  await expect(uploadMarkdown(file, '已存在.md', { kind: 'existing', groupId: 'ai-docs' }))
    .rejects.toThrow('同名文件已存在，请修改文件名')
})
