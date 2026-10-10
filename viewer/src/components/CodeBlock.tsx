/**
 * Markdown 围栏代码块：只在原始 pre 外增加工具栏。
 * rehype-highlight 生成的 code/span 子树保持原样，避免破坏语法着色。
 */
import { isValidElement, useEffect, useRef, useState } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type CopyState = 'idle' | 'success' | 'error'

/** 从 code 的 className 读取围栏语言；highlight.js 也使用 language-* 约定。 */
function getLanguage(children: ReactNode): string {
  if (!isValidElement<{ className?: string }>(children)) return 'text'
  return children.props.className?.match(/(?:^|\s)language-([\w+#.-]+)/)?.[1] ?? 'text'
}

export function CodeBlock({ children, node: _node, ...preProps }: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) {
  const codeRef = useRef<HTMLPreElement>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const copyCode = async () => {
    try {
      // textContent 取的是原代码文本，不包含工具栏，也不包含高亮 span 的标记。
      if (!navigator.clipboard?.writeText) throw new Error('剪贴板不可用')
      await navigator.clipboard.writeText(codeRef.current?.textContent ?? '')
      setCopyState('success')
    } catch {
      setCopyState('error')
    }
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopyState('idle'), 1800)
  }

  const copyLabel = copyState === 'success' ? '已复制' : copyState === 'error' ? '复制失败' : '复制'

  return (
    <figure className="code-block">
      <figcaption className="code-block-toolbar">
        <span className="code-language">{getLanguage(children)}</span>
        <button type="button" className="code-copy" onClick={copyCode} aria-live="polite">
          {copyLabel}
        </button>
      </figcaption>
      <pre {...preProps} ref={codeRef}>{children}</pre>
    </figure>
  )
}
