# openspec-new-change · 中文版

> **来源**：`skills/openspec/skills/openspec-new-change/SKILL.md`
> **类型**：工作流技能（规划阶段，分步版）
> **触发**：自动触发——当用户想用结构化的、一步一步的方式创建新功能、修复或修改时

---

## frontmatter

- **name**：`openspec-new-change`
- **description**：使用实验性的 artifact 工作流启动一个新 OpenSpec 变更。当用户想用结构化的、一步一步的方式创建新功能、修复或修改时使用。
- **allowed-tools**：`Bash(openspec:*)`——只允许运行 openspec 命令
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: "1.0"`、`generatedBy: "1.8.0"`

> **批注**：description 里"实验性的（experimental）"这个自我标注值得注意。它出现在 `openspec init` 的**扩展 profile** 里（默认 profile 只给 6 个工作流，本技能不在其中）。作者把一个自己还在试验的东西明确标成试验性，而不是等它成熟了再放出来——这让使用者的预期与实际成熟度对齐。

## 正文

使用实验性的 artifact 驱动方式启动一个新变更。

**Store 选择：** 如果用户点名了某个 store（store 是注册在这台机器上的独立 OpenSpec 仓库），或者工作就发生在某个 store 里，先运行 `openspec store list --json` 发现已注册的 store id，然后在读写 specs 和 changes 的那些命令上附加 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定，就把 `--store <id>` 视为**粘性**的，整个工作流剩余部分都带着它。下文所有未带 scope 的命令示例都是简写：运行前要补上这个标志。例如要运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文所示的未带标志形式。其他命令不接受这个标志。命令打印的提示里已经带上了该标志，后续跟进时要保持它。如果没有 store，命令就作用于最近的本地 `openspec/` 根。

**输入**：用户的请求应当包含一个变更名（kebab-case）**或**一段关于他要构建什么的描述。

**步骤**

1. **如果没有提供清晰的输入，问他想构建什么**

   问用户（开放式，不给预设选项）：
   > "你想处理哪个变更？描述一下你想构建或修复什么。"

   从他的描述里推导出一个 kebab-case 名字（例如 "add user authentication" → `add-user-auth`）。

   **重要**：在没有理解用户想构建什么之前，**不要**继续。

2. **确定工作流 schema**

   除非用户明确要求别的，否则使用默认 schema（省略 `--schema`）。

   **只有在用户提到下列情形时才换 schema：**
   - 某个具体的 schema 名字 → 使用 `--schema <name>`
   - "展示工作流" 或 "有哪些工作流" → 运行 `openspec schemas --json`，让他选择

   **否则**：省略 `--schema` 以使用默认值。

3. **创建变更目录**
   ```bash
   openspec new change "<name>"
   ```
   只有当用户请求了某个特定工作流时，才加 `--schema <name>`。
   这会在 CLI 解析出的 planning home 中创建一个带脚手架的变更。

4. **展示 artifact 状态**
   ```bash
   openspec status --change "<name>" --json
   ```
   使用返回的 `planningHome`、`changeRoot`、`artifactPaths` 和 `nextSteps`，**而不是假设仓库内的相对路径**。

5. **获取第一个 artifact 的指令**
   第一个 artifact 取决于 schema（例如 `spec-driven` 的 `proposal`）。
   检查 status 输出，找到第一个状态为 "ready" 的 artifact。
   ```bash
   openspec instructions <first-artifact-id> --change "<name>"
   ```
   这会输出用于创建第一个 artifact 的模板和上下文。

6. **停下，等待用户的指示**

> **批注**：第 6 步是"停下"。它不是流程的中断，**它就是流程的终点**——这个技能的全部设计就是"走到这里然后交还控制权"。与 `openspec-propose` 一路生成到四件套全部完成相比，这一步的差别就是两个技能存在的全部理由。见 [详细设计讲解](./openspec-new-change-详细设计讲解.md)。

**输出**

完成上述步骤后，总结：
- 变更名与位置
- 正在使用的 schema / 工作流及其 artifact 顺序
- 当前状态（N 个 artifact 中完成 0 个）
- 第一个 artifact 的模板
- 提示："准备好创建第一个 artifact 了吗？描述一下这个变更是关于什么的，我来起草；或者让我继续。"

**护栏（Guardrails）**

- **还不要创建任何 artifact**——只展示指令
- **不要越过"展示第一个 artifact 模板"这一步**
- 如果变更名不合法（不是 kebab-case），要求一个合法的名字
- 如果同名变更已存在，建议改为继续那个变更
- 如果使用非默认工作流，要传 `--schema`

---

## 相关

- [openspec-new-change-详细设计讲解.md](./openspec-new-change-详细设计讲解.md) —— 本文的设计分析：为什么"主动停止"本身就是功能、它与 propose 的取舍差异
- [openspec-propose-中文版.md](./openspec-propose-中文版.md) —— 同一阶段的一次生成版本
- [openspec-explore-中文版.md](./openspec-explore-中文版.md) —— 变更之前的无副作用探索
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— OpenSpec 整体原理与三套对比
