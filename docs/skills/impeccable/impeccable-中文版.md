# impeccable · 中文版

> **来源**：`skills/impeccable/impeccable/SKILL.md`（上游 `pbakaus/impeccable`，版本 4.5.2）  
> **类型**：前端界面设计、评审与改进技能  
> **触发**：设计、重设计、规划、评审、审计或改进网站、应用界面及组件；不用于纯后端任务。

---

## frontmatter

- **name**：`impeccable`，技能名称。
- **description**：当用户要设计或改进前端界面时使用，覆盖信息架构、视觉层级、无障碍、性能、响应式、文案、状态、动效和设计系统；纯后端任务不触发。
- **metadata.version**：`4.5.2`，技能版本。

## 正文

本技能提供工具和授权，让设计达到值得称为超越常见范式的工艺水准。处理设计任务时，应像优秀的设计总监一样，兼顾可投产的代码、创造力、明确的观点、对客户与用户需求的深入理解，以及出色的细节。

核心原则：

- 全力完成，不犹豫、不走捷径；除必须由用户提供的素材外，交付物应完整。
- 大胆构想，做出鲜明、美观、出色且有启发性的作品。
- 验证要有边界，且上限覆盖截图、缺陷扫描、微调和重新构建的整个周期。完整构建后，一次性检查桌面与移动端（原生应用检查实际交付设备），集中修复所见问题，最多再确认一轮，然后停止打磨。无限循环的自检会消耗用户成本，也不如交付前的专门复核有效。

> **批注**：这里把“完整交付”和“有限轮验证”绑定，避免模型把追求完美误解成没有退出条件的反复修改。

## 设置

1. 每次会话运行一次 `<技能根目录>/scripts/impeccable context`。技能根目录指包含本 `SKILL.md` 的目录，而不是更上层的插件目录；工作目录保持在用户项目。技能及参考文件中的启动器命令都以此目录解析。只有运行环境没有提供技能根目录时，才使用 `.agents/skills/impeccable/scripts` 作为后备路径。Windows 环境若没有 `sh`，改用 `impeccable.cmd`。启动器运行旁边自带或首次运行时下载的独立二进制程序，无需 Node。可通过 `--target <路径>` 指定源码文件或路由。它会加载 `PRODUCT.md`、`DESIGN.md`、匹配的页面简报及相关原生平台指南；遵循输出，不重复运行。
2. 根据请求加载手册：明确或隐含的子命令，读下方命令表所指的参考文件；新页面或更换视觉体系，读[新作品流程](../../../skills/impeccable/impeccable/reference/new-work.md)。编辑前检查目标和现有视觉事实。应用无法运行时，从已提交的视觉回归基准或截图样例入手，核对目标、时效及其与当前样式、组件、素材的关系，并比较主题和变体。
3. 分析和方向确定后、任何界面编辑之前，立即读[工艺底线](../../../skills/impeccable/impeccable/reference/craft-floor.md)，小幅优化也一样。它规定质量底线、绝对禁令和检测器无法捕捉的判断；只做规划时无需加载。

> **批注**：`context → 任务手册 → craft-floor` 是按需加载链。上下文负责事实，手册负责该任务的步骤，底线留到动手前加载，减少无关规则占用注意力。

**启动器不可用**：若启动器被拒绝或失败，在下一次工具调用之前，单独发送“上下文加载未运行；我会直接读取现有项目上下文”。然后读取已有的 `PRODUCT.md` 与 `DESIGN.md`，不虚构缺失内容；继续第 2、3 步和可用工具。无论规划还是编辑，启动器失败本身都不阻止工作。

## 如何设计

- **简报优先**：尊重用户明确指定的审美、时代、材质、字体与配色，即使它们触发了常见模式警告。把明确要求改成自己的偏好属于失败。
- **优化保留，重设计替换**：优化保留现有身份、行为、文案及范围外内容；替换事实文案或增加主张前应询问。重设计保留产品事实、内容、功能、原生习惯与约束，但把旧视觉当作证据和反面参照；在新作品流程中选定新体系并替换 `DESIGN.md`，不要把已放弃的旧风格稍作润色当成重设计。
- **有负面历史含义的符号不作装饰**：主题文化不等于可以使用与军国主义、至上主义或仇恨运动相关的徽记，包括旭日旗放射纹、邦联战旗、纳粹符号及其变体。应改用该文化的中性形式；作为事实记载的内容保持原样。
- **视觉权威来自证据，而不是文件名**：缺少 `DESIGN.md` 不代表项目是全新设计。由新作品流程判断应保留、扩展还是替换现有视觉体系。

> **批注**：这组规则把用户简报、产品事实和现有实现分开。尤其是“没有设计文档”不能自动授权重设计，避免局部任务破坏成熟界面。

## 模式

模式描述访问者在当前界面上怎样才算成功。

- **说服**：访问者作决定并行动；设计本身就是产品体验。适用于落地页、营销、活动、定价页，应赢得注意与行动。简报需要真实图片时就交付真实图片，并遵循已确定的视觉体系。
- **操作**：访问者完成任务。适用于应用、仪表盘、编辑器、管理后台、设置和工具。易扫读、一致性、原生预期与真实使用场景优先于表现欲；品牌体现在精准细节中。
- **阅读**：访问者理解信息。适用于文档、文章、指南、帮助和更新记录。先组织内容以便理解，再提高阅读体验。
- **体验**：访问者进入作品本身。适用于作品集、画廊和展示。让作品从首屏领路，界面退居其后。

根据请求的**当前界面**而非整个产品选择模式，并只把模式记在该界面的简报中。工具的落地页仍是“说服”；时尚品牌的文档仍是“阅读”；文档目录也是“阅读”。新页面细节见[新作品流程](../../../skills/impeccable/impeccable/reference/new-work.md)，“操作”与“阅读”的深入指导见[操作指南](../../../skills/impeccable/impeccable/reference/operate.md)。

## 命令

| 命令 | 类别 | 作用 | 源码参考 |
|---|---|---|---|
| `craft [功能]` | 构建 | 普通新作品请求的已弃用别名 | [craft.md](../../../skills/impeccable/impeccable/reference/craft.md) |
| `shape [功能]` | 构建 | 写代码前规划界面与体验 | [shape.md](../../../skills/impeccable/impeccable/reference/shape.md) |
| `init` | 构建 | 将持久产品背景记录在 `PRODUCT.md` | [init.md](../../../skills/impeccable/impeccable/reference/init.md) |
| `document` | 构建 | 从现有代码生成 `DESIGN.md` | [document.md](../../../skills/impeccable/impeccable/reference/document.md) |
| `extract [目标]` | 构建 | 提取可复用的设计令牌和组件 | [extract.md](../../../skills/impeccable/impeccable/reference/extract.md) |
| `critique [目标]` | 评估 | 按启发式标准评审体验 | [critique.md](../../../skills/impeccable/impeccable/reference/critique.md) |
| `audit [目标]` | 评估 | 检查无障碍、性能与响应式等技术质量 | [audit.md](../../../skills/impeccable/impeccable/reference/audit.md)、[原生版](../../../skills/impeccable/impeccable/reference/audit.native.md) |
| `polish [目标]` | 优化 | 发布前的最后质量检查 | [polish.md](../../../skills/impeccable/impeccable/reference/polish.md) |
| `bolder [目标]` | 优化 | 增强平淡、保守的设计 | [bolder.md](../../../skills/impeccable/impeccable/reference/bolder.md) |
| `quieter [目标]` | 优化 | 收敛过度张扬的设计 | [quieter.md](../../../skills/impeccable/impeccable/reference/quieter.md) |
| `distill [目标]` | 优化 | 去除复杂性，保留核心 | [distill.md](../../../skills/impeccable/impeccable/reference/distill.md) |
| `harden [目标]` | 优化 | 补齐错误、国际化与边界情况 | [harden.md](../../../skills/impeccable/impeccable/reference/harden.md) |
| `onboard [目标]` | 优化 | 改进首次使用、空状态和激活路径 | [onboard.md](../../../skills/impeccable/impeccable/reference/onboard.md) |
| `animate [目标]` | 增强 | 加入有目的的动效 | [animate.md](../../../skills/impeccable/impeccable/reference/animate.md) |
| `colorize [目标]` | 增强 | 为单调界面引入有策略的色彩 | [colorize.md](../../../skills/impeccable/impeccable/reference/colorize.md) |
| `typeset [目标]` | 增强 | 改善字体、层级和排版 | [typeset.md](../../../skills/impeccable/impeccable/reference/typeset.md) |
| `layout [目标]` | 增强 | 调整布局、间距和视觉节奏 | [layout.md](../../../skills/impeccable/impeccable/reference/layout.md) |
| `delight [目标]` | 增强 | 增加个性与令人愉悦的细节 | [delight.md](../../../skills/impeccable/impeccable/reference/delight.md) |
| `overdrive [目标]` | 增强 | 实现超出常规的技术效果 | [overdrive.md](../../../skills/impeccable/impeccable/reference/overdrive.md) |
| `clarify [目标]` | 修复 | 改善标签、错误提示和界面文案 | [clarify.md](../../../skills/impeccable/impeccable/reference/clarify.md) |
| `adapt [目标]` | 修复 | 适配不同设备与屏幕尺寸 | [adapt.md](../../../skills/impeccable/impeccable/reference/adapt.md)、[原生版](../../../skills/impeccable/impeccable/reference/adapt.native.md) |
| `optimize [目标]` | 修复 | 诊断并改进界面性能 | [optimize.md](../../../skills/impeccable/impeccable/reference/optimize.md) |
| `live` | 迭代 | 在浏览器中选取元素，比较视觉变体 | [live.md](../../../skills/impeccable/impeccable/reference/live.md) |
| `generate [数量] [动作] [元素]` | 迭代 | 为指定元素生成多个方案，无需先手动点选 | [generate.md](../../../skills/impeccable/impeccable/reference/generate.md) |

路由规则：

- **没有参数**：读[路由手册](../../../skills/impeccable/impeccable/reference/routing.md)，展示与上下文有关的菜单，不自动执行命令。
- **明确或明显隐含某个命令**：读取相应参考文件；原生平台读取对应原生版。两个命令都可能适用时，只询问一次。
- **询问工作流或命令选择**：读[工作流问题](../../../skills/impeccable/impeccable/reference/routing.md#workflow-questions)。
- **其他设计请求**：按一般设计工作处理。若新页面或替换视觉体系时缺少 `PRODUCT.md`，先运行初始化再进入新作品流程；若只是对现有代码做局部优化，则按 `impeccable context` 给出的既有实现继续，事后可建议初始化，但不把它当作阻塞条件。
- `teach` 是 `init` 的别名。`craft` 是普通新作品请求的已弃用别名，不增加额外步骤。`shape` 负责发现任务需求，之后仅在决定视觉体系和页面概念时进入新作品流程。

初始化写入 `PRODUCT.md` 后继续，无需重跑 `impeccable context`。如果记录的平台是 `ios`、`android` 或 `adaptive`，初始化会自行加载对应的原生平台参考。

**固定／取消固定快捷命令**：运行 `.agents/skills/impeccable/scripts/impeccable pin <pin|unpin> <命令>`，创建或移除独立的 `$<命令>` 快捷入口。简要报告脚本结果；出错时原样转达标准错误输出。

**钩子**：`$impeccable hooks <on|off|status|ignore-rule|ignore-file|ignore-value|reset>` 管理项目的设计检测钩子。界面文件编辑后，它会自动运行检测器并给出发现。用户调用该命令及参数时，读取[钩子手册](../../../skills/impeccable/impeccable/reference/hooks.md)。

**诊断**：`$impeccable doctor` 检查并修复项目中的 Impeccable 产物与当前版本之间的偏差，包括 `PRODUCT.md`、`DESIGN.md` 及其配套文件、配置、页面简报和钩子。用户调用命令，或询问哪些内容过期、失配、需要刷新时，读取[诊断手册](../../../skills/impeccable/impeccable/reference/doctor.md)。设置输出中的 `CONTEXT_STALE` 是同一报告的简化版，应按该输出处理，不要无请求地额外运行诊断。

**不要在设计任务中顺手修复产物偏差**。除非用户提出要求，只报告 `CONTEXT_STALE`，不直接处理；唯一例外是标为 `auto` 的项目，它会在下次写入该文件时自动处理。

> **批注**：把“做设计”和“修复项目产物漂移”分开，可避免一次局部设计请求悄悄改动持久上下文或钩子配置。

## 附属文件

以下文件均保留在[技能源码目录](../../../skills/impeccable/impeccable/SKILL.md)，不复制进 `docs/`。参考手册按命令和职责分组列出；每个文件名均可在源码路径下直接打开。

| 文件名 | 作用 | 源码路径 |
|---|---|---|
| `reference/adapt.md` | 跨设备适配与原生平台指南 | [`reference/adapt.md`](../../../skills/impeccable/impeccable/reference/adapt.md) |
| `reference/adapt.native.md` | 跨设备适配与原生平台指南 | [`reference/adapt.native.md`](../../../skills/impeccable/impeccable/reference/adapt.native.md) |
| `reference/android.md` | 跨设备适配与原生平台指南 | [`reference/android.md`](../../../skills/impeccable/impeccable/reference/android.md) |
| `reference/ios.md` | 跨设备适配与原生平台指南 | [`reference/ios.md`](../../../skills/impeccable/impeccable/reference/ios.md) |
| `reference/animate.md` | 各类定向优化手册 | [`reference/animate.md`](../../../skills/impeccable/impeccable/reference/animate.md) |
| `reference/bolder.md` | 各类定向优化手册 | [`reference/bolder.md`](../../../skills/impeccable/impeccable/reference/bolder.md) |
| `reference/clarify.md` | 各类定向优化手册 | [`reference/clarify.md`](../../../skills/impeccable/impeccable/reference/clarify.md) |
| `reference/colorize.md` | 各类定向优化手册 | [`reference/colorize.md`](../../../skills/impeccable/impeccable/reference/colorize.md) |
| `reference/delight.md` | 各类定向优化手册 | [`reference/delight.md`](../../../skills/impeccable/impeccable/reference/delight.md) |
| `reference/distill.md` | 各类定向优化手册 | [`reference/distill.md`](../../../skills/impeccable/impeccable/reference/distill.md) |
| `reference/audit.md` | 质量审计、体验评审与组件复核 | [`reference/audit.md`](../../../skills/impeccable/impeccable/reference/audit.md) |
| `reference/audit.native.md` | 质量审计、体验评审与组件复核 | [`reference/audit.native.md`](../../../skills/impeccable/impeccable/reference/audit.native.md) |
| `reference/critique.md` | 质量审计、体验评审与组件复核 | [`reference/critique.md`](../../../skills/impeccable/impeccable/reference/critique.md) |
| `reference/component-review.md` | 质量审计、体验评审与组件复核 | [`reference/component-review.md`](../../../skills/impeccable/impeccable/reference/component-review.md) |
| `reference/craft.md` | 新作品方向、可视化与工艺底线 | [`reference/craft.md`](../../../skills/impeccable/impeccable/reference/craft.md) |
| `reference/craft-floor.md` | 新作品方向、可视化与工艺底线 | [`reference/craft-floor.md`](../../../skills/impeccable/impeccable/reference/craft-floor.md) |
| `reference/new-work.md` | 新作品方向、可视化与工艺底线 | [`reference/new-work.md`](../../../skills/impeccable/impeccable/reference/new-work.md) |
| `reference/shape.md` | 新作品方向、可视化与工艺底线 | [`reference/shape.md`](../../../skills/impeccable/impeccable/reference/shape.md) |
| `reference/visualize.md` | 新作品方向、可视化与工艺底线 | [`reference/visualize.md`](../../../skills/impeccable/impeccable/reference/visualize.md) |
| `reference/region-map.md` | 新作品方向、可视化与工艺底线 | [`reference/region-map.md`](../../../skills/impeccable/impeccable/reference/region-map.md) |
| `reference/document.md` | 项目上下文、设计系统与诊断 | [`reference/document.md`](../../../skills/impeccable/impeccable/reference/document.md) |
| `reference/extract.md` | 项目上下文、设计系统与诊断 | [`reference/extract.md`](../../../skills/impeccable/impeccable/reference/extract.md) |
| `reference/init.md` | 项目上下文、设计系统与诊断 | [`reference/init.md`](../../../skills/impeccable/impeccable/reference/init.md) |
| `reference/doctor.md` | 项目上下文、设计系统与诊断 | [`reference/doctor.md`](../../../skills/impeccable/impeccable/reference/doctor.md) |
| `reference/hooks.md` | 项目上下文、设计系统与诊断 | [`reference/hooks.md`](../../../skills/impeccable/impeccable/reference/hooks.md) |
| `reference/generate.md` | 浏览器现场迭代 | [`reference/generate.md`](../../../skills/impeccable/impeccable/reference/generate.md) |
| `reference/live.md` | 浏览器现场迭代 | [`reference/live.md`](../../../skills/impeccable/impeccable/reference/live.md) |
| `reference/live-setup.md` | 浏览器现场迭代 | [`reference/live-setup.md`](../../../skills/impeccable/impeccable/reference/live-setup.md) |
| `reference/harden.md` | 具体界面问题的处理手册 | [`reference/harden.md`](../../../skills/impeccable/impeccable/reference/harden.md) |
| `reference/layout.md` | 具体界面问题的处理手册 | [`reference/layout.md`](../../../skills/impeccable/impeccable/reference/layout.md) |
| `reference/onboard.md` | 具体界面问题的处理手册 | [`reference/onboard.md`](../../../skills/impeccable/impeccable/reference/onboard.md) |
| `reference/operate.md` | 具体界面问题的处理手册 | [`reference/operate.md`](../../../skills/impeccable/impeccable/reference/operate.md) |
| `reference/optimize.md` | 具体界面问题的处理手册 | [`reference/optimize.md`](../../../skills/impeccable/impeccable/reference/optimize.md) |
| `reference/overdrive.md` | 具体界面问题的处理手册 | [`reference/overdrive.md`](../../../skills/impeccable/impeccable/reference/overdrive.md) |
| `reference/polish.md` | 具体界面问题的处理手册 | [`reference/polish.md`](../../../skills/impeccable/impeccable/reference/polish.md) |
| `reference/quieter.md` | 具体界面问题的处理手册 | [`reference/quieter.md`](../../../skills/impeccable/impeccable/reference/quieter.md) |
| `reference/typeset.md` | 具体界面问题的处理手册 | [`reference/typeset.md`](../../../skills/impeccable/impeccable/reference/typeset.md) |
| `reference/mode-operate.md` | 模式要求与命令路由 | [`reference/mode-operate.md`](../../../skills/impeccable/impeccable/reference/mode-operate.md) |
| `reference/mode-persuade.md` | 模式要求与命令路由 | [`reference/mode-persuade.md`](../../../skills/impeccable/impeccable/reference/mode-persuade.md) |
| `reference/mode-read.md` | 模式要求与命令路由 | [`reference/mode-read.md`](../../../skills/impeccable/impeccable/reference/mode-read.md) |
| `reference/routing.md` | 模式要求与命令路由 | [`reference/routing.md`](../../../skills/impeccable/impeccable/reference/routing.md) |
| `reference/degraded/asset-producer.md` | 专用代理不可用时的降级指引 | [`reference/degraded/asset-producer.md`](../../../skills/impeccable/impeccable/reference/degraded/asset-producer.md) |
| `reference/degraded/documenter.md` | 专用代理不可用时的降级指引 | [`reference/degraded/documenter.md`](../../../skills/impeccable/impeccable/reference/degraded/documenter.md) |
| `reference/degraded/finish-reviewer.md` | 专用代理不可用时的降级指引 | [`reference/degraded/finish-reviewer.md`](../../../skills/impeccable/impeccable/reference/degraded/finish-reviewer.md) |
| `reference/degraded/manual-edit-applier.md` | 专用代理不可用时的降级指引 | [`reference/degraded/manual-edit-applier.md`](../../../skills/impeccable/impeccable/reference/degraded/manual-edit-applier.md) |
| `agents/impeccable_asset_producer.toml` | 专用代理配置和展示元数据 | [`agents/impeccable_asset_producer.toml`](../../../skills/impeccable/impeccable/agents/impeccable_asset_producer.toml) |
| `agents/impeccable_documenter.toml` | 专用代理配置和展示元数据 | [`agents/impeccable_documenter.toml`](../../../skills/impeccable/impeccable/agents/impeccable_documenter.toml) |
| `agents/impeccable_finish_reviewer.toml` | 专用代理配置和展示元数据 | [`agents/impeccable_finish_reviewer.toml`](../../../skills/impeccable/impeccable/agents/impeccable_finish_reviewer.toml) |
| `agents/impeccable_manual_edit_applier.toml` | 专用代理配置和展示元数据 | [`agents/impeccable_manual_edit_applier.toml`](../../../skills/impeccable/impeccable/agents/impeccable_manual_edit_applier.toml) |
| `agents/openai.yaml` | 专用代理配置和展示元数据 | [`agents/openai.yaml`](../../../skills/impeccable/impeccable/agents/openai.yaml) |
| `scripts/impeccable` | 启动器、版本与命令元数据 | [`scripts/impeccable`](../../../skills/impeccable/impeccable/scripts/impeccable) |
| `scripts/impeccable.cmd` | 启动器、版本与命令元数据 | [`scripts/impeccable.cmd`](../../../skills/impeccable/impeccable/scripts/impeccable.cmd) |
| `scripts/VERSION` | 启动器、版本与命令元数据 | [`scripts/VERSION`](../../../skills/impeccable/impeccable/scripts/VERSION) |
| `scripts/command-metadata.json` | 启动器、版本与命令元数据 | [`scripts/command-metadata.json`](../../../skills/impeccable/impeccable/scripts/command-metadata.json) |
| `scripts/live-browser.js` | 现场浏览器操作与截图支持 | [`scripts/live-browser.js`](../../../skills/impeccable/impeccable/scripts/live-browser.js) |
| `scripts/live-browser-dom.js` | 现场浏览器操作与截图支持 | [`scripts/live-browser-dom.js`](../../../skills/impeccable/impeccable/scripts/live-browser-dom.js) |
| `scripts/live-browser-ignores.js` | 现场浏览器操作与截图支持 | [`scripts/live-browser-ignores.js`](../../../skills/impeccable/impeccable/scripts/live-browser-ignores.js) |
| `scripts/live-browser-session.js` | 现场浏览器操作与截图支持 | [`scripts/live-browser-session.js`](../../../skills/impeccable/impeccable/scripts/live-browser-session.js) |
| `scripts/modern-screenshot.umd.js` | 现场浏览器操作与截图支持 | [`scripts/modern-screenshot.umd.js`](../../../skills/impeccable/impeccable/scripts/modern-screenshot.umd.js) |
| `scripts/data/font-index.json` | 字体数据和失败记录 | [`scripts/data/font-index.json`](../../../skills/impeccable/impeccable/scripts/data/font-index.json) |
| `scripts/data/font-index-failures.json` | 字体数据和失败记录 | [`scripts/data/font-index-failures.json`](../../../skills/impeccable/impeccable/scripts/data/font-index-failures.json) |

## 相关

- [impeccable · 详细设计讲解](impeccable-详细设计讲解.md)
- [本套件技能原理深度讲解](技能原理深度讲解.md)
