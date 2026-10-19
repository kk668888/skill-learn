/**
 * 后端 API 客户端：统一 fetch + 错误处理。
 * 后端出错时返回 { error: string }，这里把 error 抛成 Error 交给界面显示。
 */
import type { TreeRoot, DocResponse, SearchResponse, UploadResponse, UploadTarget } from '../../shared/types'

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

/**
 * 使用浏览器原生 FormData 传原始文件字节；不手填 Content-Type，
 * 让浏览器附上 multipart 边界。错误文案沿用后端的 { error } 约定，
 * 上传界面可据此提示用户改名或检查文件。
 */
export async function uploadMarkdown(
  file: File,
  targetName: string,
  target: UploadTarget,
): Promise<UploadResponse> {
  const body = new FormData()
  body.append('file', file)
  body.append('targetName', targetName)
  if (target.kind === 'new') body.append('newGroup', target.name)
  else body.append('groupId', target.groupId)

  let response: Response
  try {
    response = await fetch('/api/upload', { method: 'POST', body })
  } catch {
    throw new Error('网络请求失败，请确认查看器服务正在运行')
  }
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (result as { error?: string } | null)?.error
    throw new Error(message ?? `上传失败（HTTP ${response.status}）`)
  }
  return result as UploadResponse
}
