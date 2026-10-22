/**
 * Vite 配置：前端开发服务器 + Express API 中间件，单进程运行。
 *
 * 为什么用 configureServer 挂 Express：
 * - 整个查看器只有 `npm run dev` 一条命令，不需要单独起后端进程
 * - API 与前端同源，无需配置代理
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Connect } from 'vite'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createApiApp } from './server/api'

const viewerRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // 把 Express API 以插件钩子的形式挂进 dev server
      name: 'skill-learn-api',
      configureServer(server) {
        server.middlewares.use(createApiApp() as unknown as Connect.NextHandleFunction)
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        overview: join(viewerRoot, 'index.html'),
        library: join(viewerRoot, 'library', 'index.html'),
      },
    },
  },
  server: {
    // 固定端口，失败时直接报错而不是悄悄换端口
    port: 5188,
    strictPort: true,
    // 启动后自动打开浏览器
    open: true,
  },
})
