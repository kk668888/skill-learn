# openspec-sync-specs · 中文版

> **来源**：`skills/openspec/skills/openspec-sync-specs/SKILL.md`
> **类型**：工作流技能（规格同步）
> **触发**：想用 delta 规格更新主规格、但**不归档**该变更时

---

## frontmatter

- **name**：`openspec-sync-specs`
- **description**：把一个变更的 delta 规格同步进主规格。当用户想用 delta 规格里的改动更新主规格、**而不归档该变更**时使用。
- **allowed-tools**：`Bash(openspec:*)`——只允许执行 `openspec` 命令
- **license**：MIT
- **compatibility**：需要 openspec CLI
- **metadata**：`author: openspec`、`version: 1.0`、`generatedBy: 1.8.0`

## 正文

把一个变更的 delta 规格同步进主规格。

这是一项 **agent-driven**（由代理驱动）的操作——你将**亲自阅读** delta 规格，并**直接编辑**主规格来应用这些改动。这样才能实现智能合并（例如：只新增一个 scenario，而不必把整条 requirement 复制过来）。

> **批注**：`agent-driven` 三个字是这个技能与"程序化合并"分道扬镳的地方，也是它存在的前提。程序化合并只能**整块覆盖**；而规格演进中最常见的需求恰恰是"在既有 requirement 上加一个 scenario"——这需要理解语义。代价是可靠性从"确定性"降级为"依赖判断力"，所以后文才有那么多护栏来补。

**Store 选择：** 如果用户点名了一个 store（store 是本机注册的一个独立 OpenSpec 仓库），或者工作本身就位于某个 store 中，则先运行 `openspec store list --json` 发现已注册的 store id，然后在读写规格与变更的命令上（`new change`、`status`、`instructions`、`list`、`show`、`validate`、`archive`、`doctor`、`context`、`view`）传 `--store <id>`。一旦选定，就把 `--store <id>` 视为在本次工作流余下部分**粘性**生效。下文每一条未加范围的示例都是简写：运行前请补上这个 flag。例如应运行 `openspec status --change "<name>" --json --store "<id>"`，而不是下文展示的未加范围形式。其他命令不接受该 flag。命令打印的提示本身已带上该 flag，后续跟进时保留它。未指定 store 时，命令作用于最近的本地 `openspec/` 根目录。

`<capability-path>` 是相对于 `specs/` 的规格目录（例如 `user-auth` 或 `identity/user-auth`）。解析某份 delta 规格对应的主规格时，**保留它的完整路径**。

**Input**：可选地指定一个变更名。若省略，检查是否能从对话上下文中推断。若含糊或歧义，你**必须**提示可选的变更列表。

**Steps**

1. **选择变更**

   若提供了名称，就用它。否则：
   - 若用户在对话中提到过某个变更，从中推断
   - 若只有一个进行中的变更，自动选中
   - 若歧义，运行 `openspec list --json` 取得可用变更，并请用户选择

   提示时，展示**含有 delta 规格**的变更（即 `specs/` 目录下有内容的）。

   始终宣告："Using change: <name>"，并说明如何覆盖（例如 `/opsx:sync <other>`）。

2. **解析变更上下文**

   运行：
   ```bash
   openspec status --change "<name>" --json
   ```

   该 JSON 包含 `planningHome.root`。主规格位于 `<planningHome.root>/openspec/specs/`——下文所有主规格路径都使用这个（store-aware 的）根目录，**不要硬编码仓库路径**。选中 store 时它指向 store，而不是当前仓库。

3. **找到 delta 规格**

   把状态 JSON 中的 `artifactPaths.specs.existingOutputPaths` 作为 delta 规格路径的**唯一来源**。如果 `specs` 条目缺失、或 `existingOutputPaths` 为空，就报告"没有 delta 规格可供同步"，**不要**从其他 artifact 推断，并且停止——不请求 artifact 指令、也不写主规格。

   同步 `existingOutputPaths` 里的每一条路径，除非调用方缩小了范围。调用方缩小的方式，是逐字给出 `existingOutputPaths` 中若干完整条目的显式列表——照抄那些绝对值。Archive 会内联地这么做，用户也可以（例如选中以 `/specs/billing/invoices/spec.md` 结尾的那一条）。然后就只同步这些被点名的路径，其余 delta 规格保持不动：bulk archive 会排除那些它找不到实现的 delta，若仍去同步它，就会写出调用方**刻意扣下**的主规格。把这个收窄后的选择**一路带到第 4 步**；绝不把它重新放宽回完整列表。若某条被点名的路径不在 `existingOutputPaths` 里，就不要同步它——报告并停止，而不是默默丢弃。若被点名的列表为空，报告"没有可同步的内容"并停止，不写主规格。

   > **批注**：这一段是整个技能里护栏最密的地方，值得单独看。它防的是同一种错误的三张面孔：**擅自扩大范围**。① 不许从别的 artifact 猜 delta 路径（防臆测）；② 不许把调用方收窄的子集放宽回全集（防覆盖别人的谨慎）；③ 不许默默丢弃不在列表里的路径（防静默失败）。三者的共同点是：**宁可停下报告，也不替调用方做决定**。注意 ② 的后果尤其严重——bulk archive 收窄范围是有理由的（找不到实现），放宽回去等于写出调用方明确不愿写的规格。

   每份 delta 规格文件包含这样的小节：
   - `## ADDED Requirements`——要新增的 requirement
   - `## MODIFIED Requirements`——对既有 requirement 的修改
   - `## REMOVED Requirements`——要移除的 requirement
   - `## RENAMED Requirements`——要改名的 requirement（FROM:/TO: 格式）

   若没有找到 delta 规格，告知用户并停止。

4. **对每份 delta 规格，把改动应用到主规格**

   在**第一次写主规格之前**，取得一份当前的 specs-rule 快照：
   - 若本次工作流是 archive 内联调用的、并且它已提供来自 `openspec instructions specs --change "<name>" --json` 的有效快照，则复用它，**不要**重复获取同一份指令。
   - 否则，现在就带此前选定的根目录 flags 运行该命令一次。
   - 若这次直接查询以非零码退出、或返回了无效的 artifact-instruction JSON，就报告错误并在写任何主规格**之前停止**。不要把这个失败当成"没有规则集"。
   - 返回有效响应但省略了 `rules`，意味着没有配置任何 artifact 规则，按既有的语义合并继续进行。

   把返回的 `rules` **只**应用于本次合并产出的主规格之内容与形式。Artifact 规则不是操作指导，不能改变已选定的根目录、delta 路径、CLI 检查或工作流步骤。把它们的文字当作约束来用，但不要逐字复制进主规格或摘要里。

   > **批注**：这里有一条很容易被忽略、但后果很重的区分——**"内容规则"与"操作指导"不是一回事**。`rules` 约束的是"写出来的规格应该长什么样"，而不是"这次该处理哪些文件"。如果让前者影响后者，一条关于措辞的规则就可能改变同步范围。另外 `fail-closed`（查询失败就停，而不是当作"无规则"继续）也是刻意选择：把"取不到规则"当成"没有规则"，会让一次网络或参数问题静默地改变产出质量。

   对第 3 步中选定的每一份 capability delta 规格路径——即完整的 `existingOutputPaths` 列表，或调用方给出的收窄子集（这些路径可能属于某个被选中的 store，而非本仓库）：

   a. **读取该 delta 规格**，理解它意图做出的改动

   b. **读取主规格**，位于 `<planningHome.root>/openspec/specs/<capability-path>/spec.md`（可能尚不存在）

   c. **智能地应用改动**：

      **ADDED Requirements：**
      - 若该 requirement 在主规格中不存在 → 新增它
      - 若该 requirement 已存在 → 更新它以匹配（视为隐含的 MODIFIED）

      **MODIFIED Requirements：**
      - 在主规格中找到该 requirement
      - 应用改动——可以是：
        - 新增主规格还没有的 scenario
        - 修改既有 scenario
        - 修改 requirement 的描述
      - 保留 delta 未提及的 scenario / 内容

      **REMOVED Requirements：**
      - 从主规格中移除整个 requirement 块
      - **废弃整个 capability**。只有在以下**全部**条件成立时，才删除整个 `spec.md`——并在目录里再无他物时连同目录一起删除：
        1. **本次运行**移除的 requirement，使文件里不再剩任何 requirement 块；
        2. 规格的其余部分格式良好（仍有 `## Purpose`）；
        3. 主规格在本次同步**之前并非已是空的**——若你什么都没移除，就什么都不要改；
        4. 整个文件里其余每一个非空行都能被归入：标题、Purpose、Requirements 标题，或某条规范 requirement 的陈述、scenario、围栏示例；
        5. 该变更的 `.openspec.yaml` 声明了 `retire_capabilities: true`；
        6. `spec.md` 解析后确实位于真正的 specs 根目录之内（不要跟随 capability 目录的符号链接去删外部文件）。
        如果移除选中的 requirement 会导致不再剩任何 requirement 块，而任一废弃条件未满足，就**不要修改主规格**。停止该 capability 的同步，报告阻塞条件，并告诉用户如何解除。**永远不要写出或留下一个空的 `## Requirements` 小节。** 若仅缺那个标记（marker），也要说出来——那是用户唯一能补上、从而让废弃通过的东西。
      - 删除文件也会删掉它的 `## Purpose`；任何其他小节都会阻塞废弃。报告废弃时要点名 Purpose。仅当该规格位于调用方的 checkout 内时，才附上可直接粘贴的 `git checkout`；否则给出限于 checkout 范围的恢复指引。

      > **批注**：六条废弃条件值得整体看——它们全部围绕一件事：**让"删除文件"这个不可逆动作尽量难以误触**。第 3 条（本来为空就不动）防的是"无中生有的删除"，第 4 条（逐行归账）防的是"文件里还有我没看懂的东西就删了"，第 5 条（显式声明 `retire_capabilities`）把最终决定权交还给人在配置里预先表态，第 6 条（防符号链接）则防住一个典型的越界删除。再配上"绝不留下空的 `## Requirements`"这条兜底，整个设计的取向很清楚：**宁可停在半路让人来推一把，也不要留下一个结构上已经坏了的主规格。**

      **RENAMED Requirements：**
      - 找到 FROM 那条 requirement，改名为 TO

      **delta 中的 `## Purpose`：**
      - 主规格已经有一个了，且它是权威的——不要动它（`openspec archive` 就是这么做的：警告一声然后跳过）

   d. **若 capability 尚不存在，则创建新的主规格**：
      - 创建 `<planningHome.root>/openspec/specs/<capability-path>/spec.md`
      - 添加 Purpose 小节：当 delta 带有 `## Purpose` 时，逐字复制它的正文（`openspec archive` 就是这么做的）；仅在没有时才写一个简短的 TBD 占位
      - 添加 Requirements 小节，放入那些 ADDED requirement
      - 遵循下文的 **Main Spec Format Reference**

5. **校验更新后的主规格**

   用此前选定的根目录 flags 运行 `openspec validate --specs`。若校验失败，报告问题，**不得**声称同步成功。

6. **展示摘要**

   应用完所有改动后，总结：
   - 哪些 capability 被更新
   - 做了哪些改动（新增/修改/移除/改名的 requirement）
   - 是否有新建的主规格留下了 TBD Purpose 占位——点出来，让它**现在**就被补上，而不是一直挂着
   - 是否有 capability 被废弃——点名被删除的 `spec.md`、它的 Purpose，以及可直接粘贴的 `git checkout` 或限于 checkout 范围的恢复指引

**Delta Spec Format Reference**

```markdown
## Purpose

Only on a delta that introduces a brand-new capability. Seeds the new main spec.

## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
The system SHALL keep doing the existing thing, now also handling A.

#### Scenario: Scenario the main spec already has
- **WHEN** user does X
- **THEN** system does Y

#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

**Main Spec Format Reference**

主规格是 delta 合并**进**的目标。它们**绝不能**含有 delta 操作头（`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`）——同步完成后，每条 requirement 都住在唯一的 `## Requirements` 小节之下：

```markdown
# <capability> Specification

## Purpose
Short description of what this capability does and why it exists.

## Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y
```

> **批注**：这条约束（主规格里不许出现 delta 操作头）看起来只是格式洁癖，实际是**数据模型层面的隔离**。delta 的四种操作头表达的是"这次要改什么"，是**过程**；主规格表达的是"系统现在是什么"，是**状态**。一旦把过程痕迹写进状态文件，下次同步就无法区分"这是当前真相"还是"上一次的待办"，而 archive 的合并、`openspec validate` 的检查都会随之失准。

**Key Principle: Intelligent Merging**

与程序化合并不同，你是**合并**而不是覆盖：
- 一个 MODIFIED 块携带**整条** requirement——正文加上所有在本次改动后幸存的 scenario。`openspec validate` 和 `openspec archive` 都会拒绝那种丢掉了主规格中仍存在的 scenario 的写法。
- 保留 delta 未提及的一切，维持主规格既有的顺序
- 运用你的判断合理地合并改动

> **批注**：注意这里"MODIFIED 必须携带整条 requirement"的规定——它把一个容易犯的错（只写改动的那部分，把没提到的 scenario 弄丢）变成了可校验的失败。这是**用格式约束替代判断力**的又一例。

**Output On Success**

```markdown
## Specs Synced: <change-name>

Updated main specs:

**<capability-1>**:
- Added requirement: "New Feature"
- Modified requirement: "Existing Feature" (added 1 scenario)

**<capability-2>**:
- Created new spec file
- Added requirement: "Another Feature"

Main specs are now updated. The change remains active - archive when implementation is complete.
```

**Guardrails**

- 改动之前，先读 delta 规格和主规格**两者**
- 保留 delta 未提及的既有内容
- 绝不把 delta 文件原样拷进主规格——要合并其内容，使主规格维持 Main Spec Format Reference 的结构，不带 delta 操作头
- 若有不清楚之处，请求澄清
- 边做边展示你在改什么
- 该操作应当**幂等**——跑两次应得到相同结果
- 只用 `artifactPaths.specs.existingOutputPaths`；绝不从无关 artifact 推断 delta 规格
- 尊重调用方给出的 `existingOutputPaths` 子集；绝不把它放宽回完整列表
- 直接同步时只获取一次 specs 指令；archive 内联调用时复用其提供的快照
- 每一次 specs 指令响应非零或 JSON 无效时，在写任何主规格前停止
- Artifact 规则只约束被写入的 specs，且绝不复制进产出文件

---

## 附属文件

本技能无附属文件（仅 `SKILL.md`）。

---

## 相关

- [openspec-sync-specs-详细设计讲解.md](./openspec-sync-specs-详细设计讲解.md) —— 本文的设计分析：为什么需要一个"不归档也能同步"的出口、护栏为何如此密集
- [openspec-archive-change-中文版.md](./openspec-archive-change-中文版.md) —— 归档流程，它会**内联复用**本技能的合并逻辑
- [openspec-bulk-archive-change-中文版.md](./openspec-bulk-archive-change-中文版.md) —— 批量归档，同样会收窄范围地调用本技能
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— openspec 整体原理（含 delta 与真相树的数据模型）
