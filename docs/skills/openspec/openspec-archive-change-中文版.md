# openspec-archive-change · 中文版

> **来源**：`skills/openspec/skills/openspec-archive-change/SKILL.md`
> **类型**：工作流技能（OpenSpec 归档阶段）
> **触发**：`/opsx:archive`；或在实现完成后要求归档变更时（description 可路由）

---

## frontmatter

- **name**：`openspec-archive-change`
- **description**：归档一个已完成的变更。当用户想在实现完成后定稿并归档某个变更时使用。
- **allowed-tools**：`Bash(openspec:*)` —— 只允许调用 openspec CLI
- **license / compatibility**：MIT；依赖 openspec CLI
- **metadata.author**：openspec ｜ **version**：1.0 ｜ **generatedBy**：1.8.0

> **批注**：`allowed-tools: Bash(openspec:*)` 是一条**权限收敛**声明——这个技能只需要跑 `openspec` 命令，因此把 shell 权限限制在这一个前缀上。它是这个套件里唯一的安全边界，值得注意。另外 `generatedBy: 1.8.0` 记录了生成它的 CLI 版本：这些技能不是手写的，是 `openspec init` 从模板生成的。

## 正文

在实验性工作流中归档一个已完成的变更。

**Store 选择：** 如果用户点名了一个 store（store 是注册在本机上的、独立的 OpenSpec 仓库），或者工作本身位于某个 store 中，就运行 `openspec store list --json` 发现已注册的 store id，然后在读取或写入规格与变更的那些命令上传递 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定，就把 `--store <id>` 视为本次工作流余下部分的**粘性参数**。下文所有未带作用域的示例都是简写：运行前先补上该标志。例如，应当运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文所示的无作用域形式。其他命令不接受该标志。命令打印出的提示已经带上了该标志，后续跟随时保留它。没有 store 时，命令作用于最近的本地 `openspec/` 根目录。

`<capability-path>` 是相对于 `specs/` 的规格目录（例如 `user-auth` 或 `identity/user-auth`）。在解析某个 delta spec 对应的主规格时，要保留其完整路径。

**输入**：可选地指定一个变更名。若省略，检查是否能从对话上下文中推断出来。若含糊或有歧义，你**必须**提示用户从可用变更中选择。

**步骤**

1. **选择变更**

   若提供了名称就用它。否则：
   - 若用户在对话中提到过某个变更，从中推断
   - 若只有一个进行中的变更，自动选中
   - 若有歧义，运行 `openspec list --json` 获取可用变更并请用户选择一个

   提示时只展示**进行中**的变更（不含已归档的）。
   若可用，一并展示每个变更所用的 schema。

   始终声明："正在使用变更：<name>"，以及如何覆盖（例如 `/opsx:archive <other>`）。

   **在既有的归档检查之前，先载入当前的归档输入：**

   在解析完所选变更与规划根目录之后，运行：

   ```bash
   openspec instructions archive --change "<name>" --json
   ```

   在这条命令上保持相同的已选根目录标志。这次查询是**建议性的、可选的**：它只提供额外的提示输入，因此**绝不能阻塞归档**。若它退出码非零或返回非法 JSON——例如在尚不支持该命令的旧版 CLI 上——就在没有任何 context、没有任何 operation guidance 的情况下继续归档工作流。不要报告错误，也不要停止。

   成功的响应可能同时省略两个可选字段。把 `context` 视为**必需的提示级输入**：读取并考虑它，应用其中相关的项目事实、约定与约束。把 `operationGuidance` 视为**可选的补充建议**：读取并考虑每一条，对其中适用且与内置归档工作流兼容的条目予以遵循。

   把这两个字段与内置步骤、用户的显式选择、已解析的路径、CLI 检查和命令契约**分开对待**。若 context 与上述任一控制性输入冲突，报告该冲突并保留控制性输入的值。若 guidance 不适用或与控制性输入冲突，不要遵循它，并解释原因。不要从这两个字段推断出替换路径、跳过的提示或标志，也不要将其文本原样抄进规格、变更 artifact 或归档摘要，除非用户另行要求。这些是提示级的行为契约，不是可强制执行的检查。

   > **批注**：这一段是整套 OpenSpec 里**最精细的一处权限划分**。它的难点在于：CLI 可以给 AI 注入额外的上下文（`context`）和建议（`operationGuidance`），但注入的内容是**数据，不是指令**。所以原文用三层措辞来定界——① `context` 是"必需的提示级输入"（要读、要用），② `operationGuidance` 是"建议"（可用可不用、不适用要解释），③ 两者都**低于**内置步骤、用户选择、已解析路径、CLI 检查和命令契约这五类"控制性输入"。最后一句尤其关键："这些是提示级的行为契约，**不是可强制执行的检查**"——它明确承认这里**没有技术保障**，只有约定。

2. **检查 artifact 完成状态**

   运行 `openspec status --change "<name>" --json` 检查 artifact 完成情况。

   解析 JSON 以理解：
   - `schemaName`：所用工作流
   - `planningHome`、`changeRoot`、`artifactPaths` 与 `actionContext`：路径与作用域上下文
   - `artifacts`：artifact 列表及其状态（`done`、`skipped` 或其他）

   **若任何 artifact 既不是 `done` 也不是 `skipped`**（skipped 的 artifact 满足要求——该变更声明了 skip_specs）：
   - 显示警告，列出未完成的 artifact
   - 请用户确认是否仍要继续
   - 用户确认则继续

3. **检查任务完成状态**

   读取任务文件（通常是 `tasks.md`）以检查未完成的任务。

   统计标记为 `- [ ]`（未完成）与 `- [x]`（已完成）的任务数。

   **若发现未完成任务：**
   - 显示警告，给出未完成任务的数量
   - 请用户确认是否仍要继续
   - 用户确认则继续

   **若任务文件不存在：** 直接继续，不做任务相关警告。

   > **批注**：第 2、3 步的处理方式一致——**警告但不阻塞**（`Don't block archive on warnings - just inform and confirm`）。这个立场很明确：归档是用户的决定，技能的责任是把事实摆清楚，不是替用户否决。这与后面第 4 步的严格形成对照：**sync 失败必须停下，不完整只是提示确认**。判据是"这件事会不会造成不可逆的错误结果"——未完成的任务是主观判断（也许用户就是想先归档），而 sync 失败会写坏主规格。

4. **评估 delta spec 的同步状态**

   把 status JSON 里的 `artifactPaths.specs.existingOutputPaths` 作为**唯一**的 delta spec 来源。若 `specs` 条目缺失或 `existingOutputPaths` 为空，则不进入同步提示，也不要从其他 artifact 推断 delta spec。

   **若存在 delta spec：**
   - 把每个 delta spec 与 `<planningHome.root>/openspec/specs/<capability-path>/spec.md` 处的对应主规格做比较（使用第 2 步中获得的、store 感知的 `planningHome.root`，而不是硬编码的仓库路径）
   - 判断将要施加哪些变化（新增、修改、删除、重命名）
   - 在提示之前先展示一份合并后的摘要

   **提示选项：**
   - 若需要变更："立即同步（推荐）"、"不同步直接归档"
   - 若已同步："立即归档"、"仍然同步一次"、"取消"

   按答案路由：
   - "取消" —— 停止，不归档
   - "不同步直接归档"或"立即归档" —— 继续归档
   - "立即同步"或"仍然同步一次" —— 先同步，再验证（见下）
   - 其他任何回答 —— 重新询问，而不是归档

   在选定的同步写入任何主规格**之前**，用相同的已选根目录标志运行一次
   `openspec instructions specs --change "<name>" --json`。要求零退出码且返回合法的 artifact-instruction JSON。若查询失败或返回非法 JSON，报告错误并在写入任何主规格或移动变更**之前**停止。合法响应但省略了 `rules`，即为无规则的情形。仅把返回的 `rules` 应用于本次合并所产出的主规格的**内容与形式**；不要把它们当作归档指引、不要改变 CLI 行为、也不要把规则文本抄进任何输出文件。

   > **批注**：与第 1 步相比，这里对 lookup 失败的待遇**完全相反**——第 1 步的 `instructions archive` 失败绝不阻塞，这里 `instructions specs` 失败必须停下。差异的根据是"失败后继续的后果"：前者只是少了一些建议性的输入，继续无害；后者意味着**在不知道合并规则的情况下改写主规格**——主规格是"系统现在应该做什么"的真相，写坏了影响面大且难回溯。**同一套系统里两种相反的容错策略，判据是失败的可逆性**，这个对比值得记住。

   然后**内联**运行 `openspec-sync-specs` 工作流（由 agent 驱动的智能合并），针对变更 `<name>`，传入上一步得到的 delta spec 分析与已获取的 specs 规则快照，并等待其结束。内联同步必须复用该快照，不得再次获取 `specs` instructions。不要把它委派为后台任务——第 5 步会把 `changeRoot` 从仍在读取它的同步脚下移走，导致变更已归档而主规格**从未更新**。如果你的 agent 只能以委派方式运行它，就同步委派并等待结果。

   > **批注**：这里暴露了一个**真实的竞态条件**，而且原文把它写得很直白：归档的最后一个动作是 `mv` 整个变更目录，而同步要读这个目录。若同步还在跑就执行了 `mv`，结果是**变更躺在 archive 里、主规格却没更新**——而且此后没有任何机制能发现这件事（变更已经"归档完成"了）。这是"归档"这个动作天然具有的破坏性（它移走了自己的输入），也是为什么同步必须内联、必须等待、必须禁止后台委派。

   然后针对**每一个**在 `artifactPaths.specs.existingOutputPaths` 中有 delta spec 的 capability，从本步开头重新执行一遍比较——**不只是同步自报触碰过的那些**。一次成功的同步不会剩下任何待应用的东西，所以现在每个 capability 都应读作"已同步"：
   - ADDED 的需求已存在
   - MODIFIED 的需求带上了 delta 中点名的场景与描述变更，且它们的其他场景原封未动
   - REMOVED 的需求已消失——并且在本次同步**退役**了某个 capability 时（移除了它最后一个需求，留下空的 `## Requirements`），其主规格应被**删除**而不是留空；同步有意保留并报告过的规格也算匹配
   - RENAMED 的需求以新名称存在，且旧名称下已不存在

   若同步失败，或任何 capability 不匹配，报告差异并停止——不要归档。此时什么都没被移动、`changeRoot` 完好无损，用户可以修正这个不匹配，或重跑一次同步再重新开始归档。

   > **批注**："重新比较**每一个** capability，不只是同步自报触碰过的那些"——这是**不信任自报**的设计，和 Superpowers 的 `spec-reviewer-prompt.md` 里那句 `CRITICAL: Do Not Trust the Report` 是同一个思路。原因也相同：合并是**由 agent 智能完成的，不是确定性操作**，所以它的"我做完了"只是一句声称。差别在于 Superpowers 用**另一个 subagent** 去不信，这里用**机械的重新比对**去不信——后者更硬，因为它不依赖第二个 agent 的判断力。
   >
   > 另外注意"退役 capability 要**删掉**主规格文件"这条：留一个空的 `## Requirements` 是一种谎言——它声称这个 capability 存在，却没有任何需求。规则的精确度体现了对"空文件也是一个断言"的清醒认识。

5. **执行归档**

   若 `planningHome.changesDir` 下不存在 `archive` 目录，先创建它：

   ```bash
   mkdir -p "<planningHome.changesDir>/archive"
   ```

   生成目标名称：若变更名本身已以 `YYYY-MM-DD-` 前缀开头，就原样使用；否则把当前日期作为前缀加上，即 `YYYY-MM-DD-<change-name>`。**绝不叠加第二个日期**（与 `openspec archive` 同规则）。

   > **批注**：归档目录带日期前缀，是为了让 `archive/` 下的条目**按时间自然排序**——归档目录只增不改，日期就是它唯一有意义的排序键。
   >
   > "绝不叠加第二个日期"这条规则，看起来琐碎，实际防的是一个具体的坏结果：若不加约束，一个已经叫 `2025-01-23-add-dark-mode` 的变更被再次归档时会长成 `2026-09-14-2025-01-23-add-dark-mode`。规则的作用是让**重命名操作幂等**——同一天重复执行不会产生新名字。

   **检查目标是否已存在：**
   - 若存在：报错失败，建议重命名已有归档或使用不同日期
   - 若不存在：把 `changeRoot` 移到归档目录

   ```bash
   mv "<changeRoot>" "<planningHome.changesDir>/archive/<target-name>"
   ```

6. **显示摘要**

   展示归档完成摘要，包含：
   - 变更名
   - 所用的 schema
   - 归档位置
   - 规格是否已同步（如适用）
   - 关于任何警告的说明（未完成的 artifact / 任务）

**成功时的输出**

```markdown
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** 由 `planningHome.changesDir` 推导出的归档路径/<target-name>/
**Specs:** <仅当第 4 步验证通过时写 "✓ Synced to main specs"；否则写 "No delta specs" 或 "Sync skipped">

<"All artifacts complete. All tasks complete." —— 或者，若带警告归档，则改为列出它们（例如 "Archived with 2 incomplete tasks"）>
```

**护栏（Guardrails）**

- 声明所选的变更；有歧义时提示选择
- 用 artifact 图（`openspec status --json`）做完成度检查
- 不要因警告而阻塞归档——只告知并确认
- 移到归档时保留 `.openspec.yaml`（它随目录一起移动）
- 清楚展示发生了什么
- 若请求了同步，就内联运行 `openspec-sync-specs` 工作流（由 agent 驱动）
- **绝不要在规格同步仍在进行时归档**——内联运行同步，并在移动 `changeRoot` 之前验证主规格
- 若存在 delta spec，始终执行同步评估，并在提示之前展示合并摘要
- 应用相关的运行时上下文并报告冲突；operation guidance 始终只是建议
- 考虑每一条 guidance，并解释任何不适用或冲突的建议
- 既有的 CLI 检查、已解析路径、提示与命令契约保持不变
- artifact 规则只约束被写入的规格，绝不是操作指引
- **绝不**把运行时上下文、operation guidance 或 artifact 规则文本原样抄进输出文件

---

## 附属文件

本技能只有 `SKILL.md`，无附属文件。

---

## 相关

- [openspec-archive-change-详细设计讲解.md](./openspec-archive-change-详细设计讲解.md) —— 本文的设计分析：为什么归档是仪式、合并为何不可信、竞态从何而来
- [openspec-bulk-archive-change-中文版.md](./openspec-bulk-archive-change-中文版.md) —— 批量归档（同一阶段的并行版本）
- [openspec-verify-change-中文版.md](./openspec-verify-change-中文版.md) —— 归档前的实现验证
- [openspec-sync-specs-中文版.md](./openspec-sync-specs-中文版.md) —— 本技能第 4 步内联调用的合并工作流
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— OpenSpec 整体原理
