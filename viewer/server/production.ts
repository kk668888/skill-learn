/**
 * 生产环境的同源 HTTP 服务。
 *
 * API 先于静态文件注册，避免前端的页面回退把不存在的 /api/* 包装成 HTML；
 * 根路径就是技能文库（库总览，hash 路由，未知页面一律回退到文库首页），
 * /overview/ 固定返回学习总览矩阵，旧 /library/* 链接 308 回根。
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
  // 旧入口兼容：文库曾长期挂在 /library/，外链与书签统一 308 回根
  // （#/?path=… 这类 hash 不随 3xx 发给服务端，浏览器会自动带到新地址上）。
  app.get(['/library', '/library/', '/library/index.html'], (_req, res) => res.redirect(308, '/'))
  app.get(/^\/overview$/, (_req, res) => res.redirect(308, '/overview/'))
  app.get(['/overview/', '/overview/index.html'], (_req, res) => {
    res.sendFile(join(staticDir, 'overview', 'index.html'))
  })
  app.use(express.static(staticDir, { index: false }))
  app.get('*', (_req, res) => {
    res.sendFile(join(staticDir, 'index.html'))
  })
  return app
}
