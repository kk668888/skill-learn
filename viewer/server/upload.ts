/**
 * 本地 Markdown 上传的磁盘边界。
 *
 * 浏览器提交的分组标识和文件名都不可信：这里先把分组映射到两个允许的
 * docs/ 子树，再检查目录与名称，最后排他写入。文件系统写入保持同步，
 * 与查看器现有的同步扫描一致；单个请求的“检查重名 → 创建文件”不会在
 * 本进程内被另一个上传请求插入，另由 wx 排他标志挡住进程外的同名竞争。
 */
import {
  closeSync, existsSync, fstatSync, lstatSync, mkdirSync, openSync,
  readdirSync, rmSync, rmdirSync, writeFileSync,
} from 'node:fs'
import type { Stats } from 'node:fs'
import { join } from 'node:path'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** 写入函数是明确的 I/O 边界；测试可注入一次“已创建文件后中断”的故障。 */
export interface UploadOptions {
  writeBytes?: (path: string, bytes: Buffer, markCreated: (identity?: Stats) => void) => void
}

export class UploadFailure extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

interface UploadFields {
  targetName?: unknown
  groupId?: unknown
  newGroup?: unknown
}

/**
 * 只允许一个安全的目录层级或文件名。除路径穿越外，也拒绝 Windows 保留名与
 * 末尾空格／点，保证现在的 Windows 开发环境和未来 Linux 容器行为一致。
 */
function validSegment(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 120) return false
  if (value !== value.trim() || value.startsWith('.') || /[. ]$/.test(value)) return false
  if (value === '.' || value === '..' || /[<>:"/\\|?*\x00-\x1f\x7f]/u.test(value)) return false
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/iu.test(value)) return false
  return true
}

/** NFC + 小写作为跨平台冲突键；展示和落盘仍保留用户输入的原始名称。 */
function collisionKey(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('en-US')
}

/** 已存在的允许目录必须是真目录，符号链接绝不能作为写入目标。 */
function assertRealDirectory(path: string): void {
  const info = lstatSync(path)
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new UploadFailure(400, '目标目录不是安全的普通目录')
  }
}

function isCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code
}

/**
 * 保存一份 Markdown 并返回项目根相对路径。
 * 请求不能给出磁盘路径：groupId 只能是 ai-docs 或当前真实存在的 collection ID；
 * newGroup 则只能产生 docs/collections/ 下的一级目录。
 */
export function saveMarkdownUpload(
  root: string,
  fields: UploadFields,
  file: Express.Multer.File | undefined,
  options: UploadOptions = {},
): string {
  if (!file) throw new UploadFailure(400, '请选择一个 Markdown 文件')
  if (!validSegment(file.originalname) || !file.originalname.endsWith('.md')) {
    throw new UploadFailure(400, '源文件必须是 .md 文件')
  }
  if (!validSegment(fields.targetName) || !fields.targetName.endsWith('.md')) {
    throw new UploadFailure(400, '目标文件名必须是安全的 .md 文件名')
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadFailure(413, '文件不得超过 5 MiB')
  try {
    // fatal 模式拒绝损坏的 UTF-8；保存仍用原始 Buffer，避免改写 BOM 或换行。
    new TextDecoder('utf-8', { fatal: true }).decode(file.buffer)
  } catch {
    throw new UploadFailure(400, '文件内容不是有效的 UTF-8')
  }

  const hasNewGroup = fields.newGroup !== undefined
  if (hasNewGroup === (fields.groupId !== undefined)) {
    throw new UploadFailure(400, '请选择已有分组或填写一个新分组')
  }
  if (hasNewGroup && !validSegment(fields.newGroup)) {
    throw new UploadFailure(400, '新分组名称无效')
  }
  if (!hasNewGroup && typeof fields.groupId !== 'string') {
    throw new UploadFailure(400, '普通文档分组无效')
  }

  const docsRoot = join(root, 'docs')
  assertRealDirectory(docsRoot)
  let groupDir: string
  let relativeDir: string
  let createdGroup = false
  let createdCollectionsRoot = false
  let collectionsRoot: string | null = null

  if (fields.groupId === 'ai-docs') {
    groupDir = join(docsRoot, 'ai-docs')
    assertRealDirectory(groupDir)
    relativeDir = 'docs/ai-docs'
  } else {
    // collections 根目录只在真正新建分组时创建；选择已有组不应偷偷创建目录。
    collectionsRoot = join(docsRoot, 'collections')
    const collectionsExists = existsSync(collectionsRoot)
    if (!hasNewGroup && !collectionsExists) throw new UploadFailure(400, '所选普通文档分组不存在')
    if (collectionsExists) assertRealDirectory(collectionsRoot)
    const existingNames = collectionsExists
      ? readdirSync(collectionsRoot, { withFileTypes: true }).map((entry) => entry.name)
      : []

    if (hasNewGroup) {
      const name = fields.newGroup as string
      if (collisionKey(name) === collisionKey('AI 文章')
        || existingNames.some((existing) => collisionKey(existing) === collisionKey(name))) {
        throw new UploadFailure(409, '同名分组已存在，请选择已有分组或更换名称')
      }
      // 只有确认分组名称可用后才创建根目录；失败时也只清理本次创建的空目录。
      if (!collectionsExists) {
        mkdirSync(collectionsRoot)
        createdCollectionsRoot = true
      }
      groupDir = join(collectionsRoot, name)
      try {
        mkdirSync(groupDir)
        createdGroup = true
      } catch (error) {
        if (createdCollectionsRoot) {
          try { rmdirSync(collectionsRoot) } catch { /* 其他进程可能已在其中创建文件 */ }
        }
        if (isCode(error, 'EEXIST')) throw new UploadFailure(409, '同名分组已存在')
        throw error
      }
      relativeDir = `docs/collections/${name}`
    } else {
      const groupId = fields.groupId as string
      if (!groupId.startsWith('collection:')) throw new UploadFailure(400, '普通文档分组无效')
      const name = groupId.slice('collection:'.length)
      if (!validSegment(name) || !existingNames.includes(name)) {
        throw new UploadFailure(400, '所选普通文档分组不存在')
      }
      groupDir = join(collectionsRoot, name)
      assertRealDirectory(groupDir)
      relativeDir = `docs/collections/${name}`
    }
  }

  const targetName = fields.targetName as string
  const targetPath = join(groupDir, targetName)
  try {
    // 这里使用目录项而非仅文件列表检查，避免与已有目录或符号链接撞名。
    // 同步执行让同进程请求逐个检查；wx 仍负责跨进程的最后一道排他保障。
    if (readdirSync(groupDir).some((name) => collisionKey(name) === collisionKey(targetName))) {
      throw new UploadFailure(409, '同名文件已存在，请修改文件名')
    }
    // 只有排他创建成功后才登记所有权。若在创建前发生错误，就不能按路径删除，
    // 因为另一个进程可能已抢先创建了同名文件。
    const ownership: { identity: Pick<Stats, 'dev' | 'ino'> | null } = { identity: null }
    try {
      const markCreated = (identity: Stats = lstatSync(targetPath)) => {
        ownership.identity = { dev: identity.dev, ino: identity.ino }
      }
      const writeBytes = options.writeBytes ?? ((path: string, bytes: Buffer, mark: (identity?: Stats) => void) => {
        const handle = openSync(path, 'wx')
        try {
          mark(fstatSync(handle))
          writeFileSync(handle, bytes)
        } finally {
          closeSync(handle)
        }
      })
      writeBytes(targetPath, file.buffer, markCreated)
    } catch (error) {
      if (isCode(error, 'EEXIST')) throw new UploadFailure(409, '同名文件已存在，请修改文件名')
      // 文件名相同不足以证明所有权：仅在目录项仍指向本次创建的文件时清理。
      if (ownership.identity) {
        try {
          const current = lstatSync(targetPath)
          if (current.dev === ownership.identity.dev && current.ino === ownership.identity.ino) {
            rmSync(targetPath, { force: true })
          }
        } catch {
          // 清理失败保留原始错误，避免误删一个已被替换的路径。
        }
      }
      throw error
    }
    return `${relativeDir}/${targetName}`
  } finally {
    // 失败的新分组不应留下一个空分组；若写入成功，目录非空所以不会移除。
    if (createdGroup) {
      try {
        if (readdirSync(groupDir).length === 0) rmdirSync(groupDir)
      } catch {
        // 清理失败不覆盖原始上传错误，目录可由用户在项目中检查。
      }
    }
    if (createdCollectionsRoot && collectionsRoot) {
      try { rmdirSync(collectionsRoot) } catch { /* 非空目录保留，避免删除其他进程的文件 */ }
    }
  }
}
