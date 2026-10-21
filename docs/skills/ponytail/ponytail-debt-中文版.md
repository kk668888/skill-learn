# ponytail-debt · 中文版

> **来源**：`skills/ponytail/ponytail-debt/SKILL.md`
> **类型**：报告技能（技术债台账收割；只读，一次性报告，经确认可写台账文件）
> **触发**：可自动触发；用户说「ponytail debt」「what did ponytail defer」「list the shortcuts」或调用 `/ponytail-debt` 时使用

---

## frontmatter

- **name**：`ponytail-debt`
- **description**：把每一条 `shortcut:` 注释（以及更早的 `ponytail:` 注释）列成技术债台账。一次性报告，不改动任何东西。适用于「ponytail debt」「ponytail 推迟了什么」「列出这些捷径」等场景。

> **批注**：注意 description 的角色定位——它是**收割器**而不是登记器：登记发生在主技能写代码的时刻（`shortcut:` 注释），本技能只在需要时把散落各处的登记汇总成账。

## 正文

每一处 ponytail 刻意留下的捷径都用 `shortcut:` 注释标记，写明它的上限和升级路径（更早的代码可能写 `ponytail:`）。本技能把它们收进同一份台账，让一次推迟不能悄悄变成永久。

> **批注**：这句话就是整个技能的存在理由——**对抗遗忘**。刻意妥协最大的风险不是妥协本身，而是它被记住的方式只存在于某个人的脑子里；注释化之后，债有了可 grep 的物理载体。

## 扫描

在仓库里 grep 注释标记，跳过 `.git` 和所有 `.gitignore` 忽略的内容（依赖、构建产物、缓存，无论什么技术栈）：

`git grep --no-index --exclude-standard -nE '(#|//|/[*]) ?(shortcut|ponytail):'`（如果你的技术栈还有其他注释前缀，自行补充）

如果用户指定了自己的标记词（`/ponytail-debt TODO`），改为 grep 那个词。

每一处命中就是台账里的一行。注释前缀把只是提到这套约定的散文挡在账外。跳过不是推迟的命中，比如一条关于键盘快捷键（shortcut）的说明。

> **批注**：用「前缀 + 冒号」的窄模式而不是裸词搜索，是台账信噪比的关键：代码里随处出现的「shortcut」一词（键盘快捷键、捷径算法）不会误入账，只有按约定登记的注释才算债务。

## 输出

每条标记一行，按文件分组：

`<文件>:<行号>, <被简化的内容>. ceiling: <注释写明的上限>. upgrade: <重新评估的触发条件>.`

约定的格式是 `shortcut: <上限>, <升级路径>`，所以上限和触发条件直接从注释里取。想给每行加负责人？追加 `git blame -L<行>,<行>`。

标记腐烂风险：任何没写升级路径或触发条件的标记注释，打上 `no-trigger` 标签——这些正是会悄悄烂掉的债。

结尾：`<N> markers, <M> with no trigger.`（N 条标记，其中 M 条没有触发条件。）什么都没找到：`No shortcut debt. Clean ledger.`（无捷径债，台账干净。）

## 边界

只读和报告，不做任何改动。要持久化时，经确认后把台账写入一个文件（如 `PONYTAIL-DEBT.md`）。一次性执行。

---

## 附属文件

无——本技能目录只有 `SKILL.md` 单文件。

---

## 相关

- [ponytail-debt-详细设计讲解.md](./ponytail-debt-详细设计讲解.md) —— 本文的设计分析：为什么这么设计、代价是什么、何时会失效
- [ponytail-中文版.md](./ponytail-中文版.md) —— 登记 `shortcut:` 注释的主技能
- [ponytail-review-中文版.md](./ponytail-review-中文版.md) ｜ [ponytail-audit-中文版.md](./ponytail-audit-中文版.md) —— 对已登记捷径的豁免语义
- [ponytail-help-中文版.md](./ponytail-help-中文版.md) —— 命令速查卡
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— ponytail 套件整体原理
