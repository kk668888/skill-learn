/**
 * 侧栏底部的「操作」下拉菜单：上传、下载全部、主题切换三个入口。
 *
 * 采用 disclosure 模式（aria-expanded + 普通按钮项）而不是 ARIA menu：
 * 里面是三个独立动作按钮，不构成需要方向键语义的菜单栏。
 * 打开时向上弹出（菜单位于侧栏底部），点外部、Esc、选中动作都会收起。
 */
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { cx } from '../lib/cx'

interface SidebarMenuProps {
  /** 上传对话框关闭后焦点归还的目标，挂在菜单触发按钮上 */
  uploadTriggerRef: RefObject<HTMLButtonElement>
  onOpenUpload: () => void
  onDownload: () => void
  downloading: boolean
  isDark: boolean
  onToggleTheme: () => void
}

export function SidebarMenu({
  uploadTriggerRef,
  onOpenUpload,
  onDownload,
  downloading,
  isDark,
  onToggleTheme,
}: SidebarMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击菜单外部任意位置时收起；pointerdown 比 click 更早，避免外部按钮
  // 的 click 与内部收起竞态造成“点一次开关两次”。
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /** 选中动作后收起并把焦点还给触发按钮，方便键盘用户继续操作 */
  const runAndClose = (action: () => void) => {
    setOpen(false)
    action()
    uploadTriggerRef.current?.focus()
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    // 方向键下打开菜单并落焦到第一个动作，等价于菜单栏习惯
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      containerRef.current?.querySelector<HTMLButtonElement>('.sidebar-menu-item')?.focus()
    }
  }

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      uploadTriggerRef.current?.focus()
      return
    }
    // 在动作之间上下循环移动焦点
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('.sidebar-menu-item') ?? [],
    )
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowDown' ? index + 1 : index - 1
    items[(next + items.length) % items.length]?.focus()
  }

  return (
    <div className={cx('sidebar-menu', open && 'open')} ref={containerRef}>
      <button
        ref={uploadTriggerRef}
        type="button"
        className="sidebar-menu-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKeyDown}
      >
        操作
        <span className="sidebar-menu-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="sidebar-menu-list" onKeyDown={handleListKeyDown}>
          <button type="button" className="sidebar-menu-item" onClick={() => runAndClose(onOpenUpload)}>
            上传 Markdown
          </button>
          {/* 下载始终请求服务端的完整扫描清单，不读取当前过滤或搜索结果。 */}
          <button
            type="button"
            className="sidebar-menu-item"
            aria-label="下载全部 Markdown"
            disabled={downloading}
            onClick={() => runAndClose(onDownload)}
          >
            {downloading ? '正在打包…' : '下载全部 Markdown'}
          </button>
          <button type="button" className="sidebar-menu-item" onClick={() => runAndClose(onToggleTheme)}>
            {isDark ? '切换到浅色主题' : '切换到深色主题'}
          </button>
        </div>
      )}
    </div>
  )
}
