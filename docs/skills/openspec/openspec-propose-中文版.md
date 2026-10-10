# openspec-propose · 中文版

> **来源**：`skills/openspec/skills/openspec-propose/SKILL.md`
> **类型**：工作流技能（规划阶段，主入口）
> **触发**：自动触发——当用户想快速描述要构建什么、并一次拿到完整提案（含 design、specs、tasks）时

---

## frontmatter

- **name**：`openspec-propose`
- **description**：提出一个新变更，并在一步之内生成全部 artifact。当用户想快速描述要构建什么、并拿到一份完整的提案（含 design、specs、tasks，可直接进入实现）时使用。
- **allowed-tools**：`Bash(openspec:*)`——只允许运行 openspec 命令
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: "1.0"`、`generatedBy: "1.8.0"`

## 正文

提出一个新变更——创建它，并在一步之内生成全部 artifact。

**规划边界（Planning boundary）**：这个工作流**只创建规划 artifact**。选中或触发本工作流的那个用户请求，**只授权了规划**——即使它说的是要构建或修复什么。**不要编辑项目代码。** 规划 artifact 完成后就停下。**不要在同一个响应里开始实现**，即使最初的请求就是这么要求的。artifact 呈现给用户之后，等待一个新的用户请求；那时再启动 apply 工作流。

> **批注**：这段是**整个 OpenSpec 里最重要的边界**，也是它与 Superpowers 的 `<HARD-GATE>`、grilling 的"确认共识前不得行动"**各自独立发明的同一道规划门禁**。三者措辞几乎互不相干，却都在防同一件事：规划态与执行态必须分离，中间隔一道人工审查。特别注意那句 "even if the initial request asks for it"——它明确堵住了"用户说了要写代码"这个最常见的绕过理由。见 [详细设计讲解](./openspec-propose-详细设计讲解.md)。

我将创建一个变更，其 artifact 由你的 schema 定义。用默认的 `spec-driven` schema 时是：

- `proposal.md`（是什么 & 为什么）
- `specs/<capability-path>/spec.md`（系统必须做到什么——这是**增量（delta）**，不是主规格）
- `design.md`（怎么做）
- `tasks.md`（实现步骤）

`<capability-path>` 是相对于 `specs/` 的规格目录（例如 `user-auth` 或 `identity/user-auth`）。保留既有 capability 的完整路径，新 capability 则遵循项目已有的组织方式。

当用户准备好实现时，他必须显式启动 apply 工作流。

> **批注**：`<capability-path>` 按**业务能力**划分，而不是按代码模块（`user-auth` 而不是 `src/auth/`）。这个选择让规格可以与代码结构各自独立演化——你重构代码目录时，规格树不必跟着动。它也解释了 OpenSpec 声称的 "built for brownfield"（为存量项目而生）：业务能力是存量项目里唯一相对稳定的那层结构。

---

**Store 选择：** 如果用户点名了某个 store（store 是注册在这台机器上的独立 OpenSpec 仓库），或者工作就发生在某个 store 里，先运行 `openspec store list --json` 发现已注册的 store id，然后在读写 specs 和 changes 的那些命令上附加 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定，就把 `--store <id>` 视为**粘性**的，整个工作流剩余部分都带着它。下文所有未带 scope 的命令示例都是简写：运行前要补上这个标志。例如要运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文所示的未带标志形式。其他命令不接受这个标志。命令打印的提示里已经带上了该标志，后续跟进时要保持它。如果没有 store，命令就作用于最近的本地 `openspec/` 根。

**输入**：用户的请求应当包含一个变更名（kebab-case）**或**一段关于他要构建什么的描述。

**步骤**

1. **理解请求，澄清实质性歧义**

   如果没有提供清晰的输入，就问用户（开放式，不给预设选项）：
   > "你想处理哪个变更？描述一下你想构建或修复什么。"

   从他的描述里推导出一个 kebab-case 名字（例如 "add user authentication" → `add-user-auth`）。

   **重要**：在没有理解用户想构建什么之前，**不要**继续。

   如果请求里含有会**实质影响范围、外部可观察行为、兼容性或验收标准**的歧义，就在创建变更之前先问用户。对于次要细节，做一个合理的假设，并把它记录在规划 artifact 里。

2. **确定工作流 schema**

   除非用户明确要求别的，否则使用配置好的默认 schema。

   **只有在用户符合下列情形时才换 schema：**
   - 明确点名了某个 schema → 使用 `--schema <schema-name>`
   - 要求"展示工作流"或问"有哪些工作流" → 通过在当前工作目录运行 `openspec context --json` 来解析权威 root。如果用户明确选择了某个已注册的 store，则用 `openspec context --json --store "<store-id>"`。然后把工作目录设为返回的 `root.path`，运行 `openspec schemas --json`，让他选择。这样能保留由本地 `store:` 指针或全局 `defaultStore` 选定的 root；`schemas` 不接受 `--store`。如果 context 只报告 `no_openspec_root`，就改为在当前工作目录运行 `openspec schemas --json`。**不要**对无效或不可用的 store 使用这个回退。

   否则，**省略 `--schema`** 以保留配置好的默认值。

3. **创建变更目录**

   在下面两种形式中选一种。如果选定了已注册的 store，就给该命令、以及下面每一个接受 `--store` 的后续 OpenSpec 命令附加 `--store "<store-id>"`。

   使用配置好的默认值：
   ```bash
   openspec new change "<name>"
   ```

   使用显式请求的 schema：
   ```bash
   openspec new change "<name>" --schema "<schema-name>"
   ```
   这会在 CLI 解析出的 planning home 中创建一个带脚手架的变更，含 `.openspec.yaml`。

4. **获取 artifact 的构建顺序**
   ```bash
   openspec status --change "<name>" --json
   ```
   解析 JSON 得到：
   - `applyRequires`：实现之前必需的 artifact id 数组（例如 `["tasks"]`）
   - `artifacts`：全部 artifact 的列表，每个带有它的 `status` 和它的 `requires` 边（它直接依赖的 artifact id）
   - `planningHome`、`changeRoot`、`artifactPaths`、`actionContext`：路径与 scope 上下文。**用这些，而不是假设仓库内的相对路径。**

5. **创建必需集合里的每一个 artifact**

   用一份 todo 列表跟踪 artifact 的推进进度。

   按依赖顺序遍历 artifact（没有待处理依赖的排前面）：

   a. **对每个状态为 `ready` 的 artifact（依赖已满足）**：
      - 获取指令：
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - 指令 JSON 包含：
        - `context`：项目背景（**给你**的约束——**不要**写进输出）
        - `rules`：artifact 专属规则（**给你**的约束——**不要**写进输出）
        - `template`：你输出文件要用的结构
        - `instruction`：针对该 artifact 类型的 schema 专属指导
        - `skipped`/`warning`：当变更声明了 skip_specs、且该 artifact **绝不能**被创建时出现——停下来，换一个 artifact
        - `resolvedOutputPath`：写 artifact 的已解析路径或模式
        - `dependencies`：要读取以获取上下文的已完成 artifact
      - 读取任何已完成的依赖文件作为上下文——**始终从磁盘重读，即使你在对话前面已经看过**（用户可能改过它们）
      - 如果 `instruction` 字段把创建委托给某个特定技能或命令，就调用它来产出 artifact，而不是自己写文件；然后核实 artifact 文件确实存在于 `resolvedOutputPath`
      - 否则以 `template` 为结构创建 artifact 文件，写到 `resolvedOutputPath`。如果 `resolvedOutputPath` 是 glob，遵循 `instruction` 选择具体文件路径
      - 把 `context` 和 `rules` 作为约束应用——但**不要**把它们复制进文件
      - 显示简短进度："Created `<artifact-id>`"

   b. **继续直到必需集合里的每个 artifact 都存在（不只是 `apply.requires`）**
      - 每创建一个 artifact 之后，重新运行 `openspec status --change "<name>" --json`
      - 必需集合 = `applyRequires` **加上**从它们出发沿着 `status --json` 的 `requires` 边走到的每个 artifact——**传递地**走完（spec-driven 会闭包到 proposal、specs、design、tasks）。集合之外的 artifact 不要动
      - `status` **只反映文件是否存在**，所以一个 `applyRequires` 里的 artifact 读到 `done` **不代表**它的依赖存在——提前写 `tasks.md` 会把 `tasks` 标成 done，而 `specs` 从未写过。**用每个 artifact 的 `requires` 边来构建必需集合，而不是用它的 `status`**：一个 `done` 的 artifact 仍然会列出它依赖什么
      - 已经读到 `status: "skipped"` 的 artifact 是**已满足**的：变更在 `.openspec.yaml` 里声明了 `skip_specs`，所以它的文件**绝不能存在**。绝不要试图创建一个
      - 创建必需集合里每个缺失的 artifact，然后重新检查——创建一个可能会解锁其他
      - 只有在 `status` 已经报告它为 `skipped`，或者它自己的 `instruction` 说明它是条件性的时候，才跳过某个 artifact：运行 `openspec instructions <artifact-id> --change "<name>" --json`，**只有当它的 `instruction` 字段标明其为可选**（例如 "create only if..."）时才跳过。spec-driven 的 `design.md` 符合这一点；`specs` **只**通过上面的 `skipped` 状态符合，**绝不**能靠你自己的判断。告知用户，并且不再重新考虑
      - 依赖是**使能者，不是闸门**：如果某个必需的 artifact 仍然 `blocked`，而原因仅仅是你跳过了某个条件性依赖，那就照样写它
      - 当必需集合里的每个 artifact 都达到 `done`、`skipped`，或被有意跳过时停止

   c. **如果某个 artifact 需要用户输入**（上下文不清楚）：
      - 请用户澄清
      - 然后继续创建

> **批注**：第 5b 步里那条 `status` 只反映文件存在的规则，是全文**最容易被忽略、也最实质**的一条技术细节。它暴露了 `status` 这个 API 的语义边界：它检查的是"文件在不在"，而不是"依赖闭包是否成立"。于是出现一个反直觉的陷阱——**提前写一个叶子 artifact，反而会让它显示为"完成"，而它的依赖其实一个都没写。** 正确的做法是按 `requires` 边传递地算出必需集合，而不是相信 `status`。这是一个典型的"API 语义不如名字暗示的那样强"的例子。

6. **展示最终状态**
   ```bash
   openspec status --change "<name>"
   ```

**输出**

完成全部 artifact 之后，总结：
- 变更名与位置
- 已创建 artifact 的列表与简述，外加任何被你**条件性跳过**的 artifact 及原因
- 什么已就绪："实现所需的全部 artifact 已就绪。"
- 提示："artifact 已就绪，可供审查。当你准备好时，运行 `/opsx:apply`，或者让我来应用这个变更。"

**Artifact 创建准则**

- 对每种 artifact 类型，遵循 `openspec instructions` 返回的 `instruction` 字段——**它是权威指导**，即使遇到你熟悉的 artifact 名字也不例外
- 如果 `instruction` 字段指示你用某个特定技能或命令来创建 artifact，就调用它，而不是直接写文件
- schema 定义了每个 artifact 应当包含什么——遵循它
- 在创建新 artifact 之前，先读取依赖 artifact 作为上下文
- 用 `template` 作为输出文件的结构——填充它的各个小节
- **重要**：`context` 和 `rules` 是**给你**的约束，**不是给文件的**内容
  - **不要**把 `<context>`、`<rules>`、`<project_context>` 这些块复制进 artifact
  - 它们指导你写什么，但**永远不应出现在输出里**

> **批注**："`context` 和 `rules` 是给你的约束，不是给文件的内容"这句在 `propose` 里出现了**两次**（第 5a 步一次，这里一次），在 `explore` 里也出现了一次。同一条规则在三个地方重复，说明它对抗的是 LLM 的一个**高频默认行为**：拿到背景文本就原样粘贴进产物。后果是每个 artifact 都被样板文字撑大、真正的信息被稀释。

**护栏（Guardrails）**

- 触发本工作流的那个请求**只授权了规划**。该请求里任何实现或 apply 的指示都**不会延续到这里**。在本工作流进行期间，**不要**实现这个变更、**不要**启动 apply 工作流、**不要**编辑项目代码。呈现 artifact 之后停下，等待一个新的用户请求来启动 apply 工作流
- 创建 apply 阶段**传递依赖**的每一个 artifact，而不只是 `apply.requires` 里列出的那些 id
- 创建新 artifact 之前**始终**先读依赖 artifact——**从磁盘重读，不要从对话记忆里读**（文件可能在你上次看到之后变过）
- 对于会实质改变**范围、外部可观察行为、兼容性或验收标准**的歧义，要问；对于次要细节，做合理假设并记录它们
- 如果同名变更已存在，问用户是想继续它还是新建一个
- 每写完一个 artifact，都要先核实文件存在，再进入下一个

---

## 相关

- [openspec-propose-详细设计讲解.md](./openspec-propose-详细设计讲解.md) —— 本文的设计分析：规划边界为何必要、`status` 语义陷阱的成因
- [openspec-explore-中文版.md](./openspec-explore-中文版.md) —— 常在本技能之前的无副作用探索
- [openspec-new-change-中文版.md](./openspec-new-change-中文版.md) —— 同一阶段的分步版本（只脚手架、不一次生成）
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— OpenSpec 整体原理与三套对比
