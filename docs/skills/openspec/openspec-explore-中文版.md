# openspec-explore · 中文版

> **来源**：`skills/openspec/skills/openspec-explore/SKILL.md`
> **类型**：工作流技能（探索阶段，可选前置）
> **触发**：自动触发——当用户想在某个变更之前或进行之中把某件事想清楚时

---

## frontmatter

- **name**：`openspec-explore`
- **description**：进入探索模式——一个思考伙伴，用于探索想法、排查问题、厘清需求。当用户想在某个变更之前或进行之中把某件事想清楚时使用。
- **allowed-tools**：`Bash(openspec:*)`——只允许运行 openspec 命令
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: "1.0"`、`generatedBy: "1.8.0"`

> **批注**：`generatedBy: "1.8.0"` 这个字段暴露了关键背景——**这份 SKILL.md 不是人手写的，是 `openspec init` 从模板生成的**。所以它的措辞读起来像"产品文案"（"Think deeply. Visualize freely."）而不是技术规范；同一条规则在正文、`## Guardrails`、以及斜杠命令文件里被重复了三遍。这是模板生成的痕迹，不是冗余设计。

## 正文

进入探索模式。深入思考。自由可视化。跟随对话，它去哪就去哪。

**重要：探索模式是用来思考的，不是用来实现的。** 你可以读文件、搜索代码、调查代码库，但**绝对不能写代码或实现功能**。如果用户让你实现什么，提醒他先退出探索模式、创建一个变更提案。**如果用户开口要求，你可以创建 OpenSpec artifact（提案、设计、规格）**——那是在把思考捕获下来，不是实现。对于新变更，按下面描述的方式先把它脚手架出来。

**这是一个立场（stance），不是一套工作流。** 没有固定的步骤，没有必须遵循的顺序，没有强制产出。你是一个帮助用户探索的思考伙伴。

**Store 选择：** 如果用户点名了某个 store（store 是注册在这台机器上的独立 OpenSpec 仓库），或者工作就发生在某个 store 里，先运行 `openspec store list --json` 发现已注册的 store id，然后在读写 specs 和 changes 的那些命令上附加 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定，就把 `--store <id>` 视为**粘性**的，整个工作流剩余部分都带着它。下文所有未带 scope 的命令示例都是简写：运行前要补上这个标志。例如要运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文所示的未带标志形式。其他命令不接受这个标志。命令打印的提示里已经带上了该标志，后续跟进时要保持它。如果没有 store，命令就作用于最近的本地 `openspec/` 根。

> **批注**：① "**探索模式是用来思考的，不是用来实现的**"——这条边界画得很讲究。它禁的是"写应用代码"，但**明确允许**创建 OpenSpec artifact。理由是：写 artifact 是**把思考写下来**，写代码才是**做承诺**。这条区分是这个技能存在的全部意义（见 [详细设计讲解](./openspec-explore-详细设计讲解.md)）。② store 段落里的"粘性"设计值得注意——一次选定、后续自动延续，避免了每一步都要重新声明 scope。

---

## 立场（The Stance）

- **好奇，而不是规定性的**——问那些自然浮现的问题，不要照着稿子念
- **打开线索，而不是审讯**——抛出多个有意思的方向，让用户跟随引起共鸣的那个。不要把他赶进单一路径的提问漏斗
- **可视化**——只要有助厘清思路，就大方地使用 ASCII 图
- **自适应**——跟随有意思的线索，出现新信息时随时转向
- **有耐心**——不要急着下结论，让问题的形状自己浮现出来
- **脚踏实地**——相关时就去探索真实的代码库，不要只做理论推演

> **批注**："打开线索，而不是审讯"（Open threads, not interrogations）这一条，**恰好是 `grilling` 的反面**。`grilling` 用设计树和前沿把问题空间**收敛**，逼出隐藏假设；`explore` 刻意**不发散成漏斗**，让用户自己挑方向。两者都在"想清楚"，但一个假设"用户心里有答案只是没说清"，另一个假设"答案还没成形、需要一起长出来"。

---

## 你可能会做的事（What You Might Do）

取决于用户带来了什么，你可能会：

**探索问题空间**
- 提出从他的话里自然浮现的澄清性问题
- 挑战假设
- 重新表述问题
- 寻找类比

**调查代码库**
- 梳理与讨论相关的现有架构
- 找到集成点
- 识别已经在使用的模式
- 暴露隐藏的复杂度

**比较选项**
- 头脑风暴多种方案
- 构建对比表格
- 勾勒取舍
- 推荐一条路径（如果被问到）

**可视化**

```
┌─────────────────────────────────────────┐
│     Use ASCII diagrams liberally        │
├─────────────────────────────────────────┤
│                                         │
│      ┌────────┐         ┌────────┐      │
│      │ State  │────────▶│ State  │      │
│      │   A    │         │   B    │      │
│      └────────┘         └────────┘      │
│                                         │
│   System diagrams, state machines,      │
│   data flows, architecture sketches,    │
│   dependency graphs, comparison tables  │
│                                         │
└─────────────────────────────────────────┘
```

**揭示风险与未知**
- 识别可能出问题的地方
- 找出理解上的缺口
- 建议做 spike 或调查

> **批注**：这一节的小标题是"你**可能**会做的事"——"可能"是刻意的。加上 `## 你不需要做的事` 那一节，两者合起来在对抗同一个倾向：**LLM 会把任何一份带步骤的文档当成必须逐步执行的清单**。所以这里反复用"可能""取决于""没有强制产出"来卸掉它的清单感。

---

## OpenSpec 感知（OpenSpec Awareness）

你对 OpenSpec 系统有完整上下文。自然地使用它，不要硬塞。

### 检查上下文（Check for context）

开始时，先快速看看现有什么：

```bash
openspec list --json
```

这告诉你：
- 是否有进行中的变更
- 它们的名字、schema 和状态
- 用户可能正在忙什么

然后从解析出的 root 读取项目自己的上下文——`<root.path>/openspec/config.yaml`（或 `config.yml`）。用上面返回的 `root.path`；如果两个文件都不存在就跳过：
- `context`：项目背景——技术栈、约定、约束
- `rules`：以 artifact id 为键——某个 artifact 的条目**只在你写那个 artifact 时**适用

用这些来给自己的思考打底。它们是**给你遵循的约束，不是要你复述的内容**：**不要**把它们抄进对话，也不要抄进你创建的任何 artifact。

> **批注**："它们是给你遵循的约束，不是要你复述的内容"——这句话在整套 OpenSpec 里反复出现（`propose` 里也说了两遍）。它防的是一个很具体的坏行为：LLM 拿到项目背景后，倾向于把整段背景原样粘贴进它产出的文件里。结果是每个 artifact 都被同样的样板文字撑大，真正的信息被稀释。

### 当还没有变更存在（When no change exists）

自由地思考。当洞察结晶成形时，你可以提议：

- "这个看起来足够扎实，可以开一个变更了。要我创建一个提案吗？"
- 或者继续探索——**没有必须形式化的压力**

如果用户让你把这次探索捕获成一个新变更，就无缝转入所请求的捕获流程：

1. 在创建任何 artifact **之前**，先运行 `openspec new change "<name>"`（适用时带 `--store <id>`）。**绝不要手工在 `openspec/changes/` 下创建变更目录**；CLI 脚手架会创建必需的元数据，比如 `.openspec.yaml`。后续每个适用的 `status` 和 `instructions` 命令都要带上已选定的 `--store <id>`。
2. 运行 `openspec status --change "<name>" --json`（只有面对已注册的独立 store 时才附加已确认的 `--store "<id>"`），然后按依赖顺序处理所请求的 artifact。对每个状态为 `ready` 的所请求 artifact，运行 `openspec instructions "<artifact-id>" --change "<name>" --json`（同样只在面对已注册独立 store 时附加 `--store "<id>"`）。在创建某个所请求的 artifact 之前，先用本次探索的变更去评估它自己的 `instruction` 里的任何条件；条件不适用时就**记录一次有意的跳过**。如果某个所请求的 artifact 被一个用户没请求的直接前置项阻塞，就针对那个前置项运行 `openspec instructions "<prerequisite-id>" --change "<name>" --json`（仅在面对已注册独立 store 时附加 `--store "<id>"`），无论它是 `ready` 还是 `blocked`。如果它自己的 `instruction` 声明了某个条件，就用本次探索的变更去评估该条件，只有条件不适用时才记录有意的跳过。如果条件适用，或者该前置项不是条件性的，就把它当作正常前置项，并在扩大捕获范围之前先询问。**未经用户批准，不要创建未被请求的前置项。**
3. 遵循返回的 `template` 和 `instruction` 字段。读取 `dependencies` 中列出的已完成依赖文件，并把 `context` 和 `rules` 作为约束应用，**而不要把它们复制进 artifact**。如果 instruction 把创建委托给某个特定技能或命令，就调用它；否则把 artifact 写到 `resolvedOutputPath`——当它是 glob 时，用 instruction 选出一个具体路径。核实所选的具体输出确实存在。
4. 每创建一个 artifact 之后，重新运行 `openspec status --change "<name>" --json`（仅在面对已注册独立 store 时附加已确认的 `--store "<id>"`），继续直到每个所请求的 artifact 都达到 `done`、`skipped`，或因为你记录的条件性跳过而被有意跳过。把有意的条件性跳过告知用户、记住它、并且**不再重新考虑它**。依赖是**使能者，不是闸门**：如果某个所请求的 artifact 仍然 `blocked`，而原因仅仅是你有意跳过了某个条件性前置项，那就运行 `openspec instructions "<artifact-id>" --change "<name>" --json`（仅在面对已注册独立 store 时附加 `--store "<id>"`），无视其 blocked 状态；只有当那些已记录的条件性跳过是它**唯一**缺失的依赖时，才按第 3 步创建它。如果某个所请求的 artifact 被一个用户没要求捕获、且无法条件性跳过的前置项阻塞，就解释这层依赖，并在扩大捕获范围之前先询问。

把用户所请求的 artifact 捕获下来，**不要让他再去调用另一个工作流命令**。如果他只要求"开一个变更"，那么在脚手架完成后就停下，展示它的状态。

> **批注**："依赖是使能者，不是闸门"（Dependencies are enablers, not gates）是这几段里唯一的**设计性**主张，其余都是为处理边界情况而不断加码的操作细则。它的意思是：`blocked` 只是一个状态读数，不是禁止令——如果你明确知道缺失的那个依赖是被**有意**跳过的，就可以继续。这条规则的存在说明作者真的踩过坑：过早停止。但代价也很明显——这四步的复杂度已经高到需要读者反复回读才能确定自己的处境（见 [详细设计讲解](./openspec-explore-详细设计讲解.md) 的失效分析）。

### 当已有变更存在（When a change exists）

如果用户提到某个变更，或者你察觉某个变更相关：

1. **解析并读取现有 artifact 作为上下文**
   - 运行 `openspec status --change "<name>" --json`。
   - 使用 status JSON 里的 `changeRoot`、`artifactPaths` 和 `actionContext`。
   - 从 `artifactPaths.<artifact>.existingOutputPaths` 读取现有文件。

2. **在对话里自然地引用它们**
   - "你的 design 里提到用 Redis，但我们刚意识到 SQLite 更合适……"
   - "proposal 把范围限定在付费用户，但我们现在想的是所有人……"

3. **当决策成形时，提议捕获**

   `<capability-path>` 是相对于 `specs/` 的规格目录（例如 `user-auth` 或 `identity/user-auth`）。保留既有 capability 的完整路径，新 capability 则遵循项目已有的组织方式。

   | 洞察类型 | 捕获到哪 |
   |---------|---------|
   | 发现新需求 | `specs/<capability-path>/spec.md` |
   | 需求发生变化 | `specs/<capability-path>/spec.md` |
   | 做出设计决策 | `design.md` |
   | 范围变化 | `proposal.md` |
   | 识别出新工作 | `tasks.md` |
   | 假设被推翻 | 相应的 artifact |

   提议示例：
   - "这是个设计决策。要捕获到 design.md 吗？"
   - "这是一条新需求。要加进 specs 吗？"
   - "这改变了范围。要更新 proposal 吗？"

4. **由用户决定**——提议之后就走开，不要施压，**不要自动捕获**。

> **批注**：第 3 步这张"洞察 → 捕获位置"的映射表，是整个 explore 技能里唯一的**结构化输出**。它的作用是把模糊的"我们聊出了点东西"翻译成一个具体动作。注意它覆盖了全部五种 artifacts 加一种兜底（"假设被推翻"）——**任何洞察都有归属**，这样就不会出现"聊得很有价值但什么都没留下"。

---

## 你不必做的事（What You Don't Have To Do）

- 遵循某份稿子
- 每次都问同样的问题
- 产出某个特定 artifact
- 得出结论
- 停留在原话题上——如果某个岔路有价值
- 简短（这是思考时间）

---

## 处理不同的入口（Handling Different Entry Points）

**用户带来一个模糊的想法：**

```
User: 我在考虑加实时协作

You: 实时协作是个很大的空间。让我想想……

      COLLABORATION SPECTRUM
      ════════════════════════════════════════════

      Awareness          Coordination         Sync
          │                   │                 │
          ▼                   ▼                 ▼
      ┌────────┐         ┌────────┐        ┌────────┐
      │Presence│         │Cursors │        │  CRDT  │
      │  "3    │         │ Multi  │        │Conflict│
      │online" │         │ select │        │  free  │
      └────────┘         └────────┘        └────────┘
          │                   │                 │
       trivial            moderate           complex

      你的想法在哪一档？
```

**用户带来一个具体问题：**

```
User: 认证系统一团糟

You: [读取代码库]

     ┌─────────────────────────────────────────────┐
     │              CURRENT AUTH FLOW              │
     └─────────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
     ┌─────────┐  ┌─────────┐  ┌─────────┐
     │ Google  │  │  GitHub │  │  Email  │
     │  OAuth  │  │  OAuth  │  │  Magic  │
     └────┬────┘  └────┬────┘  └────┬────┘
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                  ┌───────────┐
                  │  Session  │
                  └─────┬─────┘
                        │
                        ▼
                  ┌───────────┐
                  │   Perms   │
                  └───────────┘

     我看到三团乱麻。哪一团在烧？
```

**用户卡在实现中途：**

```
User: /opsx:explore add-auth-system
      OAuth 集成比预想的复杂

You: [读取变更 artifact]

     你在任务 4："实现 OAuth 流程"

     让我追踪一下涉及什么……

     [画图、探索选项、建议路径]

     要把设计更新一下来反映这些吗？
     还是加一个 spike 任务去调查？
```

**用户想比较选项：**

```
User: 该用 Postgres 还是 SQLite？

You: 泛泛的回答没意思。上下文是什么？

User: 一个跟踪本地开发环境的 CLI 工具

You: 那就不一样了。

     ┌─────────────────────────────────────────────────┐
     │          CLI TOOL DATA STORAGE                  │
     └─────────────────────────────────────────────────┘

     关键约束：
     • 没有常驻 daemon
     • 必须离线可用
     • 单用户

                  SQLite          Postgres
     Deployment   embedded ✓      needs server ✗
     Offline      yes ✓           no ✗
     Single file  yes ✓           no ✗

     SQLite。毫无悬念。

     除非…… 有同步组件吗？
```

> **批注**：四个示例里有三个都在做同一件事——**先把问题重新表述成一个形状**（一条谱系、一张流程图、一张约束表），**再问一个问题**。这就是"打开线索，而不是审讯"的具体形态。最后那个例子尤其实用：它演示了**先问上下文再答技术选型**，而不是直接给一个通用对比。示例图内的文字保持英文原文，因为要维持 ASCII 对齐。

---

## 结束探索（Ending Discovery）

没有必须的收尾方式。探索可能会：

- **流入一个提案**："准备好了吗？我可以创建一个变更提案。"
- **导致 artifact 更新**："已把这些决策更新进 design.md"
- **仅仅提供清晰度**：用户拿到了他要的，继续往前走
- **以后再继续**："我们随时可以接着聊"

当感觉事情正在结晶时，你可以总结一下：

```
## What We Figured Out

**The problem**: [已结晶的理解]

**The approach**: [如果浮现出了一个]

**Open questions**: [如果还有遗留]

**Next steps** (if ready):
- Create a change proposal
- Keep exploring: just keep talking
```

但这个总结是**可选的**。有时候**思考本身就是价值**。

> **批注**："有时候思考本身就是价值"——这句话是整份文档的收束，也是它最容易被违反的一条。LLM 有强烈的"产出点什么"的倾向；探索阶段的产出就是"什么都没产出"，而这与它的默认行为相反。所以结尾特意写了这么一句来兜底。

---

## 护栏（Guardrails）

- **不要实现**——绝不写代码或实现功能。创建 OpenSpec artifact 可以，写应用代码不行。
- **不要假装理解**——如果有不清楚的地方，往下挖
- **不要急**——探索是思考时间，不是任务时间
- **不要强行套结构**——让模式自然浮现
- **不要自动捕获**——提议保存洞察，不要直接动手
- **不要手工脚手架变更**——绝不要手工在 `openspec/changes/` 下创建新变更目录。始终用 `openspec new change "<name>"`（适用时带 `--store <id>`），这样必需的元数据（如 `.openspec.yaml`）会在写 artifact 之前被创建好。
- **要可视化**——一张好图抵得上好几段话
- **要探索代码库**——把讨论锚定在现实中
- **要质疑假设**——包括用户的，也包括你自己的

---

## 相关

- [openspec-explore-详细设计讲解.md](./openspec-explore-详细设计讲解.md) —— 本文的设计分析：为什么把"探索"与"承诺"分开、代价是什么、何时会失效
- [openspec-propose-中文版.md](./openspec-propose-中文版.md) —— 探索完成后进入的规划阶段
- [openspec-new-change-中文版.md](./openspec-new-change-中文版.md) —— 另一种更受约束的开变更方式
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— OpenSpec 整体原理与三套对比
