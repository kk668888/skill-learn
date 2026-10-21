/** 文档标题区：树上下文、角色与兄弟文档互跳都由已加载数据计算。 */
import type { DocResponse, FileNode } from '../../shared/types'
import type { FileContext } from '../lib/filter'
import { extractHeadings } from '../lib/headings'
import { isReadingTheme, READING_THEMES } from '../lib/readingTheme'
import type { ReadingTheme } from '../lib/readingTheme'
import { suiteKey } from '../lib/suiteTheme'

interface DocHeaderProps {
  doc: DocResponse
  context?: FileContext
  crossLinks: FileNode[]
  onNavigate: (path: string) => void
  readingTheme: ReadingTheme
  onReadingThemeChange: (theme: ReadingTheme) => void
}

const roleNames = { zh: '中文版', design: '详细设计讲解', source: '源码' } as const

export function DocHeader({ doc, context, crossLinks, onNavigate, readingTheme, onReadingThemeChange }: DocHeaderProps) {
  const role = context?.node.role
  const badge = role && role in roleNames ? roleNames[role as keyof typeof roleNames] : null
  const headingCount = extractHeadings(doc.content).length

  return (
    <header className="doc-header" data-suite={suiteKey(context?.suite)}>
      <div className="doc-header-top">
        <div className="doc-breadcrumb" aria-label="文档位置">
          {context?.suite && <span className="crumb">{context.suite}</span>}
          {context?.skill && <span className="crumb-sep">›</span>}
          {context?.skill && <span className="crumb">{context.skill}</span>}
          {(context?.suite || context?.skill) && <span className="crumb-sep">›</span>}
          <span className="crumb crumb-current">{context?.node.title ?? doc.title}</span>
        </div>
        {crossLinks.length > 0 && (
          <nav className="cross-links" aria-label="文档互跳">
            {crossLinks.map((file) => (
              <button type="button" key={file.path}
                className={file.path === doc.path ? 'cross-link current' : 'cross-link'}
                aria-current={file.path === doc.path ? 'page' : undefined}
                onClick={() => onNavigate(file.path)}>
                {roleNames[file.role as keyof typeof roleNames] ?? file.title}
              </button>
            ))}
          </nav>
        )}
        <div className="reading-theme-control">
          <label htmlFor="reading-theme-select">阅读样式</label>
          <select id="reading-theme-select" value={readingTheme}
            onChange={(event) => {
              // 表单值属于外部输入，先核对内置 ID，再交给持久化状态。
              if (isReadingTheme(event.target.value)) onReadingThemeChange(event.target.value)
            }}>
            {READING_THEMES.map((theme) => (
              <option value={theme.id} key={theme.id}>{theme.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="doc-title-line">
        <h1>{context?.node.title ?? doc.title}</h1>
        {badge && <span className={`doc-role doc-role-${role}`}>{badge}</span>}
      </div>
      <div className="doc-meta">
        <span>{doc.content.length.toLocaleString('zh-CN')} 字符</span>
        <span>{headingCount} 个标题</span>
        <span className="doc-meta-path" title={doc.path}>{doc.path}</span>
      </div>
    </header>
  )
}
