/**
 * 右侧文档大纲（TOC）：
 * - 标题列表从 markdown 原文提取，锚点 id 与 rehype-slug 保持一致
 * - IntersectionObserver 跟踪当前滚动位置，高亮所在小节
 * - 点击平滑滚动到对应标题（不用 href 锚点，避免污染 hash 路由）
 */
import { useEffect, useMemo, useState } from 'react'
import { extractHeadings } from '../lib/headings'
import { cx } from '../lib/cx'

interface TocProps {
  content: string
}

export function Toc({ content }: TocProps) {
  const headings = useMemo(() => extractHeadings(content), [content])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    setActiveId(null)
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 视口顶部区域命中的第一个标题视为"当前小节"
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      // 根元素上移一点、底部收窄，让"当前标题"更贴近阅读位置
      { rootMargin: '0px 0px -75% 0px', threshold: 0 },
    )

    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) {
    return <div className="toc toc-empty">本文档没有可跳转的标题</div>
  }

  const scrollTo = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="toc" aria-label="文档大纲">
      <div className="toc-title">大纲</div>
      {headings.map((h) => (
        <button
          type="button"
          key={h.id}
          className={cx('toc-item', `toc-depth-${h.depth}`, activeId === h.id && 'active')}
          style={{ paddingLeft: (h.depth - 1) * 12 + 12 }}
          onClick={() => scrollTo(h.id)}
          title={h.text}
        >
          {h.text}
        </button>
      ))}
    </nav>
  )
}
