# grill-me · 中文版

> **来源**：`skills/grill/grill-me/SKILL.md`
> **类型**：入口技能（薄入口）
> **触发**：仅可手动 `/grill-me`，禁止自动触发

---

## frontmatter

- **name**：`grill-me`
- **description**：一场不留情面的访谈，用于打磨计划或设计。
- **disable-model-invocation**：`true`

> **批注**：`disable-model-invocation: true` 是这个技能最重要的设计——它禁止 AI 自作主张地启动拷问。拷问是**高强度打断式交互**，会连珠炮般向你提问；如果 AI 能在你只是随口提了个想法时就擅自开启它，体验会灾难性地差。所以入口必须由你亲手触发。

## 正文

调用 Skill 工具，传入 `"grilling"`。

> **批注**：整个入口的正文只有这一行。它不实现任何逻辑，只做**转发**——真正的拷问方法论全在 `grilling` 里。这样设计的好处是：`grilling` 可以被单独复用（也可以被别的入口复用，比如 [grill-with-docs-中文版.md](./grill-with-docs-中文版.md)），入口只负责"声明用户意图"。整个技能集合因此是**可组合**的，而非三个互相复制的完整副本。

---

## 附属文件

| 文件 | 作用 | 源码路径 |
|------|------|----------|
| `agents/openai.yaml` | 面向 OpenAI / Codex 格式的等价入口声明：显示名「Grill Me」、简述「Sharpen a plan through interview」，并同样设了 `allow_implicit_invocation: false` | `skills/grill/grill-me/agents/openai.yaml` |

> **批注**：`openai.yaml` 里那条 `allow_implicit_invocation: false` 与 Claude 版的 `disable-model-invocation: true` 语义完全一致。**同一个设计决策在不同 harness 各写了一遍**——说明"入口禁止自动触发"是这套设计里必须显式表达的部分，而不是某个平台的偶然约定。

---

## 相关

- [grill-me-详细设计讲解.md](./grill-me-详细设计讲解.md) —— 本文的设计分析：为什么入口要禁止自动触发、代价是什么
- [grilling-中文版.md](./grilling-中文版.md) —— 它转发的内核
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— grill 系列整体原理与三套对比
