/**
 * 文档主视图：面包屑 + 源码/中文版互跳 + 正文渲染。
 */
import { useMemo } from 'react'
import type { DocResponse, TreeRoot } from '../../shared/types'
import { collectFiles, findFileContext } from '../lib/filter'
import { MarkdownBody } from './MarkdownBody'
import { DocHeader } from './DocHeader'
import { ReadingProgress } from './ReadingProgress'
import type { ReadingTheme } from '../lib/readingTheme'

interface DocViewProps {
  doc: DocResponse
  tree: TreeRoot
  onNavigate: (path: string) => void
  readingTheme: ReadingTheme
  onReadingThemeChange: (theme: ReadingTheme) => void
}

export function DocView({ doc, tree, onNavigate, readingTheme, onReadingThemeChange }: DocViewProps) {
  // 当前文件在树里的位置（套件/技能上下文）
  const context = useMemo(() => findFileContext(tree, doc.path), [tree, doc.path])

  // 互跳链接：同一技能下的 中文版 / 详细设计讲解 / 源码
  const crossLinks = useMemo(() => {
    if (!context?.skillNode) return []
    return collectFiles(context.skillNode.children).filter(
      (f) => f.role === 'zh' || f.role === 'design' || f.role === 'source',
    )
  }, [context])

  // 扫描集合路径表，供正文里的相对链接判断能否站内跳转
  const knownPaths = useMemo(() => new Set(collectFiles(tree).map((f) => f.path)), [tree])

  return (
    <article className="doc">
      <ReadingProgress docPath={doc.path} readingTheme={readingTheme} />
      <DocHeader doc={doc} context={context} crossLinks={crossLinks} onNavigate={onNavigate}
        readingTheme={readingTheme} onReadingThemeChange={onReadingThemeChange} />
      {/* 正文列与通栏文档头分离：头部横跨整个中栏，正文保持阅读度量。 */}
      <div className="doc-body">
        <MarkdownBody
          content={doc.content}
          filePath={doc.path}
          knownPaths={knownPaths}
          onNavigate={onNavigate}
        />
      </div>
    </article>
  )
}
