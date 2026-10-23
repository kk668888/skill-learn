// @vitest-environment jsdom
/**
 * 总览页（AI 工程工具矩阵）的主题行为：
 * - 默认白天主题（无存储时亮色，data-theme=light）
 * - 顶栏按钮切换白天/夜间，并持久化到 localStorage
 * - 再次进入时按存储恢复；存储值非法时回退白天
 */
import { afterEach, beforeEach, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import App from '../overview/App'
import {
  THEME_STORAGE_KEY,
  initTheme,
  persistTheme,
  readStoredTheme,
} from '../overview/theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(cleanup)

it('无存储时默认白天主题：挂载即写入 data-theme=light', () => {
  render(<App />)
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('顶栏按钮点击进入夜间主题并持久化', async () => {
  render(<App />)
  await userEvent.setup().click(screen.getByRole('button', { name: '切换到夜间主题' }))

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
})

it('夜间主题下按钮名称反转，再次点击切回白天', async () => {
  render(<App />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '切换到夜间主题' }))
  await user.click(screen.getByRole('button', { name: '切换到白天主题' }))

  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
})

it('初始化时读取已存储的夜间主题', () => {
  localStorage.setItem(THEME_STORAGE_KEY, 'dark')
  initTheme()

  expect(document.documentElement.dataset.theme).toBe('dark')
})

it('存储值非法时回退白天，而不是沿用残留的暗色', () => {
  localStorage.setItem(THEME_STORAGE_KEY, 'banana')
  expect(readStoredTheme()).toBe('light')

  render(<App />)
  expect(document.documentElement.dataset.theme).toBe('light')
})

// ---------- 降级与守卫：localStorage 抛异常、双源键名同步、StrictMode ----------

/** 模拟隐私模式：访问 window.localStorage 属性 getter 本身即抛 SecurityError（非 getItem 抛） */
it('localStorage 属性访问即抛时不崩：读取、持久化、render 全部安全降级', async () => {
  const throwingStorage = {
    getItem: () => {
      throw new DOMException('denied', 'SecurityError')
    },
  }
  // 注入 stub 的路径：getItem 抛异常被捕获回退白天
  expect(readStoredTheme(throwingStorage)).toBe('light')

  // 更真实的隐私模式：localStorage 属性 getter 即抛。
  // 这会击穿「默认参数 = localStorage」在 try 外求值的写法——若被击穿，
  // initTheme 会在 React render 阶段抛出并卸载整棵树（白屏）。
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('denied', 'SecurityError')
    },
  })
  try {
    expect(readStoredTheme()).toBe('light')
    expect(() => persistTheme('dark')).not.toThrow()
    // render 阶段 useState 初始化器会调 initTheme，这里不抛即通过
    render(<App />)
    expect(screen.getByRole('button', { name: '切换到夜间主题' })).toBeTruthy()
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
  }

  // 恢复存储后点击切换照常工作：DOM 翻转 + 内存态生效（持久化静默失败的路径已单独验证）
  await userEvent.setup().click(screen.getByRole('button', { name: '切换到夜间主题' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
})

it('总览入口页防 FOUC 脚本与 THEME_STORAGE_KEY 同源，防止双字符串漂移', () => {
  // jsdom 环境下 import.meta.url 非 file 协议，改用 cwd（npm test 固定在 viewer/ 下运行）；
  // 总览页挂在 /overview/，防闪烁脚本位于 overview/index.html 而非根入口
  const html = readFileSync(join(process.cwd(), 'overview', 'index.html'), 'utf8')
  // theme.ts 若改键名而 html 漏改，此断言即失败——症状本是「夜间用户每次加载闪白」
  expect(html).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`)
})

it('StrictMode 下点击切换仍恰好完成一次状态翻转', async () => {
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  await userEvent.setup().click(screen.getByRole('button', { name: '切换到夜间主题' }))

  // updater 若含非幂等副作用，双调用会在这里暴露（dark → light 抖回）
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
})
