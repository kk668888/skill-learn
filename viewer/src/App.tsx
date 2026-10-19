/**
 * 应用骨架：三栏布局（侧边栏 / 正文 / 大纲）+ 全局状态编排。
 *
 * 状态分工：
 * - 树：挂载时加载；上传成功后立即重读磁盘目录并保留展开状态
 * - 当前文档：跟随 hash 路由，切换时请求 /api/doc（带取消，防快速切换时的竞态）
 * - 搜索：App 持有结果，侧边栏负责输入与展示
 * - 展开状态：App 持有，打开文档时自动展开其祖先链
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { TreeRoot, DocResponse, SearchResultItem, UploadTarget } from '../shared/types'
import { fetchTree, fetchDoc, fetchSearch, uploadMarkdown } from './api/client'
import { useTheme } from './hooks/useTheme'
import { useReadingTheme } from './hooks/useReadingTheme'
import { useHashRoute } from './hooks/useHashRoute'
import { collectAncestorIds } from './lib/filter'
import { Sidebar } from './components/Sidebar'
import { DocView } from './components/DocView'
import { Toc } from './components/Toc'
import { cx } from './lib/cx'
import { WelcomePanel } from './components/WelcomePanel'
import { readRecent, recordRecent } from './lib/recent'
import { PaneResizeHandle } from './components/PaneResizeHandle'
import { UploadDialog } from './components/UploadDialog'
import {
  clampPaneWidth,
  DEFAULT_PANE_WIDTHS,
  normalizePaneWidths,
  PANE_MIN,
} from './lib/paneWidths'
import type { PaneWidths, ResizablePane } from './lib/paneWidths'

const PANE_STORAGE_KEY = 'viewer-pane-widths'

/** 仅接受有限数字，忽略损坏或旧格式的本地设置。 */
function readPaneWidths(): PaneWidths {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PANE_STORAGE_KEY) ?? 'null')
    if (saved && typeof saved === 'object' && 'sidebar' in saved && 'toc' in saved
      && typeof saved.sidebar === 'number' && Number.isFinite(saved.sidebar)
      && typeof saved.toc === 'number' && Number.isFinite(saved.toc)) {
      return { sidebar: saved.sidebar, toc: saved.toc }
    }
  } catch {
    // 私密模式禁用存储时仍可拖拽，本次会话内的状态由 React 保留。
  }
  return DEFAULT_PANE_WIDTHS
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  // 阅读风格的状态独立于明暗模式，放在 App 才能跨文档保持选择。
  const [readingTheme, chooseReadingTheme] = useReadingTheme()
  const [currentPath, navigate] = useHashRoute()

  // ---------- 三栏宽度 ----------
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const [paneWidths, setPaneWidths] = useState(readPaneWidths)
  const visibleWidths = normalizePaneWidths(paneWidths, viewportWidth)

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    // 拖动过程中只更新 React 状态；停手片刻后再持久化，避免频繁同步写入。
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(PANE_STORAGE_KEY, JSON.stringify(visibleWidths)) } catch { /* 存储不可用时保持当前会话可用 */ }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [visibleWidths.sidebar, visibleWidths.toc])

  const handlePaneResize = useCallback((pane: ResizablePane, desired: number) => {
    setPaneWidths((previous) => {
      const current = normalizePaneWidths(previous, viewportWidth)
      const other = pane === 'sidebar' ? current.toc : current.sidebar
      return { ...current, [pane]: clampPaneWidth(pane, desired, other, viewportWidth) }
    })
  }, [viewportWidth])

  const paneStyle = {
    '--sidebar-width': `${visibleWidths.sidebar}px`,
    '--toc-width': `${visibleWidths.toc}px`,
  } as CSSProperties

  // ---------- 目录树 ----------
  const [tree, setTree] = useState<TreeRoot | null>(null)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [sidebarVersion, setSidebarVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchTree()
      .then((t) => {
        if (!cancelled) {
          setTree(t)
          // 默认展开所有套件，进页面就能看到全貌
          setExpanded(new Set(t.filter((n) => n.type === 'suite').map((n) => n.id)))
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setTreeError(e instanceof Error ? e.message : '加载目录树失败')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ---------- 当前文档 ----------
  const [doc, setDoc] = useState<DocResponse | null>(null)
  const [docError, setDocError] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [recentPaths, setRecentPaths] = useState(readRecent)

  useEffect(() => {
    if (!currentPath) {
      setDoc(null)
      setDocError(null)
      return
    }
    let cancelled = false
    setDocLoading(true)
    setDocError(null)
    fetchDoc(currentPath)
      .then((d) => {
        if (!cancelled) {
          setDoc(d)
          setRecentPaths(recordRecent(d.path))
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDoc(null)
          setDocError(e instanceof Error ? e.message : '加载文档失败')
        }
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentPath])

  // ---------- 侧边栏展开状态 ----------
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  // 打开文档时自动展开其祖先链（套件 → 技能 → 目录）
  useEffect(() => {
    if (!tree || !currentPath) return
    const ancestors = collectAncestorIds(tree, currentPath)
    if (ancestors.length === 0) return
    setExpanded((prev) => {
      const needs = ancestors.filter((id) => !prev.has(id))
      return needs.length === 0 ? prev : new Set([...prev, ...needs])
    })
  }, [tree, currentPath])

  const handleToggleNode = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ---------- 全文搜索 ----------
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (!query) return
    setSearching(true)
    setSearchError(null)
    setSearchQuery(query)
    try {
      const res = await fetchSearch(query)
      setSearchResults(res.results)
    } catch (e: unknown) {
      setSearchResults(null)
      setSearchError(e instanceof Error ? e.message : '搜索失败')
    } finally {
      setSearching(false)
    }
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchResults(null)
    setSearchError(null)
  }, [])

  // ---------- 移动端侧边栏 ----------
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)
  const uploadTriggerRef = useRef<HTMLButtonElement>(null)
  const handleSelect = useCallback(
    (path: string) => {
      navigate(path)
      setSidebarOpen(false)
    },
    [navigate],
  )

  const closeUpload = useCallback(() => {
    setUploadOpen(false)
    // 原生 dialog 关闭后再归还焦点。窄屏取消时抽屉仍打开，应回到可见的
    // 上传按钮；成功上传收起抽屉后，才回到主阅读区的“目录”入口。
    window.setTimeout(() => {
      const target = window.matchMedia('(max-width: 760px)').matches
        && !document.querySelector('.sidebar.open')
        ? document.querySelector<HTMLButtonElement>('.menu-btn')
        : uploadTriggerRef.current
      target?.focus()
    }, 0)
  }, [])

  const handleUpload = useCallback(async (file: File, targetName: string, target: UploadTarget) => {
    const { path } = await uploadMarkdown(file, targetName, target)
    setUploadNotice(null)
    try {
      // 服务端落盘后重新读取权威目录，旧节点的展开状态保持不变。
      const nextTree = await fetchTree()
      setTree(nextTree)
      const groupId = path.startsWith('docs/ai-docs/') ? 'ai-docs' : `collection:${path.split('/')[2]}`
      setExpanded((previous) => new Set([...previous, groupId]))
      setSidebarVersion((version) => version + 1) // 清除旧过滤词，使新分组可见。
      setSearchResults(null)
      setSearchQuery('')
      setSearchError(null)
    } catch {
      // 上传已经成功，目录刷新失败不能当作“保存失败”让用户重复上传。
      setUploadNotice('文档已保存，但目录暂未更新；刷新页面即可在分组中看到。')
    }
    navigate(path)
    setSidebarOpen(false)
  }, [navigate])

  const uploadGroups = tree
    ? [{ id: 'ai-docs', title: 'AI 文章' }, ...tree
      .filter((node) => node.type === 'group' && node.id.startsWith('collection:'))
      .map((node) => ({ id: node.id, title: node.title }))]
    : []

  return (
    <div className="app" style={paneStyle}>
      {uploadOpen && <UploadDialog groups={uploadGroups} onSubmit={handleUpload} onClose={closeUpload} />}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside id="viewer-sidebar" className={cx('sidebar', sidebarOpen && 'open')}>
        {tree && (
          <Sidebar
            key={sidebarVersion}
            tree={tree}
            currentPath={currentPath}
            expanded={expanded}
            onSelect={handleSelect}
            onToggleNode={handleToggleNode}
            searchResults={searchResults}
            searchQuery={searchQuery}
            searching={searching}
            searchError={searchError}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            isDark={theme === 'dark'}
            onToggleTheme={toggleTheme}
            onOpenUpload={() => setUploadOpen(true)}
            uploadTriggerRef={uploadTriggerRef}
          />
        )}
      </aside>

      <PaneResizeHandle pane="sidebar" width={visibleWidths.sidebar} min={PANE_MIN.sidebar}
        max={clampPaneWidth('sidebar', Infinity, visibleWidths.toc, viewportWidth)}
        onResize={handlePaneResize} />

      <main className="main" data-reading-theme={currentPath && doc ? readingTheme : undefined}>
        {uploadNotice && <div className="upload-notice" role="status">{uploadNotice}</div>}
        {!tree && !treeError && <div className="pane-message">目录加载中…</div>}
        {treeError && (
          <div className="pane-message pane-error">
            <p>{treeError}</p>
            <button type="button" className="ghost-btn" onClick={() => window.location.reload()}>
              重试
            </button>
          </div>
        )}

        {tree && (
          <>
            <button
              type="button"
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开目录"
            >
              目录
            </button>

            {!currentPath && <WelcomePanel tree={tree} recentPaths={recentPaths} onNavigate={handleSelect} />}

            {currentPath && docError && (
              <div className="pane-message pane-error">
                <p>{docError}</p>
              </div>
            )}
            {currentPath && docLoading && !doc && <div className="pane-message">文档加载中…</div>}
            {currentPath && doc && tree && (
              <DocView doc={doc} tree={tree} onNavigate={handleSelect}
                readingTheme={readingTheme} onReadingThemeChange={chooseReadingTheme} />
            )}
          </>
        )}
      </main>

      <PaneResizeHandle pane="toc" width={visibleWidths.toc} min={PANE_MIN.toc}
        max={clampPaneWidth('toc', Infinity, visibleWidths.sidebar, viewportWidth)}
        onResize={handlePaneResize} />
      <aside id="viewer-toc" className="toc-panel">{doc && <Toc key={doc.path} content={doc.content} />}</aside>
    </div>
  )
}
