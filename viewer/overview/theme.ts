/**
 * 总览页主题状态：白天（light，默认）与夜间（dark）。
 *
 * 设计要点：
 * - 主题值落在 <html data-theme="..."> 上，CSS 变量随属性切换（见 index.css）
 * - 只有 'dark' 是合法存储值，其余一律回退白天——避免历史脏数据把用户锁在暗色里
 * - localStorage 访问必须 try/catch：隐私模式等场景下读写会直接抛错，不能让主题逻辑弄崩页面
 */
export type Theme = 'light' | 'dark'

/** localStorage 键名，需与 index.html 中的防闪烁内联脚本保持一致 */
export const THEME_STORAGE_KEY = 'sl-overview-theme'

export const DEFAULT_THEME: Theme = 'light'

/**
 * 读取持久化的主题偏好；无记录或值非法时回退白天。
 * 注意：storage 参数必须可选、localStorage 的属性访问必须发生在 try 内——
 * 隐私模式下访问 window.localStorage 属性 getter 本身就会抛 SecurityError，
 * 写成默认参数 `= localStorage` 会在 try 外求值，直接击穿兜底逻辑。
 */
export function readStoredTheme(storage?: Pick<Storage, 'getItem'>): Theme {
  try {
    const raw = (storage ?? localStorage).getItem(THEME_STORAGE_KEY)
    return raw === 'dark' ? 'dark' : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** 把主题应用到文档根元素，驱动 CSS 变量整体切换 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/** 应用启动时调用：恢复上次偏好并落到 DOM 上，返回实际生效的主题 */
export function initTheme(): Theme {
  const theme = readStoredTheme()
  applyTheme(theme)
  return theme
}

/** 持久化主题偏好；写入失败（配额/隐私模式）静默忽略，不影响当前会话 */
export function persistTheme(theme: Theme, storage?: Pick<Storage, 'setItem'>): void {
  try {
    ;(storage ?? localStorage).setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // 持久化不可用时保持内存态即可
  }
}

/** 求另一主题：light ↔ dark */
export function oppositeTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light'
}
