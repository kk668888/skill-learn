import { describe, expect, it } from 'vitest'
import { clampPaneWidth, normalizePaneWidths } from '../src/lib/paneWidths'

describe('三栏宽度边界', () => {
  it('限制两侧面板各自的最小和最大宽度', () => {
    expect(clampPaneWidth('sidebar', 100, 230, 1400)).toBe(220)
    expect(clampPaneWidth('sidebar', 600, 230, 1400)).toBe(480)
    expect(clampPaneWidth('toc', 100, 300, 1400)).toBe(180)
    expect(clampPaneWidth('toc', 600, 300, 1400)).toBe(420)
  })

  it('窄窗口下给中间阅读区保留至少 360 像素', () => {
    expect(clampPaneWidth('sidebar', 480, 400, 1101)).toBe(329)
    expect(clampPaneWidth('toc', 420, 480, 1101)).toBe(249)
  })

  it('大纲隐藏后不再为其预留宽度，并在窗口缩小时归一化旧设置', () => {
    expect(clampPaneWidth('sidebar', 480, 420, 900)).toBe(480)
    expect(normalizePaneWidths({ sidebar: 480, toc: 420 }, 1101)).toEqual({ sidebar: 309, toc: 420 })
  })
})
