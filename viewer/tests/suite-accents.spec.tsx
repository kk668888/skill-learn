// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DocHeader } from '../src/components/DocHeader'
import type { FileContext } from '../src/lib/filter'

afterEach(cleanup)

const doc = { path: 'docs/skills/openspec/opsx-new-中文版.md', title: 'opsx new 中文版', content: '' }
const context = (suite?: string): FileContext => ({
  node: { type: 'file', path: doc.path, title: doc.title, role: 'zh', skillId: 'opsx-new' },
  suite,
  skill: 'opsx-new',
})

it('文档头标注所属套件，未知套件为 default', () => {
  const { container } = render(
    <DocHeader doc={doc} context={context('openspec')} crossLinks={[]}
      onNavigate={() => {}} readingTheme="classic" onReadingThemeChange={() => {}} />,
  )
  expect(container.querySelector('.doc-header')!.getAttribute('data-suite')).toBe('openspec')

  const anonymous = render(
    <DocHeader doc={doc} context={context()} crossLinks={[]}
      onNavigate={() => {}} readingTheme="classic" onReadingThemeChange={() => {}} />,
  )
  expect(anonymous.container.querySelector('.doc-header')!.getAttribute('data-suite')).toBe('default')
  anonymous.unmount()
})
