/**
 * 左侧边栏：搜索输入 + 目录树/过滤结果/搜索结果三态切换 + 主题切换。
 *
 * 输入框的两种意图（共识 Q9）：
 * - 输入即过滤：按标题/路径匹配，树切换成扁平匹配列表
 * - 回车全文搜索：调 /api/search，结果面板替代树；Esc 或「返回目录」退出搜索态
 */
import { useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { TreeRoot, SearchResultItem } from '../../shared/types'
import { TreeView } from './TreeView'
import { SearchResults } from './SearchResults'
import { SidebarMenu } from './SidebarMenu'
import { filterFiles } from '../lib/filter'
import { cx } from '../lib/cx'

interface SidebarProps {
  tree: TreeRoot
  currentPath: string | null
  /** 当前文档所属套件名，透传给目录树的套件行选中态 */
  activeSuiteTitle?: string
  expanded: Set<string>
  onSelect: (path: string) => void
  onToggleNode: (id: string) => void
  /** null 表示不在全文搜索态 */
  searchResults: SearchResultItem[] | null
  searchQuery: string
  searching: boolean
  searchError: string | null
  onSearch: (query: string) => void
  onClearSearch: () => void
  isDark: boolean
  onToggleTheme: () => void
  onOpenUpload: () => void
  uploadTriggerRef: RefObject<HTMLButtonElement>
  onDownload: () => void
  downloading: boolean
  downloadError: string | null
}

export function Sidebar({
  tree,
  currentPath,
  activeSuiteTitle,
  expanded,
  onSelect,
  onToggleNode,
  searchResults,
  searchQuery,
  searching,
  searchError,
  onSearch,
  onClearSearch,
  isDark,
  onToggleTheme,
  onOpenUpload,
  uploadTriggerRef,
  onDownload,
  downloading,
  downloadError,
}: SidebarProps) {
  // 过滤文本只影响侧边栏展示，留在组件内部即可
  const [filterText, setFilterText] = useState('')
  const matches = useMemo(() => filterFiles(tree, filterText), [tree, filterText])
  const filtering = filterText.trim() !== ''

  return (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="brand-name">skill-learn</span>
        <a className="overview-link" href="/">返回总览</a>
      </div>
      <div className="sidebar-head">
        <input
          className="search-input"
          type="text"
          placeholder="输入过滤目录，回车全文搜索"
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value)
            // 重新打字意味着回到过滤模式，退出上一次的搜索结果
            if (searchResults !== null) onClearSearch()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearch(filterText.trim())
            } else if (e.key === 'Escape') {
              setFilterText('')
              onClearSearch()
            }
          }}
        />
      </div>

      <div className="sidebar-body">
        {searchError && <div className="sidebar-error">{searchError}</div>}

        {searchResults !== null ? (
          searching ? (
            <div className="sidebar-loading">搜索中…</div>
          ) : (
            <SearchResults
              query={searchQuery}
              results={searchResults}
              onSelect={onSelect}
              onBack={onClearSearch}
            />
          )
        ) : filtering ? (
          <div className="tree">
            {matches.length === 0 && <div className="sidebar-loading">没有匹配的文件</div>}
            {matches.map((f) => (
              <button
                type="button"
                key={f.path}
                className={cx('tree-item', 'tree-file', f.path === currentPath && 'active')}
                title={f.path}
                onClick={() => onSelect(f.path)}
              >
                {f.title}
              </button>
            ))}
          </div>
        ) : (
          <TreeView
            nodes={tree}
            currentPath={currentPath}
            activeSuiteTitle={activeSuiteTitle}
            expanded={expanded}
            onSelect={onSelect}
            onToggle={onToggleNode}
          />
        )}
      </div>

      <div className="sidebar-foot">
        <SidebarMenu
          uploadTriggerRef={uploadTriggerRef}
          onOpenUpload={onOpenUpload}
          onDownload={onDownload}
          downloading={downloading}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
        />
        {downloadError && <div className="sidebar-error download-error" role="alert">{downloadError}</div>}
      </div>
    </div>
  )
}
