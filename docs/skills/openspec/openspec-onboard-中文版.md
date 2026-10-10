# openspec-onboard · 中文版

> **来源**：`skills/openspec/skills/openspec-onboard/SKILL.md`
> **类型**：工作流技能（新手引导 / 教学）
> **触发**：首次接触 OpenSpec，想让 AI 带着走完一个完整周期时

---

## frontmatter

- **name**：`openspec-onboard`
- **description**：OpenSpec 的引导式上手——带叙述地走完一个完整的工作流周期，并在真实代码库上做实际工作。
- **allowed-tools**：`Bash(openspec:*)`——只允许执行 `openspec` 命令
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: 1.0`、`generatedBy: 1.8.0`

## 正文

带用户走完他们的**第一个完整 OpenSpec 工作流周期**。这是一次教学体验——你会在他们真实的代码库里做实际工作，同时解释每一步。

> **批注**：这个技能在 12 个 OpenSpec 技能里是很特殊的一类：它不产出变更、不改规格，它的**产物是用户的理解**。而且它的设计立场很明确——教学不能靠"读文档"，必须靠"做完一遍"。原文用了一句很讲究的措辞：*"you'll do real work in their codebase **while explaining** each step"*。工作是实的，解释是附着在真实工作上的。

**Store 选择：** 如果用户点名了一个 store（store 是本机注册的一个独立 OpenSpec 仓库），或者工作本身就位于某个 store 中，则先运行 `openspec store list --json` 发现已注册的 store id，然后在读写规格与变更的命令上（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）传 `--store <id>`。一旦选定，就把 `--store <id>` 视为在本次工作流余下部分**粘性**生效。下文每一条未加范围的示例都是简写：运行前请补上这个 flag。例如应运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文展示的未加范围形式。其他命令不接受该 flag。命令打印的提示本身已带上该 flag，后续跟进时保留它。未指定 store 时，命令作用于最近的本地 `openspec/` 根目录。

---

## Preflight

开始之前，检查 OpenSpec CLI 是否已安装：

```bash
# Unix/macOS
openspec --version 2>&1 || echo "CLI_NOT_INSTALLED"
# Windows (PowerShell)
# if (Get-Command openspec -ErrorAction SilentlyContinue) { openspec --version } else { echo "CLI_NOT_INSTALLED" }
```

**若 CLI 未安装：**
> OpenSpec CLI 尚未安装。请先安装它，然后回到 `/opsx:onboard`。

若未安装就停在这里。

---

## Phase 1: Welcome

展示：

```
## Welcome to OpenSpec!

我会带你走完一个完整的变更周期——从想法到实现——用你代码库里的一个真实任务。一路上，你会通过亲手做来学会这套工作流。

**我们要做的事：**
1. 在你代码库里挑一个小而真实的任务
2. 简要地探索这个问题
3. 创建一个变更（承载我们工作的容器）
4. 产出各个 artifact：proposal → specs → design → tasks
5. 实现这些任务
6. 归档已完成的变更

**耗时：** 约 15-20 分钟

先从找个活儿干开始。
```

---

## Phase 2: Task Selection

### Codebase Analysis

扫描代码库，寻找小的改进机会。留意：

1. **TODO/FIXME 注释**——在代码文件中搜索 `TODO`、`FIXME`、`HACK`、`XXX`
2. **缺失的错误处理**——吞掉错误的 `catch` 块、没有 try-catch 的风险操作
3. **没有测试的函数**——把 `src/` 与测试目录交叉比对
4. **类型问题**——TypeScript 文件里的 `any` 类型（`: any`、`as any`）
5. **调试痕迹**——非调试代码里的 `console.log`、`console.debug`、`debugger` 语句
6. **缺失的校验**——没有校验的用户输入处理

同时查看近期的 git 活动：
```bash
# Unix/macOS
git log --oneline -10 2>/dev/null || echo "No git history"
# Windows (PowerShell)
# git log --oneline -10 2>$null; if ($LASTEXITCODE -ne 0) { echo "No git history" }
```

### Present Suggestions

根据你的分析，给出 3-4 条具体的建议：

```
## Task Suggestions

根据对你代码库的扫描，这里有一些不错的入门任务：

**1. [最有希望的任务]**
   位置：`src/path/to/file.ts:42`
   范围：约 1-2 个文件，约 20-30 行
   为何合适：[简短理由]

**2. [第二个任务]**
   位置：`src/another/file.ts`
   范围：约 1 个文件，约 15 行
   为何合适：[简短理由]

**3. [第三个任务]**
   位置：[位置]
   范围：[估计]
   为何合适：[简短理由]

**4. 别的什么？**
   告诉我你想做什么。

你对哪个任务感兴趣？（选个编号，或者描述你自己的）
```

**若什么都没找到：** 退回到询问用户想构建什么：
> 我在你的代码库里没找到明显的快速改进点。有什么小东西是你一直想加或想修的？

> **批注**：注意这个两段式设计——**先扫、后问**，而不是直接问。先扫的价值不在于"总能找到"，而在于**给出了具体的锚点**：用户看到"第 2 条，`src/another/file.ts`，约 15 行"时，判断成本远低于面对"你想做什么"这类开放问题。而扫不到时退回开放提问（而不是硬凑一个建议），这条退路同样重要——硬凑的任务会把教学变成表演。

### Scope Guardrail

如果用户挑的或描述的东西太大（大功能、多日工作量）：

```
那是个有价值的任务，但对你的第一次 OpenSpec 走查来说可能偏大了。

为了学这套工作流，小一点更好——它能让你看到完整周期，而不会卡在实现细节里。

**选项：**
1. **切小一点**——[他们的任务] 里最小的有用片段是什么？也许只是 [具体切片]？
2. **换一个**——其他建议里的某一个，或者另一个小任务？
3. **还是要做**——如果你确实想啃这个，我们可以做。只是要知道它会花更久。

你更倾向哪种？
```

若用户坚持，就让他覆盖——**这是一条软护栏**。

> **批注**：Soft guardrail 这个设定值得单独说。OpenSpec 在其他地方用的是**硬门禁**（`Planning boundary` 直接禁止未批准的规划进入实现），而这里刻意选了软的：给出三条出路（切小、换一个、还是要做），并明说"让用户覆盖"。
>
> **为什么这里必须软**——因为硬护栏会让教学变成受阻。新手第一次用这套东西时被系统驳回，学到的是"这工具很烦"，而不是"这工具很严谨"。而软护栏的代价（用户挑了大任务、学习体验退化）是**只伤害自己的选择**，不像硬场景里那样会污染共享资产。这是一个把约束强度**匹配到后果严重性**的例子。

---

## Phase 3: Explore Demo

任务选定后，简要演示 explore 模式：

```
在我们创建变更之前，让我快速给你看看 **explore 模式**——它是你在选定方向之前用来想清楚问题的。
```

花 1-2 分钟调查相关代码：
- 读取涉及的文件
- 如果有助于说明，画一个简略的 ASCII 图
- 记下任何需要考虑的点

```
## Quick Exploration

[你的简要分析——发现了什么、有哪些考虑]

┌─────────────────────────────────────────┐
│   [可选：如有帮助，放 ASCII 图]           │
└─────────────────────────────────────────┘

Explore 模式（`/opsx:explore`）就是用来做这类思考的——在实现之前先调查。任何时候你需要想清楚一个问题，都可以用它。

现在我们来创建一个变更来承载我们的工作。
```

**PAUSE**——等待用户确认后再继续。

> **批注**：这里是 onboard 相对"用户自己去看文档"的关键差异：**它把 explore 内联演示了一遍**，而不是说"另外还有个 explore 命令，你可以去用"。理由很简单——抽象地知道一个命令存在，和亲眼看到它在当前任务上跑出结果，是两种完全不同的理解。代价是这一阶段会花掉 1-2 分钟，而且演示得出的分析**不必然被后续阶段采用**（它只是演示）。

---

## Phase 4: Create the Change

**EXPLAIN:**
```
## 创建一个变更

OpenSpec 里的"变更"（change）是一个容器，装着围绕某项工作的全部思考与规划。它位于 `openspec status --change "<name>" --json` 报告的 `changeRoot`，里面存放你的 artifact——proposal、specs、design、tasks。

让我为我们的任务创建一个。
```

**DO:** 用一个推导出的 kebab-case 名称创建变更：
```bash
openspec new change "<derived-name>"
```

**SHOW:**
```
已创建：<来自 status JSON 的 changeRoot>

文件夹结构：
```
<changeRoot>/
├── proposal.md    ← 我们为什么做这个（空的，稍后填）
├── design.md      ← 我们怎么建（空的）
├── specs/         ← 详细需求（空的）
└── tasks.md       ← 实现清单（空的）
```

现在来填第一个 artifact——proposal。
```

---

## Phase 5: Proposal

**EXPLAIN:**
```
## Proposal

proposal 记录我们**为什么**要做这个变更，以及它在高层面**涉及什么**。这是这项工作的"电梯陈述"。

我会根据我们的任务起草一份。
```

**DO:** 起草 proposal 内容（先别保存）：

`<capability-path>` 是相对于 `specs/` 的规格目录（例如 `user-auth` 或 `identity/user-auth`）。修改既有 capability 时使用其精确的既有路径。对于新 capability，遵循项目既有的规格组织方式。

```
这是一份草案：

---

## Why

[1-2 句话解释问题/机会]

## What Changes

[将会发生什么变化的要点]

## Capabilities

### New Capabilities
- `<capability-path>`：[简短描述]

### Modified Capabilities
<!-- 如果要修改既有行为 -->
- `<existing-capability-path>`：[简短描述]

## Impact

- `src/path/to/file.ts`：[什么会变]
- [其他相关文件]

---

这抓住你的意图了吗？保存之前我可以调整。
```

**PAUSE**——等待用户批准/反馈。

获得批准后，保存 proposal：
```bash
openspec instructions proposal --change "<name>" --json
```
然后把内容写入 `openspec instructions proposal --change "<name>" --json` 返回的 `resolvedOutputPath`。

```
Proposal 已保存。这是你的"为什么"文档——随着理解的演进，你可以随时回来打磨它。

接下来：specs。
```

---

## Phase 6: Specs

**EXPLAIN:**
```
## Specs

specs 用精确、可测试的措辞定义我们**要建什么**。它使用 requirement/scenario 格式，让预期行为一目了然。

对于像这样的小任务，我们可能只需要一个 spec 文件。
```

**DO:** 确定 spec 文件应该创建在哪里：
```bash
openspec instructions specs --change "<name>" --json
# 使用 JSON 里的 resolvedOutputPath。如果它是 glob，就依据 schema 指令和该变更的上下文选出具体的文件路径。
```

起草 spec 内容：

```
这是 spec：

---

## ADDED Requirements

### Requirement: <名称>

<系统应该做什么的描述>

#### Scenario: <场景名>

- **WHEN** <触发条件>
- **THEN** <预期结果>
- **AND** <如有需要，追加结果>

---

这个格式——WHEN/THEN/AND——让需求可测试。你完全可以把它当测试用例来读。
```

保存到从 `resolvedOutputPath` 选出的具体文件路径。

---

## Phase 7: Design

**EXPLAIN:**
```
## Design

design 记录我们**怎么**建它——技术决策、取舍、方案。

对于小改动，这部分可能很简短。这没问题——不是每个变更都需要深入的设计讨论。
```

**DO:** 起草 design.md：

```
这是 design：

---

## Context

[关于当前状态的简要上下文]

## Goals / Non-Goals

**Goals:**
- [我们想达成什么]

**Non-Goals:**
- [明确不在范围内的是什么]

## Decisions

### Decision 1: [关键决策]

[方案与理由的说明]

---

对于小任务，这样就抓住了关键决策，而没有过度设计。
```

保存到 `openspec instructions design --change "<name>" --json` 返回的 `resolvedOutputPath`。

---

## Phase 8: Tasks

**EXPLAIN:**
```
## Tasks

最后，我们把工作拆成实现任务——驱动 apply 阶段的复选框。

这些任务应该小、清晰、按逻辑排序。
```

**DO:** 基于 specs 和 design 生成任务：

```
这是实现任务：

---

## 1. [分类或文件]

- [ ] 1.1 [具体任务]
- [ ] 1.2 [具体任务]

## 2. Verify

- [ ] 2.1 [验证步骤]

---

每个复选框都会成为 apply 阶段的一个工作单元。准备好了要开始实现吗？
```

**PAUSE**——等待用户确认已准备好开始实现。

保存到 `openspec instructions tasks --change "<name>" --json` 返回的 `resolvedOutputPath`。

---

## Phase 9: Apply (Implementation)

**EXPLAIN:**
```
## Implementation

现在我们逐项实现任务，边做边勾掉。我会宣告每一项，偶尔说明 specs/design 是如何影响做法的。
```

**DO:** 对每个任务：

1. 宣告："Working on task N: [描述]"
2. 在代码库中实现该改动
3. 自然地引用 specs/design："spec 里说 X，所以我这么做 Y"
4. 在 tasks.md 中标记完成：`- [ ]` → `- [x]`
5. 简短状态："✓ Task N complete"

保持叙述轻量——不要逐行解释代码。

所有任务完成后：

```
## Implementation Complete

全部任务完成：
- [x] Task 1
- [x] Task 2
- [x] ...

变更已实现！还剩一步——我们来归档它。
```

> **批注**：四个阶段（5-8）在结构上高度同构——都是 EXPLAIN（这是什么、为什么需要它）→ DO（起草，**先不保存**）→ 呈现草案 → PAUSE（等批准）→ 保存。重复四遍不是啰嗦，而是**刻意的节奏训练**：用户在第四个 artifact 时已经能预判下一步，这种"可预判感"正是"学会了"的体感来源。另外"先呈现草案、等批准、再保存"这个顺序也呼应了 OpenSpec 的规划门禁——**改动在获得认可之前不落盘**。

---

## Phase 10: Archive

**EXPLAIN:**
```
## Archiving

变更为完成后，我们归档它。归档路径由 `planningHome.changesDir` 和日期推导得出。

归档后的变更成为你项目的决策历史——你随时可以回头找到它们，理解某个东西当初为什么那样建。
```

**DO:** 归档变更（`--yes` 用于回答那些你无法从工具调用中回答的确认提示）：
```bash
openspec archive "<name>" --yes
```

**SHOW:**
```
已归档到：`<planningHome.changesDir>/archive/<target-name>/`（target name 会前置今天的日期；若名称本身已以 `YYYY-MM-DD-` 开头，则保持原样，不再叠加日期）

这个变更现在是你项目历史的一部分了。代码在你的代码库里，决策记录被保留了下来。
```

---

## Phase 11: Recap & Next Steps

```
## Congratulations!

你刚刚完成了一个完整的 OpenSpec 周期：

1. **Explore**——想清楚问题
2. **New**——创建变更容器
3. **Proposal**——记录 WHY
4. **Specs**——详细定义 WHAT
5. **Design**——决定 HOW
6. **Tasks**——拆成步骤
7. **Apply**——实现工作
8. **Archive**——保存记录

同一个节奏适用于任何规模的变更——小修补或大功能都一样。

---

## Command Reference

**核心工作流：**

 | 命令              | 作用                        |
 |-------------------|-----------------------------|
 | `/opsx:propose` | 创建一个变更并生成全部 artifact |
 | `/opsx:explore` | 在工作之前/之中想清楚问题      |
 | `/opsx:apply`   | 实现某个变更里的任务           |
 | `/opsx:archive` | 归档一个已完成的变更           |

**额外命令**（仅在已安装时可用——取决于你的 profile）：

 | 命令                | 作用                                    |
 |---------------------|-----------------------------------------|
 | `/opsx:new`       | 开始一个新变更，逐个 artifact 推进        |
 | `/opsx:continue`  | 继续一个已有的变更                        |
 | `/opsx:ff`        | 快进：一次性创建全部 artifact             |
 | `/opsx:verify`    | 校验实现是否与 artifact 一致               |

---

## What's Next?

挑一件你真正想建的东西，试试 `/opsx:propose`。你已经掌握这个节奏了！
```

> **批注**：收尾这一段有个细节值得注意——"额外命令"那组明确标注了 *"only if installed - availability depends on your profile"*。因为 OpenSpec 的默认 profile 只装 6 个技能/命令，扩展 profile 才装齐 12 个（`new`/`continue`/`ff`/`verify`/`bulk-archive`/`onboard` 属于扩展组）。教学时推荐一个用户机器上不存在的命令，会造成"我说了但它没有"的困惑——所以宁可先标注条件。

---

## Graceful Exit Handling

### 用户中途想停

如果用户说要停下、想暂停，或看起来已经走神：

```
没问题！你的变更保存在 `openspec status --change "<name>" --json` 报告的 `changeRoot`。

以后想接着做：
- `/opsx:continue <name>`——继续 artifact 的创建（若已安装；否则用 `openspec status --change "<name>" --json` 查看下一个 artifact）
- `/opsx:apply <name>`——直接跳到实现（若 tasks 已存在）

工作不会丢。准备好了随时回来。
```

不带压力地优雅退出。

### 用户只想要命令参考

如果用户说只想看命令、或想跳过教程：

```
## OpenSpec Quick Reference

**核心工作流：**

 | 命令                     | 作用                        |
 |--------------------------|-----------------------------|
 | `/opsx:propose <name>` | 创建一个变更并生成全部 artifact |
 | `/opsx:explore`        | 想清楚问题（不改代码）         |
 | `/opsx:apply <name>`   | 实现任务                      |
 | `/opsx:archive <name>` | 完成后归档                    |

**额外命令**（仅在已安装时可用——取决于你的 profile）：

 | 命令                      | 作用                          |
 |---------------------------|-------------------------------|
 | `/opsx:new <name>`      | 开始一个新变更，逐步骤推进      |
 | `/opsx:continue <name>` | 继续一个已有的变更              |
 | `/opsx:ff <name>`       | 快进：一次性创建全部 artifact   |
 | `/opsx:verify <name>`   | 校验实现                       |

试试 `/opsx:propose` 开始你的第一个变更。
```

优雅退出。

> **批注**：两条退出路径的设计都围绕同一个取向——**不施压**。原文的 Guardrails 里有一条写得很直白：*"Handle exits gracefully—never pressure the user to continue."* 这一条在教学中是硬要求：一个被追着"你确定不要走完吗"的新手，会把"学这套工作流"和"被人推销"关联起来。另外第二条退出路径（只要命令参考）实际上是把"跳过教程"变成了**一条正常的、被设计过的分支**，而不是"用户不配合"。

---

## Guardrails

- **在关键转折点遵循 EXPLAIN → DO → SHOW → PAUSE 的节拍**（explore 之后、proposal 草案之后、tasks 之后、archive 之后）
- **实现期间保持叙述轻量**——教学而不说教
- **即使变更很小也不要跳过任何阶段**——目标是教会这套工作流
- **在标注处暂停等待确认**，但不要过度暂停
- **优雅处理退出**——绝不施压让用户继续
- **使用真实的代码库任务**——不要模拟，也不要用假例子
- **温和地调整范围**——引导向更小的任务，但尊重用户的选择

> **批注**：*"Don't skip phases even if the change is small"* 这条护栏解释了整个技能为什么要把一个小任务走完 11 个阶段。有人会问：既然任务这么小，为什么不能省掉 design？答案在于**目标不是完成这个任务，而是让用户看到完整的周期**。一旦某个阶段被"因为简单所以跳过"，用户就少看到一段，而这恰恰是他以后在真实项目里会遇到、却从没见人做过的部分。这条护栏同时也是对本技能的自我约束：**教学效果优先于效率**。

---

## 附属文件

本技能无附属文件（仅 `SKILL.md`）。

---

## 相关

- [openspec-onboard-详细设计讲解.md](./openspec-onboard-详细设计讲解.md) —— 本文的设计分析：为什么教学必须走完真实周期、软护栏为何必须软
- [openspec-explore-中文版.md](./openspec-explore-中文版.md) —— 第 3 阶段内联演示的那个技能
- [openspec-propose-中文版.md](./openspec-propose-中文版.md) —— 一次性生成全部 artifact 的常规入口（onboard 教完之后推荐用户用的就是它）
- [openspec-archive-change-中文版.md](./openspec-archive-change-中文版.md) —— 第 10 阶段调用的归档流程
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— openspec 整体原理（含 delta 与真相树的数据模型）
