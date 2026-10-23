/**
 * 生产环境的同源 HTTP 服务。
 *
 * API 先于静态文件注册，避免前端的页面回退把不存在的 /api/* 包装成 HTML；
 * 文库使用 hash 路由，/library/ 固定返回文库入口，其余页面回退到总览。
 */
import express from 'express'
import { join } from 'node:path'
import { createApiApp } from './api'

/** root 和 staticDir 可注入临时目录，测试无需启动 Vite 或触碰项目资料。 */
export function createProductionApp(root: string, staticDir: string, publicOrigin?: string): express.Express {
  const app = createApiApp(root, {}, publicOrigin)

  // 未知 API 明确返回 JSON 404，不能落入前端页面回退。
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: '接口不存在' })
  })
  app.get(/^\/library$/, (_req, res) => res.redirect(308, '/library/'))
  app.get(['/library/', '/library/index.html'], (_req, res) => {
    res.sendFile(join(staticDir, 'library', 'index.html'))
  })
  app.use(express.static(staticDir, { index: false }))
  app.get('*', (_req, res) => {
    res.sendFile(join(staticDir, 'index.html'))
  })
  return app
}
