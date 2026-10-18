/**
 * 四种阅读风格的唯一目录。稳定 ID 用于 CSS 属性和本地偏好；中文名称只用于界面。
 * 明暗模式使用原有 viewer-theme 键，两类偏好各自负责一个维度，避免迁移旧数据。
 */
export const READING_THEMES = [
  { id: 'classic', label: '经典文档' },
  { id: 'paper', label: '纸张阅读' },
  { id: 'minimal', label: '简洁笔记' },
  { id: 'editorial', label: '精致文章' },
] as const

export type ReadingTheme = (typeof READING_THEMES)[number]['id']

export const DEFAULT_READING_THEME: ReadingTheme = 'classic'
export const READING_THEME_STORAGE_KEY = 'viewer-reading-theme'

/**
 * 只接受内置 ID，防止旧版本或手工修改的任意字符串进入 data-reading-theme。
 * 入参保持 unknown，读取本地存储和界面事件时都能经过同一条校验路径。
 */
export function isReadingTheme(value: unknown): value is ReadingTheme {
  return READING_THEMES.some((theme) => theme.id === value)
}

/**
 * 读偏好时捕获安全策略、私密模式或损坏实现产生的异常。
 * storage 为 null 表示浏览器根本不提供存储，直接使用默认风格。
 */
export function readReadingTheme(storage: Pick<Storage, 'getItem'> | null): ReadingTheme {
  try {
    const stored = storage?.getItem(READING_THEME_STORAGE_KEY)
    return isReadingTheme(stored) ? stored : DEFAULT_READING_THEME
  } catch {
    return DEFAULT_READING_THEME
  }
}

/** 写入失败只影响下次启动的恢复，不能撤销当前会话中的选择。 */
export function writeReadingTheme(storage: Pick<Storage, 'setItem'> | null, theme: ReadingTheme): boolean {
  try {
    if (!storage) return false
    storage.setItem(READING_THEME_STORAGE_KEY, theme)
    return true
  } catch {
    return false
  }
}
