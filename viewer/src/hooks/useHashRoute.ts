/**
 * hash 路由 hook：URL 形如 #/?path=<encodeURIComponent(文档路径)>。
 *
 * 为什么用 hash 而不是 History API：查看器由 Vite dev server 直接托管，
 * hash 路由零配置、刷新/收藏都安全。
 *
 * 注意：文档内部的页内锚点（href="#some-id"）不以 "#/" 开头，
 * 一律忽略，避免点锚点把当前文档卸载掉。
 */
import { useCallback, useEffect, useState } from 'react'

function parseHash(): string | null {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const query = raw.startsWith('?') ? raw.slice(1) : raw
  const path = new URLSearchParams(query).get('path')
  return path && path.trim() !== '' ? path : null
}

export function useHashRoute(): [string | null, (path: string) => void] {
  const [path, setPath] = useState<string | null>(parseHash)

  useEffect(() => {
    const onHashChange = (): void => {
      const hash = window.location.hash
      // 只有本查看器自己的路由 hash（空 或 #/ 开头）才参与路由
      if (hash === '' || hash.startsWith('#/')) {
        setPath(parseHash())
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: string) => {
    const target = `#/?path=${encodeURIComponent(next)}`
    if (window.location.hash !== target) {
      window.location.hash = target
    }
  }, [])

  return [path, navigate]
}
