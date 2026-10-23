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
  mkdirSync(join(staticDir, 'overview'), { recursive: true })
  writeFileSync(join(root, 'docs', 'ai-docs', '笔记.md'), '# 生产文档\n独有关键词\n')
  writeFileSync(join(root, 'skills', 'sample', 'SKILL.md'), '# 示例技能\n')
  // 根路径是技能文库（库总览），学习总览矩阵退居 /overview/
  writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>技能文库</title>')
  writeFileSync(join(staticDir, 'overview', 'index.html'), '<!doctype html><title>学习总览</title>')
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

it('无需 Vite 即可提供文库首页、总览矩阵、静态资源和页面回退', async () => {
  const base = await startProduction()
  // 默认根路径落在技能文库（库总览）
  const home = await fetch(base)
  expect(home.status).toBe(200)
  expect(await home.text()).toContain('技能文库')
  // 学习总览矩阵固定在 /overview/
  const overview = await fetch(`${base}/overview/`)
  expect(overview.status).toBe(200)
  expect(await overview.text()).toContain('学习总览')
  const overviewRedirect = await fetch(`${base}/overview`, { redirect: 'manual' })
  expect(overviewRedirect.status).toBe(308)
  expect(overviewRedirect.headers.get('location')).toBe('/overview/')
  // 旧 /library/ 外链与书签 308 回根，hash 由浏览器保留
  for (const legacy of ['/library', '/library/', '/library/index.html']) {
    const redirect = await fetch(`${base}${legacy}`, { redirect: 'manual' })
    expect(redirect.status).toBe(308)
    expect(redirect.headers.get('location')).toBe('/')
  }
  const asset = await fetch(`${base}/assets/main.js`)
  expect(asset.status).toBe(200)
  expect(await asset.text()).toContain('viewerReady')
  const fallback = await fetch(`${base}/unknown-page`)
  expect(await fallback.text()).toContain('技能文库')
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
  expect(await missing.text()).not.toContain('技能文库')
})
