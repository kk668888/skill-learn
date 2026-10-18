/**
 * 阅读风格是跨文档的会话状态：App 只创建一次，文档切换不会重置选择。
 * 持久化失败时 React 状态继续生效，刷新后的降级由 readReadingTheme 负责。
 */
import { useCallback, useEffect, useState } from 'react'
import {
  readReadingTheme,
  writeReadingTheme,
} from '../lib/readingTheme'
import type { ReadingTheme } from '../lib/readingTheme'

/** 访问 localStorage 属性本身也可能抛错，因此必须在 try 内取得引用。 */
function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function useReadingTheme(): [ReadingTheme, (next: ReadingTheme) => void] {
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>(() => readReadingTheme(browserStorage()))

  useEffect(() => {
    writeReadingTheme(browserStorage(), readingTheme)
  }, [readingTheme])

  const chooseReadingTheme = useCallback((next: ReadingTheme) => {
    setReadingTheme(next)
  }, [])

  return [readingTheme, chooseReadingTheme]
}
