/**
 * 树的查询工具：扁平化、过滤、找上下文、算祖先。
 * 全部是纯函数，侧边栏过滤与文档互跳都依赖这里。
 */
import type { TreeRoot, TreeNode, FileNode, SkillNode } from '../../shared/types'

/** 深度优先收集树里的所有文件节点 */
export function collectFiles(nodes: TreeNode[]): FileNode[] {
  return nodes.flatMap((n) => (n.type === 'file' ? [n] : collectFiles(n.children)))
}

/** 深度优先收集树里的所有技能节点 */
export function collectSkills(nodes: TreeNode[]): SkillNode[] {
  return nodes.flatMap((n) => {
    if (n.type === 'skill') return [n, ...collectSkills(n.children)]
    if (n.type === 'file') return []
    return collectSkills(n.children)
  })
}

/**
 * 按标题或路径过滤，返回匹配的文件列表（用于输入框的即时过滤）。
 * 英文不区分大小写，中文按子串。
 */
export function filterFiles(tree: TreeRoot, text: string): FileNode[] {
  const q = text.trim().toLowerCase()
  if (!q) return []
  return collectFiles(tree).filter(
    (f) => f.title.toLowerCase().includes(q) || f.path.toLowerCase().includes(q),
  )
}

/** 文件在树里的位置上下文 */
export interface FileContext {
  node: FileNode
  /** 所属套件名（根级文档没有） */
  suite?: string
  /** 所属技能名（套件级/根级文档没有） */
  skill?: string
  /** 所属技能的完整节点（互跳链接用） */
  skillNode?: SkillNode
}

/** 在树里定位一个文件，顺带带回它的套件/技能上下文 */
export function findFileContext(tree: TreeRoot, path: string): FileContext | undefined {
  const search = (nodes: TreeNode[], suite?: string, skillNode?: SkillNode): FileContext | undefined => {
    for (const n of nodes) {
      if (n.type === 'file') {
        if (n.path === path) return { node: n, suite, skill: skillNode?.title, skillNode }
      } else if (n.type === 'skill') {
        const hit = search(n.children, suite, n)
        if (hit) return hit
      } else {
        // 只有套件节点才确立“所属套件”；分组/文件夹沿用外层上下文。
        const hit = search(n.children, n.type === 'suite' ? n.title : suite, skillNode)
        if (hit) return hit
      }
    }
    return undefined
  }
  return search(tree)
}

/**
 * 计算包裹某文件的所有祖先节点 id（套件 id、技能 id、folder id），
 * 打开文档时用来自动展开侧边栏对应路径。
 */
export function collectAncestorIds(tree: TreeRoot, path: string): string[] {
  const ids: string[] = []
  const walk = (nodes: TreeNode[]): boolean => {
    for (const n of nodes) {
      if (n.type === 'file') {
        if (n.path === path) return true
        continue
      }
      ids.push(n.id)
      if (walk(n.children)) return true
      ids.pop()
    }
    return false
  }
  walk(tree)
  return ids
}

/**
 * 学习地图的初始展开策略：首页初次进入只展开最近阅读所属的套件；
 * 没有可解析的最近记录时全部收起，靠欢迎页套件入口和搜索进入。
 */
export function initialExpandedSuites(tree: TreeRoot, recentPaths: string[]): Set<string> {
  const recentSuite = recentPaths[0] ? findFileContext(tree, recentPaths[0])?.suite : undefined
  if (!recentSuite) return new Set()
  const suite = tree.find((n) => n.type === 'suite' && n.title === recentSuite)
  return suite ? new Set([suite.id]) : new Set()
}
