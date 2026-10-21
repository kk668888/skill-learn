import { expect, it } from 'vitest'
import { suiteDescription, suiteKey } from '../src/lib/suiteTheme'
import { findFileContext, initialExpandedSuites } from '../src/lib/filter'
import { buildTree } from '../server/tree-builder'

it('findFileContext 返回文件所属套件名', () => {
  const tree = buildTree(['skills/superpowers/brainstorming/SKILL.md'])
  expect(findFileContext(tree, 'skills/superpowers/brainstorming/SKILL.md')?.suite).toBe('superpowers')
})

it('已知套件名映射到稳定 key 与描述', () => {
  expect(suiteKey('OpenSpec')).toBe('openspec')
  expect(suiteKey('frontend-design-premium')).toBe('frontend-design-premium')
  expect(suiteKey('Ponytail')).toBe('ponytail')
  expect(suiteDescription('grill')).toBe('深挖问题')
  expect(suiteDescription('ponytail')).toBe('极简实现')
})

it('未知套件回退中性默认，描述为空', () => {
  expect(suiteKey('全新套件')).toBe('default')
  expect(suiteKey(undefined)).toBe('default')
  expect(suiteDescription('default')).toBe('')
})

it('套件名撞上 Object 原型属性名时仍回退默认', () => {
  expect(suiteKey('toString')).toBe('default')
  expect(suiteKey('constructor')).toBe('default')
})

it('初次进入只展开最近阅读所属套件，无记录则全收起', () => {
  const tree = buildTree([
    'skills/openspec/opsx/new/SKILL.md',
    'skills/superpowers/brainstorming/SKILL.md',
  ])
  expect(initialExpandedSuites(tree, ['skills/superpowers/brainstorming/SKILL.md']))
    .toEqual(new Set(['suite:superpowers']))
  expect(initialExpandedSuites(tree, [])).toEqual(new Set())
  expect(initialExpandedSuites(tree, ['docs/ai-docs/不存在的文章.md'])).toEqual(new Set())
})
