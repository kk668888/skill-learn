// @vitest-environment jsdom
/** 下载入口应始终作用于全量文件，搜索和目录过滤仅影响列表展示。 */
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { Sidebar } from '../src/components/Sidebar'

afterEach(cleanup)

/** 动作项藏在「操作」下拉里，先点开菜单再触达具体按钮 */
async function openMenu(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: '操作' }))
}

function renderSidebar(options: { searching?: boolean; downloadError?: string; searchResults?: [] } = {}) {
  const onDownload = vi.fn()
  const view = render(
    <Sidebar
      tree={[]}
      currentPath={null}
      expanded={new Set()}
      onSelect={vi.fn()}
      onToggleNode={vi.fn()}
      searchResults={options.searchResults ?? null}
      searchQuery="测试"
      searching={false}
      searchError={null}
      onSearch={vi.fn()}
      onClearSearch={vi.fn()}
      isDark={false}
      onToggleTheme={vi.fn()}
      onOpenUpload={vi.fn()}
      uploadTriggerRef={{ current: null }}
      onDownload={onDownload}
      downloading={options.searching ?? false}
      downloadError={options.downloadError ?? null}
    />,
  )
  return { onDownload, ...view }
}

it('目录过滤和全文搜索态都能触发同一个全量下载操作', async () => {
  const user = userEvent.setup()
  const view = renderSidebar()
  await user.type(screen.getByPlaceholderText('输入过滤目录，回车全文搜索'), '某技能')
  await openMenu(user)
  await user.click(screen.getByRole('button', { name: '下载完整资料与离线技能包' }))
  expect(view.onDownload).toHaveBeenCalledOnce()
  view.unmount()

  const searchView = renderSidebar({ searchResults: [] })
  await openMenu(user)
  await user.click(screen.getByRole('button', { name: '下载完整资料与离线技能包' }))
  expect(searchView.onDownload).toHaveBeenCalledOnce()
})

it('下载中禁用重复点击，失败时显示提示并允许重试', async () => {
  const user = userEvent.setup()
  const busy = renderSidebar({ searching: true })
  await openMenu(user)
  const button = screen.getByRole('button', { name: /下载完整资料与离线技能包/ })
  expect((button as HTMLButtonElement).disabled).toBe(true)
  await user.click(button)
  expect(busy.onDownload).not.toHaveBeenCalled()
  busy.unmount()

  const failed = renderSidebar({ downloadError: '下载失败，请重试' })
  expect(screen.getByRole('alert').textContent).toContain('下载失败，请重试')
  await openMenu(user)
  await user.click(screen.getByRole('button', { name: '下载完整资料与离线技能包' }))
  expect(failed.onDownload).toHaveBeenCalledOnce()
})
