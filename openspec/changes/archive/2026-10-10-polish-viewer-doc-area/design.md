# polish-viewer-doc-area · 设计

## Context

查看器（viewer/，React 18 + Vite + react-markdown 生态）已有可用的三栏布局与双主题 CSS 变量体系（`styles.css`，`<html data-theme>` 切换）。本 change 全部落在 `viewer/src/`，服务端与 API 契约零改动。动机见 proposal.md，行为契约见 specs/viewer-reading-experience/spec.md。

## Goals / Non-Goals

**Goals:**

- 代码块获得语言标签、复制按钮、完整的双主题高亮
- 文档头从"细面包屑"升级为信息完整的 hero 区（标题/徽章/元信息/进度条）
- 排版细节（标题锚点、表格行 hover、引用块层次）达到成熟文档站质感
- 欢迎页从纯文字升级为仪表盘（统计/套件导航/最近打开）

**Non-Goals:**

- 不改 viewer/server/ 与任何 API（元信息全部前端计算）
- 不引入新 npm 依赖
- 不做 Mermaid、分栏对照（维持 v1 共识）
- 不做全文字号调节器等设置面板（YAGNI，等真实需求）

## Decisions

### D1 代码块：包装而非重写

自定义 react-markdown 的 `pre` 组件：外层包 `<figure class="code-block">`，头部条（语言标签 + 复制按钮）+ 原始 `<pre>` 原样透传 children。

- 语言来源：`code` 元素的 `className="language-xxx"`（rehype-highlight 依赖同一约定，不会不一致）
- 复制实现：`navigator.clipboard.writeText(codeRef.textContent)`；try/catch 失败显示"复制失败"状态（localhost 是安全上下文，失败仅在极端环境出现）
- **否决的备选**：在 `code` 组件上做——pre 才是围栏容器语义；重写高亮 HTML——会破坏 rehype-highlight 输出，丢失着色

### D2 高亮主题：手写补全暗色 token，不引第二套官方 CSS

浅色继续用已引入的 `highlight.js/styles/github.css`；暗色在 styles.css 的 `[data-theme='dark']` 作用域下把常见 token（keyword/string/comment/number/title/attr/built_in/section/literal/regexp/meta…）补齐到 ~20 条。

- **否决的备选**：同时引入 github-dark.css——两套 CSS 的 `.hljs-*` 规则同名，后者无条件覆盖前者，无法按主题切换；要按主题生效就得给整份文件加前缀改写，工作量和手写一样但多一份 11KB 资源

### D3 进度条：scroll 监听 + rAF 节流

`.main` 是滚动容器（现状如此）。`ReadingProgress` 组件监听其 scroll 事件，`requestAnimationFrame` 节流计算 `scrollTop / (scrollHeight - clientHeight)`，写 CSS 变量驱动 2px 顶部条。

- **否决的备选**：IntersectionObserver——适合离散区间（TOC 高亮已在用），不适合连续百分比

### D4 标题锚点：自定义 heading 组件，不碰 URL hash

自定义 `h1–h4` 组件：内容后附 `<button class="heading-anchor">`（CSS hover 才显示）。点击 = `scrollIntoView` + `flash` 高亮动画类。**绝不写 location.hash**（与 `#/?path=` 路由冲突，这是硬约束）。

- **否决的备选**：纯 CSS `::before` 图标——不可交互；复制链接到剪贴板——单机工具没有分享场景

### D5 元信息：纯前端计算

字数用 content 字符数（中文语境下"字符数"是最诚实的指标），标题数复用已有 `extractHeadings()`，路径直接用 `doc.path`。零 API 改动是本 change 的边界承诺。

### D6 欢迎页：新组件 WelcomePanel，套件导航有确定回退链

- 统计：复用 `collectSkills/collectFiles`
- 套件卡片点击目标（回退链）：套件总览（role=suite-intro）→ 首技能的中文版 → 首技能源码 → 套件下任意第一个文件
- 最近打开：localStorage 键 `viewer-recent`，`string[]`（路径），去重置顶、上限 10；写入挂在 App 打开文档的 effect 里；读写均 try/catch，失败时该区域静默隐藏

### D7 组件拆分

新增四个内聚组件，全部小文件：`CodeBlock`（含在 MarkdownBody 文件内或独立文件，实现时定）、`DocHeader`（从 DocView 拆出）、`ReadingProgress`、`WelcomePanel`。DocView 瘦身为组装层。

## Risks / Trade-offs

- [自定义 pre 意外破坏 rehype-highlight 结构] → 只包装不重写 children；若高亮丢失，spec 场景"切换主题"会直接暴露
- [clipboard 被拒] → catch 后按钮显示失败态，spec 已定义该降级
- [scroll 监听性能] → passive listener + rAF 节流；365 文件量级无压力
- [localStorage 禁用] → try/catch，最近打开区域隐藏，其余功能不受影响
- [暗色 token 手写覆盖不全] → 只覆盖常见 token，长尾语言退化为默认色，可读性不受损（GitHub dark 的前景色兜底）

## Migration Plan

纯前端增量改动，无数据迁移。回滚 = 还原 viewer/src/ 下本次改动即可，无外部状态（localStorage 键是新增的，遗留无害）。

## Open Questions

（无——徽章具体配色、欢迎页卡片密度等纯视觉参数实现时定即可，不影响契约与任务拆分）
