// @vitest-environment jsdom
/** 上传表单的行为测试：用真实表单事件验证分组选择、错误恢复和键盘可用的标签。 */
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadDialog } from '../src/components/UploadDialog'

beforeAll(() => {
  // jsdom 尚未实现原生 dialog 的显示方法；仅补 DOM 可见状态，交互仍由真实 React 处理。
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(cleanup)

const groups = [
  { id: 'ai-docs', title: 'AI 文章' },
  { id: 'collection:读书笔记', title: '读书笔记' },
]

it('选择已有分组并上传一份 Markdown，成功后关闭对话框', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn(async () => undefined)
  const onClose = vi.fn()
  render(<UploadDialog groups={groups} onSubmit={onSubmit} onClose={onClose} />)

  const file = new File(['# 内容\n'], '内容.md', { type: 'text/markdown' })
  await user.upload(screen.getByLabelText('选择 Markdown 文件'), file)
  await user.selectOptions(screen.getByLabelText('保存到分组'), 'collection:读书笔记')
  await user.click(screen.getByRole('button', { name: '保存文档' }))

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
    file, '内容.md', { kind: 'existing', groupId: 'collection:读书笔记' },
  ))
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
})

it('同名冲突后保留文件，改名重试成功', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
    .mockRejectedValueOnce(new Error('同名文件已存在，请修改文件名'))
    .mockResolvedValueOnce(undefined)
  const onClose = vi.fn()
  render(<UploadDialog groups={groups} onSubmit={onSubmit} onClose={onClose} />)

  const file = new File(['# 内容\n'], '原名.md', { type: 'text/markdown' })
  await user.upload(screen.getByLabelText('选择 Markdown 文件'), file)
  await user.selectOptions(screen.getByLabelText('保存到分组'), '__new__')
  await user.type(screen.getByLabelText('新分组名称'), '项目笔记')
  await user.click(screen.getByRole('button', { name: '保存文档' }))
  expect((await screen.findByRole('alert')).textContent).toContain('同名文件已存在')
  expect((screen.getByLabelText('选择 Markdown 文件') as HTMLInputElement).files?.[0]).toBe(file)

  await user.clear(screen.getByLabelText('保存文件名'))
  await user.type(screen.getByLabelText('保存文件名'), '改名.md')
  await user.click(screen.getByRole('button', { name: '保存文档' }))
  await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(
    file, '改名.md', { kind: 'new', name: '项目笔记' },
  ))
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
})
