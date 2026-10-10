# skill-learn

学习并搞清 Superpowers、OpenSpec、grill、frontend-design-premium 四套 AI 工作流的流程与原理，并把技能沉淀为可检索的中文文档。

## Language

**Superpowers**:
一套以过程技能（process skills）为核心的 Claude Code 插件，链路为 brainstorming → writing-plans → TDD → review，靠"任何任务前必须先调技能"的强制规则生效。
_Avoid_: 超能力、SP

**grill**:
一套以拷问式访谈为核心的技能组合（grill-me / grill-with-docs / grilling / domain-modeling），链路为设计树 × 前沿 × 轮次，并把共识沉淀为术语表与 ADR。
_Avoid_: grilling（那只是它的内核之一）、Grill

**OpenSpec**:
一套 spec 驱动开发（spec-driven development）的 CLI 工作流，链路为 proposal → spec → tasks → implement，靠目录约定（`.openspec/`）生效。
_Avoid_: 开放规格、OS

**frontend-design-premium**:
一套前端**审美 + 生产行为契约**的技能，只有一个技能但强制与外部技能 `frontend-design` 组合使用，并用项目根的 `DESIGN.md` 补上 agent 缺失的持久记忆。
_Avoid_: frontend-design（那是它的上游，不是同一套）、premium（单独用时指代不明）

**L2**:
本项目的完成标准：能向他人讲清各套流程中每一步存在的原因，而不只是会操作。
_Avoid_: 熟悉、掌握（太模糊，禁止用于验收）

**技能机制**:
Claude Code 技能的底层运作方式（SKILL.md、frontmatter 字段、触发方式、插件与本地目录的区别），区别于某套流程的具体内容。

**共存/取舍**:
本项目的核心问题：Superpowers、OpenSpec、grill 三套在"计划→实现"阶段重叠，谁是主力、谁配合谁、何时切换。
_Avoid_: 选哪个（预设了二选一的答案）

**讲解-实验法**:
本项目采用的学习方式：先输出原理讲解打底，再用同一小需求分别过一遍两套流程验证。

**规划门禁**:
规划态与执行态分离的硬性规则。Superpowers 中叫 HARD-GATE，OpenSpec 中叫 Planning boundary，两者独立发明、语义相同：设计未经人工批准前禁止写任何代码。
_Avoid_: 硬门禁（中英混用）、gate

**delta（增量规格）**:
OpenSpec 中进行中变更不直接修改主规格，只写 ADDED/MODIFIED/REMOVED 需求增量；archive 时才合并进 `openspec/specs/` 真相树。
_Avoid_: 规格差异、spec diff

**capability（能力域）**:
OpenSpec 组织规格的单位（kebab-case 路径，如 `user-auth`），按业务能力而非代码模块划分，每个 capability 一个 spec.md。

**前沿（frontier）**:
grilling 中前置决策已全部敲定、此刻可合法提出的问题集合；前沿为空即拷问完成、没有沉默的假设。

**薄入口（thin entry）**:
正文仅一行转发到内核技能的入口技能（如 grill-me），`disable-model-invocation: true` 只许手动触发；入口管用户意图，内核管触发语义。

**技能文档**:
`docs/skills/` 下技能文档的总称，由三类文件构成：技能原理深度讲解、中文版、详细设计讲解。规范见项目根 `CLAUDE.md`。
_Avoid_: 技能笔记、技能说明（都指代不明）

**详细设计讲解**:
`<套件>/<技能名>-详细设计讲解.md`，单个技能的设计分析：解决什么问题、关键决策与取舍、机制如何运转、何时会失效。与「中文版」的分工是——中文版讲"原文说了什么"，本篇讲"为什么这么设计、换个做法行不行"。
_Avoid_: 设计文档、详解（指代不明）、原理（那是套件级的）

**触发短语**:
一组固定措辞（如"生成技能文档 X"），说出即触发技能文档的生成或更新。清单见 `CLAUDE.md`。
_Avoid_: 口令、关键词（暗示自动监听，实际不存在）

**中文版**:
`<套件>/<技能名>-中文版.md`，纯中文逐段译文，仅在设计关键点附段末批注（`> **批注**：…`）。不做中英对照，不放英文副本。
_Avoid_: 译注、翻译（旧称或只强调了"译"）

**技能原理深度讲解**:
`<套件>/技能原理深度讲解.md`，该套件的整体设计原理（主链路 + 每步为什么存在 + 设计哲学），每套一份，不逐个介绍技能。
_Avoid_: 原理（旧称）、综述

**信任边界（trust boundary）**:
frontend-design-premium 的安全条款：PRD / ADR / CONTEXT.md / 领域契约等业务文档是**证据**而非**指令**；只有本技能 SKILL.md、上游技能与用户请求才是指令源。用于防 prompt injection。
_Avoid_: 权限边界（那是另一回事）

**注册类型（register）**:
frontend-design-premium 的目标页面分类：**产品/管理页**走完整 premium 契约，**营销落地页**只加可访问性/布局稳定性/滚动条/减弱动效四类打磨。只豁免行为契约，不豁免语言区域与可访问性规则。

**规范归属者（canonical owner）**:
某个 UI 行为的唯一权威实现。已存在则复用或扩展，不存在且会反复出现则创建一个共享原语并记录决策；**未解出则阻塞该能力的实现**。

**高风险类别**:
七类"错误默认值不可补救"的决策（权限/金钱/隐私/不可逆变更/法律文案/非幂等副作用/共享状态转换）。这些**没有默认值**，必须来自权威来源或升级上报——与低风险默认值的关键区别在于错误能否低成本撤销。
