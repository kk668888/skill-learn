/**
 * 两侧面板的可访问分隔条。
 * Pointer Events 同时覆盖鼠标、触控和笔；键盘用方向键按 10px 调整。
 */
import { useEffect, useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { ResizablePane } from '../lib/paneWidths'

interface PaneResizeHandleProps {
  pane: ResizablePane
  width: number
  min: number
  max: number
  onResize: (pane: ResizablePane, width: number) => void
}

export function PaneResizeHandle({ pane, width, min, max, onResize }: PaneResizeHandleProps) {
  const start = useRef<{ x: number; width: number } | null>(null)
  const isSidebar = pane === 'sidebar'

  // 组件卸载或响应式布局切换时，确保拖动光标不会遗留在页面上。
  useEffect(() => () => document.body.classList.remove('resizing-panes'), [])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    start.current = { x: event.clientX, width }
    document.body.classList.add('resizing-panes')
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    const delta = event.clientX - start.current.x
    onResize(pane, start.current.width + (isSidebar ? delta : -delta))
  }

  const stopDragging = () => {
    start.current = null
    document.body.classList.remove('resizing-panes')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number
    if (event.key === 'Home') next = min
    else if (event.key === 'End') next = max
    else if (event.key === 'ArrowLeft') next = width + (isSidebar ? -10 : 10)
    else if (event.key === 'ArrowRight') next = width + (isSidebar ? 10 : -10)
    else return
    event.preventDefault()
    onResize(pane, next)
  }

  return (
    <div
      className={`pane-resize-handle pane-resize-${pane}`}
      role="separator"
      tabIndex={0}
      aria-label={isSidebar ? '调整左侧目录宽度' : '调整右侧大纲宽度'}
      aria-orientation="vertical"
      aria-controls={isSidebar ? 'viewer-sidebar' : 'viewer-toc'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(width)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={handleKeyDown}
    />
  )
}
