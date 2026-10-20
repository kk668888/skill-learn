// @vitest-environment jsdom
/** 从真实上传接口到 React 目录与阅读区的集成测试，使用临时目录避免修改仓库资料。 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import App from '../src/App'
import { createApiApp } from '../server/api'
import { saveMarkdownUpload, UploadFailure } from '../server/upload'

// jsdom 的 import.meta.url 不是 file:，而此测试显式注入临时 root，因此默认根目录无需解析。
vi.mock('../server/config', () => ({
  PROJECT_ROOT: '',
  INCLUDE_DIRS: ['skills', 'docs/skills', 'docs/ai-docs', 'docs/collections'],
  EXCLUDE_DIR_NAMES: ['node_modules'],
}))

let root = ''
let server: Server
const nativeFetch = globalThis.fetch

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'viewer-flow-'))
  mkdirSync(join(root, 'docs', 'ai-docs'), { recursive: true })
  writeFileSync(join(root, 'docs', 'ai-docs', 'README.md'), '# AI 文章\n')
  server = createApiApp(root).listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('测试服务未取得端口')
  const baseUrl = `http://127.0.0.1:${address.port}`
  vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
    if (url === '/api/upload') {
      // jsdom 的 FormData 与 Node fetch 的 multipart 实现不同。这里仅适配测试传输，
      // 真实 HTTP multipart 解析已由 upload.spec.ts 使用 Node FormData 独立覆盖。
      const form = options?.body as FormData
      const file = form.get('file') as File
      const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(file)
      })
      try {
        const path = saveMarkdownUpload(root, {
          targetName: form.get('targetName'),
          groupId: form.get('groupId') ?? undefined,
          newGroup: form.get('newGroup') ?? undefined,
        }, {
          originalname: file.name,
          size: file.size,
          buffer: Buffer.from(bytes),
        } as Express.Multer.File)
        return new Response(JSON.stringify({ path }), { status: 201 })
      } catch (error) {
        const status = error instanceof UploadFailure ? error.status : 500
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '保存失败' }), { status })
      }
    }
    return nativeFetch(new URL(url, baseUrl), options)
  })
  window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia
  // 目录高亮依赖浏览器观察器；本测试只验证上传导航，不需要模拟滚动命中。
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  window.location.hash = ''
  window.localStorage.clear()
})

afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  rmSync(root, { recursive: true, force: true })
})

it('新建普通分组后无需刷新页面即可看到目录、阅读正文并搜索', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '操作' }))
  await user.click(screen.getByRole('button', { name: '上传 Markdown' }))
  const file = new File(['# 导入标题\n独有关键词\n'], '导入.md', { type: 'text/markdown' })
  await user.upload(screen.getByLabelText('选择 Markdown 文件'), file)
  await user.selectOptions(screen.getByLabelText('保存到分组'), '__new__')
  await user.type(screen.getByLabelText('新分组名称'), '个人资料')
  await user.click(screen.getByRole('button', { name: '保存文档' }))

  await waitFor(() => {
    const error = screen.queryByRole('alert')
    if (error) throw new Error(`上传界面提示：${error.textContent}`)
    expect(window.location.hash).toContain(encodeURIComponent('docs/collections/个人资料/导入.md'))
  })
  expect(await screen.findByText('个人资料')).toBeTruthy()
  expect(await screen.findByText('独有关键词')).toBeTruthy()

  const search = screen.getByPlaceholderText('输入过滤目录，回车全文搜索')
  await user.type(search, '导入')
  expect(screen.getByRole('button', { name: '导入' })).toBeTruthy()
  await user.clear(search)
  await user.type(search, '独有关键词{Enter}')
  expect(await screen.findByText('导入', { selector: '.search-item-title' })).toBeTruthy()
})

it('窄屏取消上传后将焦点还给侧栏的「操作」菜单按钮', async () => {
  window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: '打开目录' }))
  // 焦点归还目标现在是「操作」菜单触发按钮（上传入口的挂载点）
  const trigger = screen.getByRole('button', { name: '操作' })
  await user.click(trigger)
  await user.click(screen.getByRole('button', { name: '上传 Markdown' }))
  await user.click(screen.getByRole('button', { name: '取消' }))
  await waitFor(() => expect(document.activeElement).toBe(trigger))
})
