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

/** 等待 ZIP 响应完整到达；断流会让 blob() 失败，界面因此不会保存残缺文件。 */
export async function fetchMarkdownArchive(): Promise<Blob> {
  let response: Response
  try {
    response = await fetch('/api/download')
  } catch {
    throw new Error('网络请求失败，请确认查看器服务正在运行')
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message = (body as { error?: string } | null)?.error
    throw new Error(message ?? `下载失败（HTTP ${response.status}）`)
  }
  if (!response.headers.get('content-type')?.includes('application/zip')) {
    throw new Error('下载响应不是 ZIP 文件，请检查查看器服务')
  }
  let archive: Blob
  try {
    archive = await response.blob()
  } catch {
    throw new Error('下载中断，请重试')
  }
  // ZIP 的结束记录必须落在响应末尾；即便代理把截短响应误报为 200，
  // 也不能因此触发浏览器保存一个明显残缺的归档。
  if (!await hasZipEndRecord(archive)) throw new Error('下载的 ZIP 不完整，请重试')
  return archive
}

/** 只读取 ZIP 尾部（最长 65535 字节注释 + 22 字节记录），避免解压整份文档。 */
async function hasZipEndRecord(archive: Blob): Promise<boolean> {
  if (archive.size < 22) return false
  const tail = new Uint8Array(await archive.slice(-65557).arrayBuffer())
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength)
  for (let offset = tail.length - 22; offset >= 0; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50
      && offset + 22 + view.getUint16(offset + 20, true) === tail.length) return true
  }
  return false
}

/** 完整获取 ZIP 后才交给浏览器保存；始终移除临时链接并延后释放对象 URL。 */
export async function downloadMarkdownArchive(): Promise<void> {
  const archive = await fetchMarkdownArchive()
  const url = URL.createObjectURL(archive)
  const link = document.createElement('a')
  link.href = url
  link.download = 'skill-learn-bundle.zip'
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    // 立即撤销有机会让浏览器尚未读取 Blob，故留给浏览器一个事件循环。
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
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
