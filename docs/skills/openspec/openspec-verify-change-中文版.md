# openspec-verify-change · 中文版

> **来源**：`skills/openspec/skills/openspec-verify-change/SKILL.md`
> **类型**：工作流技能（OpenSpec 归档前验证）
> **触发**：`/opsx:verify`；或在归档前要求验证实现是否与变更 artifact 一致时

---

## frontmatter

- **name**：`openspec-verify-change`
- **description**：验证实现与变更 artifact 是否一致。当用户想在归档前确认实现是完整、正确、前后一致的时使用。
- **allowed-tools**：`Bash(openspec:*)` —— 只允许调用 openspec CLI
- **license / compatibility**：MIT；依赖 openspec CLI
- **metadata.author**：openspec ｜ **version**：1.0 ｜ **generatedBy**：1.8.0

## 正文

验证一个实现是否与变更 artifact（specs、tasks、design）相符。

**Store 选择：** 如果用户点名了一个 store（store 是注册在本机上的、独立的 OpenSpec 仓库），或者工作本身位于某个 store 中，就运行 `openspec store list --json` 发现已注册的 store id，然后在读取或写入规格与变更的那些命令上传递 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定，就把 `--store <id>` 视为本次工作流余下部分的**粘性参数**。下文所有未带作用域的示例都是简写：运行前先补上该标志。例如，应当运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文所示的无作用域形式。其他命令不接受该标志。命令打印出的提示已经带上了该标志，后续跟随时保留它。没有 store 时，命令作用于最近的本地 `openspec/` 根目录。

**输入**：可选地指定一个变更名。若省略，检查是否能从对话上下文中推断出来。若含糊或有歧义，你**必须**提示用户从可用变更中选择。

**步骤**

1. **选择变更**

   若提供了名称就用它。否则：
   - 若用户在对话中提到过某个变更，从中推断
   - 若只有一个进行中的变更，自动选中
   - 若有歧义，运行 `openspec list --json` 获取可用变更并请用户选择一个

   提示时只展示**带实现任务**的变更（即存在 tasks artifact）。
   若可用，一并展示每个变更所用的 schema。
   把任务未完成的变更标记为"(In Progress)"。

   始终声明："正在使用变更：<name>"，以及如何覆盖（例如 `/opsx:verify <other>`）。

   > **批注**：选择标准的差异值得注意——`archive-change` 提示时展示**所有进行中**的变更，而这里只展示**带 tasks 的**。原因很直接：本技能的职责是"验证实现"，而没有 tasks 的变更（比如纯探索或纯规格变更）没有可验证的实现。

2. **检查状态以理解 schema**

   ```bash
   openspec status --change "<name>" --json
   ```

   解析 JSON 以理解：
   - `schemaName`：所用工作流（例如 "spec-driven"）
   - `planningHome`、`changeRoot`、`artifactPaths` 与 `actionContext`：路径与作用域上下文
   - 该变更存在哪些 artifact

3. **获取规划上下文并载入 artifact**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   这会返回变更目录与 `contextFiles`（artifact ID → 具体文件路径的数组）。读取 `contextFiles` 中所有可用的 artifact。

4. **初始化验证报告结构**

   建立一个含三个维度的报告结构：
   - **Completeness（完整性）**：跟踪任务与规格覆盖
   - **Correctness（正确性）**：跟踪需求实现与场景覆盖
   - **Coherence（一致性）**：跟踪设计遵循度与模式一致性

   每个维度都可以有 CRITICAL、WARNING 或 SUGGESTION 级的问题。

   > **批注**：三个维度回答的是三个不同的问题，缺一不可——**Completeness**："说要做的事都做了吗？"（查清单）**Correctness**："做对了吗？"（查需求与场景的对应）**Coherence**："做法自洽吗？"（查是否遵循 design.md、是否符合项目既有模式）。如果只报一个"通过/不通过"，这三类问题的**可操作性**就丢了：未完成的任务要去做，偏离的实现在 review，模式不一致只需知晓——它们的处理方式完全不同。

5. **验证完整性（Completeness）**

   **任务完成度**：
   - 若 `contextFiles.tasks` 存在，读取其中的每一个文件路径
   - 解析复选框：`- [ ]`（未完成）与 `- [x]`（已完成）
   - 统计已完成与总任务数
   - 若存在未完成任务：
     - 为每个未完成任务添加一条 CRITICAL 问题
     - 建议："完成该任务：<描述>"或"若已实现，标记为完成"

   **规格覆盖**：
   - 若 `contextFiles.specs` 中存在 delta spec：
     - 提取所有需求（以 "### Requirement:" 标记的行）
     - 对每个需求：
       - 在代码库中搜索与该需求相关的关键词
       - 评估实现是否**很可能**存在
     - 若需求看起来未被实现：
       - 添加 CRITICAL 问题："未找到需求：<需求名>"
       - 建议："实现需求 X：<描述>"

6. **验证正确性（Correctness）**

   **需求实现映射**：
   - 对 delta spec 中的每个需求：
     - 在代码库中搜索实现证据
     - 若找到，记录文件路径与行号范围
     - 评估实现是否符合需求意图
     - 若检测到偏离：
       - 添加 WARNING："实现可能与规格偏离：<细节>"
       - 建议："对照需求 X 审查 <file>:<lines>"

   **场景覆盖**：
   - 对 delta spec 中的每个场景（以 "#### Scenario:" 标记）：
     - 检查代码中是否处理了这些条件
     - 检查是否有测试覆盖该场景
     - 若场景看起来未被覆盖：
       - 添加 WARNING："场景未覆盖：<场景名>"
       - 建议："为该场景添加测试或实现：<描述>"

7. **验证一致性（Coherence）**

   **设计遵循度**：
   - 若 `contextFiles.design` 存在：
     - 提取关键决策（寻找 "Decision:"、"Approach:"、"Architecture:" 这类小节）
     - 验证实现是否遵循了这些决策
     - 若检测到矛盾：
       - 添加 WARNING："设计决策未被遵循：<决策>"
       - 建议："更新实现，或修订 design.md 使其与实际情况相符"
   - 若没有 design.md：跳过设计遵循度检查，注明"没有 design.md 可供对照"

   **代码模式一致性**：
   - 审查新代码与项目模式的一致性
   - 检查文件命名、目录结构、编码风格
   - 若发现显著偏离：
     - 添加 SUGGESTION："代码模式偏离：<细节>"
     - 建议："考虑遵循项目模式：<示例>"

8. **生成验证报告**

   **摘要记分卡**：

   ```markdown
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |
   ```

   **按优先级分组的问题**：

   1. **CRITICAL**（归档前必须修复）：
      - 未完成的任务
      - 缺失的需求实现
      - 每条都配具体、可执行的建议

   2. **WARNING**（应当修复）：
      - 规格/设计偏离
      - 缺失的场景覆盖
      - 每条都配具体建议

   3. **SUGGESTION**（改了更好）：
      - 模式不一致
      - 次要改进
      - 每条都配具体建议

   **最终判定**：
   - 若有 CRITICAL 问题："发现 X 个严重问题。归档前请修复。"
   - 若只有警告："无严重问题。有 Y 个警告值得考虑。可以归档（附已知改进项）。"
   - 若全部通过："所有检查通过。可以归档。"

**验证启发式（Verification Heuristics）**

- **完整性**：聚焦客观的清单项（复选框、需求列表）
- **正确性**：使用关键词搜索、文件路径分析、合理推断——**不要求完全确定的证据**
- **一致性**：寻找显著的不一致，不要对风格吹毛求疵
- **误报**：不确定时，宁可报 SUGGESTION 而非 WARNING，宁可报 WARNING 而非 CRITICAL
- **可执行性**：每条问题都必须给出具体建议，并在适用时附文件/行号引用

> **批注**：这一节是整个技能的**诚实声明**——它承认自己用的是**启发式，不是证明**。"用关键词搜索……不要求完全确定的证据"等于说：这份报告的结论可能是错的。承认这一点之后，才有下面那条更重要的规则：**不确定时向下降级**（SUGGESTION > WARNING > CRITICAL）。
>
> 这条降级规则的真正目的是**保护信噪比**。一份验证报告的价值取决于其中"必须处理"的条目是否真的必须处理；一旦 CRITICAL 里混进误报，用户就会开始整体忽略这份报告——而那时真正致命的遗漏也一起被忽略了。所以宁可把不确定的东西放在低级别，也不能让高级别被稀释。

**优雅降级（Graceful Degradation）**

- 若只有 tasks.md：只验证任务完成度，跳过规格/设计检查
- 若 tasks + specs 存在：验证完整性与正确性，跳过设计
- 若有完整 artifact：三个维度全部验证
- 始终注明跳过了哪些检查以及原因

**输出格式**

使用清晰的 markdown，包含：
- 摘要记分卡用表格
- 问题按 CRITICAL/WARNING/SUGGESTION 分组列出
- 代码引用格式：`file.ts:123`
- 具体、可执行的建议
- 不要写"建议审查一下"这类含糊的建议

---

## 附属文件

本技能只有 `SKILL.md`，无附属文件。

---

## 相关

- [openspec-verify-change-详细设计讲解.md](./openspec-verify-change-详细设计讲解.md) —— 本文的设计分析：启发式为何必须承认自己不确定、降级规则在保护什么
- [openspec-archive-change-中文版.md](./openspec-archive-change-中文版.md) —— 紧随其后的归档步骤
- [openspec-apply-change-中文版.md](./openspec-apply-change-中文版.md) —— 它所验证的那个实现阶段
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— OpenSpec 整体原理
