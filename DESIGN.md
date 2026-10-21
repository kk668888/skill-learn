---
version: alpha
name: "skill-learn viewer"
description: "供中文技能文档阅读与对照的三栏查看器，应用外壳克制，正文使用固定的衬线阅读排版。"
colors:
  app-background: "#fbfbfe"
  panel: "#ffffff"
  text: "#1f2328"
  muted: "#57606a"
  border: "#d0d7de"
  accent: "#0969da"
  dark-background: "#0d1117"
  dark-panel: "#161b22"
  dark-text: "#e6edf3"
  dark-accent: "#58a6ff"
typography:
  sans:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif"
  serif:
    fontFamily: "'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', SimSun, serif"
  mono:
    fontFamily: "Consolas, 'Cascadia Code', 'Courier New', monospace"
rounded:
  control: "6px"
  code: "7px"
  pill: "999px"
spacing:
  sidebar-default: "252px"
  toc-default: "205px"
  pane-divider: "6px"
components:
  document: {}
  sidebar: {}
  table-of-contents: {}
  code-block: {}
---

# skill-learn viewer 设计约定

## Overview

查看器服务于阅读和对照 Superpowers、OpenSpec、grill 等工作流的中文文档。整体参照技术文档阅读器：目录和大纲稳定、信息密度适中，视觉表达集中在正文排版。用户主要在桌面查阅，也可在窄屏阅读；界面用中文，源码与文档可保留原有英文术语。

应用外壳采用产品工具的安静语气。正文使用一套固定排版；套件识别色经 `data-suite` 变量只作用于导航、入口和文档头。避免给每段内容套彩色卡片、加入装饰性渐变或用动效干扰连续阅读。

运行时代码是颜色与尺寸的权威来源：全局变量与正文区 `.doc-body` 的固定配色都在 `viewer/src/styles.css`。本文件记录它们的语义和映射，不生成 CSS。修改持久变量时同步更新本文件并检查明暗两种模式。

## Colors

全站浅色使用 `--bg`、`--bg-panel`、`--text`、`--text-secondary`、`--border`、`--accent`，分别对应 frontmatter 的 `app-background`、`panel`、`text`、`muted`、`border`、`accent`。深色由根节点 `data-theme='dark'` 覆盖，背景、面板、正文和强调色分别对应 `dark-background`、`dark-panel`、`dark-text`、`dark-accent`。链接、选中项和焦点共用语义强调色。

正文区域在 `.doc-body` 上固定设计稿配色：正文 `#414a5a`、标题 `#30394a`，引用底 `#f4f5fb` 配 `#6572be` 强调线，代码块恒为深蓝 `#202943` 配 `#c9d8f4` 文字，语法高亮用同一套浅色 token。深色模式由 `:root[data-theme='dark'] .doc-body` 单独取值。表格悬停整行着色，焦点轮廓保持可辨。

套件识别色由 `data-suite` 属性触发 `--suite-mark`（标记/轮廓）、`--suite-soft`（浅色面）、`--suite-text`（其上的文字），定义在 `viewer/src/styles.css` 的套件变量区，明暗各一套。key 由 `viewer/src/lib/suiteTheme.ts` 的 `suiteKey()` 生成，与下表对应；未知套件使用 `default` 中性配色，不因缺少映射隐藏内容。颜色是辅助识别线索：套件名、选中态和文档位置始终用文字或形状表达，不能只靠颜色传达。

| 套件 | 基准识别色 | 使用位置 |
|------|-----------|----------|
| OpenSpec | `#626DBE` | 紫蓝标记与浅色块 |
| Superpowers | `#3A9588` | 青绿标记与浅色块 |
| grill | `#B47D45` | 琥珀标记与浅色块 |
| impeccable | `#9A70A6` | 紫色标记与浅色块 |
| anthropics | `#4282AA` | 蓝色标记与浅色块 |
| frontend-design-premium | `#C57A69` | 珊瑚色标记与浅色块 |

## Typography

应用控件采用 frontmatter 的 `sans` 字体栈；正文与文档头标题固定使用 `serif` 衬线栈；代码及语言标签采用 `mono`。这些都是本地字体栈，不依赖在线字体。正文 15px、行高 1.85，铺满中栏，长代码和宽表格在自身容器横向滚动。

## Layout

桌面为目录、正文、大纲三栏，默认宽度对应 `sidebar-default`、`toc-default`，两条分隔轨各为 `pane-divider`。中屏隐藏大纲，窄屏把目录收起为入口。正文与文档头都横跨整个中栏，仅留内边距。文档头的面包屑与阅读样式控件可换行；390px 下保持完整标签与选项。

## Elevation & Depth

层级主要由面板底色、边线、文字权重和间距区分。侧栏使用轻微阴影，正文、引用和代码块不使用浮动卡片阴影。阅读进度是文档顶部的细线，不遮挡正文或控件。

## Shapes

输入和选择控件使用约 6px 圆角，代码容器使用 7px，文档互跳标签使用胶囊形。标题左线、引用强调条和表格分隔线承载结构信息。

## Components

文档头展示位置、标题、关联文档和元数据，互跳标签使用胶囊按钮。导航仍使用既有侧栏、链接和大纲行为。

代码块保留语言标签、复制按钮及成功或失败反馈；工具栏使用代码块自己的配色。加载、错误与空状态沿用原有文字提示。正文链接和按钮在悬停与键盘焦点下提供反馈；装饰性标题闪烁应尊重系统减弱动效设置。

## Do's and Don'ts

- **应当**用真实中文长文、表格及多语言代码检验正文排版，覆盖明暗和窄屏。
- **应当**让正文样式改动只作用于主阅读区，并保留已选明暗模式和文档位置。
- **避免**给阅读页增加与查阅任务无关的品牌装饰或远程字体依赖。
