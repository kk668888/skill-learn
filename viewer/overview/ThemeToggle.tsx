import { Moon, Sun } from 'lucide-react'
import { oppositeTheme, type Theme } from './theme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

/**
 * 顶栏右侧的主题切换按钮。
 * 图标与文案指向「点击后将进入的主题」：白天显示月亮（切往夜间），夜间显示太阳（切往白天）。
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  // 取反逻辑复用 theme.ts，light↔dark 不变量只在一处定义
  const nextTheme = oppositeTheme(theme)
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`切换到${nextTheme === 'light' ? '白天' : '夜间'}主题`}
      title={`切换到${nextTheme === 'light' ? '白天' : '夜间'}主题`}
      className="inline-flex size-8 items-center justify-center rounded-md border border-line text-fg-muted transition hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  )
}
