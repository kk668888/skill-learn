/**
 * 阅读风格偏好测试：四种预设必须稳定恢复，存储故障不得阻断阅读。
 * 使用最小存储替身只模拟浏览器读写边界，避免把 React 组件实现写进断言。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_READING_THEME,
  READING_THEMES,
  readReadingTheme,
  writeReadingTheme,
} from '../src/lib/readingTheme'

describe('阅读风格偏好', () => {
  it('无保存值、未知值和读入异常时回退到经典文档', () => {
    expect(readReadingTheme(null)).toBe(DEFAULT_READING_THEME)
    expect(readReadingTheme({ getItem: () => null })).toBe('classic')
    expect(readReadingTheme({ getItem: () => 'unknown' })).toBe('classic')
    expect(readReadingTheme({ getItem: () => { throw new Error('blocked') } })).toBe('classic')
  })

  it('四种内置风格均可从本地偏好恢复', () => {
    expect(READING_THEMES.map((theme) => theme.id)).toEqual(['classic', 'paper', 'minimal', 'editorial'])
    for (const theme of READING_THEMES) {
      expect(readReadingTheme({ getItem: () => theme.id })).toBe(theme.id)
    }
  })

  it('以独立存储键保存选择，写入被拒绝时安静降级', () => {
    const setItem = vi.fn()
    expect(writeReadingTheme({ setItem }, 'paper')).toBe(true)
    expect(setItem).toHaveBeenCalledWith('viewer-reading-theme', 'paper')
    expect(writeReadingTheme(null, 'paper')).toBe(false)
    expect(writeReadingTheme({ setItem: () => { throw new Error('blocked') } }, 'paper')).toBe(false)
  })
})
