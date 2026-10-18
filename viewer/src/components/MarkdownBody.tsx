/**
 * Markdown 渲染体：GFM（表格/任务列表/删除线）+ 代码高亮 + 标题锚点。
 *
 * 链接分三类处理：
 * 1. 外部链接（http/https/mailto）→ 新标签页打开
 * 2. 页内锚点（#xxx）→ 交给浏览器原生跳转（rehype-slug 已生成 id）
 * 3. 相对 md 链接 → 相对当前文档路径解析；解析结果在扫描集合内则站内跳转，
 *    否则降级为不可点的提示文本（避免跳出去 404）
 */
import { memo } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import type { Components } from 'react-markdown'
import { CodeBlock } from './CodeBlock'

interface MarkdownBodyProps {
  content: string
  /** 当前文档的相对路径，用于解析文档里的相对链接 */
  filePath: string
  /** 扫描集合内所有文件路径，判断相对链接能否站内跳转 */
  knownPaths: Set<string>
  onNavigate: (path: string) => void
}

/** 把相对链接解析成项目根相对路径：处理 ./、../ 和锚点后缀 */
function resolveRelative(base: string, href: string): string {
  const [filePart, anchor = ''] = href.split('#')
  const stack = base.split('/').slice(0, -1) // 最后一截是文件名，去掉
  for (const seg of decodeURIComponent(filePart ?? '').split('/')) {
    if (seg === '..') stack.pop()
    else if (seg !== '.' && seg !== '') stack.push(seg)
  }
  return anchor ? `${stack.join('/')}#${anchor}` : stack.join('/')
}

/** 标题按钮直接滚动 DOM，避免改写应用用作路由的 URL hash。 */
function Heading({ level, children, node: _node, ...props }: ComponentPropsWithoutRef<'h1'> & { level: 1 | 2 | 3 | 4; node?: unknown }) {
  const Tag = `h${level}` as const
  const jump = (event: React.MouseEvent<HTMLButtonElement>) => {
    const heading = event.currentTarget.parentElement
    if (!heading) return
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    heading.classList.remove('heading-flash')
    // 重启动画，使连续点击同一锚点也有可见反馈。
    void heading.offsetWidth
    heading.classList.add('heading-flash')
  }
  return (
    <Tag {...props}>
      {children}
      <button type="button" className="heading-anchor" aria-label="跳转到此标题" onClick={jump}>#</button>
    </Tag>
  )
}

export const MarkdownBody = memo(function MarkdownBody({
  content,
  filePath,
  knownPaths,
  onNavigate,
}: MarkdownBodyProps) {
  const components: Components = {
    pre: CodeBlock,
    h1: (props) => <Heading level={1} {...props} />,
    h2: (props) => <Heading level={2} {...props} />,
    h3: (props) => <Heading level={3} {...props} />,
    h4: (props) => <Heading level={4} {...props} />,
    a({ href, children }) {
      const target = href ?? ''
      if (/^(https?:|mailto:)/i.test(target)) {
        return (
          <a href={target} target="_blank" rel="noreferrer">
            {children}
          </a>
        )
      }
      if (target.startsWith('#')) {
        return <a href={target}>{children}</a>
      }
      // 相对链接：解析后去掉锚点再查集合
      const resolved = resolveRelative(filePath, target)
      const purePath = resolved.split('#')[0]!
      if (knownPaths.has(purePath)) {
        return (
          <a
            href={`#/?path=${encodeURIComponent(purePath)}`}
            className="internal-link"
            onClick={(e) => {
              e.preventDefault()
              onNavigate(purePath)
            }}
          >
            {children}
          </a>
        )
      }
      return (
        <span className="dead-link" title="链接目标不在扫描范围内">
          {children}
        </span>
      )
    },
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
