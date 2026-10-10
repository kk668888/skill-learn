# openspec-update-change · 中文版

> **来源**：`skills/openspec/skills/openspec-update-change/SKILL.md`
> **类型**：流程技能（规划态——**永不编辑代码**）
> **触发**：用户想修订某个变更的计划、把新决策并进去，或在其 artifact 被编辑后重新协调时

---

## frontmatter

- **name**：`openspec-update-change`
- **description**：通过修订某个 OpenSpec 变更已有的规划 artifact、并保持它们彼此协调一致，来更新该变更。当用户想修订某个变更的计划、把新决策并进去，或在某次编辑之后重新协调其 artifact 时使用。**永不编辑代码。**
- **allowed-tools**：`Bash(openspec:*)`
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: 1.0`、`generatedBy: 1.8.0`

> **批注**：注意 description 里出现了**两次**否定——开头的 "revising its existing planning artifacts"（只改**已有的**）与结尾的 "Never edits code."（永不改代码）。这两条否定合起来界定了它的活动范围：**只在既有规划文件内部活动，既不向外扩展到代码，也不向前扩展到新文件**。整个技能的设计张力都从这两条否定长出来。

## 正文

修订某个变更已有的规划 artifact，并保持它们彼此协调一致。**永不编辑代码。**

**Store（存储库）选择：** 如果用户点名了某个 store，或当前工作位于某个 store 中，先运行 `openspec store list --json` 发现已注册的 store id，然后在所有读写 specs 与 changes 的命令上追加 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定即视为**粘住**。下文每一处未加限定的示例都是简写：运行前须补上该标志，例如 `openspec status --change "<name>" --json --store "<id>"`。其他命令不接受该标志。命令打印的提示已带该标志，跟进时保留。不指定 store 时，命令作用于最近的本地 `openspec/` 根目录。

**Input**：可选地指定变更名。若省略，检查能否从对话上下文推断。若含糊或有歧义，你**必须**提示可选的变更列表。

`/opsx:continue` 是扩展 profile 的工作流，可能未安装。在下文任何建议它之前，先确认它可用。若不可用，`openspec status --change "<name>" --json` 会显示下一个 artifact，而 `openspec instructions "<artifact-id>" --change "<name>" --json` 会说明如何创建它。

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

   把最近修改的那个标记为 `(Recommended)`，因为它大概率就是用户想更新的目标。

   始终宣告："Using change: <name>"，并说明如何覆盖（例如 `/opsx:update <other>`）。

2. **获取该变更的 artifact**
   ```bash
   openspec status --change "<name>" --json
   ```
   解析 JSON 以理解当前状态。返回值包括：
   - `schemaName`：正在使用的工作流 schema（例如 `"spec-driven"`）
   - `artifacts`：artifact 数组，各带状态（`"done"`、`"skipped"`、`"ready"`、`"blocked"`）
   - `isPlanningComplete`：布尔值，表示所有规划 artifact 是否已完成。旧版 CLI 用 `isComplete` 暴露同一个值。
   - `planningHome`、`changeRoot`、`artifactPaths` 和 `actionContext`：路径与范围上下文。**使用这些，而不要假定仓库本地路径。**

   artifact id 与路径来自当前生效的 schema——**不要假定它们，也不要基于硬编码的 artifact 名分支**。自定义 schema 必须能原样工作。

   要编辑的文件是 `artifactPaths.<id>.existingOutputPaths`——那些**真实存在于磁盘上**的具体文件（glob artifact 已经过展开，例如 `specs/**/*.md`）。**不要**写入 `resolvedOutputPath`：对 glob artifact 而言它仍然是 glob 模式，不是真实文件。

   > **批注**：`existingOutputPaths`（已存在）与 `resolvedOutputPath`（解析出的路径）的区分是本技能最技术性、也最容易踩的一处。对普通 artifact 两者差不多；但对 **glob artifact**（比如 `specs/**/*.md`，一次变更可能摊开成多个 capability 文件），`resolvedOutputPath` 里躺着的是"`specs/**/*.md`"这个**模式字符串**而非文件路径。照着它写，就是在磁盘上创建一个名为 `**` 的目录。原文为此专门写了一段警告，说明这个错误真的发生过。

3. **理解请求**
   - 若用户提出了具体修订（"设计现在改用 X"），那个就是起始编辑。
   - 若用户只说了"更新"／"把它弄协调"，则把它当作一次**一致性审查**：阅读已有 artifact，互相核对是否存在矛盾、缺口与重复。

4. **阅读并协调**
   - 阅读请求涉及的 artifact，以及该变更的其他已有 artifact。
   - 应用所请求的编辑。然后**用它对每一个其他已有 artifact 做检查——方向不限**：对较晚 artifact 的编辑可能需要反过来修订较早的那个，而不只是单向。构建顺序是有用的**阅读顺序**，但不是"哪些 artifact 可以被修订"的约束。
   - 记录所有现在变得不一致、缺失或矛盾的地方。
   - **只修订已存在的文件**（`existingOutputPaths`）。**不要**创建尚不存在的 artifact，**不要**在 glob artifact 下发明新文件——记录下来，并指引用户用 `/opsx:continue` 去创建。
   - 若该变更本已协调，就直说，不做任何编辑。

   > **批注**：这一段是本技能的核心，而其中最反直觉的是**"方向不限"**。人的直觉是顺着构建顺序推进的：proposal → specs → design → tasks，改也是从上游改到下游。但设计变更常常**从下游被发现**——你在写 `tasks.md` 时意识到 `specs.md` 里有个需求根本没法拆成任务。这时需要改的是上游。
   >
   > 原文那句 *"Build order is a useful reading order, not a constraint on which artifacts may be revised."* 值得单独记住：它明确否掉了"只能顺流改"的隐含假设，而这恰恰是最容易被执行者默默遵守的假设。

5. **逐项确认并应用**
   - 展示每一处拟议修订及其理由。**只有在用户确认后才写入。**
   - 若用户拒绝了某处修订，不要写入——让那个 artifact 保持原样。
   - 当需要大幅重写时，先获取该 artifact 的规则与模板：
     ```bash
     openspec instructions "<artifact-id>" --change "<name>" --json
     ```

6. **指向下一步（仅给建议——永不代劳）**
   - 仍有 artifact 缺失 → 建议用 `/opsx:continue` 创建它们。
   - 变更已实现（任务已勾完／已 apply 过）→ 代码可能已不再匹配修订后的计划；建议用 `/opsx:apply` 把 delta 带进代码。
   - 全部完成且已实现 → 建议 `/opsx:archive`。

**输出**

每次调用后，展示：
- 修订了哪些 artifact（以及哪些拟议修订被拒绝）
- 任何被推迟给 `/opsx:continue` 的内容（尚未创建的 artifact 或文件）
- 该变更当前所处的状态，以及推荐的下一步命令

**Guardrails（护栏）**
- **只动规划 artifact——永不编辑实现代码。** 若修订后的计划意味着代码要改，停下来，指向 `/opsx:apply`。
- 使用 `openspec status` 报告的 artifact id 与路径；**永不基于硬编码的 artifact 名分支**。
- **只编辑 `existingOutputPaths` 中的具体文件**；**永不**写入 glob 形式的 `resolvedOutputPath`。
- **不要推进构建前沿**：不创建新 artifact、不在 glob artifact 下创建新文件——那是 `/opsx:continue` 的活。
- 每次编辑都要先与用户确认再写入。
- 若请求改变的是该变更的**意图**而非对其做细化，先确认扩展 profile 的 `/opsx:new` 工作流是否可用。若可用，建议用 `/opsx:new` 从头开始（这是"更新 vs. 重开"的启发式判据）。若不可用，请用户给出一个未被使用过的变更名，并建议改用 `openspec new change "<new-change-name>"`。

> **批注**：最后那条"更新 vs. 重开"的判据是全文最有价值的一个启发式：**改动的是 intent（意图）还是 refinement（细化）？** 前者应该重开一个新变更，后者才在本变更上修订。
>
> 为什么这条重要？因为一个变更的名字、proposal、archive 日期，全都绑定在它最初声明的意图上。把一个"做 A"的变更慢慢改成"做 B"，会让所有历史记录失去意义——你三个月后回看 `archive/2025-01-23-add-dark-mode/`，名字说是加暗色模式，内容却在讲别的。**这条判据保护的是历史可读性，不是当前操作的正确性。**

---

## 附属文件

本技能为单文件技能，**无附属文件**。

---

## 相关

- [openspec-update-change-详细设计讲解.md](./openspec-update-change-详细设计讲解.md) —— 本文的设计分析：为什么协调必须是双向的、"不推进前沿"的边界从哪来
- [openspec-continue-change-中文版.md](./openspec-continue-change-中文版.md) —— 创建新 artifact 的职责归它，本技能反复把用户推过去
- [openspec-apply-change-中文版.md](./openspec-apply-change-中文版.md) —— 修订涉及代码改动时，指向它
- [openspec-new-change-中文版.md](./openspec-new-change-中文版.md) —— 意图变了就该重开，走这条
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— openspec 整体原理
