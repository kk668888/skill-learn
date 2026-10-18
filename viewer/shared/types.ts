/**
 * 前后端共享的类型定义。
 *
 * 约定：所有文件路径都是「项目根目录相对路径」，用正斜杠分隔，
 * 例如 "skills/superpowers/brainstorming/SKILL.md"。
 * 这个路径同时充当文件的唯一 id。
 */

/** 文档在技能体系中的角色 */
export type DocRole =
  /** 中文版翻译（docs/skills/<套件>/<技能名>-中文版.md） */
  | 'zh'
  /** 详细设计讲解（docs/skills/<套件>/<技能名>-详细设计讲解.md） */
  | 'design'
  /** 技能源码（skills/.../SKILL.md） */
  | 'source'
  /** 技能下的附属文件 / 未配对文档 */
  | 'extra'
  /** 套件级总览（docs/skills/<套件>/技能原理深度讲解.md） */
  | 'suite-intro'
  /** 项目根级文档 */
  | 'root'
  /** 独立的 AI 文章，不参与技能源码与中文文档配对 */
  | 'article'

/** 叶子节点：一个 md 文件 */
export interface FileNode {
  type: 'file'
  /** 唯一 id，即相对路径 */
  path: string
  /** 侧边栏显示名 */
  title: string
  role: DocRole
  /** 所属技能，格式 "<套件名>/<技能目录名>"；根级/套件级文档没有 */
  skillId?: string
}

/** 普通文件夹节点（用于技能内的附属文件目录、套件内的独立文档目录） */
export interface FolderNode {
  type: 'folder'
  id: string
  title: string
  children: TreeNode[]
}

/** 技能节点：聚合了源码 + 中文版 + 详细设计讲解 + 附属文件 */
export interface SkillNode {
  type: 'skill'
  id: string
  title: string
  suite: string
  children: TreeNode[]
}

/** 套件节点（anthropics / grill / openspec / superpowers / ...） */
export interface SuiteNode {
  type: 'suite'
  id: string
  title: string
  children: TreeNode[]
}

/** 普通文档分组（项目根级文档或 AI 文章），其子项都是文件 */
export interface RootGroupNode {
  type: 'group'
  id: string
  title: string
  children: FileNode[]
}

export type TreeNode = FileNode | FolderNode | SkillNode | SuiteNode | RootGroupNode

/** 侧边栏整棵树：若干套件 + 可选的文章分组 + 根级文档分组 */
export type TreeRoot = (SuiteNode | RootGroupNode)[]

/** GET /api/doc 的响应体 */
export interface DocResponse {
  path: string
  title: string
  /** markdown 原文 */
  content: string
  /** 所属技能（若有），前端用它去树里找兄弟文档做互跳 */
  skillId?: string
}

/** 全文搜索中的一次行级命中 */
export interface SearchMatch {
  /** 行号（从 1 开始） */
  line: number
  /** 该行文本（可能截断），前端负责高亮关键词 */
  text: string
}

/** 全文搜索命中的一个文件 */
export interface SearchResultItem {
  path: string
  title: string
  skillId?: string
  matches: SearchMatch[]
}

/** GET /api/search 的响应体 */
export interface SearchResponse {
  query: string
  results: SearchResultItem[]
}
