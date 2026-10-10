# polish-viewer-doc-area · 任务清单

## 1. 代码块升级（A）

- [x] 1.1 新建 CodeBlock 组件：包装 `pre`（figure 容器 + 头部条），从 code 元素 className 解析语言标签，无语言显示 "text"
- [x] 1.2 CodeBlock 复制按钮：clipboard API 写入 code 原文，成功显示"已复制"、失败显示"复制失败"，短暂延时后恢复
- [x] 1.3 MarkdownBody 接入自定义 pre 组件（只包装不重写 children，保住 rehype-highlight 结构）
- [x] 1.4 styles.css 暗色主题 hljs token 覆盖补全（keyword/string/comment/number/title/attr/built_in/section/literal/regexp/meta 等）

## 2. 文档头 hero 化（B）

- [x] 2.1 从 DocView 拆出 DocHeader 组件：面包屑 + 文档大标题 + 角色徽章（中文版/详细设计讲解/源码，按 role 着色）+ 互跳链接
- [x] 2.2 DocHeader 元信息行：字符数、标题数（复用 extractHeadings）、相对路径，全部前端计算
- [x] 2.3 新建 ReadingProgress 组件：监听 .main 滚动（passive + rAF 节流），CSS 变量驱动顶部进度条
- [x] 2.4 DocView 组装 DocHeader 与 ReadingProgress，移除旧头部样式

## 3. 排版质感（C）

- [x] 3.1 MarkdownBody 自定义 h1–h4：标题后附锚点按钮（hover 显示），点击 scrollIntoView + flash 高亮动画，不写 location.hash
- [x] 3.2 styles.css：表格数据行 hover 高亮、引用块左强调条 + 底色 + 图标层次、正文字号行距微调

## 4. 欢迎页仪表盘（D）

- [x] 4.1 新建 WelcomePanel：统计卡片（套件/技能/文档数）+ 套件导航卡片（技能数、文档数，点击按回退链打开：总览 → 首技能中文版 → 首技能源码 → 首个文件）
- [x] 4.2 最近打开：localStorage 键 `viewer-recent`（路径数组，去重置顶、上限 10，读写 try/catch）；App 打开文档的 effect 里写入
- [x] 4.3 WelcomePanel 渲染最近打开列表（点击直达，空则隐藏该区域），App 用 WelcomePanel 替换旧欢迎块

## 5. 验证

- [x] 5.1 npm run typecheck 零错误；npx vitest run 27 个既有测试全绿
- [x] 5.2 交接手动验收清单（用户自跑 dev server）：语言标签/复制反馈/双主题高亮/进度条/锚点高亮/表格行 hover/套件导航跳转/最近打开去重
