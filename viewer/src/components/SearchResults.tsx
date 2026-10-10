/**
 * 全文搜索结果面板：文件卡片 + 命中行（关键词高亮）。
 */
import type { SearchResultItem } from '../../shared/types'

interface SearchResultsProps {
  query: string
  results: SearchResultItem[]
  onSelect: (path: string) => void
  onBack: () => void
}

export function SearchResults({ query, results, onSelect, onBack }: SearchResultsProps) {
  return (
    <div className="search-results">
      <div className="search-results-head">
        <span>
          「{query}」命中 {results.length} 个文件
        </span>
        <button type="button" className="ghost-btn" onClick={onBack}>
          返回目录
        </button>
      </div>
      {results.length === 0 && <div className="search-empty">没有找到匹配的文档</div>}
      {results.map((item) => (
        <button type="button" key={item.path} className="search-item" onClick={() => onSelect(item.path)}>
          <div className="search-item-title">{item.title}</div>
          <div className="search-item-path">{item.path}</div>
          {item.matches.map((m) => (
            <div className="search-line" key={m.line}>
              <span className="line-no">L{m.line}</span>
              <span className="line-text">
                <Highlight text={m.text} query={query} />
              </span>
            </div>
          ))}
        </button>
      ))}
    </div>
  )
}

/** 把命中行里的关键词包上 <mark>；大小写不敏感 */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.toLowerCase()
  if (!needle) return <>{text}</>

  const parts: Array<{ text: string; hit: boolean }> = []
  let rest = text
  let lower = text.toLowerCase()
  let idx = lower.indexOf(needle)
  while (idx !== -1) {
    parts.push({ text: rest.slice(0, idx), hit: false })
    parts.push({ text: rest.slice(idx, idx + needle.length), hit: true })
    rest = rest.slice(idx + needle.length)
    lower = rest.toLowerCase()
    idx = lower.indexOf(needle)
  }
  parts.push({ text: rest, hit: false })

  return (
    <>
      {parts.map((p, i) =>
        p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>,
      )}
    </>
  )
}
