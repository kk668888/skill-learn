// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { buildTree } from '../server/tree-builder'
import { TreeView } from '../src/components/TreeView'

const FILES = ['skills/openspec/opsx/new/SKILL.md', 'skills/superpowers/brainstorming/SKILL.md']
const base = { currentPath: null, expanded: new Set<string>(), onSelect: vi.fn(), onToggle: vi.fn() }

afterEach(cleanup)

it('套件行有颜色标记与 data-suite，未知套件为 default', () => {
  render(<TreeView nodes={buildTree([...FILES, 'skills/全新套件/x/SKILL.md'])} {...base} />)
  expect(screen.getByRole('button', { name: /openspec/ }).getAttribute('data-suite')).toBe('openspec')
  expect(screen.getByRole('button', { name: /全新套件/ }).getAttribute('data-suite')).toBe('default')
  expect(document.querySelector('.tree-suite .suite-dot')).not.toBeNull()
})

it('当前文档所属套件行有 active 与 aria-current', () => {
  render(
    <TreeView nodes={buildTree(FILES)} currentPath="skills/openspec/opsx/new/SKILL.md"
      activeSuiteTitle="openspec" expanded={new Set()} onSelect={vi.fn()} onToggle={vi.fn()} />,
  )
  const suite = screen.getByRole('button', { name: /openspec/ })
  expect(suite.classList.contains('active')).toBe(true)
  expect(suite.getAttribute('aria-current')).toBe('true')
  expect(screen.getByRole('button', { name: /superpowers/ }).getAttribute('aria-current')).toBeNull()
})
