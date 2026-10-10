# openspec-bulk-archive-change · 中文版

> **来源**：`skills/openspec/skills/openspec-bulk-archive-change/SKILL.md`
> **类型**：工作流技能（OpenSpec 批量归档）
> **触发**：`/opsx:bulk-archive`；或需要一次归档多个并行变更时

---

## frontmatter

- **name**：`openspec-bulk-archive-change`
- **description**：一次归档多个已完成的变更。在归档多个并行变更时使用。
- **allowed-tools**：`Bash(openspec:*)` —— 只允许调用 openspec CLI
- **license / compatibility**：MIT；依赖 openspec CLI
- **metadata.author**：openspec ｜ **version**：1.0 ｜ **generatedBy**：1.8.0

## 正文

在一次操作中归档多个已完成的变更。

这个技能让你批量归档变更，并通过**检查代码库来判断实际实现了什么**，从而智能地处理规格冲突。

**Store 选择：** 如果用户点名了一个 store（store 是注册在本机上的、独立的 OpenSpec 仓库），或者工作本身位于某个 store 中，就运行 `openspec store list --json` 发现已注册的 store id，然后在读取或写入规格与变更的那些命令上传递 `--store <id>`（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）。一旦选定，就把 `--store <id>` 视为本次工作流余下部分的**粘性参数**。下文所有未带作用域的示例都是简写：运行前先补上该标志。例如，应当运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文所示的无作用域形式。其他命令不接受该标志。命令打印出的提示已经带上了该标志，后续跟随时保留它。没有 store 时，命令作用于最近的本地 `openspec/` 根目录。

`<capability-path>` 是相对于 `specs/` 的规格目录（例如 `user-auth` 或 `identity/user-auth`）。在解析某个 delta spec 对应的主规格时，要保留其完整路径。

**输入**：不需要（会提示选择）

**步骤**

1. **获取进行中的变更**

   运行 `openspec list --json` 获取所有进行中的变更。

   若不存在进行中的变更，告知用户并停止。

2. **提示选择变更**

   请用户选择变更（多选）：
   - 展示每个变更及其 schema
   - 提供一个"全部变更"的选项
   - 允许任意数量的选择（1 个也可以，2 个以上是典型用法）

   **重要**：**不要**自动选择。始终让用户自己选。

   > **批注**：这一句全部大写强调，理由很直接——这是一次**批量破坏性操作**（多个 `mv` + 多次主规格写入），而且**没有回滚**。自动选择意味着 AI 可以替用户决定"哪些变更算完成了"，而这个判断一旦错，用户会在毫不知情的情况下把未完成的变更推进真相。对比 `archive-change`（单变更）也要求"有歧义时必须提示"，但允许多数情形下自动选中——批量的风险量级不同，所以标准也更严。

   **在批量校验之前，为所选根目录载入一次当前的归档输入：**

   从该根目录中选一个已选变更，用相同的已选根目录标志运行
   `openspec instructions archive --change "<selected-change>" --json`。这次查询是**建议性的、可选的**：它只提供额外的提示输入，因此**绝不能阻塞批量操作**。若它失败或返回非法 JSON——例如在尚不支持该命令的旧版 CLI 上——就在没有任何 context、没有任何 operation guidance 的情况下继续批量操作。不要报告错误，也不要停止。

   合法响应可能省略 `context` 与 `operationGuidance`。把 `context` 视为**贯穿整批的必需提示级输入**：读取并考虑它，应用其中相关的项目事实、约定与约束。把 `operationGuidance` 视为**可选的补充建议**：读取并考虑每一条，对其中适用且与内置批量工作流兼容的条目予以遵循。

   把这两个字段与冲突分析、用户的显式选择、已解析的路径、CLI 检查和命令契约**分开对待**。若 context 与上述任一控制性输入冲突，报告该冲突并保留控制性输入的值。若 guidance 不适用或与控制性输入冲突，不要遵循它，并解释原因。不要从这两个字段推断出跳过的提示、替换路径或标志，也不要将其文本原样抄进规格、变更或摘要。这些是提示级的行为契约，不是可强制执行的检查。

   > **批注**：注意这里只查**一个**变更的归档输入，却要**贯穿整批**使用。因为 `context` 描述的是**项目级**的约定与事实，而整批变更共享同一个根目录——查一次就够。这是把"每个变更查一次"的 N 次查询压成 1 次，代价是：若这批变更来自**混合 schema**（见第 3 步 c），单一来源的 context 可能不完全适用于每一个。

3. **批量校验——收集所有已选变更的状态**

   对每个已选变更，收集：

   a. **Artifact 状态** —— 运行 `openspec status --change "<name>" --json`
      - 解析 `schemaName`、`artifacts`、`planningHome`、`changeRoot`、`artifactPaths` 与 `actionContext`
      - 记录哪些 artifact 是 `done`、哪些是其他状态

   b. **任务完成度** —— 从 status JSON 读取 `artifactPaths.tasks.existingOutputPaths`
      - 统计 `- [ ]`（未完成）与 `- [x]`（已完成）
      - 若不存在任务文件，记为 "No tasks"

   c. **Delta specs** —— 检查 status JSON 里的 `artifactPaths.specs.existingOutputPaths`
      - 列出存在哪些 capability spec
      - 对每一个，提取需求名（匹配 `### Requirement: <name>` 的行）
      - 把这个列表当作**唯一**的 delta-spec 来源。若 `specs` 条目缺失或列表为空，就对该变更**不做任何规格同步或 specs-instruction 查询**；不要从无关 artifact 推断 delta
      - 对**每一个**变更都要独立评估这一点，包括混合 schema 的批次（其中某些 schema 根本没有 `specs` artifact）

   > **批注**：c 的最后一句针对一个容易被忽略的边界：一批里可能混着不同 schema 的变更，而某些 schema 不产 `specs` artifact。若代码写成"先假定都有 specs 再逐个查"，遇到这类变更就会去猜 delta——而"不要从无关 artifact 推断 delta"正是把这扇门关死。**唯一来源就是 `existingOutputPaths`**，缺失即视为没有。

4. **检测规格冲突**

   建立一张以 `<capability-path>`（相对 `specs/` 的精确路径）为键的映射表：

   ```text
   identity/user-auth -> [change-a, change-b]  <- 冲突（2 个及以上变更）
   billing/user-auth  -> [change-c]            <- 正常（完整路径不同）
   ```

   当 2 个及以上已选变更对**完全相同的 `<capability-path>`** 存在 delta spec 时，即构成冲突。

   > **批注**：注意判据是**精确完整路径**，而不是末段名。`identity/user-auth` 与 `billing/user-auth` 路径末段同名，却**不算冲突**——因为它们是两个不同的 capability，各自有独立的 `spec.md`。这条规则把"命名空间"变成了隔离机制：目录层级越细，冲突面越小。反过来也意味着，**把 capability 路径设计得过粗（比如全都塞在 `auth/` 下）会人为制造冲突**。

5. **由 agent 裁决冲突**

   **对每一处冲突**，调查代码库：

   a. **读取各冲突变更的 delta spec**，理解各自声称新增/修改了什么

   b. **在代码库中搜索实现证据**：
      - 寻找实现各 delta spec 中需求的代码
      - 检查相关文件、函数或测试

   c. **决定如何解决**：
      - 若只有一个变更是**实际已实现**的 → 只同步那一个的规格
      - 若**两者都已实现** → 按时间顺序施加（旧的先，新的覆盖）
      - 若**两者都未实现** → 跳过规格同步，并警告用户

   d. **记录裁决结果**：对每一处冲突记录
      - 针对**每一个** delta spec 的包含或排除决定，以变更与 `<capability-path>` 为键
      - 哪些被包含的 delta spec 需要施加、按什么顺序
      - 哪些 delta spec 因实现缺失而被排除在同步之外
      - 依据（在代码库里发现了什么）

   > **批注**：裁决依据是"代码里实际实现了什么"，这个选择值得琢磨。备选方案有：按变更新旧（简单但可能把未实现的新变更盖在已实现的旧变更上）、按用户偏好（但用户未必知道哪个真做了）、按 delta 内容质量（更主观）。选"代码证据"的理由是：**它是唯一客观且能反映现实的**——delta 写的是**意图**，代码才是**事实**。这和 `domain-modeling` 里"与代码交叉验证"用的是同一个判据。

6. **展示合并后的状态表**

   展示一张概括所有变更的表：

   ```markdown
   | Change              | Artifacts | Tasks | Specs   | Conflicts | Status |
   |---------------------|-----------|-------|---------|-----------|--------|
   | schema-management   | Done      | 5/5   | 2 delta | None      | Ready  |
   | project-config      | Done      | 3/3   | 1 delta | None      | Ready  |
   | add-oauth           | Done      | 4/4   | 1 delta | identity/user-auth (!) | Ready* |
   | add-verify-skill    | 1 left    | 2/5   | None    | None      | Warn   |
   ```

   对冲突，展示裁决结果：

   ```text
   * Conflict resolution:
     - identity/user-auth spec: Will apply add-oauth then add-jwt (both implemented, chronological order)
   ```

   对不完整的变更，展示警告：

   ```text
   Warnings:
   - add-verify-skill: 1 incomplete artifact, 3 incomplete tasks
   ```

7. **确认批量操作**

   请用户做**一次**确认：

   - "归档 N 个变更？"，选项取决于状态
   - 选项可能包括：
     - "归档全部 N 个变更"
     - "只归档 N 个就绪的变更（跳过不完整的）"
     - "取消"

   若存在不完整的变更，明确说明它们将**带着警告**被归档。

   按**意图**而非精确字面来路由答案——这些标签是你自己写的，所以匹配用户实际选的那个，而不是上面这段文字：
   - "取消" —— 停止，不归档。报告什么都没被归档，并跳过剩余步骤。
   - 归档全部的那个选项 —— 对每一个已选变更继续
   - 只归档就绪的那个选项 —— 只对第 6 步表格中标记为 `Ready` 或 `Ready*` 的变更继续，其余在第 8 步 d 记为 Skipped。若某个 `Ready*` 变更的冲突伙伴被跳过，**只用正在归档的那些变更**重新推导该冲突的裁决。
   - 其他任何回答 —— 重新询问，而不是归档

   > **批注**："只归档就绪的"这个选项里藏着整套技能**最精妙的一处逻辑**：当一个冲突的两个变更中有一个被跳过时，原来的裁决（可能是"两者都已实现，按时间顺序施加"）就**不再成立**——伙伴不在批里了，冲突本身消失了。所以必须**重新推导**，而不是沿用旧裁决。若不重推，就会出现"裁决说按顺序施加 A 然后 B，但 B 已被跳过"的矛盾状态。
   >
   > 这也说明冲突裁决不是一个"分析结果"，而是**相对于某一批变更集合**的结论——集合一变，结论要重算。

   在第 8 步写入第一份主规格或移动任何变更**之前**，为已确认的这批取齐所有必需的 specs 规则快照。对每一个将要同步具体 `artifactPaths.specs.existingOutputPaths` 的变更，用相同的已选根目录标志**恰好运行一次** `openspec instructions specs --change "<name>" --json`。**在第一次写入或移动之前**取得全部快照。若任何一次查询退出码非零或返回非法的 artifact-instruction JSON，指出受影响的变更、报告错误，并在任何主规格写入或变更移动之前**停止整批**。不要把查询失败当作"省略了规则"。合法响应但不含 `rules`，即无规则的情形。

   > **批注**：这里的设计意图是**原子性**——所有可能导致写入失败的前置查询，必须在**任何写入发生之前**全部成功。若改成"边查边写"，第一个变更写完了、第二个的查询才失败，结果就是**一半生效、一半没生效**，而且没有回滚。这就是"取齐才开始"的全部理由。
   >
   > 注意它与第 2 步的 `instructions archive` **待遇相反**：那个失败绝不阻塞，这个失败整批停止。判据同样是失败的可逆性——前者只少了一些建议，后者会导致主规格被写坏。

8. **对每个已确认的变更执行归档**

   处理之前，把第 5 步记录下的裁决（经第 7 步可能的重新推导后）带入两个**按 delta 划分**的集合：
   - `includedDeltas`：已确认变更中所有非冲突的 delta spec，加上被选中同步的冲突 delta
   - `excludedDeltas`：已确认变更中因实现缺失而被排除的冲突 delta
   - **一个变更可以同时拥有 included 与 excluded 的 delta spec。把决定保持在 delta 粒度上，不要把它塌缩成一个"按变更"的同步开关。**

   > **批注**：这是整套技能里**最容易被实现错的一处**。"按变更"去想会很自然：这个变更要同步，那个不同步。但真实情形是——一个变更的 delta 可能横跨多个 capability，其中一部分已被实现（要同步）、另一部分还没（不能同步）。若按变更设一个布尔开关，就只能二选一：要么把这批未实现的需求也写进真相（污染），要么放弃已实现那部分的同步（漏掉）。
   >
   > 原文用加粗强调"不要塌缩"，正是因为这是 LLM 最可能自作聪明简化掉的地方——而简化后行为看起来仍然"合理"，只是静默丢了正确性。

   按确定的顺序处理各变更（遵循冲突裁决的结果）：

   a. **同步被包含的 delta spec**：
      - 只对那些在 `includedDeltas` 中有条目的变更，**内联**运行 `openspec-sync-specs` 工作流（agent 驱动的智能合并），只传入被包含的 delta 路径，并**明确指示它忽略该变更的 `excludedDeltas`**。等待其结束。
      - 对冲突项，按裁决出的顺序施加。
      - 把该变更已取得的 specs 规则快照传入内联同步；内联同步必须复用它，不得再次获取 instructions
      - 仅把 artifact 规则应用于该变更所产出的主规格。它们不改变冲突裁决、归档行为或 CLI 契约，其文本也不被抄进任何输出文件
      - 不要委派为后台任务——第 8 步 c 会把 `changeRoot` 从仍在读取它的同步脚下移走。
      - 若某个变更没有 included 的 delta spec，就不要为它运行同步工作流。

   b. **在移动 `changeRoot` 之前验证被包含的 delta spec**：
      - 只对 `includedDeltas` 中的 delta spec，重新与 `<planningHome.root>/openspec/specs/<capability-path>/spec.md` 处的主规格做比较（使用第 3 步 status JSON 中获得的、store 感知的 `planningHome.root`，而不是硬编码的仓库路径）。
      - 验证主规格已更新：
        - ADDED 的需求已存在
        - MODIFIED 的需求带上了 delta 中点名的场景与描述变更，且它们的其他场景原封未动
        - REMOVED 的需求已消失——并且在本次同步**退役**了某个 capability 时（移除了它最后一个需求，留下空的 `## Requirements`），其主规格应被**删除**而不是留空；同步有意保留并报告过的规格也算匹配
        - RENAMED 的需求以新名称存在，且旧名称下已不存在
      - **不要**验证 `excludedDeltas` 中的 delta spec；它们是被有意留在未同步状态的。
      - 若同步失败，或任何 capability 不匹配验证结果，报告差异并**失败/跳过移动该变更的 `changeRoot`**——不归档该变更。`changeRoot` 保持完好。

   c. **执行归档**：

      目标名称：若变更名本身已以 `YYYY-MM-DD-` 前缀开头，就原样使用；否则把当前日期作为前缀加上，即 `YYYY-MM-DD-<name>`（与 `openspec archive` 同规则）。

      ```bash
      mkdir -p "<planningHome.changesDir>/archive"
      mv "<changeRoot>" "<planningHome.changesDir>/archive/<target-name>"
      ```

   d. **记录每个变更的结果**：
      - Success：归档成功
      - Failed：归档或规格验证过程中出错（记录错误）
      - Skipped：用户选择不归档（如适用）
      - Sync skipped：对 `excludedDeltas` 中的**每一个** delta，报告 `sync skipped`，并带上变更名、`<capability-path>` 与记录的原因。这与"跳过归档"是**两件不同的事**。

   > **批注**：d 的最后一句是在防止一种**报告层面的混淆**：一个变更可能"归档成功"但同时"某个 delta 未同步"。如果报告里只有一个状态字段，这两种情况就会被压成同一个词，用户无法分辨"这个变更完全生效了"还是"变更归档了但有一半需求没进真相"。**分开报告是让不完整的成功可见**——和 `verify-change` 里"跳过检查必须显式说明"是同一条原则。

9. **展示摘要**

   展示最终结果：

   ```markdown
   ## Bulk Archive Complete

   Archived 3 changes:
   - schema-management-cli -> archive/2026-01-19-schema-management-cli/
   - project-config -> archive/2026-01-19-project-config/
   - add-oauth -> archive/2026-01-19-add-oauth/

   Skipped 1 change:
   - add-verify-skill (user chose not to archive incomplete)

   Spec sync summary:
   - 4 delta specs synced to main specs
   - 1 delta spec sync skipped (add-jwt, identity/user-auth: implementation not found)
   - 1 conflict resolved (identity/user-auth: synced add-oauth, skipped add-jwt)
   ```

   若有失败：

   ```text
   Failed 1 change:
   - some-change: Archive directory already exists
   ```

**冲突裁决示例**

示例 1：只有一个已实现

```text
Conflict: <planningHome.root>/openspec/specs/auth/spec.md touched by [add-oauth, add-jwt]

Checking add-oauth:
- Delta adds "OAuth Provider Integration" requirement
- Searching codebase... found src/auth/oauth.ts implementing OAuth flow

Checking add-jwt:
- Delta adds "JWT Token Handling" requirement
- Searching codebase... no JWT implementation found

Resolution: Only add-oauth is implemented. Will sync add-oauth specs only.
```

示例 2：两者都已实现

```text
Conflict: <planningHome.root>/openspec/specs/api/spec.md touched by [add-rest-api, add-graphql]

Checking add-rest-api (created 2026-01-10):
- Delta adds "REST Endpoints" requirement
- Searching codebase... found src/api/rest.ts

Checking add-graphql (created 2026-01-15):
- Delta adds "GraphQL Schema" requirement
- Searching codebase... found src/api/graphql.ts

Resolution: Both implemented. Will apply add-rest-api specs first,
then add-graphql specs (chronological order, newer takes precedence).
```

> **批注**：两个示例的判据都是"**代码里有没有**"，而不是"变更写得怎么样"。示例 2 里的 `(created 2026-01-10)` 也值得注意——**时间顺序用的是变更创建时间**。这在多数情况下能反映"谁先谁后"，但创建时间**不等于实现时间**，也不等于用户期望的优先级。当两者冲突时（比如先创建的后实现），"新的覆盖旧的"可能给出与事实相反的结果。

**成功时的输出**

```markdown
## Bulk Archive Complete

Archived N changes:
- <change-1> -> archive/<target-name-1>/
- <change-2> -> archive/<target-name-2>/

Spec sync summary:
- N delta specs synced to main specs
- No conflicts (or: M conflicts resolved)
```

**部分成功时的输出**

```markdown
## Bulk Archive Complete (partial)

Archived N changes:
- <change-1> -> archive/<target-name-1>/

Skipped M changes:
- <change-2> (user chose not to archive incomplete)

Failed K changes:
- <change-3>: Archive directory already exists
```

**没有变更时的输出**

```markdown
## No Changes to Archive

No active changes found. Create a new change to get started.
```

**护栏（Guardrails）**

- 允许任意数量的变更（1 个也可以，2 个以上是典型用法）
- 始终提示选择，**绝不自动选择**
- 尽早检测规格冲突，并通过检查代码库来裁决
- 当两个变更都已实现时，按时间顺序施加规格
- 仅在实现缺失时跳过规格同步（并警告用户）
- 在确认之前展示清晰的逐变更状态
- 对整批使用**单次确认**
- 用户取消确认后**绝不**归档——被取消的批量操作什么都不归档
- 记录并报告所有结果（成功/跳过/失败）
- 移到归档时保留 `.openspec.yaml`
- 归档目录目标使用当前日期 `YYYY-MM-DD-<name>`；若名称已以 `YYYY-MM-DD-` 前缀开头则原样使用（绝不叠加第二个日期）
- 若归档目标已存在，让该变更失败，但**继续处理其他变更**
- 若请求了同步，对每个含 included delta spec 的变更**内联**运行 `openspec-sync-specs` 工作流（由 agent 驱动）
- 把按 delta 划分的 `includedDeltas` 与 `excludedDeltas` 决定带入执行；只同步并验证被包含的 delta
- 把每一个被排除的 delta 报告为 `sync skipped`，**不要**据此把归档本身也算作跳过
- **绝不**在规格同步仍在进行时归档某个变更——内联运行同步，并在移动 `changeRoot` 之前于 `<planningHome.root>/openspec/specs/<capability-path>/spec.md` 验证主规格
- 在规格检查或移动之前，为所选根目录取一次归档输入
- 在整批的第一次主规格写入或移动之前，取齐所有必需的 specs 规则快照
- 归档输入查询失败**绝不**阻塞批量操作；它会在没有 context 或 guidance 的情况下继续
- specs instruction 查询失败会**原子性地停止整批**
- 没有具体 `artifactPaths.specs.existingOutputPaths` 的变更在不做规格同步的情况下继续
- 在整批范围内应用相关的运行时上下文并报告冲突
- Operation guidance 始终只是建议；考虑每一条并解释被拒绝的建议
- 把运行时输入、冲突分析、CLI 推导出的值与 artifact 规则**分开**
- Artifact 规则**只**约束被写入的规格
- **绝不**把运行时输入或 artifact 规则文本原样抄进输出文件

---

## 附属文件

本技能只有 `SKILL.md`，无附属文件。

---

## 相关

- [openspec-bulk-archive-change-详细设计讲解.md](./openspec-bulk-archive-change-详细设计讲解.md) —— 本文的设计分析：批量比逐个多出什么风险、per-delta 模型为何必要
- [openspec-archive-change-中文版.md](./openspec-archive-change-中文版.md) —— 单变更归档（本技能的逐个版本）
- [openspec-sync-specs-中文版.md](./openspec-sync-specs-中文版.md) —— 本技能第 8 步内联调用的合并工作流
- [openspec-verify-change-中文版.md](./openspec-verify-change-中文版.md) —— 归档前的实现验证
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— OpenSpec 整体原理
