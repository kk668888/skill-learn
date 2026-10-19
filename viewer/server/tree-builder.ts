/**
 * 套件合并树构建器（纯函数，不碰文件系统）。
 *
 * 核心任务：把「skills/ 源码树」与「docs/skills/ 中文文档树」按名字配对，
 * 合并成一棵「套件 → 技能 → 中文版/详细设计讲解/源码/附属文件」的树。
 *
 * 配对规则（依赖目录命名约定）：
 * - 目录里直接含 SKILL.md → 该目录是一个技能（不管嵌套多深，openspec 的
 *   skills/openspec/skills/<name>/ 就是靠这条规则识别的）
 * - docs/skills/<套件>/<技能名>-中文版.md / -详细设计讲解.md 按文件名前缀挂到同名技能
 * - docs/skills/<套件>/技能原理深度讲解.md 挂套件节点
 * - docs/ai-docs/ 与 docs/collections/<分组名>/ 独立成组，不参与技能配对；AI 导读排在文章前面
 * - 配不上的文档/散文件不丢弃，直接挂套件节点（宁可展示多余，不可静默丢数据）
 */
import type {
  TreeRoot,
  TreeNode,
  SuiteNode,
  SkillNode,
  FolderNode,
  FileNode,
  RootGroupNode,
  DocRole,
} from '../shared/types'

const SUITE_INTRO_FILENAME = '技能原理深度讲解.md'
const ZH_SUFFIX = '-中文版.md'
const DESIGN_SUFFIX = '-详细设计讲解.md'
const SOURCE_FILENAME = 'SKILL.md'

/** 去掉 .md 扩展名，作为默认显示标题 */
const baseTitle = (filename: string): string => filename.replace(/\.md$/, '')

/** 单个技能的原始数据（配对过程的中间结构） */
interface SkillData {
  name: string
  suite: string
  sourcePath?: string
  zhPath?: string
  designPath?: string
  /** 技能目录下的其他 md，值为相对技能目录的路径 */
  extras: string[]
}

/** 单个套件的原始数据 */
interface SuiteData {
  name: string
  skills: Map<string, SkillData>
  introPath?: string
  /** skills/ 下不属于任何技能的文件（相对套件目录） */
  leftovers: string[]
  /** docs/ 下没配对到技能的文档（相对套件目录，即纯文件名） */
  orphanDocs: string[]
}

/**
 * 构建完整的侧边栏树。
 * @param files 扫描得到的相对路径清单（正斜杠分隔）
 */
export function buildTree(files: string[]): TreeRoot {
  // ---------- 第一步：按来源分区 ----------
  const rootFiles = files.filter((f) => !f.includes('/')).sort()
  const skillFiles = files.filter((f) => f.startsWith('skills/'))
  const docFiles = files.filter((f) => f.startsWith('docs/skills/'))
  const aiDocFiles = files.filter((f) => f.startsWith('docs/ai-docs/'))
  const collectionFiles = files.filter((f) => f.startsWith('docs/collections/'))

  // ---------- 第二步：识别技能目录（含 SKILL.md 的目录） ----------
  const skillDirs = new Set<string>()
  for (const f of skillFiles) {
    if (f.endsWith(`/${SOURCE_FILENAME}`)) {
      skillDirs.add(f.slice(0, f.lastIndexOf('/')))
    }
  }

  const suites = new Map<string, SuiteData>()
  const suiteOf = (name: string): SuiteData => {
    let s = suites.get(name)
    if (!s) {
      s = { name, skills: new Map(), leftovers: [], orphanDocs: [] }
      suites.set(name, s)
    }
    return s
  }
  const skillOf = (suite: SuiteData, name: string): SkillData => {
    let sk = suite.skills.get(name)
    if (!sk) {
      sk = { name, suite: suite.name, extras: [] }
      suite.skills.set(name, sk)
    }
    return sk
  }

  // ---------- 第三步：消化 skills/ 下的文件 ----------
  for (const f of skillFiles) {
    // 形如 skills/<套件>/<剩余路径>
    const rest = f.slice('skills/'.length)
    const slash = rest.indexOf('/')
    // 理论上 scanner 不会给出 "skills/x.md" 这种文件，防御性跳过
    if (slash <= 0) continue
    const suite = suiteOf(rest.slice(0, slash))

    // 找最深的技能祖先目录，把文件归属到该技能
    const owner = deepestSkillDir(f, skillDirs)
    if (!owner) {
      // 不属于任何技能：套件下的散文件（如 openspec 的 commands/opsx/*.md）
      suite.leftovers.push(rest.slice(slash + 1))
      continue
    }
    const skillName = owner.slice(owner.lastIndexOf('/') + 1)
    const skill = skillOf(suite, skillName)
    const relToOwner = f.slice(owner.length + 1)
    if (relToOwner === SOURCE_FILENAME) {
      skill.sourcePath = f
    } else {
      skill.extras.push(relToOwner)
    }
  }

  // ---------- 第四步：消化 docs/skills/ 下的文件 ----------
  for (const f of docFiles) {
    const rest = f.slice('docs/skills/'.length)
    const slash = rest.indexOf('/')
    if (slash <= 0) continue // docs/skills/x.md 这种直接跳过（不符合文档命名约定）
    const suite = suiteOf(rest.slice(0, slash))
    const filename = rest.slice(slash + 1)

    if (filename === SUITE_INTRO_FILENAME) {
      suite.introPath = f
    } else if (filename.endsWith(ZH_SUFFIX)) {
      const skillName = baseTitle(filename.slice(0, -ZH_SUFFIX.length))
      const skill = suite.skills.get(skillName)
      if (skill) skill.zhPath = f
      else suite.orphanDocs.push(filename)
    } else if (filename.endsWith(DESIGN_SUFFIX)) {
      const skillName = baseTitle(filename.slice(0, -DESIGN_SUFFIX.length))
      const skill = suite.skills.get(skillName)
      if (skill) skill.designPath = f
      else suite.orphanDocs.push(filename)
    } else {
      suite.orphanDocs.push(filename)
    }
  }

  // ---------- 第五步：组装节点 ----------
  const suiteNodes: SuiteNode[] = [...suites.keys()].sort((a, b) => a.localeCompare(b)).map((name) => {
    const data = suites.get(name)!
    const children: TreeNode[] = []

    // 5.1 套件总览排最前
    if (data.introPath) {
      children.push(fileNode(data.introPath, baseTitle(SUITE_INTRO_FILENAME), 'suite-intro'))
    }

    // 5.2 技能节点（按名字排序），子节点顺序固定：中文版 → 详细设计讲解 → 源码 → 附属
    const skillNodes: SkillNode[] = [...data.skills.keys()].sort((a, b) => a.localeCompare(b)).map((skillName) => {
      const sk = data.skills.get(skillName)!
      const skillId = `${data.name}/${skillName}`
      const skillChildren: TreeNode[] = []
      if (sk.zhPath) skillChildren.push(fileNode(sk.zhPath, '中文版', 'zh', skillId))
      if (sk.designPath) skillChildren.push(fileNode(sk.designPath, '详细设计讲解', 'design', skillId))
      if (sk.sourcePath) skillChildren.push(fileNode(sk.sourcePath, SOURCE_FILENAME, 'source', skillId))
      skillChildren.push(...buildNestedTree(sk.extras, `skills/${data.name}/${skillName}`, skillId))
      return { type: 'skill', id: skillId, title: skillName, suite: data.name, children: skillChildren }
    })
    children.push(...skillNodes)

    // 5.3 孤儿文档（有文档没源码技能）：直接挂套件，保留原文件名做标题
    for (const filename of [...data.orphanDocs].sort((a, b) => a.localeCompare(b))) {
      children.push(fileNode(`docs/skills/${data.name}/${filename}`, baseTitle(filename), 'extra'))
    }

    // 5.4 skills/ 下的散文件：按父目录折叠成一层 folder（如 "commands/opsx"）
    const leftoverByDir = new Map<string, string[]>()
    for (const rel of data.leftovers) {
      const slashAt = rel.lastIndexOf('/')
      const dir = slashAt === -1 ? '' : rel.slice(0, slashAt)
      const name = slashAt === -1 ? rel : rel.slice(slashAt + 1)
      leftoverByDir.set(dir, [...(leftoverByDir.get(dir) ?? []), name])
    }
    const looseRootFiles = leftoverByDir.get('') ?? []
    for (const name of [...looseRootFiles].sort((a, b) => a.localeCompare(b))) {
      children.push(fileNode(`skills/${data.name}/${name}`, baseTitle(name), 'extra'))
    }
    const leftoverFolders: FolderNode[] = [...leftoverByDir.keys()]
      .filter((d) => d !== '')
      .sort((a, b) => a.localeCompare(b))
      .map((dir) => ({
        type: 'folder',
        id: `skills/${data.name}/${dir}`,
        title: dir, // 多级目录折叠显示，如 "commands/opsx"
        children: (leftoverByDir.get(dir) ?? [])
          .sort((a, b) => a.localeCompare(b))
          .map((name) => fileNode(`skills/${data.name}/${dir}/${name}`, baseTitle(name), 'extra')),
      }))
    children.push(...leftoverFolders)

    return { type: 'suite', id: `suite:${data.name}`, title: data.name, children }
  })

  // ---------- 第六步：普通文章独立成组，保留套件文档与文章的边界 ----------
  // 导读 README 优先展示；其余文章按相对路径排序，新增文件无需维护固定清单。
  const orderedAiDocs = [...aiDocFiles].sort((a, b) => {
    const aIsReadme = a === 'docs/ai-docs/README.md'
    const bIsReadme = b === 'docs/ai-docs/README.md'
    if (aIsReadme !== bIsReadme) return aIsReadme ? -1 : 1
    return a.localeCompare(b)
  })
  const aiDocsGroup: RootGroupNode = {
    type: 'group',
    id: 'ai-docs',
    title: 'AI 文章',
    children: orderedAiDocs.map((path) => fileNode(path, baseTitle(path.split('/').pop()!), 'article')),
  }

  // ---------- 第七步：自建普通文档按第一级目录分组 ----------
  // 路径是文档唯一 ID，分组只改变树的展示，不改读取和搜索的文件定位约定。
  const collections = new Map<string, string[]>()
  for (const path of collectionFiles) {
    const rest = path.slice('docs/collections/'.length)
    const slash = rest.indexOf('/')
    if (slash <= 0) continue
    const name = rest.slice(0, slash)
    collections.set(name, [...(collections.get(name) ?? []), path])
  }
  const collectionGroups: RootGroupNode[] = [...collections.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      type: 'group',
      id: `collection:${name}`,
      title: name,
      children: collections.get(name)!
        .sort((a, b) => a.localeCompare(b))
        .map((path) => fileNode(path, baseTitle(path.split('/').pop()!), 'article')),
    }))

  // ---------- 第八步：根级文档分组挂最后 ----------
  const rootGroup: RootGroupNode = {
    type: 'group',
    id: 'root',
    title: '根级文档',
    children: rootFiles.map((f) => fileNode(f, baseTitle(f), 'root')),
  }

  // 没有文章目录的微型项目不显示空组，保持原有空输入的树形约定。
  return [...suiteNodes, ...(orderedAiDocs.length > 0 ? [aiDocsGroup] : []), ...collectionGroups, rootGroup]
}

/**
 * 从树里提取 path → 元信息 的索引，
 * 供 API 补全文档标题 / skillId / 搜索结果展示名使用。
 */
export interface FileMeta {
  title: string
  role: DocRole
  skillId?: string
}

export function buildFileIndex(tree: TreeRoot): Map<string, FileMeta> {
  const index = new Map<string, FileMeta>()
  const walk = (nodes: TreeNode[]): void => {
    for (const n of nodes) {
      if (n.type === 'file') index.set(n.path, { title: n.title, role: n.role, skillId: n.skillId })
      else walk(n.children)
    }
  }
  walk(tree)
  return index
}

/** 构造叶子文件节点 */
function fileNode(path: string, title: string, role: DocRole, skillId?: string): FileNode {
  return skillId ? { type: 'file', path, title, role, skillId } : { type: 'file', path, title, role }
}

/**
 * 把一批相对路径（相对某个技能目录）组装成「文件 + 嵌套 folder」的子树。
 * 保留真实目录层级（references/、agents/ 一层是一层）。
 * @param relPaths 相对 prefix 的路径
 * @param prefix   拼回完整路径用的前缀（也是 folder id 的前缀）
 * @param skillId  附属文件同样归属该技能
 */
function buildNestedTree(relPaths: string[], prefix: string, skillId: string): TreeNode[] {
  const directFiles = relPaths.filter((p) => !p.includes('/')).sort((a, b) => a.localeCompare(b))
  const files = directFiles.map((rel) => fileNode(`${prefix}/${rel}`, baseTitle(rel), 'extra', skillId))

  const byHead = new Map<string, string[]>()
  for (const p of relPaths.filter((p) => p.includes('/'))) {
    const slashAt = p.indexOf('/')
    const head = p.slice(0, slashAt)
    byHead.set(head, [...(byHead.get(head) ?? []), p.slice(slashAt + 1)])
  }
  const folders: FolderNode[] = [...byHead.keys()].sort((a, b) => a.localeCompare(b)).map((head) => ({
    type: 'folder',
    id: `${prefix}/${head}`,
    title: head,
    children: buildNestedTree(byHead.get(head)!, `${prefix}/${head}`, skillId),
  }))

  return [...files, ...folders]
}

/** 找 path 的祖先中最深的技能目录；没有则返回 undefined */
function deepestSkillDir(path: string, skillDirs: Set<string>): string | undefined {
  const segs = path.split('/')
  for (let i = segs.length - 1; i > 0; i--) {
    const candidate = segs.slice(0, i).join('/')
    if (skillDirs.has(candidate)) return candidate
  }
  return undefined
}
