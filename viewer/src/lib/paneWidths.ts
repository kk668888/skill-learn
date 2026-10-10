/**
 * 三栏拖拽尺寸的纯计算规则。
 * 与 styles.css 的 6px 分隔条、1100px 大纲断点和 760px 抽屉断点保持一致。
 */
export interface PaneWidths {
  sidebar: number
  toc: number
}

export type ResizablePane = keyof PaneWidths

export const DEFAULT_PANE_WIDTHS: PaneWidths = { sidebar: 300, toc: 230 }
export const PANE_MIN = { sidebar: 220, toc: 180 } as const
export const PANE_MAX = { sidebar: 480, toc: 420 } as const

const CENTER_MIN = 360
const HANDLE_WIDTH = 6
const TOC_BREAKPOINT = 1100

/** 限制当前面板宽度，同时为正文和可见的另一侧面板预留空间。 */
export function clampPaneWidth(
  pane: ResizablePane,
  desired: number,
  otherWidth: number,
  viewportWidth: number,
): number {
  const tocVisible = viewportWidth > TOC_BREAKPOINT
  const reserved = pane === 'sidebar'
    ? CENTER_MIN + HANDLE_WIDTH + (tocVisible ? otherWidth + HANDLE_WIDTH : 0)
    : CENTER_MIN + HANDLE_WIDTH * 2 + otherWidth
  const available = Math.min(PANE_MAX[pane], viewportWidth - reserved)
  return Math.max(PANE_MIN[pane], Math.min(desired, available))
}

/** 窗口缩小时依次收紧侧栏和大纲，避免两者一起挤掉正文。 */
export function normalizePaneWidths(widths: PaneWidths, viewportWidth: number): PaneWidths {
  const sidebar = clampPaneWidth('sidebar', widths.sidebar, widths.toc, viewportWidth)
  return {
    sidebar,
    toc: viewportWidth > TOC_BREAKPOINT
      ? clampPaneWidth('toc', widths.toc, sidebar, viewportWidth)
      : widths.toc,
  }
}
