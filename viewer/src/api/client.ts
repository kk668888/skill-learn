/**
 * 后端 API 客户端：统一 fetch + 错误处理。
 * 后端出错时返回 { error: string }，这里把 error 抛成 Error 交给界面显示。
 */
import type { TreeRoot, DocResponse, SearchResponse } from '../../shared/types'

async function getJson<T>(url: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error('网络请求失败，请确认查看器服务正在运行')
  }
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error
    throw new Error(message ?? `请求失败（HTTP ${res.status}）`)
  }
  return body as T
}

export function fetchTree(): Promise<TreeRoot> {
  return getJson<{ tree: TreeRoot }>('/api/tree').then((r) => r.tree)
}

export function fetchDoc(path: string): Promise<DocResponse> {
  return getJson<DocResponse>(`/api/doc?path=${encodeURIComponent(path)}`)
}

export function fetchSearch(query: string): Promise<SearchResponse> {
  return getJson<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`)
}
