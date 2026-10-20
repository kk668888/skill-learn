// @vitest-environment jsdom
/** 浏览器只在完整收到 ZIP 后保存；错误与断流都不能触发残缺文件下载。 */
import { afterEach, expect, it, vi } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { downloadMarkdownArchive, fetchMarkdownArchive } from '../src/api/client'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('完整响应后保存 ZIP，移除临时链接并释放对象 URL', async () => {
  vi.useFakeTimers()
  const archive = Buffer.from(zipSync({ '笔记.md': strToU8('# 内容') }))
  const request = vi.fn(async () => new Response(archive, {
    headers: { 'Content-Type': 'application/zip' },
  }))
  vi.stubGlobal('fetch', request)
  const create = vi.fn(() => 'blob:viewer-test')
  const revoke = vi.fn()
  URL.createObjectURL = create
  URL.revokeObjectURL = revoke
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('skill-learn-markdown.zip')
    expect(this.href).toBe('blob:viewer-test')
  })

  await downloadMarkdownArchive()
  expect(request).toHaveBeenCalledWith('/api/download')
  expect(create).toHaveBeenCalledOnce()
  expect(click).toHaveBeenCalledOnce()
  expect(document.querySelector('a[download="skill-learn-markdown.zip"]')).toBeNull()
  vi.advanceTimersByTime(1000)
  expect(revoke).toHaveBeenCalledWith('blob:viewer-test')
})

it('服务端错误和 ZIP 响应断流都向界面抛出错误，不触发保存', async () => {
  const create = vi.fn()
  URL.createObjectURL = create
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: '项目文件不可读' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }))
  await expect(downloadMarkdownArchive()).rejects.toThrow('项目文件不可读')

  const interrupted = new Response('partial', { headers: { 'Content-Type': 'application/zip' } })
  vi.spyOn(interrupted, 'blob').mockRejectedValue(new Error('stream aborted'))
  vi.stubGlobal('fetch', async () => interrupted)
  await expect(fetchMarkdownArchive()).rejects.toThrow('下载中断')
  vi.stubGlobal('fetch', async () => new Response('partial zip', {
    headers: { 'Content-Type': 'application/zip' },
  }))
  await expect(downloadMarkdownArchive()).rejects.toThrow('ZIP 不完整')
  expect(create).not.toHaveBeenCalled()
})
