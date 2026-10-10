# polish-viewer-doc-area · 提案

## Why

查看器（viewer/）中间文档区当前只有裸排版：头部是细弱面包屑，658 个代码块没有语言标签和复制按钮，欢迎页是纯文字列表。这批文档本质上是"代码文档"（代码围栏 1316 行、89 个文件含表格），阅读区的呈现质量直接决定工具好不好用。

## What Changes

四个方向全部纳入（探索阶段已确认"全部都加上"）：

- **A 代码块升级**：每个代码围栏显示语言标签；右上角一键复制按钮（复制成功有反馈）；语法高亮主题换更完整的方案，暗色 token 覆盖补全
- **B 文档头 hero 化**：面包屑下增加大标题（文档名）与角色徽章（中文版/详细设计讲解/源码）；元信息行显示字数、标题数、相对路径（全部前端从 content 计算，不改 API）；顶部细滚动进度条跟随阅读位置
- **C 排版质感**：标题 hover 显示锚点链接图标；表格行 hover 高亮；引用块视觉升级（图标/底色层次）；正文字号行距微调
- **D 欢迎页仪表化**：统计卡片（套件/技能/文档数）+ 套件色块导航 + 最近打开列表（localStorage 记录）

明确不做（维持既有共识）：Mermaid 渲染（v2）、源码/中文版分栏对照（v1 互跳够用）、服务端任何改动。

## Capabilities

### New Capabilities

- `viewer-reading-experience`: 查看器文档阅读区的呈现行为——代码块交互（语言标签/复制/高亮主题）、文档头信息架构（hero 标题/徽章/元信息/进度条）、排版细节（锚点/表格/引用块）、欢迎页仪表盘（统计/套件导航/最近打开）

### Modified Capabilities

（无——openspec/specs/ 目前为空，本 change 是该能力首个规格）

## Impact

- 仅动 `viewer/src/`（styles.css、DocView/MarkdownBody/Toc/App 等组件，可能新增 CodeBlock、DocHeader、WelcomePanel 组件）
- 不改 `viewer/server/` 与任何 API 契约；元信息全部由前端从已有 content 计算
- 最近打开功能使用 localStorage（键名沿用 viewer- 前缀约定）
- 不新增 npm 依赖（高亮主题若需要，用 highlight.js 自带的第二套官方 CSS 或手写补全，不引新库）
