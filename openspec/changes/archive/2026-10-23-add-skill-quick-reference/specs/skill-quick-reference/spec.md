## Purpose

为仓库全部技能（当前 7 套 39 个）提供一页式速查：库主凭它快速回忆「哪个技能管什么、怎么喊出来」，并保证清单与 `skills/` 源码永不漂移。

## ADDED Requirements

### Requirement: 全量覆盖且不虚列

`docs/ai-docs/技能速览.md` 列出的技能集合 MUST 与 `skills/` 下全部 `SKILL.md` 的 `name` 集合恒等：不漏（每个技能都有条目）、不多（不列不存在的技能）。openspec 套件允许短名等价写法（`opsx:new` ≡ `openspec-new-change`）。

#### Scenario: 新增技能未同步

- **WHEN** `skills/` 新增一个技能而速览未更新
- **THEN** 守护测试失败，报告缺失的技能名

#### Scenario: 删除技能未同步

- **WHEN** 某技能从 `skills/` 移除而速览仍列着它
- **THEN** 守护测试失败，报告多余的技能名

### Requirement: 行级速查形态

每个技能条目 MUST 在一行内提供三项：技能名、一句话职责、触发方式。职责句 MUST 含区分词——名称或职责相近的技能（如 `grill-me` 与 `grill-with-docs`）必须在行内即可分辨，无需点开其他文档。触发方式 MUST 归入三类之一：自动（模型按任务形态自调）、手动（薄入口，须用户点名）、斜杠（`/opsx:xx` 命令形态）。

#### Scenario: 近邻技能行内可辨

- **WHEN** 读者想区分两个名称或职责相近的技能
- **THEN** 速览中两行各自的区分词足以指出分工差异

### Requirement: 易混对照区块

文档 MUST 含「容易混的几组」对照区块，每组指明涉及技能及各自分工差异；对照组的选择可随实际混淆情况演进，不设固定清单。

#### Scenario: 跨套件混淆

- **WHEN** 两个套件存在职责重叠的技能（如 superpowers 的 `writing-plans` 与 openspec 的 `opsx:new`）
- **THEN** 对照区块或所在行的区分词能回答「各自什么时候用」

### Requirement: 随文库自动可发现

文档 MUST 位于 `docs/ai-docs/`，被现有扫描收录进文库树与全文搜索；不占用 WelcomePanel 特殊入口（新人第一入口仍唯一指向 SDD 入门指南）。

#### Scenario: 文库树与搜索可见

- **WHEN** 打开文库首页侧栏树，或搜索技能相关关键词
- **THEN** 速览文档出现在树与搜索结果中
