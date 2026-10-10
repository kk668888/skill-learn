# openspec-ff-change · 中文版

> **来源**：`skills/openspec/skills/openspec-ff-change/SKILL.md`
> **类型**：流程技能（规划态——**一次生成全部所需 artifact**）
> **触发**：用户想快速创建实现所需的全部 artifact、而不逐个过一遍时
> **前置**：属于**扩展 profile**，默认安装下可能不存在

---

## frontmatter

- **name**：`openspec-ff-change`
- **description**：快进式地完成 OpenSpec 的 artifact 创建。当用户想快速创建实现所需的全部 artifact、而不必逐个走一遍时使用。
- **allowed-tools**：`Bash(openspec:*)`
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: 1.0`、`generatedBy: 1.8.0`

> **批注**：`ff` 是 fast-forward（快进）——一个来自版本控制的隐喻，指的是"不做分叉、直接把指针推到目标位置"。用在这里很贴切：它把"逐个创建 artifact"这条路上的每一步确认都跳过去，直接把变更推到"可以开始实现"的状态。这个隐喻也暗示了它的代价——**快进没有中间历史**，你无法回到某一个检查点说"这里我想改一下"。

## 正文

快进式地完成 artifact 创建——一次生成开始实现所需的全部东西。

**Store（存储库）选择：** 如果用户点名了某个 store，或当前工作位于某个 store 中，先运行 `openspec store list --json` 发现已注册的 store id，然后在所有读写 specs 与 changes 的命令上追加 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定即视为**粘住**。下文每一处未加限定的示例都是简写：运行前须补上该标志，例如 `openspec status --change "<name>" --json --store "<id>"`。其他命令不接受该标志。命令打印的提示已带该标志，跟进时保留。不指定 store 时，命令作用于最近的本地 `openspec/` 根目录。

**Input**：用户的请求应包含一个变更名（kebab-case）**或**一段想构建什么的描述。

**Steps**

1. **若没有清晰的输入，先问用户想构建什么**

   以开放式方式询问用户（**不给预设选项**）：
   > "What change do you want to work on? Describe what you want to build or fix."

   从他们的描述中推导出 kebab-case 名称（例如 "add user authentication" → `add-user-auth`）。

   **重要**：在理解用户想构建什么之前，**不要**往下走。

2. **创建变更目录**
   ```bash
   openspec new change "<name>"
   ```
   这会在 CLI 解析出的 planning home 中创建一个带脚手架的变更。

3. **获取 artifact 的构建顺序**
   ```bash
   openspec status --change "<name>" --json
   ```
   解析 JSON 以获取：
   - `applyRequires`：进入实现前所需的 artifact ID 数组（例如 `["tasks"]`）
   - `artifacts`：全部 artifact 的列表，各带其 `status` 与 `requires` 边（即它直接依赖的 artifact ID）
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径与范围上下文。**使用这些，而不要假定仓库本地路径。**

4. **创建所需集合中的每一个 artifact**

   用一份 todo 列表跟踪 artifact 创建进度。

   按依赖顺序遍历 artifact（先处理没有待办依赖的）：

   a. **对每一个处于 `ready`（依赖已满足）的 artifact**：
      - 获取指令：
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - instructions 的 JSON 包含：
        - `context`：项目背景（对**你**的约束——**不要**放进输出）
        - `rules`：该 artifact 专属规则（对**你**的约束——**不要**放进输出）
        - `template`：你的输出文件应使用的结构
        - `instruction`：针对该 artifact 类型的 schema 专属指引
        - `skipped`/`warning`：当该变更声明了 `skip_specs` 且此 artifact **不得**创建时出现——停下，换一个 artifact
        - `resolvedOutputPath`：写入该 artifact 的解析路径或模式
        - `dependencies`：需要阅读的已完成 artifact
      - 阅读任何已完成的依赖文件作为上下文——**始终从磁盘重新读取**，即便你在对话中早先看过它们（用户可能已经改过）
      - 若 `instruction` 字段把创建委派给了某个具体技能或命令，就调用它来产出 artifact，而不要自己写文件；随后验证该文件确实存在于 `resolvedOutputPath`
      - 否则以 `template` 为结构创建 artifact 文件，并写入 `resolvedOutputPath`。若 `resolvedOutputPath` 是 glob，遵循 `instruction` 选出具体文件路径
      - 把 `context` 与 `rules` 作为**约束**施加——但**不要**把它们复制进文件
      - 展示简要进度："✓ Created <artifact-id>"

   b. **持续进行，直到所需集合中的每一个 artifact 都存在（不只是 `apply.requires` 里列出的那些）**
      - 每创建一个 artifact 后，重新运行 `openspec status --change "<name>" --json`
      - 所需集合 = `applyRequires` **加上**从这些 artifact 出发、沿 `status --json` 中的 `requires` 边可达的每一个 artifact——**要传递地走完**（spec-driven 下会闭包出 proposal、specs、design、tasks）。**集合之外**的 artifact 不要去碰。
      - `status` **只反映文件是否存在**，所以一个读作 `done` 的 `applyRequires` artifact **并不**意味着它的依赖存在——过早写入 `tasks.md` 会让 `tasks` 标记为 done，而 `specs` 从未被创建。**用每个 artifact 的 `requires` 边、而不是它的 `status` 来构建所需集合**：一个 `done` 的 artifact 仍然列出了它依赖什么。
      - 已经读作 `status: "skipped"` 的 artifact 视为**已满足**：该变更在 `.openspec.yaml` 中声明了 `skip_specs`，所以它的文件**不得存在**。**永远不要**试图创建它。
      - 创建所需集合中每一个缺失的 artifact，然后重新检查——创建一个可能会解锁其他几个。
      - **只有在**以下情况才跳过某个 artifact：`status` 已报告它为 `skipped`；或它自己的 `instruction` 说明它是有条件的——运行 `openspec instructions <artifact-id> --change "<name>" --json`，**仅当**其 `instruction` 字段标注为可选（例如"仅在……时创建"）才跳过。spec-driven 的 `design.md` 属于此列；`specs` **只能**经由上述 `skipped` 状态跳过，**绝不能**凭你自己的判断。告诉用户，并且**不要再重新考虑它**。
      - **依赖是使能条件，不是闸门**：如果某个必需的 artifact 之所以仍为 `blocked`，仅仅是因为你跳过了一个有条件的依赖，**照写不误**。
      - 当所需集合中每个 artifact 都处于 `done`、`skipped`，或已被有意跳过时，**停止**。

   c. **若某个 artifact 需要用户输入**（上下文不清晰）：
      - 请用户澄清
      - 然后继续创建

5. **展示最终状态**
   ```bash
   openspec status --change "<name>"
   ```

**输出**

全部 artifact 完成后，总结：
- 变更名与位置
- 已创建的 artifact 列表及简要说明，加上任何被跳过的条件性 artifact 及其原因
- 已就绪的内容："All artifacts needed for implementation are ready."
- 提示："Run `/opsx:apply` or ask me to implement to start working on the tasks."

**Artifact 创建指引**

- 遵循每种 artifact 类型来自 `openspec instructions` 的 `instruction` 字段——它是权威指引，**即便对熟悉的 artifact 名也一样**
- 若 `instruction` 字段要求你用某个具体技能或命令来创建该 artifact，就调用它，而不要直接写文件
- schema 定义了每种 artifact 应包含什么——遵循它
- 创建新的 artifact 前，先阅读依赖 artifact 作为上下文
- 以 `template` 作为输出文件的结构——填入其各节
- **重要**：`context` 与 `rules` 是给**你**的约束，不是文件的内容
  - **不要**把 `<context>`、`<rules>`、`<project_context>` 块复制进 artifact
  - 它们指导你写什么，但永远不应出现在输出里

**Guardrails（护栏）**
- 创建 apply 阶段**传递依赖**的每一个 artifact，而不只是 `apply.requires` 里列出的那些 id
- 创建新 artifact 前**始终**先阅读依赖 artifact——**从磁盘重新读**，而不是从对话记忆里读（文件可能自你上次看到后已被改动）
- 若上下文严重不清晰，问用户——但**优先做出合理决定以保持推进势头**
- 若已存在同名变更，建议改为继续那个变更
- 每写完一个 artifact 都**验证文件确实存在**，再进入下一个

> **批注**：4b 那一整段是本技能技术上最密集的地方，也是它区别于"简单地把文件都写一遍"的关键。它暴露了一个**代理指标的陷阱**：
>
> `status` 字段是"文件是否存在"的**代理**，而不是"这个 artifact 的语义是否完成"的**度量**。两者在顺序正确时一致，但在顺序错误时会背离——你先写 `tasks.md`，它就报 `done`，而它依赖的 `specs` 根本不存在。于是"用 status 判断进度"这个看起来最自然的做法，会在一个特定条件下静默出错。
>
> 原文的解法是**换一个判据**：不看 `status`，改看 `requires` 边，把 `applyRequires` 沿依赖关系做传递闭包。这一步不依赖任何文件的当前状态，因此不会因为写入顺序而失真。
>
> 另一个值得注意的点是"**绝不能凭你自己的判断**跳过 `specs`"（`never by your own judgment. Tell the user, and do not reconsider it`）。这是对 AI 判断力的**明确不信任**，而且措辞很强硬——包括"不要再重新考虑它"，堵住了 AI 事后自我说服的路径。在整份 OpenSpec 里，这种程度的不信任是罕见的。

---

## 附属文件

本技能为单文件技能，**无附属文件**。

---

## 相关

- [openspec-ff-change-详细设计讲解.md](./openspec-ff-change-详细设计讲解.md) —— 本文的设计分析：它放弃了什么、那个"代理指标陷阱"意味着什么
- [openspec-continue-change-中文版.md](./openspec-continue-change-中文版.md) —— 正面对立面：每次只创建一个 artifact，保留检查点
- [openspec-new-change-中文版.md](./openspec-new-change-中文版.md) —— 同为"从零建立变更"，但节奏不同
- [openspec-apply-change-中文版.md](./openspec-apply-change-中文版.md) —— 全部 artifact 就绪之后的下一个阶段
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— openspec 整体原理
