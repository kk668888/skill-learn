/**
 * 真实数据冒烟测试：直接扫真实的 skill-learn 项目，校验查看器依赖的所有约定。
 *
 * 与其他 spec 的区别：那些用虚拟夹具测逻辑，这个测「真实仓库长得符合预期」——
 * 套件配对完整、没有文件被静默丢掉。以后目录结构调整导致映射失效时，这里会先红。
 */
import { describe, it, expect } from 'vitest'
import { scanProject } from '../server/scanner'
import { buildTree, buildFileIndex } from '../server/tree-builder'
import { PROJECT_ROOT } from '../server/config'
import { collectFiles } from '../src/lib/filter'
import type { FileNode } from '../shared/types'

const files = scanProject(PROJECT_ROOT)
const tree = buildTree(files)

describe('真实仓库冒烟', () => {
  it('六个套件的快速入手均被扫描并进入欢迎页可导航的文件树', () => {
    // 欢迎页入口依赖文件节点的真实路径；只写教程但未被扫描时，套件卡片无法跳转。
    const index = buildFileIndex(tree)
    for (const suite of ['anthropics', 'frontend-design-premium', 'grill', 'impeccable', 'openspec', 'superpowers']) {
      const path = `docs/skills/${suite}/技能快速入手.md`
      expect(files).toContain(path)
      expect(index.has(path)).toBe(true)
    }
  })

  it('六个套件齐全 + 根级文档分组', () => {
    const suites = tree.filter((n) => n.type === 'suite').map((n) => n.title)
    // 此处列出仓库实际维护的套件，新增套件时要同步检查扫描和树构建是否收录它。
    expect(suites).toEqual([
      'anthropics',
      'frontend-design-premium',
      'grill',
      'impeccable',
      'openspec',
      'superpowers',
    ])
    const group = tree.find((n) => n.type === 'group' && n.id === 'root')
    expect(group).toBeDefined()
  })

  it('AI 文章可在目录树中阅读，并收录现有导读', () => {
    const group = tree.find((n) => n.type === 'group' && n.id === 'ai-docs')
    const paths = (group!.children as FileNode[]).map((c) => c.path)
    expect(paths).toContain('docs/ai-docs/README.md')
    expect(paths).toContain('docs/ai-docs/01-为什么AI时代需要硬性预算上限.md')
  })

  it('README.md（改名后）进入根级分组', () => {
    const group = tree.find((n) => n.type === 'group' && n.id === 'root')
    const paths = (group!.children as FileNode[]).map((c) => c.path)
    expect(paths).toContain('README.md')
    expect(paths).toContain('CLAUDE.md')
  })

  it('brainstorming 技能的 中文版/详细设计讲解/源码 三件套配对成功', () => {
    const index = buildFileIndex(tree)
    expect(index.get('docs/skills/superpowers/brainstorming-中文版.md')?.role).toBe('zh')
    expect(index.get('docs/skills/superpowers/brainstorming-详细设计讲解.md')?.role).toBe('design')
    expect(index.get('skills/superpowers/brainstorming/SKILL.md')?.role).toBe('source')
    expect(index.get('docs/skills/superpowers/brainstorming-中文版.md')?.skillId).toBe(
      'superpowers/brainstorming',
    )
  })

  it('openspec 套件同时包含深层技能和 commands/opsx 独立文档目录', () => {
    const openspec = tree.find((n) => n.type === 'suite' && n.title === 'openspec')
    expect(openspec).toBeDefined()
    const index = buildFileIndex(tree)
    expect(index.get('skills/openspec/skills/openspec-new-change/SKILL.md')?.skillId).toBe(
      'openspec/openspec-new-change',
    )
    expect(files).toContain('skills/openspec/commands/opsx/new.md')
  })

  it('最关键不变量：扫描到的每个文件在树里恰好出现一次（无丢失、无重复）', () => {
    const treePaths = collectFiles(tree).map((f: FileNode) => f.path)
    expect(new Set(treePaths).size).toBe(treePaths.length) // 无重复
    expect(new Set(treePaths)).toEqual(new Set(files)) // 无丢失
  })

  it('扫描集合不含 .claude/.agents/viewer/node_modules 下的文件', () => {
    for (const f of files) {
      expect(f.startsWith('.')).toBe(false)
      expect(f.includes('node_modules/')).toBe(false)
      expect(f.startsWith('viewer/')).toBe(false)
    }
  })
})
