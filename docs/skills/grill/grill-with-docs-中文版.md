# grill-with-docs · 中文版

> **来源**：`skills/grill/grill-with-docs/SKILL.md`
> **类型**：入口技能（薄入口）
> **触发**：仅可手动 `/grill-with-docs`，禁止自动触发

---

## frontmatter

- **name**：`grill-with-docs`
- **description**：一场不留情面的访谈，用于打磨计划或设计；过程中同时产出文档（ADR 与术语表）。
- **disable-model-invocation**：`true`

## 正文

调用 Skill 工具**两次**，分别传入 `"grilling"` 和 `"domain-modeling"`。

> **批注**：整个技能的全部逻辑就是这一行。它是整套设计里最能说明"薄入口"价值的地方——**加一个变体，成本是一行**。
>
> 对比一下：`grill-me` = grilling；`grill-with-docs` = grilling + domain-modeling。差别只在多叠加了一个内核。如果当初把拷问逻辑直接写进入口里，那么"再来一个带文档的版本"就意味着一份完整副本，两份代码此后会各自漂移。而现在，`grilling` 本身一个字都不用改。
>
> 还有一层：正因为逻辑在组合而不在复制，**两个内核依然能被单独使用**。你可以在不发起拷问的情况下单独触发 `domain-modeling`（比如只是在改 `CONTEXT.md` 或写一条 ADR 时），这在"入口即全部逻辑"的设计下是做不到的。

---

## 附属文件

| 文件 | 作用 | 源码路径 |
|------|------|----------|
| `agents/openai.yaml` | OpenAI / Codex 格式的等价声明：显示名「Grill with Docs」、简述「Grill a design and write its docs」，并设了 `allow_implicit_invocation: false` | `skills/grill/grill-with-docs/agents/openai.yaml` |

> **批注**：与 `grill-me` 一样，入口在另一个 harness 里同样被禁止隐式调用。两个入口、两个平台，四处声明一致。

---

## 相关

- [grill-with-docs-详细设计讲解.md](./grill-with-docs-详细设计讲解.md) —— 本文的设计分析：组合的代价、两个内核的节奏张力
- [grilling-中文版.md](./grilling-中文版.md) —— 内核之一：拷问方法论
- [domain-modeling-中文版.md](./domain-modeling-中文版.md) —— 内核之二：术语表与 ADR 纪律
- [grill-me-中文版.md](./grill-me-中文版.md) —— 非编码场景的简化版入口
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— grill 系列整体原理
