/** 最近打开只保存路径，文档标题始终从最新目录树解析。 */
const KEY = 'viewer-recent'
const LIMIT = 10

export function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((path): path is string => typeof path === 'string').slice(0, LIMIT) : []
  } catch {
    // 浏览器禁用存储或旧数据损坏时，欢迎页仍正常显示。
    return []
  }
}

export function recordRecent(path: string): string[] {
  const next = [path, ...readRecent().filter((item) => item !== path)].slice(0, LIMIT)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    // 写入被拒绝时不抛错，也不展示无法持久化的假记录。
    return []
  }
}
