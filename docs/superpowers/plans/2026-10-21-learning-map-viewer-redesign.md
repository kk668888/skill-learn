# 学习地图查看器视觉改版 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 viewer 从通用文档工具界面改成「学习地图」：鲜明套件色导航、欢迎首页学习入口、首页隐藏空白大纲栏，同时正文阅读主题与既有功能完全不动。

**Architecture:** 新增一个纯函数套件识别模块（`suiteKey` + 描述 + 初始展开策略）作为唯一映射源；套件颜色全部走 CSS 变量（`data-suite` 属性 → `--suite-mark/soft/text`，明暗各一套）；组件层只负责把 `data-suite`/`activeSuiteTitle` 接到套件卡、套件行、文档头、大纲面板上。首页与文档页的布局差异由 `.app-home` 栅格类 + 条件渲染大纲栏实现，不新增服务端字段。

**Tech Stack:** React 18 + TypeScript strict、Vite、vitest + @testing-library/react（jsdom）、纯 CSS 变量（styles.css）。

**Spec:** `docs/superpowers/specs/2026-10-21-learning-map-viewer-redesign-design.md`（实现时两份一起读）。

## Global Constraints

- Node >= 20.19；不新增任何 npm 依赖。
- 颜色权威是 `viewer/src/styles.css` 与 `viewer/src/reading-themes.css`；本计划只在 styles.css 加 `--suite-*` 变量，**不得**改动 reading-themes.css。
- 套件色只作用于：欢迎页套件卡、侧栏套件行、文档头、大纲活跃项。正文（标题/段落/引用/表格/代码）永远由四种阅读样式决定。
- 文档路径均为正斜杠项目相对路径（`shared/types.ts` 约定）；套件节点 id 形如 `suite:<name>`。
- 界面文案为简体中文；不展示完成百分比、打卡等虚构进度。
- TypeScript strict、`noUnusedLocals`；组件内注释解释「为什么」，默认无注释。
- 不得移除任何 `:focus-visible` 焦点轮廓；新彩色元素在明暗两模式下都要有可见焦点。
- 测试一律在 `viewer/` 目录运行：`npx vitest run <file>`；全量 `npm test`；类型 `npm run typecheck`；构建 `npm run build`。
- 不修改 `viewer/server/`（`buildTree` 仅作为测试夹具引用）。

## Review Focus

1. **未知套件/新分组**：`skills/` 下出现映射表之外的新套件时，期望用中性默认配色正常展示全部内容，而不是丢颜色或报错。→ Task 1 测试 `suiteKey('全新套件') === 'default'`；Task 4 测试未知套件卡片无描述行但计数可见。
2. **快速入手缺失**：某套件没有任何可用入口时，期望套件卡禁用、继续卡片不出现、页面不白屏。→ Task 4 测试空树不渲染继续卡片；既有 welcome-panel 三条回退链测试必须保持通过。
3. **首页↔文档页往返丢状态**：从文档回首页再进另一篇，期望大纲栏宽、阅读样式、明暗模式保持原值。→ Task 3 测试断言 `--toc-width` 变量在导航后仍在 `.app` 上。
4. **深色模式对比度**：套件浅色基准值直接用于深色会不可读，期望深色变量单独定义且正文可读。→ Task 2 逐套定义深色三元组；Task 7 人工核对（浏览器截图）。
5. **彩色可点击元素的键盘焦点**：套件卡整卡为 `<button>`，期望焦点轮廓在彩色背景上仍可辨。→ Task 2 CSS 用 `outline` 不用 `box-shadow` 覆盖；Task 7 人工 Tab 核对。

---

### Task 1: 套件识别模块与初始展开策略

**Files:**
- Create: `viewer/src/lib/suiteTheme.ts`
- Modify: `viewer/src/lib/filter.ts`（文件末尾追加一个函数）
- Test: `viewer/tests/suite-theme.spec.ts`

**Interfaces:**
- Consumes: `TreeRoot`/`SuiteNode`（`shared/types.ts`）、`readRecent`（`lib/recent.ts`）、`findFileContext`（`lib/filter.ts`，已存在）。
- Produces（后续任务依赖的精确签名）:
  - `type SuiteThemeKey = 'openspec' | 'superpowers' | 'grill' | 'impeccable' | 'anthropics' | 'frontend-design-premium' | 'default'`
  - `suiteKey(title: string | undefined): SuiteThemeKey` —— 对 `title` 做小写化后查表；未知返回 `'default'`。
  - `suiteDescription(key: SuiteThemeKey): string` —— 已知套件返回固定中文短语，`'default'` 返回 `''`。
  - `initialExpandedSuites(tree: TreeRoot, recentPaths: string[]): Set<string>` —— 有最近记录且能在树中解析出所属套件时，返回 `new Set([<该套件节点 id>])`；否则空 `Set`。

- [ ] **Step 1: 写失败测试 `viewer/tests/suite-theme.spec.ts`**

```ts
import { expect, it } from 'vitest'
import { suiteDescription, suiteKey } from '../src/lib/suiteTheme'
import { initialExpandedSuites } from '../src/lib/filter'
import { buildTree } from '../server/tree-builder'

it('已知套件名映射到稳定 key 与描述', () => {
  expect(suiteKey('OpenSpec')).toBe('openspec')
  expect(suiteKey('frontend-design-premium')).toBe('frontend-design-premium')
  expect(suiteDescription('grill')).toBe('深挖问题')
})

it('未知套件回退中性默认，描述为空', () => {
  expect(suiteKey('全新套件')).toBe('default')
  expect(suiteKey(undefined)).toBe('default')
  expect(suiteDescription('default')).toBe('')
})

it('初次进入只展开最近阅读所属套件，无记录则全收起', () => {
  const tree = buildTree([
    'skills/openspec/opsx/new/SKILL.md',
    'skills/superpowers/brainstorming/SKILL.md',
  ])
  expect(initialExpandedSuites(tree, ['skills/superpowers/brainstorming/SKILL.md']))
    .toEqual(new Set(['suite:superpowers']))
  expect(initialExpandedSuites(tree, [])).toEqual(new Set())
  expect(initialExpandedSuites(tree, ['docs/ai-docs/不存在的文章.md'])).toEqual(new Set())
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd viewer && npx vitest run tests/suite-theme.spec.ts`
Expected: FAIL（`suiteTheme` 模块不存在 / `initialExpandedSuites` 未导出）

- [ ] **Step 3: 实现 `suiteTheme.ts` 与 `initialExpandedSuites`**

`suiteTheme.ts`：查表用 `Record<string, …>`，键为小写套件目录名；描述表：openspec「提案与变更」、superpowers「开发实践」、grill「深挖问题」、impeccable「设计质量」、anthropics「创建技能」、frontend-design-premium「产品界面设计」。`initialExpandedSuites`：`recentPaths[0]` 经 `findFileContext` 取 `suite`（套件标题），在 `tree` 里找 `type==='suite' && title===该标题` 的节点 id；找不到或无记录返回空集合。

- [ ] **Step 4: 运行确认通过**

Run: `cd viewer && npx vitest run tests/suite-theme.spec.ts`
Expected: PASS（3 条）

- [ ] **Step 5: 提交**

```bash
git add viewer/src/lib/suiteTheme.ts viewer/src/lib/filter.ts viewer/tests/suite-theme.spec.ts
git commit -m "feat: 查看器套件识别模块与初始展开策略"
```

---

### Task 2: 套件识别色 CSS 变量与设计约定更新

**Files:**
- Modify: `viewer/src/styles.css`（`:root[data-theme='dark']` 块之后插入变量区；`.welcome`、`.suite-card`、`.tree-suite`、`.doc-header`、`.toc-item` 各区随后续任务消费，本任务只定义变量）
- Modify: `DESIGN.md`（Colors 与 Overview 两处）

**Interfaces:**
- Produces: 任意元素带 `data-suite="<key>"` 后，其子树可用 `var(--suite-mark)`、`var(--suite-soft)`、`var(--suite-text)`；明暗两套由 `:root[data-theme='dark']` 前缀选择器覆盖。

- [ ] **Step 1: 在 styles.css 插入变量区（紧跟暗色 `:root[data-theme='dark']` 块后）**

基准值来自 spec 色表；深色值按「mark 提亮、soft 压暗、text 提亮」原则逐套给出，最终对比度在 Task 7 人工核对。

```css
/* ---------- 套件识别色：只用于导航、入口、文档头，不进正文阅读主题 ---------- */
[data-suite='openspec']               { --suite-mark: #626dbe; --suite-soft: #e0e3f8; --suite-text: #394691; }
[data-suite='superpowers']            { --suite-mark: #3a9588; --suite-soft: #dbefe9; --suite-text: #26645b; }
[data-suite='grill']                  { --suite-mark: #b47d45; --suite-soft: #f3e6d5; --suite-text: #805528; }
[data-suite='impeccable']             { --suite-mark: #9a70a6; --suite-soft: #eee4f1; --suite-text: #744f82; }
[data-suite='anthropics']             { --suite-mark: #4282aa; --suite-soft: #dfedf5; --suite-text: #345f80; }
[data-suite='frontend-design-premium']{ --suite-mark: #c57a69; --suite-soft: #f3e2dd; --suite-text: #965f53; }
[data-suite='default']                { --suite-mark: #8b949e; --suite-soft: #eef1f4; --suite-text: #424a53; }

:root[data-theme='dark'] [data-suite='openspec']               { --suite-mark: #99a3f0; --suite-soft: #2e3260; --suite-text: #c9cef2; }
:root[data-theme='dark'] [data-suite='superpowers']            { --suite-mark: #6fc5b6; --suite-soft: #1e3b36; --suite-text: #bfe5dd; }
:root[data-theme='dark'] [data-suite='grill']                  { --suite-mark: #d9a76c; --suite-soft: #3f3222; --suite-text: #ebcda8; }
:root[data-theme='dark'] [data-suite='impeccable']             { --suite-mark: #c39bd3; --suite-soft: #37293f; --suite-text: #e3cdec; }
:root[data-theme='dark'] [data-suite='anthropics']             { --suite-mark: #7fb3d5; --suite-soft: #213745; --suite-text: #c4deef; }
:root[data-theme='dark'] [data-suite='frontend-design-premium']{ --suite-mark: #e0a396; --suite-soft: #422e29; --suite-text: #f0cdc5; }
:root[data-theme='dark'] [data-suite='default']                { --suite-mark: #8b949e; --suite-soft: #21262d; --suite-text: #b0bac4; }
```

- [ ] **Step 2: 更新 DESIGN.md**

Overview 段「四种阅读样式是已批准的正文变体，不扩散到侧栏、大纲和欢迎页」改为：四种阅读样式只作用于正文；套件识别色经 `data-suite` 变量只作用于导航、入口和文档头。Colors 段末尾追加六套识别色表（与 spec 色表一致）及规则：未知套件用 `default` 中性配色；颜色不单独承载信息，选中态必须有文字/形状状态。

- [ ] **Step 3: 验证**

Run: `cd viewer && npm run typecheck && npm run build`
Expected: 两者均无错误退出。

- [ ] **Step 4: 提交**

```bash
git add viewer/src/styles.css DESIGN.md
git commit -m "feat: 套件识别色 CSS 变量与设计约定更新"
```

---

### Task 3: 首页隐藏大纲栏的布局切换

**Files:**
- Modify: `viewer/src/App.tsx`（`.app` 类名、条件渲染 toc 侧栏与其拖拽轨）
- Modify: `viewer/src/styles.css`（`.app-home` 栅格类；插在 `.app` 规则之后）
- Test: `viewer/tests/home-layout.spec.tsx`（新建）

**Interfaces:**
- Consumes: `useHashRoute`（无 path = 首页）、`PaneResizeHandle`、`Toc`。
- Produces: 首页时 `.app` 追加类 `app-home` 且 DOM 中不存在 `#viewer-toc` 与 `.pane-resize-toc`；文档页恢复。`paneWidths` 状态不因切换重置（栏宽保持的实现基础）。

- [ ] **Step 1: 写失败测试 `viewer/tests/home-layout.spec.tsx`**

```tsx
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildTree } from '../server/tree-builder'
import App from '../src/App'

const FILES = ['docs/skills/superpowers/技能快速入手.md', 'skills/superpowers/brainstorming/SKILL.md']
vi.mock('../src/api/client', () => ({
  fetchTree: () => Promise.resolve(buildTree(FILES)),
  fetchDoc: (path: string) => Promise.resolve({ path, title: '技能快速入手', content: '# 一\n\n正文' }),
  fetchSearch: () => Promise.resolve({ query: '', results: [] }),
  uploadMarkdown: vi.fn(),
  downloadMarkdownArchive: vi.fn(),
}))

afterEach(() => { cleanup(); window.location.hash = ''; vi.unstubAllGlobals() })

function renderApp() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
  return render(<App />)
}

it('首页没有大纲栏，进入文档后出现且栏宽变量保留', async () => {
  renderApp()
  await screen.findByText('浏览套件')
  expect(document.querySelector('#viewer-toc')).toBeNull()
  expect(document.querySelector('.app')).toHaveClass('app-home')

  await userEvent.setup().click(screen.getByRole('button', { name: /superpowers/ }))
  expect(await screen.findByRole('heading', { level: 1, name: '技能快速入手' })).toBeTruthy()
  expect(document.querySelector('#viewer-toc')).not.toBeNull()
  expect(document.querySelector('.app')!.getAttribute('style')).toContain('--toc-width')
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd viewer && npx vitest run tests/home-layout.spec.tsx`
Expected: FAIL（首页仍有 `#viewer-toc`，`.app` 无 `app-home` 类）

- [ ] **Step 3: 改 App.tsx 与 styles.css**

App.tsx：外层 `className={cx('app', !currentPath && 'app-home')}`；`<PaneResizeHandle pane="toc" …/>` 与 `<aside id="viewer-toc" …>` 都包进 `{currentPath && (…)}`。`paneWidths` 相关 state、持久化 effect 一律不动。styles.css 在 `.app` 规则后加：

```css
.app.app-home { grid-template-columns: var(--sidebar-width, 300px) 6px minmax(0, 1fr); }
```

- [ ] **Step 4: 运行确认通过，并跑既有栏宽测试防回归**

Run: `cd viewer && npx vitest run tests/home-layout.spec.tsx tests/pane-widths.spec.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add viewer/src/App.tsx viewer/src/styles.css viewer/tests/home-layout.spec.tsx
git commit -m "feat: 欢迎页隐藏大纲栏的布局切换"
```

---

### Task 4: 学习地图欢迎首页

**Files:**
- Modify: `viewer/src/components/WelcomePanel.tsx`（整体重写渲染结构，`entryFile` 回退链原样保留）
- Modify: `viewer/src/styles.css`（重写 `.welcome*`/`.suite-card*` 区段，约 504–560 行；新增 `.continue-card`、`.suite-card-desc`、`.welcome-measure`）
- Test: `viewer/tests/welcome-panel.spec.tsx`（追加用例，既有 3 条不动）

**Interfaces:**
- Consumes: Task 1 的 `suiteKey`/`suiteDescription`；`findFileContext`（套件标题）；既有 `entryFile`。
- Produces: 套件卡 `<button>` 带 `data-suite` 属性（Task 2 的 CSS 变量在其子树生效）。

- [ ] **Step 1: 追加失败测试到 `welcome-panel.spec.tsx`**

```tsx
const TREE = buildTree([
  'docs/skills/superpowers/技能快速入手.md',
  'docs/skills/openspec/技能快速入手.md',
  'skills/superpowers/brainstorming/SKILL.md',
  'skills/openspec/opsx/new/SKILL.md',
])

it('继续卡片指向最近文档并标注套件', async () => {
  const onNavigate = vi.fn()
  render(<WelcomePanel tree={TREE} recentPaths={['skills/superpowers/brainstorming/SKILL.md']} onNavigate={onNavigate} />)
  await userEvent.setup().click(screen.getByRole('button', { name: /继续上次阅读 · superpowers/ }))
  expect(onNavigate).toHaveBeenCalledWith('skills/superpowers/brainstorming/SKILL.md')
})

it('无最近记录时继续卡片回退首个套件入口，标注「从这套开始」', async () => {
  const onNavigate = vi.fn()
  render(<WelcomePanel tree={TREE} recentPaths={[]} onNavigate={onNavigate} />)
  await userEvent.setup().click(screen.getByRole('button', { name: /从这套开始 · superpowers/ }))
  expect(onNavigate).toHaveBeenCalledWith('docs/skills/superpowers/技能快速入手.md')
})

it('目录没有可用入口时不渲染继续卡片，未知套件卡无描述但计数可见', () => {
  render(<WelcomePanel tree={buildTree([])} recentPaths={[]} onNavigate={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /继续|从这套开始/ })).toBeNull()
  render(<WelcomePanel tree={buildTree(['skills/全新套件/x/SKILL.md'])} recentPaths={[]} onNavigate={vi.fn()} />)
  const card = screen.getByRole('button', { name: /全新套件/ })
  expect(card.dataset.suite).toBe('default')
  expect(card.textContent).toContain('1 个技能')
})

it('最近打开显示「套件 · 文档名」消除重名歧义', () => {
  render(<WelcomePanel tree={TREE} recentPaths={['skills/openspec/opsx/new/SKILL.md']} onNavigate={vi.fn()} />)
  expect(screen.getAllByText(/openspec · /).length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd viewer && npx vitest run tests/welcome-panel.spec.tsx`
Expected: 新增 4 条 FAIL，既有 3 条 PASS

- [ ] **Step 3: 重写 WelcomePanel 渲染结构**

固定文案：眉标「AI 工作流学习空间」；H1「选一条路径，把方法学会。」；说明「从套件快速入手，跟做一次完整实践；再读源码与设计讲解，理解每一步为何存在。」统计沿用现有三组数字。继续卡片：`recentPaths[0]` 能在树中解析 → 眉标「继续上次阅读 · {套件}」+ 文档标题 + 「继续阅读 →」；否则按树序找第一个 `entryFile` 有值的套件 → 眉标「从这套开始 · {套件}」+ 「开始阅读 →」；两者皆无 → 不渲染卡片。套件卡：`data-suite={suiteKey(suite.title)}`，无描述的套件省略描述行。最近条目：`{套件} · {文档标题}`，套件取 `findFileContext(tree, path)?.suite`，解析不到的最近路径跳过（现状行为）；`recentFiles` 为空时整个「最近打开」区域不渲染（保留现有条件）。整卡 `<button>`，点击走既有 `onNavigate`。

- [ ] **Step 4: 配套 CSS**

`.welcome` 加 `max-width: 1080px; margin: 0 auto;`；hero 顶部栅格「文字区 + 继续卡片」两列（≤760px 单列）；`.continue-card { background: var(--suite-soft); color: var(--suite-text); }`；`.suite-card { background: var(--suite-soft); color: var(--suite-text); }`，hover 与 `:focus-visible` 用 `outline: 2px solid var(--suite-mark); outline-offset: -2px;`（替换原 border 高亮，不改焦点逻辑）；卡片列宽沿用现有 `repeat(auto-fill, minmax(210px, 1fr))` 自动降列。

- [ ] **Step 5: 运行确认通过**

Run: `cd viewer && npx vitest run tests/welcome-panel.spec.tsx tests/suite-theme.spec.ts`
Expected: 全部 PASS

- [ ] **Step 6: 提交**

```bash
git add viewer/src/components/WelcomePanel.tsx viewer/src/styles.css viewer/tests/welcome-panel.spec.tsx
git commit -m "feat: 学习地图欢迎首页改版"
```

---

### Task 5: 侧栏套件行与按需展开

**Files:**
- Modify: `viewer/src/components/TreeView.tsx`（套件分支加色点、`data-suite`、当前套件 active 态）
- Modify: `viewer/src/components/Sidebar.tsx`（透传新 prop）
- Modify: `viewer/src/App.tsx`（初始展开改用 `initialExpandedSuites`；计算并传 `activeSuiteTitle`）
- Modify: `viewer/src/styles.css`（`.tree-suite .suite-dot`、`.tree-suite.active`）
- Test: `viewer/tests/sidebar-suite.spec.tsx`（新建）；`viewer/tests/suite-theme.spec.ts`（已覆盖 `initialExpandedSuites`）

**Interfaces:**
- Consumes: Task 1 全部导出。
- Produces: `TreeViewProps` 新增 `activeSuiteTitle?: string`；`SidebarProps` 新增同名 prop。套件行按钮带 `data-suite` 与 `aria-current="true"`（仅当前套件）。

- [ ] **Step 1: 写失败测试 `viewer/tests/sidebar-suite.spec.tsx`**

```tsx
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { buildTree } from '../server/tree-builder'
import { TreeView } from '../src/components/TreeView'

const FILES = ['skills/openspec/opsx/new/SKILL.md', 'skills/superpowers/brainstorming/SKILL.md']
const base = { currentPath: null, expanded: new Set<string>(), onSelect: vi.fn(), onToggle: vi.fn() }

afterEach(cleanup)

it('套件行有颜色标记与 data-suite，未知套件为 default', () => {
  render(<TreeView nodes={buildTree([...FILES, 'skills/全新套件/x/SKILL.md'])} {...base} />)
  expect(screen.getByRole('button', { name: /openspec/ }).dataset.suite).toBe('openspec')
  expect(screen.getByRole('button', { name: /全新套件/ }).dataset.suite).toBe('default')
  expect(document.querySelector('.tree-suite .suite-dot')).not.toBeNull()
})

it('当前文档所属套件行有 active 与 aria-current', () => {
  render(<TreeView nodes={buildTree(FILES)} currentPath="skills/openspec/opsx/new/SKILL.md"
    activeSuiteTitle="openspec" expanded={new Set()} onSelect={vi.fn()} onToggle={vi.fn()} />)
  const suite = screen.getByRole('button', { name: /openspec/ })
  expect(suite).toHaveClass('active')
  expect(suite).toHaveAttribute('aria-current', 'true')
})
```

- [ ] **Step 2: 运行确认失败**

Run: `cd viewer && npx vitest run tests/sidebar-suite.spec.tsx`
Expected: FAIL（无 `data-suite`/`suite-dot`/active）

- [ ] **Step 3: 实现**

App.tsx 两处：目录加载 `.then` 里 `setExpanded(new Set(…all suites…))` 改为 `setExpanded(initialExpandedSuites(t, readRecent()))`（`readRecent` 已 import）；计算 `const activeSuiteTitle = tree && currentPath ? findFileContext(tree, currentPath)?.suite : undefined`（`findFileContext` 从 `lib/filter` 引入），传给 `<Sidebar activeSuiteTitle={activeSuiteTitle}>`。TreeView 套件分支：`activeSuiteTitle === node.title && 'active'`、`data-suite={suiteKey(node.title)}`、chevron 前加 `<span className="suite-dot" aria-hidden="true" />`、`aria-current={isCurrentSuite ? 'true' : undefined}`。CSS：`.suite-dot { width: 8px; height: 8px; border-radius: 3px; flex: none; background: var(--suite-mark); }`；`.tree-suite.active { background: var(--suite-soft); color: var(--suite-text); font-weight: 700; }`（替换原 `.tree-suite > .tree-label` 的加粗方案，保留其后代选择器兼容）。

- [ ] **Step 4: 运行确认通过 + 全量防回归**

Run: `cd viewer && npx vitest run tests/sidebar-suite.spec.tsx tests/suite-theme.spec.ts`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add viewer/src/components/TreeView.tsx viewer/src/components/Sidebar.tsx viewer/src/App.tsx viewer/src/styles.css viewer/tests/sidebar-suite.spec.tsx
git commit -m "feat: 侧栏套件颜色标记与按需展开"
```

---

### Task 6: 文档头与大纲的套件色接线

**Files:**
- Modify: `viewer/src/components/DocHeader.tsx`（header 加 `data-suite`）
- Modify: `viewer/src/App.tsx`（`#viewer-toc` aside 加 `data-suite`）
- Modify: `viewer/src/styles.css`（`.doc-header` 用 `--suite-soft/mark/text`；`.doc-role` 改套件色；`.crumb` 用 `--suite-text`；`.toc-item.active` 改套件色 + 左侧 3px 标记）
- Test: `viewer/tests/suite-accents.spec.tsx`（新建）；`tests/home-layout.spec.tsx`（追加一条断言）

**Interfaces:**
- Consumes: Task 1 `suiteKey`；`FileContext`（`lib/filter.ts`）。
- Produces: 无新导出；`#viewer-toc` 带 `data-suite` 供 CSS 与测试定位。

- [ ] **Step 1: 写失败测试**

`tests/suite-accents.spec.tsx`：

```tsx
// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { DocHeader } from '../src/components/DocHeader'
import type { FileContext } from '../src/lib/filter'

afterEach(cleanup)

const doc = { path: 'docs/skills/openspec/opsx-new-中文版.md', title: 'opsx new 中文版', content: '' }
const context = (suite?: string): FileContext => ({
  node: { type: 'file', path: doc.path, title: doc.title, role: 'zh', skillId: 'opsx-new' },
  suite, skill: 'opsx-new',
})

it('文档头标注所属套件，未知套件为 default', () => {
  const { container } = render(<DocHeader doc={doc} context={context('openspec')} crossLinks={[]}
    onNavigate={() => {}} readingTheme="classic" onReadingThemeChange={() => {}} />)
  expect(container.querySelector('.doc-header')!.getAttribute('data-suite')).toBe('openspec')
})
```

`tests/home-layout.spec.tsx` 在「进入文档后出现」用例末尾追加：

```tsx
expect(document.querySelector('#viewer-toc')!.getAttribute('data-suite')).toBe('superpowers')
```

- [ ] **Step 2: 运行确认失败**

Run: `cd viewer && npx vitest run tests/suite-accents.spec.tsx tests/home-layout.spec.tsx`
Expected: FAIL（`data-suite` 均为 null）

- [ ] **Step 3: 实现**

DocHeader：`<header className="doc-header" data-suite={suiteKey(context?.suite)}>`。App：`<aside id="viewer-toc" className="toc-panel" data-suite={suiteKey(activeSuiteTitle)}>`（复用 Task 5 的 `activeSuiteTitle`，注意 Task 5 未导入 `suiteKey`，此处补 import）。CSS：`.doc-header { background: var(--suite-soft); border-bottom-color: var(--suite-mark); }`；`.doc-role { background: var(--suite-soft); color: var(--suite-text); border: 1px solid var(--suite-mark); }`；`.doc-header .crumb { color: var(--suite-text); }`（`.crumb-current` 保持 `var(--text)` 加粗）；`.toc-item.active { background: var(--suite-soft); color: var(--suite-text); font-weight: 700; box-shadow: inset 3px 0 0 var(--suite-mark); }`。

- [ ] **Step 4: 运行确认通过**

Run: `cd viewer && npx vitest run tests/suite-accents.spec.tsx tests/home-layout.spec.tsx tests/reading-theme.spec.ts`
Expected: 全部 PASS（reading-theme 防正文被误染）

- [ ] **Step 5: 提交**

```bash
git add viewer/src/components/DocHeader.tsx viewer/src/App.tsx viewer/src/styles.css viewer/tests/suite-accents.spec.tsx viewer/tests/home-layout.spec.tsx
git commit -m "feat: 文档头与大纲的套件色接线"
```

---

### Task 7: 全量验证与人工验收

**Files:**
- 无新代码；如修复问题，改动归属上述文件并单独提交。

- [ ] **Step 1: 全量测试 + 类型 + 构建**

Run: `cd viewer && npm test && npm run typecheck && npm run build`
Expected: 92+ 条测试全 PASS；typecheck、build 无错误。

- [ ] **Step 2: 人工浏览器验收（无法自动化的部分，逐项核对并在对话中报告）**

启动 `cd viewer && npm run dev`，用真实六套资料核对：
1. 欢迎页：六张套件色卡进入正确目标；无空白大纲栏；窄屏（约 390px）卡片单列无横向滚动。
2. 文档页：大纲恢复且为已保存栏宽；四种阅读样式 × 明暗模式逐一切换，正文、代码块、表格不被套件色改写。
3. 深色模式下逐套检查 `--suite-*` 三元组对比度（正文文字 ≥ 4.5:1，大号标题 ≥ 3:1），不够则只微调 styles.css 数值。
4. 键盘：Tab 遍历侧栏与套件卡，焦点轮廓在彩色背景上可见；当前套件行有 `aria-current`。
5. 截图：欢迎页与文档页各一张（明/暗），存 `docs/superpowers/plans/` 供对照草图。

- [ ] **Step 3: 如有人工验收导致的修复，提交**

```bash
git add -A viewer/ DESIGN.md
git commit -m "fix: 学习地图改版人工验收修正"
```
