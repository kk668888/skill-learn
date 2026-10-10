# openspec-ff-change · 详细设计讲解

> **源码**：`skills/openspec/skills/openspec-ff-change/SKILL.md`
> **中文原文翻译**：[openspec-ff-change-中文版.md](./openspec-ff-change-中文版.md)
> **套件整体原理**：[技能原理深度讲解.md](./技能原理深度讲解.md)
> **本文定位**：`中文版` 回答"原文说了什么"，本文回答"**为什么这么设计、还有别的选法吗、什么时候会失效**"

---

## 1. 它解决什么问题

它与 `continue-change` 解决**同一个问题**——把变更的 artifact 补到"可以实现"的状态——但做了**相反的押注**。

`continue-change` 押"检查点更重要"：一次一个 artifact，每轮停下，把"要不要继续"交回给你。`ff-change` 押"速度更重要"：一次生成全部所需 artifact，中间不停。

**那为什么需要这么一条"快车道"？** 因为 `continue-change` 的减速设计有一个真实的成本——四份 artifact 意味着四次调用、四轮对话、四次"继续吗？"。当变更很小、或者你已经非常清楚要做什么时，这四轮确认就是纯粹的摩擦：你没有新信息要看，只是在一遍遍按确认。

所以 `ff-change` 不是"偷懒的版本"，而是**承认"检查点有价值，但不是每个场景都值得付这笔钱"**。

**设计立场**：把减速从**强制**改成**可选**，但前提是——**快进路径必须自己承担正确性的责任**。这一点正是它比 `continue-change` 复杂得多的原因：一旦放弃了逐步的人工检查，那些检查本来会拦住的问题，就全都得由技能自己处理。

## 2. 核心设计决策

### 决策一：放弃逐步确认——代价与它的补偿

**选了什么**：一次生成全部所需 artifact，中间没有人工检查点。

**放弃的具体是什么**：逐个 artifact 的确认，换来的是**四次纠错机会**。批量的真正危险不是"AI 会写错"，而是**错误会一路传播**——如果 `design.md` 里选错了技术方案，`tasks.md` 会忠实地按那个方案拆任务，而你在看到 `tasks.md` 时，看到的是一份**自洽的、看起来合理的**计划。错误被下游的一致性掩盖了。

**技能如何补偿**：它把原本由人工检查承担的正确性责任，转成了**三条自己执行的严格规则**：

1. **传递闭包**：所需集合不只是 `applyRequires`，还要沿 `requires` 边传递地走完
2. **换判据**：用 `requires` 边而非 `status` 判断进度（见决策二）
3. **不许自行判断跳过**：条件 artifact 的跳过只能由 CLI 状态或 `instruction` 字段决定（见决策三）

**代价**：即便有这三条补偿，**最根本的损失无法补回来**——没有人会在中途读一眼并说"这个方向不对"。三条规则能防"漏建""建错顺序"，防不了"建得对但想法错"。

**备选方案**：
- *不要 ff，只留 continue* —— 被否决。小变更上的四轮确认是真实摩擦，用户会开始机械点击（那样反而**更**危险：形式上的检查点比没有检查点更糟，因为它给了虚假的安心）。
- *给 continue 加一个 --all 参数* —— 被否决。参数化开关在提示词场景下不可靠：AI 判断何时该开取决于用户措辞，而用户不会记得传。

### 决策二：不信 `status`，改看 `requires` 边——一次代理指标陷阱

**选了什么**：构建所需集合时，**不使用** `artifacts[].status`，而是从 `applyRequires` 出发沿 `requires` 边做传递闭包。

**为什么**：因为 `status` 是一个**代理指标**，它代理的是"这个文件是否存在"，而不是"这个 artifact 的语义是否完成"。两者在**顺序正确**时一致，在**顺序错误**时背离。

原文给了一个精确的失败例子：

> `status` is file-existence only, so an `applyRequires` artifact reading `done` does NOT mean its dependencies exist - writing `tasks.md` early marks `tasks` done while `specs` was never written.

这正是**快进场景下最容易发生的事**——因为快进会按依赖顺序尽量快地写文件，一旦顺序判断有误（比如某个 artifact 被误判为 ready），就会出现"下游 done、上游缺失"的状态。而如果此时用 `status` 去算"还缺什么"，就会得到"什么都不缺"的错误结论，然后**在缺 specs 的情况下进入实现**。

**代价**：传递闭包的计算比"看一眼 status"复杂。而且它带来一条反直觉的表述——"一个 `done` 的 artifact 仍然列出了它依赖什么"——你**不能因为一个东西完成了就不看它的依赖**。

### 决策三：条件 artifact 的跳过不许由 AI 判断

**选了什么**：只有在 `status` 报 `skipped`，或该 artifact 自己的 `instruction` 字段标注为可选时，才能跳过。原文特别点明：`specs` **只能**经由 `skipped` 状态跳过，**绝不能**凭自己的判断；并且 `Tell the user, and do not reconsider it`。

**为什么**：这是整份 OpenSpec 里对 AI 判断力**最明确、最强硬的不信任**。

它针对的场景很具体：AI 在读 `specs` 的说明时，可能得出"这个变更好像不需要改规格"的判断，于是跳过它。但**是否需要 specs，是一个由 schema 和 `skip_specs` 声明共同决定的事**，不是一件可以临场判断的事。而且这个判断错得**不对称**——多写一份 specs 只是浪费一点工作量；少写一份 specs 会让整个变更失去需求基线，而这个缺口要到归档后才暴露。

`do not reconsider it` 这半句尤其值得注意：它堵的不是"判断错了"，而是**"判断之后再自我说服"**——AI 在被要求跳过某物后，容易再想一轮然后推翻自己。原文直接禁止了这个回路。

**代价**：僵化。如果 schema 确实在某些场景下允许省略 specs，而 `instruction` 没有把它标为可选，AI 就只能照写。**这个僵化是刻意的**——它用一点点浪费换取"绝不静默丢失需求基线"。

### 决策四：依赖是使能条件，不是闸门

**选了什么**：`Dependencies are enablers, not gates`——如果某个必需 artifact 只因"跳过了一个条件依赖"而显示 `blocked`，**照写不误**。

**为什么**：这修正了一个**状态机语义上的技术性事实**——`blocked` 在 schema 里表示"依赖尚未满足"，但"依赖被有意跳过"和"依赖还没写"是两种完全不同的未满足。前者意味着**永远不会**满足，如果把它当闸门，流程就死锁了。

**代价**：需要 AI 判断"这个 blocked 是因为跳过，还是因为没写"。原文给的判据是看 `requires` 边的状态，但这条判断仍需要理解 schema 语义，执行时有误判空间。

### 决策五：宁可自作决定也要保持推进势头

**选了什么**：`If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum`（若上下文**严重**不清晰就问用户——但优先做出合理决定以保持推进势头）。

**为什么**：这与 `continue-change` 的姿态**正好相反**。continue 是"上下文不清晰就问用户"（无保留）；ff 是"严重不清晰才问，否则自己决定"。理由是**一致的设计观**：既然这个技能的全部卖点是速度，那么在每份 artifact 上都停下来问一次，就把速度优势抵消光了。它允许自己承担"可能猜错"的风险，来换取不停步。

**代价**：这是整个技能**风险最高**的一条。它等于在四份 artifact 的生成过程中放宽了"不猜"的纪律——而猜错的地方可能一路传播到实现。原文用 `critically`（严重地）这个限定词来收紧阈值，但"严重"是主观的，**边界最终靠判断**。

## 3. 机制如何运转

```
若输入不含变更名或描述 → 开放式提问（**不给预设选项**）
      ↓
openspec new change "<name>"          ← 建脚手架
      ↓
openspec status --change <name> --json
   ├─ applyRequires      ← 种子集合
   └─ artifacts[].requires ← 传递闭包的边（**不是** status）
      ↓
计算所需集合 = 从 applyRequires 沿 requires 传递闭包
      ↓
┌─→ 取一个 ready 的 artifact
│     ├─ instructions <id> --json
│     ├─ 从**磁盘**重读依赖
│     ├─ 委派？→ 调用之；否则按 template 写文件
│     └─ "✓ Created <id>"
│   ↓
│   重新 status → 重算所需集合（创建一个可能解锁其他）
│     ├─ status 报 skipped            → 视为已满足，**永不**创建
│     ├─ instruction 明标可选          → 才可跳过
│     ├─ 因跳过条件依赖而 blocked      → **照写**（依赖是使能条件）
│     └─ 否则                          → 补上
└── 直到所需集合全部 done / skipped
      ↓
展示最终状态 + 被跳过的条件 artifact 及原因
      ↓
提示："Run `/opsx:apply` or ask me to implement"
```

**最容易违反的关键约束**：`Create every artifact the apply phase transitively depends on, not just the ids listed in apply.requires.`

它容易违反，是因为**照抄 `applyRequires` 是显而易见的做法**——CLI 直接给了你一个叫"apply 需要什么"的数组，用它看起来天经地义。但那只是**直接**依赖（在 spec-driven 下通常只有 `tasks`），而 `tasks` 又依赖 `specs`，`specs` 依赖 `proposal`……如果只建 `applyRequires`，你会在缺 `specs` 的情况下"完成"快进。

原文为此在步骤 4b 和护栏里各写了一遍，并在 4b 里解释了原因（status 只看文件存在性）。

## 4. 什么时候会失效

| 场景 | 后果 | 原因 |
|------|------|------|
| 用户其实想逐步审查，却用了 ff | 四份 artifact 一次性到手，实际不会被逐份细读 | 快进的卖点是速度，而"想边看边推进"的需求与它根本对立 |
| 按 `applyRequires` 字面建集合 | 缺 `specs` / `proposal` 等传递依赖，"完成"了却无法实现 | 直接依赖 ≠ 传递依赖；这是本技能最容易犯的错误 |
| `design.md` 里选错方案 | 错误一路传播：`tasks.md` 按错误方案拆任务，且**看起来自洽** | 放弃了人工检查点，也就放弃了"中途发现方向不对"的机会 |
| 上下文不清晰，但 AI 判断为"不算严重" | 按猜测生成 artifact，猜测被固化到下游 | `prefer making reasonable decisions to keep momentum` 依赖 AI 自己判断"严重"与否 |
| 误判某个 artifact 为可跳过 | 需求基线静默丢失，归档后才暴露 | 条件 artifact 的判定需要理解 schema 语义，有误判空间 |
| 变更名已存在 | 流程中断，需要人工处理 | 原文只说"建议继续那个变更"，没有自动合并或改名的机制 |
| 扩展 profile 未启用 | 本技能不存在 | 属扩展 profile，默认安装下没有 |

> **第三行是这个技能的核心风险，且它无法被技能内部消除。** 快进用三条严格规则补偿了"漏建""建错顺序""误跳"，但**没有一条能补偿"方向错了"**。原因很直白：判断方向需要有人读懂 `design.md` 的技术方案并说"这不对"——而快进的全部意义就是不让这件事发生在中途。所以真正的防护不在技能里，而在使用时机上：**只有当你对方案已有把握时才该用它。**

## 5. 与其他技能的协作

| 关系 | 说明 |
|------|------|
| **与** `openspec-continue-change` **正面对立** | 同一目标的两种押注：continue 每次一个（检查点），ff 一次做完（速度）。**这是套件内最本质的一对设计分歧**，也解释了两者为何都是扩展 profile 成员——它们互为替代品，而非流程上下游 |
| **与** `openspec-new-change` **最容易混淆** | 两者都"从零建立一个变更"。分歧在节奏：new 是交互式、逐步产出；ff 是拿到描述就一次铺完。**如果用户只是想开一个变更慢慢做，应该用 new；ff 的默认前提是"我知道要什么，铺完就走"** |
| **与** `openspec-propose` **功能重叠但入口不同** | propose 也从一句描述一次生成四件套。差别在 ff 显式做了**构建顺序与传递闭包**的处理，因此能应对"部分 artifact 已存在"的续建场景；propose 面向全新变更。**若变更目录已存在，用 ff 更稳** |
| **与** `openspec-update-change` **分工** | 分界线是"推进 vs 协调"：ff 向前推进构建前沿，update 在原地协调已建成的 artifact 之间的一致性 |
| **指向** `openspec-apply-change` | 所需集合就绪后，唯一出口是让用户走 apply |
| 与 Superpowers 的对照 | Superpowers 的 `writing-plans` 也是"一次产出一整份"，但它**没有**"多份 artifact + 传递依赖 + 条件跳过"这层复杂度——因为它只有一份计划文档，不存在构建前沿。ff 的复杂度是 OpenSpec 用多份 artifact 换取表达力的**直接代价** |

---

## 相关

- [openspec-ff-change-中文版.md](./openspec-ff-change-中文版.md) —— 原文逐段中文翻译
- [openspec-continue-change-详细设计讲解.md](./openspec-continue-change-详细设计讲解.md) —— 正面对立面的设计分析
- [openspec-update-change-详细设计讲解.md](./openspec-update-change-详细设计讲解.md) —— 边界对偶：推进 vs 协调
- [openspec-apply-change-详细设计讲解.md](./openspec-apply-change-详细设计讲解.md) —— 快进的终点是 apply
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— openspec 整体原理
