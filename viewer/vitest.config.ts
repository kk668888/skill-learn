/**
 * Vitest 独立配置：测试只跑服务端纯逻辑，不加载 React 插件，启动更快。
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
})
