/**
 * Express API 路由（以中间件形式挂进 Vite dev server，见 vite.config.ts）。
 *
 * 五个接口：
 * - GET /api/tree          完整合并树
 * - GET /api/doc?path=...  单篇文档原文
 * - GET /api/search?q=...  全文搜索
 * - GET /api/download      打包下载所有可浏览 Markdown
 * - POST /api/upload      上传普通 Markdown 文档
 *
 * 安全要点：/api/doc 只允许读取「扫描集合内」的文件——
 * 请求路径必须与扫描结果的相对路径完全一致，天然防住路径穿越与任意文件读取。
 */
import express from 'express'
import multer from 'multer'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PROJECT_ROOT } from './config'
import { scanProject } from './scanner'
import { buildTree, buildFileIndex } from './tree-builder'
import type { FileMeta } from './tree-builder'
import { searchDocs } from './search'
import type { SearchEntry } from './search'
import type { DocResponse, SearchResponse } from '../shared/types'
import { MAX_UPLOAD_BYTES, saveMarkdownUpload, UploadFailure } from './upload'
import type { UploadOptions } from './upload'
import { sendMarkdownArchive } from './download'

/** root 可在测试中指向临时项目，生产默认仍使用当前仓库根目录。 */
export function createApiApp(
  root: string = PROJECT_ROOT,
  uploadOptions: UploadOptions = {},
  publicOrigin?: string,
): express.Express {
  const app = express()
  const parseUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 2, parts: 3 },
  }).single('file')

  app.get('/api/tree', (_req, res) => {
    try {
      res.json({ tree: buildTree(scanProject(root)) })
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
      const allowed = new Set(scanProject(root))
      if (!allowed.has(path)) {
        res.status(404).json({ error: '文件不存在或不在扫描范围内' })
        return
      }

      const meta = buildFileIndex(buildTree([...allowed])).get(path)
      const content = readFileSync(join(root, ...path.split('/')), 'utf-8')

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

      const files = scanProject(root)
      const index = buildFileIndex(buildTree(files))
      const entries: SearchEntry[] = files.map((path) => {
        const meta = index.get(path)
        return {
          path,
          title: displayTitle(path, meta),
          skillId: meta?.skillId,
          content: readFileSync(join(root, ...path.split('/')), 'utf-8'),
        }
      })

      const body: SearchResponse = { query: q, results: searchDocs(entries, q) }
      res.json(body)
    } catch {
      res.status(500).json({ error: '搜索失败' })
    }
  })

  // 下载与目录使用同一份扫描边界，且每次请求都重新扫描以纳入新上传的文档。
  app.get('/api/download', (_req, res) => {
    sendMarkdownArchive(root, res)
  })

  app.post('/api/upload', (req, res) => {
    // 浏览器的跨站表单即使不读取响应也能写入本地文件。先检查 Origin，
    // 并把 Host 限在本机地址，避免 DNS 重绑定使用攻击者域名伪装同源。
    // 无 Origin 的本机 CLI 调用仍可用于维护与测试。
    const origin = req.get('origin')
    const host = req.get('host') ?? ''
    let requestOrigin: string | null = null
    try {
      requestOrigin = new URL(`${req.protocol}://${host}`).origin
    } catch {
      // 格式错误的 Host 不能被用作上传目标。
    }
    // 生产模式使用显式配置的地址；开发模式继续允许 localhost 和无 Origin
    // 的本机 CLI 调用。生产模式要求 Origin，阻断无来源的浏览器表单提交。
    const allowed = publicOrigin
      ? requestOrigin === publicOrigin && origin === publicOrigin
      : requestOrigin !== null
        && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(requestOrigin).hostname.toLowerCase())
        && (!origin || origin === requestOrigin)
    if (!allowed) {
      res.status(403).json({ error: '只允许从本地查看器页面上传文档' })
      return
    }
    // multipart 解析器严格限制一份文件与两个文本字段；错误在进入磁盘逻辑前返回。
    parseUpload(req, res, (parseError: unknown) => {
      if (parseError) {
        const tooLarge = parseError instanceof multer.MulterError && parseError.code === 'LIMIT_FILE_SIZE'
        res.status(tooLarge ? 413 : 400).json({
          error: tooLarge ? '文件不得超过 5 MiB' : '上传表单无效，只能提交一份 Markdown 文件',
        })
        return
      }
      try {
        const path = saveMarkdownUpload(root, req.body as Record<string, unknown>, req.file, uploadOptions)
        res.status(201).json({ path })
      } catch (error) {
        if (error instanceof UploadFailure) {
          res.status(error.status).json({ error: error.message })
        } else {
          res.status(500).json({ error: '保存文档失败，请检查项目目录' })
        }
      }
    })
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
