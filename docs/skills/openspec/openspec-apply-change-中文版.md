# openspec-apply-change · 中文版

> **来源**：`skills/openspec/skills/openspec-apply-change/SKILL.md`
> **类型**：流程技能（OpenSpec 中**唯一允许编写代码**的阶段）
> **触发**：用户想开始实现、继续实现，或推进任务时

---

## frontmatter

- **name**：`openspec-apply-change`
- **description**：实现某个 OpenSpec 变更中的任务。当用户想开始实现、继续实现，或逐项推进任务时使用。
- **allowed-tools**：`Bash(openspec:*)`——只允许调用 `openspec` 开头的命令
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: 1.0`、`generatedBy: 1.8.0`（由 `openspec init` 从模板生成）

> **批注**：`allowed-tools` 只给了 `Bash(openspec:*)`，但本技能明明要改代码——写文件靠的是通用文件工具，不在这个白名单里。这个字段约束的是**它能调用哪些 shell 命令**（只许调 openspec CLI 查询状态），不是"它不能写文件"。`generatedBy` 字段则暴露了它的出身：这不是人写的技能，是 CLI 从模板生成的，所以下文那种"契约式"的冗长措辞其实是模板的自我保护。
>
> 另一个关键点：**在整个 OpenSpec 的 12 个技能里，只有这一个允许改代码。** 其余全部止步于规划产物。这个"独家授权"是理解本技能设计意图的钥匙——见 [详细设计讲解](./openspec-apply-change-详细设计讲解.md)。

## 正文

实现某个 OpenSpec 变更中的任务。

**Store（存储库）选择：** 如果用户点名了某个 store（store 是注册在本机上的、独立的 OpenSpec 仓库），或者当前工作就位于某个 store 中，先运行 `openspec store list --json` 发现已注册的 store id，然后在所有读写 specs 与 changes 的命令上追加 `--store <id>`（这些命令是：`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定，就把 `--store <id>` 视为**在后续整个工作流中粘住**。下面每一处未加 store 限定的示例都应理解为简写：真正运行前要补上该标志。例如应当运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下面展示的未限定形式。其他命令不接受该标志。命令打印出的提示已经带上了该标志，后续跟进时请保留它。若不指定 store，命令作用于最近的本地 `openspec/` 根目录。

**Input**：可选地指定变更名（例如 `/opsx:apply add-auth`）。若省略，检查能否从对话上下文中推断。若含糊或有歧义，你**必须**提示可选的变更列表。

**Steps**

1. **选择变更**

   若提供了名称，就用它。否则：
   - 若用户在对话中提到过某个变更，从中推断
   - 若只存在一个进行中的变更，自动选择它
   - 若有歧义，运行 `openspec list --json` 获取可用变更列表，请用户挑选一个

   始终宣告："Using change: <name>"，并说明如何覆盖（例如 `/opsx:apply <other>`）。

2. **检查状态以理解所用 schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   解析 JSON 以理解：
   - `schemaName`：正在使用的工作流（例如 `"spec-driven"`）
   - `planningHome`、`changeRoot` 和 `actionContext`：规划范围与编辑约束
   - 哪个 artifact 承载任务清单（spec-driven 下通常是 `"tasks"`，其他 schema 请查 status）

3. **获取 apply 指令**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   返回值包括：
   - `contextFiles`：artifact ID → 具体文件路径的数组（随 schema 而变——可能是 proposal/specs/design/tasks，也可能是 spec/tests/implementation/docs）
   - 进度（总数、已完成、剩余）
   - 带状态的任务列表
   - 基于当前状态动态生成的指令
   - 可选的 `context`：来自所选根目录的、当前必需的项目指令输入
   - 可选的 `operationGuidance`：当前针对 apply 的参考性指导

   **处理各种状态：**
   - 若 `state: "blocked"`（缺少 artifact）：显示提示信息，建议使用 `/opsx:continue`（若它未安装，则运行 `openspec status --change "<name>" --json` 查看下一个 artifact，并用 `openspec instructions <artifact-id> --change "<name>" --json` 获知如何创建它）
   - 若 `state: "all_done"`：表示祝贺，建议归档
   - 其他情况：进入实现

   把 `context` 当作**必需的 prompt 级输入**。阅读并考虑它，在实现时应用其中相关的项目事实、约定与约束。
   把 `operationGuidance` 当作**可选的附加建议**。逐条阅读并考虑，采纳那些适用且与内建工作流兼容的条目。

   把这两个字段与 CLI 返回的状态、缺失的 artifact、任务、进度、`contextFiles` 和内建 `instruction` **严格区分开**。它们**不是**任务完成的证据，**不**替代内建指令，也**不**允许绕过一个 blocked 状态。若 `context` 与内建指令、用户的明确选择或 CLI 控制的值冲突，**报告该冲突并保留起控制作用的值**。若某条 guidance 不适用或与那些控制性输入冲突，**不要采纳它，并解释原因**。这些是 prompt 级的行为契约，**不是可强制执行的检查**。

   > **批注**：这一整段是全文最诚实、也最值得琢磨的地方。它在给两个由外部（项目配置、用户）注入的字段划权限边界，而划法是**逐项列举"它不是用来干什么的"**：不是完成证据、不替代内建指令、不许绕过 blocked、冲突时保留控制值。
   >
   > 最后那句自我坦白尤其值得注意——*"这些是 prompt 级的行为契约，不是可强制执行的检查"*。它承认了：**这段约束本身无法被机器验证**，只能靠执行者自觉。在一份模板生成的技能里写这种话，说明作者很清楚"写在提示词里的规则"和"被真正执行的规则"之间的差距。

4. **阅读上下文文件**

   读取 apply 指令输出中 `contextFiles` 下列出的每一个文件路径。
   文件取决于所使用的 schema：
   - **spec-driven**：proposal、specs、design、tasks
   - 其他 schema：遵循 CLI 输出中的 contextFiles

   除非用户另行要求，**不要**把 `context` 或 `operationGuidance` 逐字复制到实现文件或规划产物中。

5. **展示当前进度**

   显示：
   - 正在使用的 schema
   - 进度："N/M tasks complete"
   - 剩余任务概览
   - 来自 CLI 的动态指令

6. **实现任务（循环直到完成或被阻塞）**

   对每个待办任务：
   - 显示正在处理哪个任务
   - 做出所需的代码改动
   - **保持改动最小且聚焦**
   - 在任务文件中标记为完成：`- [ ]` → `- [x]`
   - 继续下一个任务

   **遇到以下情况暂停：**
   - 任务不清晰 → 请求澄清
   - 实现过程中暴露出设计问题 → 建议更新 artifact
   - 遇到错误或阻塞 → 报告并等待指示
   - 用户打断

7. **完成或暂停时，展示状态**

   显示：
   - 本次会话完成的任务
   - 总体进度："N/M tasks complete"
   - 若全部完成：建议归档
   - 若已暂停：解释原因并等待指示

**实现过程中的输出**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**完成时的输出**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! You can archive this change with `/opsx:archive`.
```

**暂停时的输出（遇到问题）**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails（护栏）**
- 持续推进任务，直到完成或被阻塞
- 动手前**始终**阅读上下文文件（来自 apply 指令的输出）
- 若任务含糊，先暂停提问再实现
- 若实现暴露了问题，暂停并建议更新 artifact
- 保持代码改动最小，且限制在每个任务范围内
- 每完成一个任务**立即**更新任务勾选框
- 遇到错误、阻塞或需求不明时暂停——**不要猜**
- 使用 CLI 输出里的 contextFiles，不要假定具体文件名
- **不要**把 context 或 operation guidance 当作任务已完成的证据
- 应用相关的项目 context；遇到与工作流控制性输入冲突时报告冲突
- 考虑每一条 guidance；对不适用或冲突的建议**解释原因**
- **不要**把运行时的 context 或 operation guidance 复制进实现文件或规划产物
- 保留 CLI 控制的 blocked / ready / all-done 行为与完成判定标准

**Fluid Workflow Integration（流动式工作流集成）**

本技能支持"对变更执行动作"（actions on a change）模型：

- **可随时调用**：在所有 artifact 完成之前（只要任务已存在）、部分实现之后、或与其他动作交错进行时都可以
- **允许更新 artifact**：若实现暴露了设计问题，建议更新 artifact——**不做阶段锁定，流动推进**

> **批注**：最后这一节是与"阶段闸门"式工作流的正面对立宣言。`propose` 阶段明令禁止写代码（Planning boundary），而这里却主动打开反方向的门——实现中发现问题可以回头改规划。原文那两句（"不做阶段锁定"、"流动推进"）正是 OpenSpec README 里 `fluid not rigid` 哲学落到单技能层面的样子。
>
> 它换来的是一个关键性质：**当实现告诉你设计错了，你不需要退出流程、也不需要绕开流程**。反面代价是——回头改 artifact 意味着之前基于旧 artifact 做的实现可能作废，而技能里没有任何机制来追踪这种作废。

---

## 附属文件

本技能为单文件技能（`openspec init` 生成的技能只含一个 `SKILL.md`），**无附属文件**。

---

## 相关

- [openspec-apply-change-详细设计讲解.md](./openspec-apply-change-详细设计讲解.md) —— 本文的设计分析：为什么它是唯一允许动代码的阶段、那个"契约而非检查"的自我坦白意味着什么
- [openspec-continue-change-中文版.md](./openspec-continue-change-中文版.md) —— blocked 时被推荐的那个技能
- [openspec-update-change-中文版.md](./openspec-update-change-中文版.md) —— 实现中发现问题时，回头改 artifact 走这条路
- [openspec-archive-change-中文版.md](./openspec-archive-change-中文版.md) —— 全部任务完成后的下一步
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— openspec 整体原理
