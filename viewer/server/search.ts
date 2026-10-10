/**
 * 全文搜索（纯函数）。
 *
 * 策略：逐行子串匹配，英文统一转小写比较（中文不受影响）。
 * 365 个小文件全量在内存里跑是毫秒级，不需要倒排索引。
 */
import type { SearchResultItem, SearchMatch } from '../shared/types'

export interface SearchEntry {
  path: string
  /** 展示标题（由 API 层从文件索引补全） */
  title: string
  skillId?: string
  content: string
}

export interface SearchOptions {
  /** 最多返回多少个文件 */
  maxFiles?: number
  /** 每个文件最多保留几条命中 */
  maxMatchesPerFile?: number
}

const DEFAULTS = { maxFiles: 30, maxMatchesPerFile: 3 }
/** 超长行截断上限（字符数），避免一行把界面撑爆 */
const MAX_LINE_LENGTH = 160

export function searchDocs(
  entries: SearchEntry[],
  rawQuery: string,
  options: SearchOptions = {},
): SearchResultItem[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []

  const { maxFiles, maxMatchesPerFile } = { ...DEFAULTS, ...options }
  const results: SearchResultItem[] = []

  // 拷贝后按 path 排序，保证结果顺序与截断都确定
  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path))

  for (const entry of sorted) {
    if (results.length >= maxFiles) break

    const matches: SearchMatch[] = []
    const lines = entry.content.split('\n')
    for (let i = 0; i < lines.length && matches.length < maxMatchesPerFile; i++) {
      if (lines[i]!.toLowerCase().includes(query)) {
        matches.push({ line: i + 1, text: truncateLine(lines[i]!.trim()) })
      }
    }
    if (matches.length > 0) {
      results.push({ path: entry.path, title: entry.title, skillId: entry.skillId, matches })
    }
  }
  return results
}

/** 超过上限的行从中间截断？不——保留行首更有信息量，尾部加省略号 */
function truncateLine(line: string): string {
  if (line.length <= MAX_LINE_LENGTH) return line
  return line.slice(0, MAX_LINE_LENGTH - 1) + '…'
}
