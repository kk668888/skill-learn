# openspec-continue-change · 中文版

> **来源**：`skills/openspec/skills/openspec-continue-change/SKILL.md`
> **类型**：流程技能（规划态——**一次只创建一个 artifact**）
> **触发**：用户想推进变更、创建下一个 artifact，或继续其工作流时
> **前置**：属于**扩展 profile**，默认安装下可能不存在

---

## frontmatter

- **name**：`openspec-continue-change`
- **description**：通过创建下一个 artifact 来继续推进某个 OpenSpec 变更。当用户想推进变更、创建下一个 artifact，或继续其工作流时使用。
- **allowed-tools**：`Bash(openspec:*)`
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: 1.0`、`generatedBy: 1.8.0`

> **批注**：这个技能是**扩展 profile** 的一员（默认 profile 只有 propose/explore/apply/update/sync/archive 六个；continue、new、ff、verify、bulk-archive、onboard 需另行启用）。所以多处技能都会提醒"建议 continue 之前先确认它可用"——一个技能的存在与否会影响其他技能的措辞，这是 OpenSpec 用 profile 分层带来的副作用。

## 正文

通过创建下一个 artifact 来继续推进某个变更。

**Store（存储库）选择：** 如果用户点名了某个 store，或当前工作位于某个 store 中，先运行 `openspec store list --json` 发现已注册的 store id，然后在所有读写 specs 与 changes 的命令上追加 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定即视为**粘住**。下文每一处未加限定的示例都是简写：运行前须补上该标志，例如 `openspec status --change "<name>" --json --store "<id>"`。其他命令不接受该标志。命令打印的提示已带该标志，跟进时保留。不指定 store 时，命令作用于最近的本地 `openspec/` 根目录。

**Input**：可选地指定变更名。若省略，检查能否从对话上下文推断。若含糊或有歧义，你**必须**提示可选的变更列表。

**Steps**

1. **选择变更**

   若提供了名称，就用它。否则：
   - 若用户在对话中提到过某个变更，从中推断
   - 若只存在一个进行中的变更，自动选择它
   - 若有歧义，运行 `openspec list --json` 获取按最近修改时间排序的可用变更列表，请用户挑选一个

   提示时，给出最近修改的前 3–4 个变更作为选项，展示：
   - 变更名
   - Schema（若有 `schema` 字段则取之，否则为 `"spec-driven"`）
   - 状态（例如 `"0/5 tasks"`、`"complete"`、`"no tasks"`）
   - 最近修改时间（来自 `lastModified` 字段）

   把最近修改的那个标记为 `(Recommended)`，因为它大概率就是用户想继续的目标。

   始终宣告："Using change: <name>"，并说明如何覆盖（例如 `/opsx:continue <other>`）。

2. **检查当前状态**
   ```bash
   openspec status --change "<name>" --json
   ```
   解析 JSON 以理解当前状态。返回值包括：
   - `schemaName`：正在使用的工作流 schema（例如 `"spec-driven"`）
   - `artifacts`：artifact 数组，各带状态（`"done"`、`"skipped"`、`"ready"`、`"blocked"`）
   - `isPlanningComplete`：布尔值，表示所有规划 artifact 是否已完成。旧版 CLI 用 `isComplete` 暴露同一个值。
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径与范围上下文。**使用这些，而不要假定仓库本地路径。**

3. **依据状态采取行动**：

   ---

   **若所有规划 artifact 已完成（`isPlanningComplete: true`，或旧字段 `isComplete: true`）**：
   - 向用户道贺
   - 展示最终状态，包括所用的 schema
   - 建议："Planning is complete! You can now implement this change. Once implementation and any tracked work are complete, archive it."
   - **停止**

   ---

   **若有 artifact 已可创建**（状态中出现 `status: "ready"` 的 artifact）：
   - 从状态输出中挑出**第一个** `status: "ready"` 的 artifact
   - 获取它的指令：
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - 解析 JSON。关键字段：
     - `context`：项目背景（对**你**的约束——**不要**放进输出）
     - `rules`：该 artifact 专属规则（对**你**的约束——**不要**放进输出）
     - `template`：你的输出文件应使用的结构
     - `instruction`：schema 专属指引
     - `resolvedOutputPath`：写入该 artifact 的解析路径或模式
     - `dependencies`：需要阅读的已完成 artifact（带 `skipped: true` 的条目没有文件——不要去找它们）
     - `skipped`/`warning`：当该变更声明了 `skip_specs` 且此 artifact **不得**创建时出现——换一个 artifact
   - **创建该 artifact 文件**：
     - 阅读任何已完成的依赖文件作为上下文——**始终从磁盘重新读取**，即便你在对话中早先看过它们（用户可能已经改过）
     - 若 `instruction` 字段把创建委派给了某个具体技能或命令，就调用它来产出 artifact，而不要自己写文件；随后验证该文件确实存在于 `resolvedOutputPath`
     - 否则以 `template` 为结构——填入其各节
     - 写入时把 `context` 与 `rules` 作为**约束**施加——但**不要**把它们复制进文件
     - 写入指令中给出的 `resolvedOutputPath`。若它是 glob 模式，依据 schema 指令与该变更的上下文选出具体文件路径
   - 展示创建了什么、解锁了什么
   - 创建**一个** artifact 后即**停止**

   ---

   **若无 artifact 可创建（全部 blocked）**：
   - 在一个合法 schema 下不应该发生
   - 展示状态并建议检查问题

4. **创建 artifact 之后，展示进度**
   ```bash
   openspec status --change "<name>"
   ```

**输出**

每次调用后展示：
- 创建了哪个 artifact
- 正在使用的工作流 schema
- 当前进度（N/M 已完成）
- 现在解锁了哪些 artifact
- 提示："Want to continue? Just ask me to continue or tell me what to do next."

**Artifact 创建指引**

artifact 的类型及其用途取决于 schema。`instructions` 输出里的 `instruction` 字段才是每种 artifact 的权威指引——**即便该 artifact 的名字你很熟悉**（proposal.md、tasks.md 等）也要遵循它，因为自定义 schema 可能为同名文件定义了不同的内容或不同的流程。

若 `instruction` 字段要求你用某个具体技能或命令来创建该 artifact，就调用它，而不要直接写文件。

**Guardrails（护栏）**
- **每次调用只创建一个 artifact**
- 创建新 artifact 前**始终**先阅读依赖 artifact——**从磁盘重新读**，而不是从对话记忆里读（文件可能自你上次看到后已被改动）
- **永不跳过 artifact，永不乱序创建**
- 若上下文不清晰，先问用户再创建
- 写入后验证 artifact 文件确实存在，再标记进度
- 使用 schema 自己的 artifact 顺序，不要假定具体 artifact 名
- **重要**：`context` 与 `rules` 是给**你**的约束，不是文件的内容
  - **不要**把 `<context>`、`<rules>`、`<project_context>` 块复制进 artifact
  - 它们指导你写什么，但永远不应出现在输出里

> **批注**：四条护栏各锁住一个具体的失败模式，而**"从磁盘重新读"这一条**最值得注意。它对照的是 LLM 一个非常自然的习惯——"这个文件我刚才看过了，我记得内容"。问题在于：**你记得的是你上次看到的样子，而不是它现在的样子**，而用户完全可能在这中间手工编辑过。原文为此在正文和护栏里各写了一遍，说明它是高频错误。
>
> 另一条容易踩的是 `resolvedOutputPath` 的 **glob 情况**——"若它是 glob 模式，选出具体文件路径"。也就是说，写入位置有时需要你自己决定（比如为新的 capability 起一个 kebab-case 目录名），而这个决定本身带进了额外的判断。

---

## 附属文件

本技能为单文件技能，**无附属文件**。

---

## 相关

- [openspec-continue-change-详细设计讲解.md](./openspec-continue-change-详细设计讲解.md) —— 本文的设计分析：为什么"一次只做一个"是刻意的减速、它与 ff-change 的对立
- [openspec-ff-change-中文版.md](./openspec-ff-change-中文版.md) —— 正面对立面：一次生成全部，跳过逐步确认
- [openspec-update-change-中文版.md](./openspec-update-change-中文版.md) —— 边界对偶：那个只管修订已有文件，创建新的归本技能
- [openspec-apply-change-中文版.md](./openspec-apply-change-中文版.md) —— `blocked` 状态下把用户推来本技能
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— openspec 整体原理
