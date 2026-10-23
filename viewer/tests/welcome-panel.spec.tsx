// @vitest-environment jsdom
/**
 * 从真实的树构建结果点击欢迎页套件卡片，验证用户实际到达的文档路径。
 * 这些用例同时保护资料不完整时的旧回退行为，避免新增快速入手后出现空白入口。
 */
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildTree } from '../server/tree-builder'
import { WelcomePanel } from '../src/components/WelcomePanel'

afterEach(cleanup)

/** 继续卡片与套件卡可能同含套件名，套件卡一律在「浏览套件」区域内定位。 */
function browseSection(): HTMLElement {
  return screen.getByText('浏览套件').closest('section') as HTMLElement
}

/** 每个用例都使用同一个真实套件名，便于直接对照卡片的可访问名称。 */
async function clickSuite(files: string[]) {
  const onNavigate = vi.fn()
  render(<WelcomePanel tree={buildTree(files)} recentPaths={[]} onNavigate={onNavigate} />)
  await userEvent.setup().click(within(browseSection()).getByRole('button', { name: /superpowers/ }))
  return onNavigate
}

it('浏览套件优先打开该套件的技能快速入手', async () => {
  const onNavigate = await clickSuite([
    'docs/skills/superpowers/技能快速入手.md',
    'docs/skills/superpowers/技能原理深度讲解.md',
    'docs/skills/superpowers/brainstorming-中文版.md',
    'skills/superpowers/brainstorming/SKILL.md',
  ])

  expect(onNavigate).toHaveBeenCalledOnce()
  expect(onNavigate).toHaveBeenCalledWith('docs/skills/superpowers/技能快速入手.md')
})

it('缺少快速入手时仍打开套件原理深度讲解', async () => {
  const onNavigate = await clickSuite([
    'docs/skills/superpowers/技能原理深度讲解.md',
    'docs/skills/superpowers/brainstorming-中文版.md',
    'skills/superpowers/brainstorming/SKILL.md',
  ])

  expect(onNavigate).toHaveBeenCalledOnce()
  expect(onNavigate).toHaveBeenCalledWith('docs/skills/superpowers/技能原理深度讲解.md')
})

it('两篇套件级文档都缺失时仍打开首个技能的中文版', async () => {
  const onNavigate = await clickSuite([
    'docs/skills/superpowers/brainstorming-中文版.md',
    'skills/superpowers/brainstorming/SKILL.md',
  ])

  expect(onNavigate).toHaveBeenCalledOnce()
  expect(onNavigate).toHaveBeenCalledWith('docs/skills/superpowers/brainstorming-中文版.md')
})

// ---------- 学习地图改版：继续卡片、套件色标注与「套件 · 文档名」最近列表 ----------

const TREE = buildTree([
  'docs/skills/superpowers/技能快速入手.md',
  'docs/skills/openspec/技能快速入手.md',
  'skills/superpowers/brainstorming/SKILL.md',
  'skills/openspec/opsx/new/SKILL.md',
])

it('继续卡片指向最近文档并标注套件', async () => {
  const onNavigate = vi.fn()
  render(<WelcomePanel tree={TREE} recentPaths={['skills/superpowers/brainstorming/SKILL.md']} onNavigate={onNavigate} />)
  await userEvent.setup().click(screen.getByRole('button', { name: /继续上次阅读 · superpowers/ }))
  expect(onNavigate).toHaveBeenCalledWith('skills/superpowers/brainstorming/SKILL.md')
})

it('无最近记录时继续卡片回退首个套件入口，标注「从这套开始」', async () => {
  const onNavigate = vi.fn()
  // 树构建器按套件名排序，这里的第一套是 openspec。
  render(<WelcomePanel tree={TREE} recentPaths={[]} onNavigate={onNavigate} />)
  await userEvent.setup().click(screen.getByRole('button', { name: /从这套开始 · openspec/ }))
  expect(onNavigate).toHaveBeenCalledWith('docs/skills/openspec/技能快速入手.md')
})

it('总览右上角优先展示 SDD 入门卡片，点击直达指南', async () => {
  const onNavigate = vi.fn()
  const withGuide = buildTree([
    'docs/ai-docs/SDD-入门指南.md',
    'docs/skills/superpowers/技能快速入手.md',
    'skills/superpowers/brainstorming/SKILL.md',
  ])
  render(<WelcomePanel tree={withGuide}
    recentPaths={['skills/superpowers/brainstorming/SKILL.md']} onNavigate={onNavigate} />)
  await userEvent.setup().click(screen.getByRole('button', { name: /SDD 入门指南/ }))
  expect(onNavigate).toHaveBeenCalledWith('docs/ai-docs/SDD-入门指南.md')
  // 指南在场时右上角不再渲染继续卡片，新人第一入口唯一。
  expect(screen.queryByRole('button', { name: /继续上次阅读/ })).toBeNull()
})

it('目录没有可用入口时不渲染继续卡片，未知套件卡无描述但计数可见', () => {
  const onNavigate = vi.fn()
  const empty = render(<WelcomePanel tree={buildTree([])} recentPaths={[]} onNavigate={onNavigate} />)
  expect(screen.queryByRole('button', { name: /继续|从这套开始/ })).toBeNull()
  empty.unmount()
  render(<WelcomePanel tree={buildTree(['skills/全新套件/x/SKILL.md'])} recentPaths={[]} onNavigate={onNavigate} />)
  const card = within(browseSection()).getByRole('button', { name: /全新套件/ })
  expect(card.dataset.suite).toBe('default')
  expect(card.textContent).toContain('1 个技能')
})

it('最近打开显示「套件 · 文档名」消除重名歧义', () => {
  render(<WelcomePanel tree={TREE} recentPaths={['skills/openspec/opsx/new/SKILL.md']} onNavigate={vi.fn()} />)
  const item = screen.getAllByRole('button', { name: /openspec · / })[0]
  expect(item.textContent).toContain('最近打开')
})

// ---------- 技能速览入口：hero 统计行下的库主速查工具直达 ----------

it('首页提供技能速览入口，点击直达速览文档', async () => {
  const onNavigate = vi.fn()
  const withRef = buildTree([
    'docs/ai-docs/技能速览.md',
    'docs/skills/superpowers/技能快速入手.md',
    'skills/superpowers/brainstorming/SKILL.md',
  ])
  render(<WelcomePanel tree={withRef} recentPaths={[]} onNavigate={onNavigate} />)

  await userEvent.setup().click(screen.getByRole('button', { name: /技能速览/ }))
  expect(onNavigate).toHaveBeenCalledOnce()
  expect(onNavigate).toHaveBeenCalledWith('docs/ai-docs/技能速览.md')
})

it('资料里没有速览文档时不渲染该入口，与 SDD 卡的缺省回退行为一致', () => {
  render(<WelcomePanel tree={TREE} recentPaths={[]} onNavigate={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /技能速览/ })).toBeNull()
})
