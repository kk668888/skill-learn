/**
 * 目录扫描器：把项目里的 md 文件变成「正斜杠相对路径」清单。
 *
 * 纯同步实现——365 个小文件的目录遍历在毫秒级，
 * 引入异步只会徒增复杂度（约定大于配置，最小依赖）。
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { INCLUDE_DIRS, EXCLUDE_DIR_NAMES } from './config'

export interface ScanOptions {
  /** 递归扫描的目录（相对 root） */
  includeDirs: string[]
  /** 跳过的目录名（任意层级） */
  excludeDirNames: string[]
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  includeDirs: INCLUDE_DIRS,
  excludeDirNames: EXCLUDE_DIR_NAMES,
}

/**
 * 扫描项目，返回排序确定的相对路径数组。
 * 路径统一用正斜杠分隔（与前端共享的 id 约定一致），如
 * "skills/superpowers/brainstorming/SKILL.md"。
 */
export function scanProject(root: string, options: ScanOptions = DEFAULT_SCAN_OPTIONS): string[] {
  const found: string[] = []

  // 1. 递归扫描各 include 目录（相对路径要把目录自身的前缀带上，如 skills/、docs/skills/）
  for (const dir of options.includeDirs) {
    walk(join(root, dir), dir.split('/'))
  }

  // 2. 根级 md：只看根下的文件，不递归（viewer/、node_modules/ 等目录天然不会进来）
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(entry.name)
    }
  }

  // 排序保证结果确定，方便测试与前端 diff
  return found.sort()

  /** 深度优先遍历一个目录；目录不存在时静默跳过 */
  function walk(absDir: string, relSegs: string[]): void {
    let entries
    try {
      entries = readdirSync(absDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      // 点开头的隐藏文件/目录一律跳过（.claude、.agents 等）
      if (entry.name.startsWith('.')) continue
      if (entry.isDirectory()) {
        if (options.excludeDirNames.includes(entry.name)) continue
        walk(join(absDir, entry.name), [...relSegs, entry.name])
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        found.push([...relSegs, entry.name].join('/'))
      }
    }
  }
}
