// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildTree } from '../server/tree-builder'
import App from '../src/App'

const FILES = ['docs/skills/superpowers/技能快速入手.md', 'skills/superpowers/brainstorming/SKILL.md']
vi.mock('../src/api/client', () => ({
  fetchTree: () => Promise.resolve(buildTree(FILES)),
  fetchDoc: (path: string) => Promise.resolve({ path, title: '技能快速入手', content: '# 一\n\n正文' }),
  fetchSearch: () => Promise.resolve({ query: '', results: [] }),
  uploadMarkdown: vi.fn(),
  downloadMarkdownArchive: vi.fn(),
}))

afterEach(() => {
  cleanup()
  window.location.hash = ''
  vi.unstubAllGlobals()
})

function renderApp() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  return render(<App />)
}

it('首页没有大纲栏，进入文档后出现且栏宽变量保留', async () => {
  renderApp()
  await screen.findByText('浏览套件')
  expect(document.querySelector('#viewer-toc')).toBeNull()
  expect(document.querySelector('.app')!.classList.contains('app-home')).toBe(true)

  // 套件卡与侧栏套件行同名，点击限定在「浏览套件」区域内的卡片。
  const browse = screen.getByText('浏览套件').closest('section') as HTMLElement
  await userEvent.setup().click(within(browse).getByRole('button', { name: /superpowers/ }))
  // 文档标题与侧栏/面包屑同名，这里只证明文档已打开渲染。
  expect((await screen.findAllByText('技能快速入手')).length).toBeGreaterThan(0)
  expect(document.querySelector('#viewer-toc')).not.toBeNull()
  expect(document.querySelector('#viewer-toc')!.getAttribute('data-suite')).toBe('superpowers')
  expect(document.querySelector('.app')!.getAttribute('style')).toContain('--toc-width')
})

// ---------- 返回总览：指回文库首页（库总览），不再外跳工具矩阵 ----------

it('返回总览在读文档时出现并指回站内首页，点击回到文库总览视图', async () => {
  renderApp()
  await screen.findByText('浏览套件')
  // 首页本身就是总览（库总览），此时不存在「返回总览」入口
  expect(screen.queryAllByRole('link', { name: '返回总览' })).toHaveLength(0)

  // 打开一篇文档，侧栏与移动端顶栏各出现一条「返回总览」
  const browse = screen.getByText('浏览套件').closest('section') as HTMLElement
  await userEvent.setup().click(within(browse).getByRole('button', { name: /superpowers/ }))
  const links = await screen.findAllByRole('link', { name: '返回总览' })
  expect(links).toHaveLength(2)
  // 两条都必须是站内 hash 路由（回首页），而不是整页外跳 /overview/（工具矩阵）
  for (const link of links) {
    expect(link.getAttribute('href')).toBe('#/')
  }

  // 点击后无刷新回到文库总览视图，链接随之消失
  await userEvent.click(links[0])
  await screen.findByText('浏览套件')
  expect(window.location.hash).toBe('#/')
  expect(screen.queryAllByRole('link', { name: '返回总览' })).toHaveLength(0)
})
