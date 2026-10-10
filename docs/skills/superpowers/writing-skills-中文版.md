# writing-skills · 中文版

> **来源**：`skills/superpowers/writing-skills/SKILL.md`
> **类型**：元技能（如何创建与测试技能）
> **触发**：创建新技能、编辑现有技能，或在部署前验证技能可用时

---

## frontmatter

- **name**：`writing-skills`
- **description**：在创建新技能、编辑已有技能，或部署前验证技能可用时使用。

> **批注**：注意它没说"这是一个 TDD 化的技能写作流程"——而正文第一句恰恰就是这个。description 只写了触发条件，工作流留给正文。这是本技能**自己规定的规则**（见下方 CSO 一节）：description 概括工作流会让 AI 走捷径、跳过正文。**它自己遵守了自己定的规矩。**

## Overview

**写技能就是"把 TDD 应用在流程文档上"。**

**个人技能存放在各自 agent 的目录中**（Claude Code 是 `~/.claude/skills`，Codex 是 `~/.agents/skills/`）

你写测试用例（用 subagent 跑压力场景），看着它们失败（基线行为），写技能（文档），看着测试通过（agent 开始遵从），然后重构（堵住漏洞）。

**核心原则：** 如果你没有亲眼看到 agent 在没有技能时失败，你就不知道这个技能教的是不是对的东西。

**必需背景：** 使用本技能之前，你**必须**理解 `superpowers:test-driven-development`。那个技能定义了根本的 RED-GREEN-REFACTOR 循环。本技能是把 TDD 适配到文档上。

**官方指引：** Anthropic 官方的技能编写最佳实践见 `anthropic-best-practices.md`。该文档提供了补充本技能这套 TDD 视角的额外模式与准则。

> **批注**："写技能就是 TDD 应用在流程文档上"——这是整份技能的核心类比，也是它最有价值的地方。它把技能文档从"写作任务"重新定义成"**有正确性可言的工程产物**"：一个技能要么被测试验证过它能改变 agent 的行为，要么只是一个看起来合理的猜测。这个重新定义带来的直接后果，就是下面那条铁律。

## What is a Skill?（什么是技能）

**技能**是针对已验证的技术、模式或工具的参考指南。技能帮助未来的 Claude 实例找到并应用有效的方法。

**技能是：** 可复用的技术、模式、工具、参考指南

**技能不是：** 关于你某次如何解决一个问题的叙述

## TDD Mapping for Skills（技能与 TDD 的对应关系）

| TDD 概念 | 技能创建中对应 |
|----------|---------------|
| **测试用例** | 用 subagent 跑的压力场景 |
| **生产代码** | 技能文档（`SKILL.md`） |
| **测试失败（RED）** | agent 在没有技能时违反规则（基线） |
| **测试通过（GREEN）** | agent 在技能在场时遵从 |
| **重构** | 在保持遵从的前提下堵住漏洞 |
| **先写测试** | 写技能**之前**先跑基线场景 |
| **看着它失败** | 逐字记录 agent 使用的合理化借口 |
| **最小实现** | 写出只针对那些具体违规行为的技能 |
| **看着它通过** | 验证 agent 现在遵从了 |
| **重构循环** | 找出新的合理化 → 堵住 → 重新验证 |

整个技能创建过程都遵循 RED-GREEN-REFACTOR。

> **批注**：这张表里最值得注意的一行是"**看着它失败 → 逐字记录 agent 使用的合理化借口**"。它规定了 RED 阶段的产出物不是"确认它会失败"，而是**一份具体的借口清单**。这份清单随后成为 GREEN 阶段的**需求**——技能要写什么，由基线测试里实际出现的违规行为决定，而不是由你的想象决定。这就是为什么 Superpowers 各技能的"合理化对照表"看起来如此具体、如此像真的有人在说——因为确实有。

## When to Create a Skill（什么时候该建技能）

**该建：**
- 这个技术对你来说不是直觉上显而易见的
- 你会在跨项目时反复参考它
- 这个模式适用范围广（不是项目特定的）
- 其他人会从中受益

**不该建：**
- 一次性的解决方案
- 已经有好文档的标准做法
- 项目特定的约定（写进 `CLAUDE.md`）
- 机械性的约束（如果可以用正则/校验强制，就自动化它——把文档留给需要判断力的场合）

> **批注**：最后一条给出了一个明确的分界线——**能被自动强制的，就不要写成文档**。理由是文档只能"请求"遵从，而校验能"保证"遵从；用文档去承载一个本来可以强制的规则，等于自愿放弃确定性，同时还要付出每次加载的 token 成本。

## Skill Types（技能类型）

### Technique（技术）
有具体步骤可循的方法（`condition-based-waiting`、`root-cause-tracing`）

### Pattern（模式）
看待问题的方式（`flatten-with-flags`、`test-invariants`）

### Reference（参考）
API 文档、语法指南、工具文档（office docs）

## Directory Structure（目录结构）

```
skills/
  skill-name/
    SKILL.md              # 主参考文件（必需）
    supporting-file.*     # 仅在需要时
```

**扁平命名空间** —— 所有技能在同一个可搜索的命名空间里

**单独文件用于：**
1. **重量级参考**（100 行以上）—— API 文档、详尽语法
2. **可复用工具** —— 脚本、工具函数、模板

**保持内联：**
- 原则与概念
- 代码模式（< 50 行）
- 其他一切

## SKILL.md Structure（SKILL.md 的结构）

**Frontmatter（YAML）：**
- 两个必填字段：`name` 和 `description`（全部支持字段见 [agentskills.io/specification](https://agentskills.io/specification)）
- 总计最多 1024 个字符
- `name`：只能用字母、数字和连字符（不能有括号、特殊字符）
- `description`：第三人称，**只**描述何时使用（**不**描述它做什么）
  - 以 "Use when..." 开头，聚焦触发条件
  - 包含具体的症状、情境、上下文
  - **绝不**概括技能的过程或工作流（原因见 CSO 一节）
  - 尽量控制在 500 字符以内

```markdown
---
name: Skill-Name-With-Hyphens
description: Use when [specific triggering conditions and symptoms]
---

# Skill Name

## Overview
What is this? Core principle in 1-2 sentences.

## When to Use
[Small inline flowchart IF decision non-obvious]

Bullet list with SYMPTOMS and use cases
When NOT to use

## Core Pattern (for techniques/patterns)
Before/after code comparison

## Quick Reference
Table or bullets for scanning common operations

## Implementation
Inline code for simple patterns
Link to file for heavy reference or reusable tools

## Common Mistakes
What goes wrong + fixes

## Real-World Impact (optional)
Concrete results
```

## Claude Search Optimization (CSO)（面向 Claude 的检索优化）

**对可发现性至关重要：** 未来的 Claude 需要**找到**你的技能

### 1. 丰富的 description 字段

**目的：** Claude 通过读 description 来决定为某个任务加载哪些技能。要让它回答："我现在应该读这个技能吗？"

**格式：** 以 "Use when..." 开头，聚焦触发条件

**关键：description = 何时使用，不是技能做什么**

description 应当**只**描述触发条件。**不要**在 description 里概括技能的过程或工作流。

**为什么这件事重要：** 测试发现，**当 description 概括了技能的工作流时，Claude 可能会照着 description 走，而不去读完整的技能内容。** 一个写着"任务之间做代码评审"的 description，导致 Claude 只做**一次**评审——尽管技能里的流程图明确画的是**两次**（规格合规性，然后是代码质量）。

当 description 改成"在执行含独立任务的实现计划时使用"（不带工作流概括）之后，Claude 正确地读了流程图，并遵循了两阶段评审流程。

**陷阱在于：** 概括工作流的 description 会造出一条 Claude 会走的捷径。技能正文变成了 Claude 跳过的文档。

```yaml
# ❌ 差：概括了工作流 —— Claude 可能照它走，而不去读技能
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ❌ 差：过程细节太多
description: Use for TDD - write test first, watch it fail, write minimal code, refactor

# ✅ 好：只有触发条件，没有工作流概括
description: Use when executing implementation plans with independent tasks in the current session

# ✅ 好：只有触发条件
description: Use when implementing any feature or bugfix, before writing implementation code
```

**内容要求：**
- 使用具体的触发条件、症状和情境
- 描述**问题**（竞态条件、行为不一致）而非**语言特有的症状**（`setTimeout`、`sleep`）
- 除非技能本身就是技术特定的，否则触发条件保持技术无关
- 如果技能是技术特定的，在触发条件里写明确
- 用第三人称写（它会被注入系统提示）
- **绝不概括技能的过程或工作流**

```yaml
# ❌ 差：太抽象、含糊，没有包含何时使用
description: For async testing

# ❌ 差：第一人称
description: I can help you with async tests when they're flaky

# ❌ 差：提到了技术，但技能并不特定于它
description: Use when tests use setTimeout/sleep and are flaky

# ✅ 好：以 "Use when" 开头，描述问题，不含工作流
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently

# ✅ 好：技术特定技能，带明确触发条件
description: Use when using React Router and handling authentication redirects
```

> **批注**：这是整份技能里**最有实证分量**的一节。它记录了一次真实的对照测试：description 里写了"任务之间做代码评审"，结果 Claude 只做了一次评审；去掉工作流概括后，Claude 正确读了流程图并执行两阶段评审。
>
> 这个发现的意义超出"description 该怎么写"——它说明 **description 不只是路由标签，它会成为 AI 心里的"技能摘要"，并取代正文**。也就是说，你写进 description 的每一个工作流细节，都是在**主动提供一个跳过正文的理由**。这解释了为什么这条规则要用如此绝对的措辞反复强调三遍。

### 2. 关键词覆盖

使用 Claude 会去搜的词：

- 错误信息：`Hook timed out`、`ENOTEMPTY`、`race condition`
- 症状：`flaky`、`hanging`、`zombie`、`pollution`
- 同义词：`timeout/hang/freeze`、`cleanup/teardown/afterEach`
- 工具：真实的命令、库名、文件类型

### 3. 描述性的命名

**用主动语态，动词优先：**
- ✅ `creating-skills` 而不是 `skill-creation`
- ✅ `condition-based-waiting` 而不是 `async-test-helpers`

### 4. Token 效率（关键）

**问题：** getting-started 类和频繁被引用的技能会载入**每一次**对话。每一个 token 都要计较。

**目标字数：**
- getting-started 工作流：每个 < 150 词
- 频繁加载的技能：总计 < 200 词
- 其他技能：< 500 词（仍然要简洁）

**技法：**

**把细节移到工具帮助里：**
```bash
# ❌ 差：在 SKILL.md 里记录所有参数
search-conversations supports --text, --both, --after DATE, --before DATE, --limit N

# ✅ 好：引用 --help
search-conversations supports multiple modes and filters. Run --help for details.
```

**使用交叉引用：**
```markdown
# ❌ 差：重复工作流细节
When searching, dispatch subagent with template...
[20 lines of repeated instructions]

# ✅ 好：引用其他技能
Always use subagents (50-100x context savings). REQUIRED: Use [other-skill-name] for workflow.
```

**压缩示例：**
```markdown
# ❌ 差：冗长的示例（42 词）
your human partner: "How did we handle authentication errors in React Router before?"
You: I'll search past conversations for React Router authentication patterns.
[Dispatch subagent with search query: "React Router authentication error handling 401"]

# ✅ 好：极简示例（20 词）
Partner: "How did we handle auth errors in React Router?"
You: Searching...
[Dispatch subagent → synthesis]
```

**消除冗余：**
- 不要重复交叉引用技能里已有的内容
- 不要解释命令本身显而易见的部分
- 不要给同一个模式放多个示例

**验证：**
```bash
wc -w skills/path/SKILL.md
# getting-started 工作流：目标 <150 每个
# 其他频繁加载的：目标 <200 总计
```

**按你做的动作或核心洞察来命名：**
- ✅ `condition-based-waiting` > `async-test-helpers`
- ✅ `using-skills` 而不是 `skill-usage`
- ✅ `flatten-with-flags` > `data-structure-refactoring`
- ✅ `root-cause-tracing` > `debugging-techniques`

**动名词（-ing）很适合流程类：**
- `creating-skills`、`testing-skills`、`debugging-with-logs`
- 主动，描述你正在采取的动作

### 4. 交叉引用其他技能

**当文档需要引用其他技能时：**

只用技能名，加上明确的要求标记：
- ✅ 好：`**REQUIRED SUB-SKILL:** Use superpowers:test-driven-development`
- ✅ 好：`**REQUIRED BACKGROUND:** You MUST understand superpowers:systematic-debugging`
- ❌ 差：`See skills/testing/test-driven-development`（不确定是否必需）
- ❌ 差：`@skills/testing/test-driven-development/SKILL.md`（强制加载，烧掉上下文）

**为什么不用 @ 链接：** `@` 语法会立刻强制加载文件，在你还没需要它们之前就消耗掉 200k+ 的上下文。

> **批注**：这一条的具体性很说明问题——它给出的数字是"200k+ 上下文"。这说明作者确实踩过：用 `@` 引用几个技能，上下文就被吃光了。它同时揭示了一个设计取舍：**交叉引用应当是"指针"而不是"内容"**。技能之间要能互相指路，但不能自动带上货。

## Flowchart Usage（流程图的使用）

```
需要展示信息？ ──否──→ 用 markdown
     │是
     ↓
这是容易搞错的决策点吗？ ──否──→ 用 markdown
     │是
     ↓
用小的内联流程图
```

**流程图只用于：**
- 不显然的决策点
- 你可能过早停下的流程循环
- "何时用 A 而不是 B"的决策

**绝不用流程图表达：**
- 参考材料 → 表格、列表
- 代码示例 → markdown 代码块
- 线性指令 → 编号列表
- 无语义的标签（step1、helper2）

graphviz 的风格规则见 `graphviz-conventions.dot`。

**为你的协作伙伴做可视化：** 用本目录的 `render-graphs.js` 把某个技能的流程图渲染成 SVG：
```bash
./render-graphs.js ../some-skill           # 每个图单独输出
./render-graphs.js ../some-skill --combine # 所有图合成一张 SVG
```

## Code Examples（代码示例）

**一个优秀的示例胜过许多平庸的示例**

选择最相关的语言：
- 测试技术 → TypeScript/JavaScript
- 系统调试 → Shell/Python
- 数据处理 → Python

**好的示例：**
- 完整可运行
- 注释良好，解释**为什么**
- 来自真实场景
- 清晰展示模式
- 可随时适配（不是通用模板）

**不要：**
- 用 5 种以上语言实现
- 创建填空式模板
- 写牵强的示例

你很擅长移植——**一个优秀的示例就够了**。

## File Organization（文件组织）

### 自包含技能
```
defense-in-depth/
  SKILL.md    # 所有内容内联
```
适用：所有内容都放得下，不需要重量级参考

### 带可复用工具的技能
```
condition-based-waiting/
  SKILL.md    # 概览 + 模式
  example.ts  # 可适配的可用工具函数
```
适用：这个工具是可复用代码，而不只是叙述

### 带重量级参考的技能
```
pptx/
  SKILL.md       # 概览 + 工作流
  pptxgenjs.md   # 600 行 API 参考
  ooxml.md       # 500 行 XML 结构
  scripts/       # 可执行工具
```
适用：参考材料太大，无法内联

## The Iron Law (Same as TDD)（铁律，与 TDD 相同）

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

（没有失败的测试，就没有技能。）

**这同时适用于新建技能和对已有技能的编辑。**

先写技能再测试？删掉它，重新开始。
编辑技能但没有测试？同样的违规。

**没有例外：**
- 不为"简单的补充"开例外
- 不为"只是加一节"开例外
- 不为"文档更新"开例外
- 不要把未测试的改动留作"参考"
- 不要在跑测试的同时"顺手改编"
- 删除就是删除

**必需背景：** `superpowers:test-driven-development` 技能解释了为什么这很重要。同样的原则适用于文档。

> **批注**：把铁律扩展到"**编辑**已有技能"是这一节的关键。"只加一节"看起来是无害的操作，但一个未经测试的新章节，可能会**改变整个技能的行为**——比如新增一段措辞松动的话，让原本被堵死的漏洞重新打开。技能文档的修改和代码的修改在这里被等同对待：**任何改动都要先用测试证明它必要、再证明它有效。**

## Testing All Skill Types（测试所有类型的技能）

不同技能类型需要不同的测试方式：

### 纪律强制型技能（规则/要求）

**例子：** TDD、verification-before-completion、designing-before-coding

**测试方式：**
- 学术性问题：它们理解规则吗？
- 压力场景：它们在压力下还会遵从吗？
- 多种压力组合：时间 + 沉没成本 + 疲惫
- 识别合理化借口，加上明确的回击

**成功标准：** agent 在最大压力下仍遵循规则

### 技术型技能（操作指南）

**例子：** condition-based-waiting、root-cause-tracing、defensive-programming

**测试方式：**
- 应用场景：它们能正确应用这个技术吗？
- 变体场景：它们能处理边界情况吗？
- 信息缺失测试：指令里有缺口吗？

**成功标准：** agent 能把这个技术成功应用到新场景

### 模式型技能（心智模型）

**例子：** reducing-complexity、information-hiding 概念

**测试方式：**
- 识别场景：它们能认出模式何时适用吗？
- 应用场景：它们能用这个心智模型吗？
- 反例：它们知道何时**不**该应用吗？

**成功标准：** agent 能正确识别何时/如何应用该模式

### 参考型技能（文档/API）

**例子：** API 文档、命令参考、库指南

**测试方式：**
- 检索场景：它们能找到正确的信息吗？
- 应用场景：它们能正确使用找到的信息吗？
- 缺口测试：常见用例都覆盖了吗？

**成功标准：** agent 找到并正确应用了参考信息

> **批注**：这一节最容易被跳过，但它解决一个实际问题——**"测试技能"听起来只对纪律型技能有意义**（因为只有它们会有"违规"可言）。这一节把四种类型各自的"失败"和"成功"都定义了出来：技术型的失败是"用错了"，模式型的失败是"该用的时候没认出来"，参考型的失败是"找不到"。没有这四套标准，非纪律型技能就只能凭感觉判断好坏。

## Common Rationalizations for Skipping Testing（跳过测试的常见合理化）

| 借口 | 现实 |
|------|------|
| "技能显然很清楚" | 对你清楚 ≠ 对其他 agent 清楚。测一下。 |
| "这只是个参考文件" | 参考文件也会有缺口、有含糊的段落。测检索。 |
| "测试是多此一举" | 未测试的技能一定有问题。15 分钟测试省下数小时。 |
| "有问题再测" | 出问题 = agent 用不了技能。部署**之前**测。 |
| "测试太乏味" | 测试比在生产环境调试坏技能更不乏味。 |
| "我确信它没问题" | 过度自信必然出问题。还是要测。 |
| "学术评审就够了" | 读 ≠ 用。测应用场景。 |
| "没时间测" | 部署未测试技能，之后修复花的时间更多。 |

**以上全部意味着：部署前测试。没有例外。**

## Bulletproofing Skills Against Rationalization（给技能加上防合理化装甲）

强制纪律的技能（如 TDD）需要能抵抗合理化。Agent 很聪明，在压力下会找漏洞。

**心理学说明：** 理解说服技术**为什么**有效，能帮你系统地应用它们。研究基础（Cialdini, 2021；Meincke et al., 2025）关于权威、承诺、稀缺、社会认同与统一性原则，见 `persuasion-principles.md`。

> **批注**：`persuasion-principles.md` 的存在揭示了一个容易被忽视的事实——**技能文档本质上是一种说服文本**。作者引用了社会心理学的说服原则（权威、承诺、稀缺、社会认同、统一性），并明确表态："不是要操控，而是确保关键实践在压力下仍被遵循。" 这段话值得留意：它没有假装"好的文档自然会被遵循"，而是承认**在压力下，合乎逻辑的指令也会被绕过**，因此需要额外的说服手段。

### 明确堵死每一个漏洞

不要只陈述规则——要禁止具体的绕法：

<Bad>
```markdown
写代码在测试之前？删掉它。
```
</Bad>

<Good>
```markdown
写代码在测试之前？删掉它。从头开始。

**没有例外：**
- 不要把它留作"参考"
- 不要在写测试时"改编"它
- 不要看它
- 删除就是删除
```
</Good>

### 处理"精神 vs 字面"的争论

在开头加一条基础原则：

```markdown
**违反规则的字面，就是违反规则的精神。**
```

这一句切掉了一整类"我是在遵循精神"的合理化。

### 建立合理化对照表

从基线测试中捕获合理化（见下方测试一节）。Agent 说出的每个借口都进表：

```markdown
| 借口 | 现实 |
|------|------|
| "太简单不用测" | 简单的代码也会坏。测试只要 30 秒。 |
| "我等下再测" | 立刻通过的测试什么都没证明。 |
| "事后补测试效果一样" | 事后测试 = "这段代码做了什么？" 先写测试 = "它应该做什么？" |
```

### 建立红旗清单

让 agent 在合理化时方便自查：

```markdown
## Red Flags - STOP and Start Over

- 测试之前先写代码
- "我已经手动测过了"
- "事后补测试目的相同"
- "重要的是精神不是形式"
- "这次不一样，因为……"

**以上全部意味着：删掉代码。用 TDD 重新开始。**
```

### 为"违规症状"更新 CSO

往 description 里加上"你**即将**违规"时的症状：

```yaml
description: use when implementing any feature or bugfix, before writing implementation code
```

## RED-GREEN-REFACTOR for Skills（技能的 RED-GREEN-REFACTOR）

遵循 TDD 循环：

### RED：写失败测试（基线）

在**没有**技能的情况下用 subagent 跑压力场景。记录确切行为：
- 它们做了什么选择？
- 它们用了哪些合理化借口（**逐字**）？
- 哪些压力触发了违规？

这就是"看着测试失败"——你必须在写技能之前，看到 agent 自然会做什么。

### GREEN：写最小技能

写出针对那些**具体**合理化借口的技能。不要为假想情况添加额外内容。

用同样的场景跑**有**技能的情况。Agent 现在应当遵从了。

### REFACTOR：堵住漏洞

Agent 找到了新的合理化？加上明确的回击。重新测试直到无懈可击。

**测试方法论：** 完整的测试方法论见 `testing-skills-with-subagents.md`：
- 如何写压力场景
- 压力类型（时间、沉没成本、权威、疲惫）
- 系统地堵洞
- 元测试技术

## Anti-Patterns（反模式）

### ❌ 叙述式示例
"在 2025-10-03 那次会话中，我们发现空的 projectDir 导致了……"
**为什么差：** 太具体，不可复用

### ❌ 多语言稀释
example-js.js、example-py.py、example-go.go
**为什么差：** 质量平庸，维护负担

### ❌ 流程图里写代码
```dot
step1 [label="import fs"];
step2 [label="read file"];
```
**为什么差：** 无法复制粘贴，难以阅读

### ❌ 通用标签
helper1、helper2、step3、pattern4
**为什么差：** 标签应当有语义

## STOP: Before Moving to Next Skill（停下：进入下一个技能之前）

**写完任何技能之后，你都必须停下，完成部署流程。**

**不要：**
- 不做测试就批量创建多个技能
- 当前技能没验证完就进入下一个
- 因为"批量更高效"就跳过测试

**下面对每个技能都是强制性的部署清单。**

部署未测试的技能 = 部署未测试的代码。这违反质量标准。

> **批注**：这一节和 TDD 技能里的"Iron Law"是同一个模式的第三次出现——**预先堵住一个特定的批量作业冲动**。在 TDD 里，要堵的是"一次写多个测试再一起跑"；在这里，要堵的是"一次写多个技能再一起测"。理由也一致：批量操作会让"哪一个没通过"变得无法判断，而技能的质量问题又是**静默的**（不会报错，只会在未来某次使用时失效）。

## Skill Creation Checklist (TDD Adapted)（技能创建清单，TDD 适配版）

**重要：用 TodoWrite 为下面每一项建立待办。**

**RED 阶段 —— 写失败测试：**
- [ ] 创建压力场景（纪律型技能需要 3 种以上叠加压力）
- [ ] 在**没有**技能的情况下跑场景 —— 逐字记录基线行为
- [ ] 找出合理化/失败中的模式

**GREEN 阶段 —— 写最小技能：**
- [ ] 命名只用字母、数字、连字符（无括号/特殊字符）
- [ ] YAML frontmatter 含必填的 `name` 和 `description` 字段（最多 1024 字符；见[规范](https://agentskills.io/specification)）
- [ ] description 以 "Use when..." 开头，含具体触发条件/症状
- [ ] description 用第三人称写
- [ ] 全文布置关键词以便检索（错误、症状、工具）
- [ ] 有清晰的概览和核心原则
- [ ] 针对 RED 中发现的**具体**基线失败
- [ ] 代码内联，或链接到单独文件
- [ ] 一个优秀的示例（不是多语言）
- [ ] 用**有**技能的情况跑场景 —— 验证 agent 现在遵从了

**REFACTOR 阶段 —— 堵住漏洞：**
- [ ] 从测试中找出**新的**合理化
- [ ] 加上明确的回击（如果是纪律型技能）
- [ ] 从所有测试轮次建立合理化对照表
- [ ] 建立红旗清单
- [ ] 重新测试直到无懈可击

**质量检查：**
- [ ] 只在决策不显然时用小流程图
- [ ] 有速查表
- [ ] 有常见错误一节
- [ ] 没有叙述式讲故事
- [ ] 附属文件只用于工具或重量级参考

**部署：**
- [ ] 提交技能到 git 并推送到你的 fork（如已配置）
- [ ] 考虑通过 PR 贡献回来（如果广泛有用）

## Discovery Workflow（发现流程）

未来的 Claude 如何找到你的技能：

1. **遇到问题**（"测试是 flaky 的"）
2. **找到 SKILL**（description 匹配）
3. **扫描概览**（这相关吗？）
4. **读模式**（速查表）
5. **加载示例**（只在实现时）

**针对这个流程优化** —— 把可检索的词放在前面，并反复出现。

## The Bottom Line（总结）

**写技能就是"为流程文档做 TDD"。**

同样的铁律：没有失败测试就不写技能。
同样的循环：RED（基线）→ GREEN（写技能）→ REFACTOR（堵漏洞）。
同样的收益：更好的质量、更少的意外、无懈可击的结果。

如果你对代码遵循 TDD，就对技能也遵循它。这是同一种纪律应用在文档上。

---

## 附属文件

| 文件 | 作用 | 源码路径 |
|------|------|----------|
| `anthropic-best-practices.md`（1150 行） | Anthropic 官方的技能编写最佳实践——补充本技能的 TDD 视角 | `skills/superpowers/writing-skills/anthropic-best-practices.md` |
| `testing-skills-with-subagents.md`（384 行） | 完整的测试方法论：如何写压力场景、压力类型（时间/沉没成本/权威/疲惫）、系统堵洞、元测试技术 | `skills/superpowers/writing-skills/testing-skills-with-subagents.md` |
| `persuasion-principles.md`（187 行） | 说服原则的研究基础（Cialdini, 2021；Meincke et al., 2025）：权威、承诺、稀缺、社会认同、统一性——用于设计更有效的纪律型技能 | `skills/superpowers/writing-skills/persuasion-principles.md` |
| `CLAUDE_MD_TESTING.md` | 关于 `CLAUDE.md` 的测试方法 | `skills/superpowers/writing-skills/CLAUDE_MD_TESTING.md` |
| `graphviz-conventions.dot`（171 行） | 流程图的 graphviz 风格规则——用 DSL 自身写成的风格指南 | `skills/superpowers/writing-skills/graphviz-conventions.dot` |
| `render-graphs.js`（168 行） | 把某个技能 `SKILL.md` 里的 graphviz 图渲染成 SVG，便于给协作伙伴看 | `skills/superpowers/writing-skills/render-graphs.js` |

> **批注**：留意这一族附属文件的**性质分布**——它正好演示了正文「文件组织」一节给出的三条规则：`testing-skills-with-subagents.md`（384 行）和 `anthropic-best-practices.md`（1150 行）属于"重量级参考"；`render-graphs.js` 属于"可复用工具"；`persuasion-principles.md` 是一份**研究依据**（为正文里那句"说服原则"提供出处）。
>
> 最后这个类别值得单独注意：把"为什么这么写有效"的**学术依据**外置成单独文件，而不是塞进正文，是一个很克制的选择——它保证了正文保持在"怎么做"的层面，而把"为什么这么做在心理学上成立"留给愿意深究的人。

---

## 相关

- [writing-skills-详细设计讲解.md](./writing-skills-详细设计讲解.md) —— 本文的设计分析：CSO 那条实测发现意味着什么、技能测试的边界在哪
- [test-driven-development-中文版.md](./test-driven-development-中文版.md) —— **必需背景**：本技能是它的适配版
- [using-superpowers-中文版.md](./using-superpowers-中文版.md) —— 那张红旗表的产生方法就是本技能描述的过程
- [systematic-debugging-中文版.md](./systematic-debugging-中文版.md) —— 它的 `test-pressure-*.md` 是本技能的活样本
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— Superpowers 整体原理
