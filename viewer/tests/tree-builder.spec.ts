/**
 * tree-builder 单元测试：套件合并映射规则。
 *
 * 这是整套树视图正确性的命门——源码树与中文文档树如何按名字配对、
 * 不同套件的目录形态差异（openspec 技能深一层、commands 是独立文档）
 * 都在这里固定下来。
 */
import { describe, it, expect } from 'vitest'
import { buildTree, buildFileIndex } from '../server/tree-builder'
import type { FileNode, SkillNode, FolderNode, TreeNode } from '../shared/types'

/**
 * 虚拟文件清单：覆盖本项目所有真实形态
 * - 标准技能：skills/superpowers/brainstorming/
 * - 技能内附属文件 + 嵌套目录（references/）
 * - 套件级中文总览（技能原理深度讲解.md）
 * - openspec 深层技能：skills/openspec/skills/<name>/
 * - openspec 独立命令文档：skills/openspec/commands/opsx/*.md
 * - 孤儿文档（有中文版但没有对应源码技能）
 * - 有源码但没有中文文档的技能
 * - 套件根下的散文件
 */
const FILES = [
  // 根级文档
  'README.md',
  'CLAUDE.md',
  // AI 文章与技能文档分开：它们不应被误识别为技能套件。
  'docs/ai-docs/README.md',
  'docs/ai-docs/01-为什么需要预算上限.md',
  // superpowers：标准形态
  'skills/superpowers/brainstorming/SKILL.md',
  'skills/superpowers/brainstorming/visual-companion.md',
  'skills/superpowers/using-superpowers/SKILL.md',
  'skills/superpowers/using-superpowers/references/codex-tools.md',
  'docs/skills/superpowers/brainstorming-中文版.md',
  'docs/skills/superpowers/brainstorming-详细设计讲解.md',
  'docs/skills/superpowers/技能原理深度讲解.md',
  // openspec：深层技能 + 独立命令文档
  'skills/openspec/skills/openspec-new-change/SKILL.md',
  'docs/skills/openspec/openspec-new-change-中文版.md',
  'skills/openspec/commands/opsx/apply.md',
  'skills/openspec/commands/opsx/new.md',
  // grill：孤儿文档 + 无文档技能 + 套件根散文件
  'docs/skills/grill/grill-me-中文版.md',
  'skills/grill/grilling/SKILL.md',
  'skills/grill/overview.md',
]

const tree = buildTree(FILES)

/** 在树里按断言查找节点的小工具 */
function findNode(nodes: TreeNode[], predicate: (n: TreeNode) => boolean): TreeNode | undefined {
  for (const n of nodes) {
    if (predicate(n)) return n
    if ('children' in n) {
      const hit = findNode(n.children, predicate)
      if (hit) return hit
    }
  }
  return undefined
}

const filesOf = (n: TreeNode) => (n.type === 'file' ? [n] : [])
const childrenOf = (n: TreeNode): TreeNode[] => ('children' in n ? n.children : [])

describe('buildTree：根级文档', () => {
  it('根级 md 进入「根级文档」分组，角色为 root', () => {
    // 同层还可能出现 AI 文章分组，按稳定 id 取得项目根级文档。
    const group = tree.find((n) => n.type === 'group' && n.id === 'root')
    expect(group).toBeDefined()
    expect(group!.title).toBe('根级文档')
    const paths = (group!.children as FileNode[]).map((c) => c.path).sort()
    expect(paths).toEqual(['CLAUDE.md', 'README.md'])
    expect((group!.children as FileNode[]).every((c) => c.role === 'root')).toBe(true)
  })
})

describe('buildTree：AI 文章', () => {
  it('独立成组，并让文章与入口文档都能进入文件索引', () => {
    const group = tree.find((n) => n.type === 'group' && n.id === 'ai-docs')
    expect(group?.title).toBe('AI 文章')
    const articles = (group?.children ?? []) as FileNode[]
    expect(articles.map((file) => file.path)).toEqual([
      'docs/ai-docs/README.md',
      'docs/ai-docs/01-为什么需要预算上限.md',
    ])
    expect(articles.every((file) => file.role === 'article')).toBe(true)
    expect(buildFileIndex(tree).get('docs/ai-docs/README.md')?.role).toBe('article')
  })
})

describe('buildTree：套件与技能识别', () => {
  it('生成按字母序排列的套件节点：grill、openspec、superpowers', () => {
    const suites = tree.filter((n) => n.type === 'suite')
    expect(suites.map((s) => s.title)).toEqual(['grill', 'openspec', 'superpowers'])
  })

  it('含 SKILL.md 的目录被识别为技能，深层目录（openspec/skills/<name>）也能识别', () => {
    const skill = findNode(tree, (n) => n.type === 'skill' && n.title === 'openspec-new-change')
    expect(skill).toBeDefined()
    expect((skill as SkillNode).suite).toBe('openspec')
  })

  it('技能子节点顺序固定：中文版 → 详细设计讲解 → 源码 → 附属文件', () => {
    const skill = findNode(tree, (n) => n.type === 'skill' && n.title === 'brainstorming') as SkillNode
    const roles = skill.children.filter((c) => c.type === 'file').map((c) => (c as FileNode).role)
    expect(roles).toEqual(['zh', 'design', 'source', 'extra'])
  })

  it('技能内嵌套目录保留为 folder 节点', () => {
    const skill = findNode(tree, (n) => n.type === 'skill' && n.title === 'using-superpowers') as SkillNode
    const folder = skill.children.find((c) => c.type === 'folder') as FolderNode
    expect(folder.title).toBe('references')
    expect((folder.children[0] as FileNode).path).toBe(
      'skills/superpowers/using-superpowers/references/codex-tools.md',
    )
  })

  it('技能的所有子节点（含中文文档）都带 skillId "<套件>/<技能名>"', () => {
    const skill = findNode(tree, (n) => n.type === 'skill' && n.title === 'brainstorming') as SkillNode
    const zh = skill.children.find((c) => filesOf(c).length > 0 && (c as FileNode).role === 'zh') as FileNode
    expect(zh.skillId).toBe('superpowers/brainstorming')
    expect(zh.path).toBe('docs/skills/superpowers/brainstorming-中文版.md')
  })
})

describe('buildTree：套件级与未配对内容', () => {
  it('技能原理深度讲解.md 挂在套件节点下，角色 suite-intro', () => {
    const suite = tree.find((n) => n.type === 'suite' && n.title === 'superpowers')
    const intro = findNode(childrenOf(suite!), (n) => n.type === 'file' && (n as FileNode).role === 'suite-intro') as FileNode
    expect(intro.path).toBe('docs/skills/superpowers/技能原理深度讲解.md')
  })

  it('无 SKILL.md 的目录（commands/opsx）折叠为套件下的 folder 节点', () => {
    const suite = tree.find((n) => n.type === 'suite' && n.title === 'openspec')
    const folder = findNode(childrenOf(suite!), (n) => n.type === 'folder' && n.title === 'commands/opsx') as FolderNode
    expect(folder).toBeDefined()
    expect(folder.children.map((c) => (c as FileNode).title).sort()).toEqual(['apply', 'new'])
  })

  it('孤儿中文文档（无对应源码技能）直接挂在套件下，不丢失', () => {
    const suite = tree.find((n) => n.type === 'suite' && n.title === 'grill')
    const orphan = findNode(childrenOf(suite!), (n) => n.type === 'file' && (n as FileNode).path === 'docs/skills/grill/grill-me-中文版.md')
    expect(orphan).toBeDefined()
  })

  it('套件根下的散文件直接挂套件节点', () => {
    const suite = tree.find((n) => n.type === 'suite' && n.title === 'grill')
    const loose = findNode(childrenOf(suite!), (n) => n.type === 'file' && (n as FileNode).path === 'skills/grill/overview.md')
    expect(loose).toBeDefined()
  })
})

describe('buildTree：确定性', () => {
  it('同样的输入两次构建结果完全一致（JSON 层面）', () => {
    expect(JSON.stringify(buildTree(FILES))).toBe(JSON.stringify(buildTree(FILES)))
  })

  it('空输入只得到空的根级分组', () => {
    const t = buildTree([])
    expect(t).toHaveLength(1)
    expect(t[0].type).toBe('group')
    expect((t[0] as RootGroupLike).children).toHaveLength(0)
  })
})

interface RootGroupLike {
  children: unknown[]
}
