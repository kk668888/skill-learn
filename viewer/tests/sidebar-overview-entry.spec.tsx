// @vitest-environment jsdom
/**
 * 侧栏「学习总览」固定入口：
 * 位于 md 目录树下方、操作菜单上方（sidebar-foot），链接形态指向工具矩阵页 /overview/。
 * 不藏进「操作」下拉——用户要求的可见直达入口。
 */
import { afterEach, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { buildTree } from '../server/tree-builder'
import { Sidebar } from '../src/components/Sidebar'

afterEach(cleanup)

function renderSidebar() {
  return render(
    <Sidebar
      tree={buildTree(['skills/superpowers/brainstorming/SKILL.md'])}
      currentPath={null}
      expanded={new Set()}
      onSelect={vi.fn()}
      onToggleNode={vi.fn()}
      searchResults={null}
      searchQuery=""
      searching={false}
      searchError={null}
      onSearch={vi.fn()}
      onClearSearch={vi.fn()}
      isDark={false}
      onToggleTheme={vi.fn()}
      onOpenUpload={vi.fn()}
      uploadTriggerRef={createRef<HTMLButtonElement>()}
      onDownload={vi.fn()}
      downloading={false}
      downloadError={null}
    />,
  )
}

it('md 树下方有学习总览链接，指向 /overview/ 工具矩阵页', () => {
  renderSidebar()
  const link = screen.getByRole('link', { name: '学习总览' })
  expect(link.getAttribute('href')).toBe('/overview/')

  // 入口钉在侧栏底部（树与操作菜单之间），不藏进「操作」下拉
  const foot = link.closest('.sidebar-foot')
  expect(foot).not.toBeNull()
  expect(within(foot as HTMLElement).getByRole('button', { name: '操作' })).toBeTruthy()
  // 菜单收起状态下，链接不在任何弹层里，而是常驻可见
  expect(document.querySelector('.sidebar-menu-list')).toBeNull()
})
