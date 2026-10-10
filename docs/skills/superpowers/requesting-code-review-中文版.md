# requesting-code-review · 中文版

> **来源**：`skills/superpowers/requesting-code-review/SKILL.md`
> **类型**：过程技能（质量保障族）
> **触发**：任务完成时、实现大型功能后、合并到 main 之前

---

## frontmatter

- **name**：`requesting-code-review`
- **description**：在完成任务、实现重大功能后，或合并之前使用，以验证工作是否满足需求。

## 正文

派一个代码评审员 subagent，在问题级联放大之前抓住它们。评审员拿到的是**精心构造的上下文**——永远不是你的会话历史。这既让评审员专注于**工作产物**而不是你的思考过程，也保护你自己的上下文，供后续工作继续使用。

**核心原则：** 尽早评审，经常评审。

> **批注**：两句话里的两个限定都很关键。① "不是你的会话历史"是一个**刻意的信息隔离**决策——你脑子里的推理过程会为你的实现辩护，评审者拿到它就会被带偏。② "保护你自己的上下文"点出了第二个动机：评审会产生大量细节，不该占据主会话的 context。

## 何时请求评审

**强制：**
- subagent-driven development 中每个任务之后
- 完成重大功能之后
- 合并到 main 之前

**可选但很有价值：**
- 卡住的时候（换一个新鲜视角）
- 重构之前（建立基线）
- 修完复杂 bug 之后

> **批注**："卡住时请求评审"这一条说明它的定位不只是**质量闸门**，也是**脱困手段**——因为评审者不带你的思维惯性，容易看出你钻进去的那个牛角尖。

## 如何请求

**1. 取 git SHA：**

```bash
BASE_SHA=$(git rev-parse HEAD~1)  # 或 origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. 派代码评审员 subagent：**

用 Task 工具、`general-purpose` 类型，填充 `code-reviewer.md` 里的模板。

**占位符：**
- `{DESCRIPTION}` —— 你构建了什么的简要说明
- `{PLAN_OR_REQUIREMENTS}` —— 它应该做什么
- `{BASE_SHA}` —— 起始提交
- `{HEAD_SHA}` —— 结束提交

**3. 对反馈采取行动：**
- 立即修 Critical 问题
- 继续之前修 Important 问题
- 记下 Minor 问题，以后再说
- 如果评审员错了，带着理由反驳

> **批注**：三类问题对应三种**不同的处置时限**——立即、继续前、以后。这是把严重度分级落到了具体的行动上；如果只说"认真对待所有反馈"，实际上等于没有优先级。

## 示例

```
[刚完成 Task 2：添加验证函数]

你：继续之前，让我先请求代码评审。

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[派代码评审员 subagent]
  DESCRIPTION: 添加了 verifyIndex() 和 repairIndex()，覆盖 4 种问题类型
  PLAN_OR_REQUIREMENTS: docs/superpowers/plans/deployment-plan.md 中的 Task 2
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[subagent 返回]：
  优点：架构清晰，用了真实测试
  问题：
    Important：缺少进度提示
    Minor：上报间隔用了魔法数字（100）
  评估：可以继续

你：[修掉进度提示]
[继续 Task 3]
```

## 与工作流的集成

**Subagent-Driven Development：**
- **每个**任务之后都评审
- 在问题叠加之前抓住它们
- 进入下一个任务之前修完

**Executing Plans：**
- 每个任务之后、或在自然检查点评审
- 拿到反馈、应用、继续

**临时开发（Ad-Hoc）：**
- 合并之前评审
- 卡住时评审

## 红旗

**永远不要：**
- 因为"它很简单"就跳过评审
- 忽略 Critical 问题
- 带着未修的 Important 问题继续
- 和正确的技术反馈争辩

**如果评审员错了：**
- 带技术理由反驳
- 展示能证明它可用的代码／测试
- 请求澄清

模板见：`requesting-code-review/code-reviewer.md`

> **批注**："如果评审员错了"这一段的存在很重要——它表明这套机制**不假设评审者总是对的**。这与 `receiving-code-review` 的核心立场一致（外部反馈是待评估的建议，不是必须执行的命令）。两处独立强调同一件事，说明"盲目服从"和"盲目忽略"被视为同等有害。

---

## 附属文件

| 文件 | 作用 | 源码路径 |
|------|------|----------|
| `code-reviewer.md` | 派发评审员 subagent 的完整 prompt 模板。定义了五个检查维度（计划对齐／代码质量／架构／测试／生产就绪）、分级标准（Critical／Important／Minor）、输出格式（优点 → 问题 → 建议 → 评估），以及若干"禁止"条款（不许没读代码就说"看起来不错"、不许把 nitpick 标成 Critical、不许含糊其辞、不许回避给出裁决） | `skills/superpowers/requesting-code-review/code-reviewer.md` |

> **批注**：这份模板里最值得注意的是 **Calibration**（校准）一节。它要求评审员"按**实际**严重度分级——不是所有东西都是 Critical"，并且要求"在列出问题之前先承认做得好的地方"，理由写得很直白：**准确的肯定能让实现者更信任剩下的反馈**。这是一个关于"评审如何被接收"的设计，而不只是"如何评审"。

---

## 相关

- [requesting-code-review-详细设计讲解.md](./requesting-code-review-详细设计讲解.md) —— 本文的设计分析：为什么必须分级、为什么隔离会话历史
- [receiving-code-review-中文版.md](./receiving-code-review-中文版.md) —— 收到评审意见的另一半
- [subagent-driven-development-中文版.md](./subagent-driven-development-中文版.md) —— 它把本技能作为每个任务后的固定环节
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— superpowers 整体原理
