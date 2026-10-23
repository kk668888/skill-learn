/**
 * 生产服务的真实 HTTP 行为：以临时项目资料和临时构建产物运行 Express。
 * 这些断言不启动 Vite，因此能发现容器镜像缺少独立服务入口的问题。
 */
import { afterEach, beforeEach, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'

let root = ''
let staticDir = ''
let server: Server | null = null

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'viewer-production-'))
  staticDir = join(root, 'viewer', 'dist')
  mkdirSync(join(root, 'docs', 'ai-docs'), { recursive: true })
  mkdirSync(join(root, 'skills', 'sample'), { recursive: true })
  mkdirSync(join(staticDir, 'assets'), { recursive: true })
  mkdirSync(join(staticDir, 'library'), { recursive: true })
  writeFileSync(join(root, 'docs', 'ai-docs', '笔记.md'), '# 生产文档\n独有关键词\n')
  writeFileSync(join(root, 'skills', 'sample', 'SKILL.md'), '# 示例技能\n')
  writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>学习总览</title>')
  writeFileSync(join(staticDir, 'library', 'index.html'), '<!doctype html><title>技能文库</title>')
  writeFileSync(join(staticDir, 'assets', 'main.js'), 'globalThis.viewerReady = true')
})

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()))
  server = null
  rmSync(root, { recursive: true, force: true })
})

async function startProduction(): Promise<string> {
  // 动态加载使缺失的生产入口成为明确的断言失败，而不是测试文件加载错误。
  const module = await import('../server/production').catch(() => null)
  expect(module).not.toBeNull()
  server = module!.createProductionApp(root, staticDir).listen(0)
  await new Promise<void>((resolve) => server!.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('测试服务没有取得端口')
  return `http://127.0.0.1:${address.port}`
}

it('无需 Vite 即可提供总览、文库、静态资源和页面回退', async () => {
  const base = await startProduction()
  const home = await fetch(base)
  expect(home.status).toBe(200)
  expect(await home.text()).toContain('学习总览')
  const library = await fetch(`${base}/library/`)
  expect(library.status).toBe(200)
  expect(await library.text()).toContain('技能文库')
  const libraryRedirect = await fetch(`${base}/library`, { redirect: 'manual' })
  expect(libraryRedirect.status).toBe(308)
  expect(libraryRedirect.headers.get('location')).toBe('/library/')
  const asset = await fetch(`${base}/assets/main.js`)
  expect(asset.status).toBe(200)
  expect(await asset.text()).toContain('viewerReady')
  const fallback = await fetch(`${base}/unknown-page`)
  expect(await fallback.text()).toContain('学习总览')
})

it('生产页面与目录、阅读、搜索 API 同源，未知 API 不返回 HTML', async () => {
  const base = await startProduction()
  const tree = await fetch(`${base}/api/tree`).then((response) => response.json())
  expect(JSON.stringify(tree)).toContain('docs/ai-docs/笔记.md')
  const path = encodeURIComponent('docs/ai-docs/笔记.md')
  const doc = await fetch(`${base}/api/doc?path=${path}`).then((response) => response.json())
  expect(doc.content).toContain('独有关键词')
  const search = await fetch(`${base}/api/search?q=${encodeURIComponent('独有关键词')}`)
  expect(JSON.stringify(await search.json())).toContain('docs/ai-docs/笔记.md')
  const missing = await fetch(`${base}/api/missing`)
  expect(missing.status).toBe(404)
  expect(await missing.text()).not.toContain('学习总览')
})
