/**
 * Express API 路由（以中间件形式挂进 Vite dev server，见 vite.config.ts）。
 *
 * 三个接口：
 * - GET /api/tree          完整合并树
 * - GET /api/doc?path=...  单篇文档原文
 * - GET /api/search?q=...  全文搜索
 *
 * 安全要点：/api/doc 只允许读取「扫描集合内」的文件——
 * 请求路径必须与扫描结果的相对路径完全一致，天然防住路径穿越与任意文件读取。
 */
import express from 'express'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PROJECT_ROOT } from './config'
import { scanProject } from './scanner'
import { buildTree, buildFileIndex } from './tree-builder'
import type { FileMeta } from './tree-builder'
import { searchDocs } from './search'
import type { SearchEntry } from './search'
import type { DocResponse, SearchResponse } from '../shared/types'

export function createApiApp(): express.Express {
  const app = express()

  app.get('/api/tree', (_req, res) => {
    try {
      res.json({ tree: buildTree(scanProject(PROJECT_ROOT)) })
    } catch {
      res.status(500).json({ error: '构建目录树失败，请检查项目目录' })
    }
  })

  app.get('/api/doc', (req, res) => {
    try {
      const path = typeof req.query.path === 'string' ? req.query.path : ''
      if (!path) {
        res.status(400).json({ error: '缺少 path 参数' })
        return
      }

      // 关键安全校验：必须是扫描集合内的确切相对路径
      const allowed = new Set(scanProject(PROJECT_ROOT))
      if (!allowed.has(path)) {
        res.status(404).json({ error: '文件不存在或不在扫描范围内' })
        return
      }

      const meta = buildFileIndex(buildTree([...allowed])).get(path)
      const content = readFileSync(join(PROJECT_ROOT, ...path.split('/')), 'utf-8')

      const body: DocResponse = {
        path,
        title: displayTitle(path, meta),
        content,
        skillId: meta?.skillId,
      }
      res.json(body)
    } catch {
      res.status(500).json({ error: '读取文档失败' })
    }
  })

  app.get('/api/search', (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : ''
      if (!q.trim()) {
        res.status(400).json({ error: '缺少搜索关键词' })
        return
      }

      const files = scanProject(PROJECT_ROOT)
      const index = buildFileIndex(buildTree(files))
      const entries: SearchEntry[] = files.map((path) => {
        const meta = index.get(path)
        return {
          path,
          title: displayTitle(path, meta),
          skillId: meta?.skillId,
          content: readFileSync(join(PROJECT_ROOT, ...path.split('/')), 'utf-8'),
        }
      })

      const body: SearchResponse = { query: q, results: searchDocs(entries, q) }
      res.json(body)
    } catch {
      res.status(500).json({ error: '搜索失败' })
    }
  })

  return app
}

/**
 * 组合展示标题：
 * 技能核心文件（中文版/详细设计讲解/源码）的索引标题很短（如 "中文版"），
 * 单独出现在搜索结果里没有上下文，所以拼上技能名变成 "技能名 · 中文版"；
 * 其他文件直接用索引标题（通常是去扩展名的文件名）。
 */
function displayTitle(path: string, meta: FileMeta | undefined): string {
  if (!meta) {
    return path.split('/').pop()!.replace(/\.md$/, '')
  }
  const skillName = meta.skillId?.split('/')[1]
  const isCoreSkillFile = meta.role === 'zh' || meta.role === 'design' || meta.role === 'source'
  if (skillName && isCoreSkillFile) {
    return `${skillName} · ${meta.title}`
  }
  return meta.title
}
