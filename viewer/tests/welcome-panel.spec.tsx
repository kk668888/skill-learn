// @vitest-environment jsdom
/**
 * 从真实的树构建结果点击欢迎页套件卡片，验证用户实际到达的文档路径。
 * 这些用例同时保护资料不完整时的旧回退行为，避免新增快速入手后出现空白入口。
 */
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildTree } from '../server/tree-builder'
import { WelcomePanel } from '../src/components/WelcomePanel'

afterEach(cleanup)

/** 每个用例都使用同一个真实套件名，便于直接对照卡片的可访问名称。 */
async function clickSuite(files: string[]) {
  const onNavigate = vi.fn()
  render(<WelcomePanel tree={buildTree(files)} recentPaths={[]} onNavigate={onNavigate} />)
  await userEvent.setup().click(screen.getByRole('button', { name: /superpowers/ }))
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
