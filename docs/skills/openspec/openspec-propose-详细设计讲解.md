# openspec-propose · 详细设计讲解

> **源码**：`skills/openspec/skills/openspec-propose/SKILL.md`
> **中文原文翻译**：[openspec-propose-中文版.md](./openspec-propose-中文版.md)
> **套件整体原理**：[技能原理深度讲解.md](./技能原理深度讲解.md)
> **本文定位**：`中文版` 回答"原文说了什么"，本文回答"**为什么这么设计、还有别的选法吗、什么时候会失效**"

---

## 1. 它解决什么问题

它要把**需求**从"聊天记录"搬到"磁盘上的可审查文本"，并且要求这件事**发生在代码之前**。

两个失败模式：

**其一，需求只存在于对话里。** 你和 AI 聊了半小时，达成了共识，然后开始写代码。三小时后你回头看，中间那些共识有一部分没有被实现，另一部分被实现成了别的东西，还有一部分你根本记不清当初是怎么说的。对话是**流式**的：它擅长传达，不擅长留存，更不擅长被逐条核对。

**其二，也是这个技能真正针对的**：**规格虽然写了，但写得太晚——在代码之后。** 如果 AI 先写代码、再补一份"规格"，那份规格描述的是**它已经做了什么**，而不是**应该做什么**。它成了一份事后追认，失去了约束力。你无法用它去发现"实现漏了一条需求"，因为规格本身就是从实现里反推出来的。

**设计立场**：规格必须是**前置的**、**可审查的**、**结构化的**。前两个要求推出了"规划边界"，第三个推出了 schema 与四件套。

> 原文对这一立场的表述藏在 README 的问题陈述里：*"AI coding assistants are powerful but unpredictable when requirements live only in chat history."*（当需求只存在于聊天记录里时，AI 编码助手强大但不可预测。）请注意这里的措辞是**"不可预测"**而不是"低效"——问题不在于做得慢，而在于**你无法预知它会做出什么**。

## 2. 核心设计决策

### 决策一：规划边界——只授权规划，即使请求说了要写代码

**选了什么**：`The user request that selected or triggered this workflow authorizes planning only, **even if it asks to build or fix something**. Do not edit project code.`

**为什么**：LLM 的默认行为是**请求即执行**。用户说"帮我加个暗色模式"，它的第一反应是去改样式文件。而在这个工作流里，"加个暗色模式"应该产出的是四份规划产物，不是代码。

关键在于那条 "even if" 从句——它**预先堵住了最常见的绕过理由**："可是用户说了要构建啊。"原文的回答是：说了也不算，那是触发语，不是授权。

**注意这条边界的精确范围**：它约束的是**"选中或触发本工作流的那个请求"**。护栏里写得更明白——*"Any implementation or apply instruction in that request **does not carry forward**"*（那个请求里的实现指示**不会延续**）。所以边界不是"永远不许实现"，而是"**不许让这一次请求里的实现条款越界到规划阶段**"。用户在 artifact 呈现之后发出的**新**请求，就是一份新的授权。

**代价**：对"我就想让 AI 一口气做完"的用户，这是纯粹的摩擦——他必须多打一句话才能继续。

> **跨套件观察**：`Superpowers` 用 `<HARD-GATE>` 标签、`grilling` 用"确认共识前不得行动"、`OpenSpec` 用 `Planning boundary` 段落——**三个不同作者、三套不同措辞，独立发明了同一道闸门**。三者都在防同一个病：规划态与执行态粘连。这种收敛说明它不是某个作者的偏好，而是这类工作流的结构性需求。

### 决策二：**一次**生成四件套，而不是逐步生成

**选了什么**：目标是"一步之内生成全部 artifact"，而不是像 `openspec-new-change` 那样先脚手架、再逐个来。

**为什么**：四件套之间有**依赖关系**——`design` 依赖 `proposal` 的取舍，`specs` 依赖 `proposal` 的范围，`tasks` 依赖 `specs` 和 `design`。一次生成让这些依赖在**同一个上下文**里被处理，一致性由 AI 一次推完，不会出现"proposal 改了但 design 还是按旧 proposal 写的"这种跨步骤漂移。

省来回是次要收益，**一致性的保持**才是主因。

**代价**：① 审查负担集中——用户一次拿到四份文档，容易只看第一份就开始点头（**审查疲劳**）；② **错误会纵向传播**——如果 `proposal` 的范围判断错了，`specs`、`design`、`tasks` 会全部长在这个错误前提上，而它们看起来彼此自洽，反而更难发现问题。

**备选方案**：逐步生成，每步让用户确认。**被否决的原因**：这正是 `openspec-new-change` 在做的事，而它被放在**扩展 profile** 里、不是默认。作者的选择很清楚——默认走"快"，把"稳"作为可选。**这是一个可以争论的默认值**：一次生成在需求明确时高效，在需求模糊时危险。

### 决策三：artifact 集合由 **schema** 定义，而不是硬编码

**选了什么**：四件套只是**默认 schema（`spec-driven`）**的内容。原文反复强调"遵循 `instruction` 字段，**它是权威指导，即使遇到你熟悉的 artifact 名字**"。

**为什么**：把"一次变更需要哪些规划产物"变成**可配置**的。不同的项目类型（库、服务、CLI 工具）需要的规划产物不同；把这件事硬编码进技能，等于替所有用户做了同一个选择。

**那句"即使你熟悉这个名字"是这条设计的关键补充**：它防的是 AI 用**常识覆盖 schema**。AI 见过很多 `design.md`，它知道"设计文档通常长什么样"——而这个 schema 里的 `design.md` 可能有完全不同的要求。所以要显式把它按回去。

**代价**：多了一层间接。artifact 的内容要求不在技能文档里，而在**运行时**从 CLI 取得（`openspec instructions <id> --json`）。这意味着**读技能文档不足以知道该写什么**——你必须真的跑命令。这是 Progressive Disclosure 的一个变体：技能负责"何时做、按什么顺序做"，CLI 负责"具体写什么"。

### 决策四：必需集合按 `requires` 边**传递闭包**计算，而不是按 `applyRequires` 或 `status`

**选了什么**：`The required set is applyRequires plus every artifact reachable from those by following the requires edges`，并附一条警告：

> `status` is file-existence only, so an `applyRequires` artifact reading `done` does NOT mean its dependencies exist

**为什么这条存在**：`status` 的语义比它的名字弱得多——它检查的是**文件在不在地磁盘上**，而不是"依赖闭包是否成立"。于是有一个反直觉的陷阱：

```
提前写 tasks.md  →  tasks 显示 done  →  但 specs 从未写过
```

一个 `done` 的 artifact **仍然会列出它依赖什么**。所以正确的算法是：从 `applyRequires` 出发，沿 `requires` 边**传递地**走，得到必需集合；而不是相信 `status`。

**为什么设计成这个样子**：`status` 是一个**廉价的文件检查**（无状态、快、易实现），而不是依赖解析器。作者选择了简单实现 + 在文档里警告用户，而不是让 `status` 去做闭包计算。这符合 OpenSpec "easy not complex" 的哲学。

**代价**：复杂度被**推给了 AI**。AI 必须正确实现这个传递闭包，否则就会漏写 artifact——而且漏写的后果是静默的（`tasks.md` 看起来是 done 的）。这是一个**把复杂度从工具转移到使用者**的典型取舍，工具越简单，使用者越需要理解它的语义边界。

### 决策五：`context`/`rules` 是约束，绝不进 artifact

**选了什么**：同一句话在本文件里出现两次，另一次在 `openspec-explore` 里。

**为什么**：防 LLM 的一个高频默认行为——拿到背景文本就原样粘贴进产物。后果是每个 artifact 被样板文字撑大，且这些样板副本会与**真实的项目背景**逐渐不一致（背景更新了，副本没有）。对 LLM 来说"读入的上下文"和"写出的产物"在表示上都是文本，所以需要**反复、显式**地划线。

### 决策六：条件性跳过，但必须留下痕迹

**选了什么**：允许某些 artifact **不创建**——`design.md` 被 `instruction` 标为可选；`specs` 可以通过 `skipped` 状态缺席，但前提是变更在 `.openspec.yaml` 里显式声明了 `skip_specs: true`。

**为什么**：有一类变更**本来就没有需求变化**——纯重构、工具链、文档。强行让它们写"需求"会产出**编造的需求**，那比没有需求更糟：它会污染主规格树。

所以设计的要点不是"允许跳过"，而是**"允许跳过，但必须显式标记"**。`openspec validate` 会拒绝"零 delta 却没标记 `skip_specs`"的变更。原文那句很能说明态度：

> `Do not invent a requirement just to satisfy validation.`（不要为了满足校验而编造一条需求。）

**这是一个"把逃逸口显式化"的设计**：承认例外存在，但让每个例外都在磁盘上留下可见的痕迹。这样"这条变更为什么没有规格"就永远是可查的，而不是不可见的疏漏。

**代价**：`skip_specs` 可以被滥用——把它当成"跳过写规格"的便捷开关。而且判断"这次变更到底算不算有需求变化"是**主观的**，原文用 `specs` **绝不**能靠 AI 自己的判断来兜底，但这只是把误判的概率降低，不是消除。

## 3. 机制如何运转

```
用户：/opsx:propose add-dark-mode
      ↓
【规划边界生效】本请求只授权规划
      ↓
① 理解请求 / 澄清实质歧义（范围、外部行为、兼容性、验收标准）
      ↓
② 确定 schema（默认 spec-driven，除非用户点名）
      ↓
③ openspec new change "<name>"        ← 必须走 CLI（建 .openspec.yaml）
      ↓
④ openspec status --json              ← 拿 applyRequires / artifacts / requires 边
      ↓
⑤ 按依赖顺序，对每个 ready 的 artifact：
     openspec instructions <id> --json
        ↓
     读 dependencies（从磁盘重读）
     用 template 为结构，写到 resolvedOutputPath
     用 context / rules 约束自己 —— 但不写进文件
        ↓
     重跑 status --json，直到必需集合全部 done / skipped
        ↓
   ⚠ 必需集合 = 从 applyRequires 沿 requires 边传递闭包
     （不能只看 applyRequires；不能相信 status，它只查文件存在）
      ↓
⑥ openspec status --change "<name>"   ← 展示最终状态
      ↓
【停下】呈现 artifact，等待新的用户请求才可启动 apply
```

**最容易违反的约束有两条**：

1. **必需集合算错**——因为它反直觉。`status` 的名字暗示它反映"完成度"，而它实际只反映"文件在不在"。任何按 `status` 判断依赖是否满足的做法都是错的。
2. **规划边界被"用户说了要写代码"绕过**——这是最自然的绕过理由，原文用 "even if" 从句专门堵它。

## 4. 什么时候会失效

| 场景 | 后果 | 原因 |
|------|------|------|
| 请求有实质歧义，但 AI 判定为"次要细节" | 错误假设被写进四份 artifact，且相互自洽、更难发现 | "什么算实质歧义"是主观判断，而判定标准（范围/外部行为/兼容性/验收标准）需要在**理解需求之后**才能应用——鸡生蛋 |
| 用户**审查疲劳** | 四件套形同虚设，用户直接进入实现 | 一次生成的代价；四份文档的认知负担远超一份 |
| 上游 `proposal` 方向错误 | `specs`/`design`/`tasks` 全部建立在错误前提上 | 决策二的纵向传播；四份文档彼此一致，**一致性反而掩盖了前提错误** |
| `skip_specs` 被滥用 | 该写规格的变更跳过了规格，主规格树逐渐失真 | 判断"有无需求变化"是主观的；标记机制只保证"有痕迹"，不保证"判断正确" |
| **必需集合算错** | 漏写 artifact，且静默（`tasks.md` 看起来是 done 的） | `status` 的语义弱于它的名字所暗示的；传递闭包需要主动实现 |
| 用户手工改过 artifact | AI 基于对话里的旧快照继续推理，产出矛盾的下一份 | 原文要求"从磁盘重读"，但这条纪律依赖 AI 自觉 |
| 同名变更已存在 | 覆盖或分叉出两个同名变更 | 原文只说"问用户"，没有更强的机制（如强制改名） |
| **后续请求放宽了边界** | 规划阶段被"顺势"推进到实现 | 边界的精确范围是"触发它的那个请求"；后续请求构成**新授权**。这在设计上是正确的，但在长对话里很容易被 AI 理解成"已经获准实现了" |
| schema 被换掉但 AI 按常识写 | artifact 内容不符合该 schema 的要求 | "即使你熟悉这个名字"这条警告需要 AI 主动压住常识，而常识的引力很强 |

> **第二条与第四条合起来指向同一个结构性风险**：这个技能把**"快"放在"稳"前面**（默认一次生成、默认跳过条件宽松）。它在**需求已经清楚**时是最优的；在**需求模糊**时，它会把模糊一次性放大成四份彼此自洽的文档。
>
> 换句话说：**它不制造错误，但它擅长把已有的错误固化成型**。而这正是 `openspec-explore` 存在的理由——想不清楚时，先去 explore，别用 propose。

## 5. 与其他技能的协作

| 关系 | 说明 |
|------|------|
| **上游** `openspec-explore` | 需求模糊时的前置：先无副作用地想清楚，再进 propose。**这是本技能失效场景的主要缓解手段** |
| **同级** `openspec-new-change` | 同一阶段的**分步版本**：只脚手架 + 给出第一个 artifact 的模板，然后停下等用户。propose 是"快"，new-change 是"稳" |
| **下游** `openspec-apply-change` | 按 `tasks.md` 逐项实现。propose 的产物是它的输入 |
| **下游** `openspec-archive-change` | 实现完成后把 delta 归并进主规格树 |
| **同阶段** `openspec-ff-change` / `openspec-continue-change` | 扩展 profile 里的变体，用于不同的推进节奏 |
| **同族对比** Superpowers `brainstorming` + `writing-plans` | 两者都在"代码之前"，但形态完全不同：Superpowers 是**人机对话逐步确认**（一次一问、逐段批准），OpenSpec 是**一次生成全部待审**。前者把审查分散在过程中，后者把审查集中在最后 |
| **共同机制** | 与 `grilling`、`brainstorming` 一样遵循规划门禁——三套系统各自独立发明（见 [技能原理深度讲解.md](./技能原理深度讲解.md) 第 3 节） |

---

## 相关

- [openspec-propose-中文版.md](./openspec-propose-中文版.md) —— 原文逐段中文翻译
- [openspec-explore-详细设计讲解.md](./openspec-explore-详细设计讲解.md) —— 需求模糊时的前置阶段
- [openspec-new-change-详细设计讲解.md](./openspec-new-change-详细设计讲解.md) —— 同一阶段的分步版本
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— OpenSpec 整体原理与三套对比
