# using-superpowers · 中文版

> **来源**：`skills/superpowers/using-superpowers/SKILL.md`
> **类型**：元技能（整套系统的总开关）
> **触发**：任何对话开始时——它规定了在任何响应（**包括澄清性提问**）之前必须先调用相关技能

---

## frontmatter

- **name**：`using-superpowers`
- **description**：任何对话开始时使用——确立如何找到并使用技能，要求在任何响应（包括澄清性提问）之前先调用 Skill 工具。

> **批注**：这是整套系统里**最重要的一份文件**。它不是一个"做某件事"的技能，而是**关于其它技能的元规则**——它规定的是"要不要用技能、什么时候用、多个技能时哪个优先"。它的正文会通过 SessionStart 钩子注入到每一次对话的开头，所以措辞里的每一个绝对化表达都是刻意的。见 [详细设计讲解](./using-superpowers-详细设计讲解.md)。

## 控制标签

```html
<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>
```

（如果你是被派来执行某个具体任务的 subagent，跳过这个技能。）

```html
<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing,
you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional.
You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>
```

（如果你认为某个技能有哪怕 **1%** 的可能适用于你正在做的事，你**绝对必须**调用该技能。

如果某个技能适用于你的任务，**你没有选择。你必须使用它。**

这不可协商。这不是可选项。你无法通过合理化绕开它。）

> **批注**：这两段是 HTML 标签包裹的，说明它们不是给**人**读的说明文字，而是给 **AI 读的指令**——标签名的全大写（`EXTREMELY-IMPORTANT`）本身就是一种语气强化。
>
> "even 1% chance" 这个阈值低到反常，但它不是判断标准，而是**刻意的不对称**：误调用一个技能代价很小（读一段文字，发现不适用就放下），漏掉一个该用的技能代价很大（整条纪律失效）。把阈值压到 1%，是用"大量无害的误报"换"接近零的漏报"。这个取舍的代价写在详细设计讲解里。
>
> "You cannot rationalize your way out of this"（你无法通过合理化绕开它）这句直接把**合理化**这个动作本身点名并预先否决——这种写法会反复出现在这套技能集里。

## Instruction Priority（指令优先级）

Superpowers 技能会覆盖系统提示的默认行为，但**用户指令永远优先**：

1. **用户的显式指令**（CLAUDE.md、GEMINI.md、AGENTS.md、直接要求）—— 最高优先级
2. **Superpowers 技能** —— 在与默认系统行为冲突时覆盖它
3. **默认系统提示** —— 最低优先级

如果 CLAUDE.md、GEMINI.md 或 AGENTS.md 说"不要用 TDD"，而某个技能说"永远用 TDD"，那就**遵从用户的指令**。用户说了算。

> **批注**：这一节解决的是**技能权限的合法性问题**。Superpowers 是一套很强势的规则（"你没有选择"），如果不明确它在权限链上的位置，它就会和用户的 CLAUDE.md 打架。原文把这个顺序写死，并给了一个具体例子（"不要用 TDD" vs "永远用 TDD"）——明确站队用户。**一个宣称"不可协商"的系统，自己先说清了它服从于谁**，这是它得以被信任的前提。

## How to Access Skills（如何访问技能）

**在 Claude Code 中：** 使用 `Skill` 工具。调用一个技能时，它的内容会被加载并呈现给你——直接照它执行。**绝不要**用 Read 工具去读技能文件。

**在 Copilot CLI 中：** 使用 `skill` 工具。技能从已安装的插件自动发现。`skill` 工具的行为与 Claude Code 的 `Skill` 工具相同。

**在 Gemini CLI 中：** 技能通过 `activate_skill` 工具激活。Gemini 在会话开始时加载技能的元数据，在需要时激活完整内容。

**在其他环境中：** 查阅你所在平台的文档，了解技能如何加载。

## Platform Adaptation（平台适配）

技能中使用的都是 Claude Code 的工具名。非 CC 平台：见 `references/copilot-tools.md`（Copilot CLI）、`references/codex-tools.md`（Codex）中的工具对照表。Gemini CLI 用户通过 GEMINI.md 自动获得工具映射。

## Using Skills（使用技能）

## The Rule（规则）

**在任何响应或动作之前，先调用相关或被要求的技能。** 哪怕只有 1% 的可能适用，也应该调用技能来检查。如果调用的技能经确认不适用于当前情况，你不必使用它。

```
用户消息到达 ──┐
              ↓
         即将进入 EnterPlanMode？ ──是──→ 已经 brainstorming 过了？
                                              ├─ 否 → 调用 brainstorming 技能
                                              └─ 是 ↓
         有任何技能可能适用？ ──否──→ 直接响应（包括澄清提问）
              │是，哪怕只有 1%
              ↓
         调用 Skill 工具
              ↓
         声明："Using [技能] to [目的]"
              ↓
         该技能有清单？ ──是──→ 为每一项建 TodoWrite 待办
              │否              │
              └────────┬───────┘
                       ↓
                 严格照技能执行
```

## Red Flags（红旗）

这些想法意味着**停下**——你正在合理化：

| 想法 | 现实 |
|------|------|
| "这只是一个简单的问题" | 问题就是任务。检查技能。 |
| "我需要先了解更多上下文" | 技能检查在澄清性提问**之前**。 |
| "让我先探索一下代码库" | 技能会告诉你**如何**探索。先检查。 |
| "我可以快速看一眼 git/文件" | 文件缺少对话上下文。检查技能。 |
| "让我先收集信息" | 技能会告诉你**如何**收集信息。 |
| "这不需要一个正式技能" | 如果技能存在，就用它。 |
| "我记得这个技能" | 技能会演进。读当前版本。 |
| "这不算一个任务" | 动作 = 任务。检查技能。 |
| "这个技能是杀鸡用牛刀" | 简单的事会变复杂。用它。 |
| "我先把这个做了再说" | 在做**任何事之前**检查。 |
| "这感觉很有产出" | 无纪律的行动浪费时间。技能能防止这一点。 |
| "我知道那是什么意思" | 知道概念 ≠ 使用技能。调用它。 |

> **批注**：这张表的每一行，都是在**提前回答一个具体的、听起来很合理的念头**。这是它和普通"注意事项"的根本区别——它不是提醒你"记得用技能"，而是列出**你已经想好的借口**，然后在旁边写上反驳。
>
> 这种写法的前提假设是：**合理化总是成句的、可枚举的**。"这只是一个简单问题"、"让我先探索一下代码库"——这些都是 AI 在跳过技能前会对自己说的话。把它们逐条写出来，效果是：当你脑中浮现这句话时，会立刻认出"我正处在这种模式里"。
>
> 这也是为什么这张表如此直白（"知识 ≠ 使用技能"这种话甚至有点冒犯）——它不需要说服你，只需要**触发自我识别**。

## Skill Priority（技能优先级）

当多个技能可能适用时，按这个顺序：

1. **过程技能优先**（brainstorming、debugging）—— 它们决定**如何**处理这个任务
2. **实现技能其次**（frontend-design、mcp-builder）—— 它们指导执行

"我们来做个 X" → 先 brainstorming，再实现技能。
"修一下这个 bug" → 先 debugging，再领域相关技能。

> **批注**：这条规则解决的是**先做哪个**的问题。为什么过程技能优先？因为它们决定的是**任务的形态**——brainstorming 可能会推翻整个需求，debugging 可能会发现你根本修错对象。先跑实现技能，等于在形态未定时就开始填内容。

## Skill Types（技能类型）

**Rigid（刚性的）**（TDD、debugging）：严格照做。不要"变通"掉纪律。

**Flexible（灵活的）**（patterns）：把原则适配到具体情境。

技能本身会告诉你它属于哪一种。

## User Instructions（用户指令）

指令说的是 **WHAT**，不是 **HOW**。"加个 X"或"修一下 Y"不意味着要跳过工作流。

> **批注**：这一句堵的是最隐蔽的一类绕过——把用户的祈使句当成"跳过流程的授权"。用户说"加个 X"，意思是他要 X 这个**结果**，而不是"请用最快最省事的方式，流程能省就省"。如果按这个逻辑推下去，"修一下这个 bug"就变成了"别走调试流程，直接改到不报错为止"——而这恰恰是 TDD 和 systematic-debugging 存在要防止的事。

---

## 附属文件

| 文件 | 作用 | 源码路径 |
|------|------|----------|
| `codex-tools.md` | Codex 平台的工具名对照表（技能正文用的是 Claude Code 的工具名） | `skills/superpowers/using-superpowers/codex-tools.md` |
| `copilot-tools.md` | Copilot CLI 平台的工具名对照表 | `skills/superpowers/using-superpowers/copilot-tools.md` |
| `gemini-tools.md` | Gemini CLI 平台的工具名对照表（Gemini 用户通过 GEMINI.md 自动加载） | `skills/superpowers/using-superpowers/gemini-tools.md` |

> **批注**：三个平台适配文件对应同一个设计问题的三种答案——技能正文写的是 Claude Code 的工具名（`Skill`、`Read`、`TodoWrite`），而 Codex / Copilot / Gemini 各有自己的对应物。**正文保持工具无关是不可能的**（它必须提到具体工具才能给出可执行指令），所以选择把映射外置。这样正文只有一份，平台差异被隔离在附属文件里。

---

## 相关

- [using-superpowers-详细设计讲解.md](./using-superpowers-详细设计讲解.md) —— 本文的设计分析：为什么需要一个元技能、"1%" 阈值的代价、何时会失效
- [brainstorming-中文版.md](./brainstorming-中文版.md) —— 被规则强制前置的过程技能
- [writing-skills-中文版.md](./writing-skills-中文版.md) —— 这张红旗表背后的方法论：合理化表是怎么测出来的
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— Superpowers 整体原理
