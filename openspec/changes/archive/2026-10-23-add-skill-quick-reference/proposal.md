# 提案：技能速览文档

## Why

仓库现有 7 套共 39 个技能，且仍在增长。库主在实际使用中记不住「哪个技能管什么、该怎么喊出来」——回忆失败集中在相似技能之间（grill 三件套、`writing-plans` vs `opsx:new`、`requesting-code-review` vs `ponytail-review`）。现有入口补不上这个缺口：

- 文库首页只到**套件级**（7 张卡，无技能明细）
- 工具矩阵（/overview/）只覆盖约 10 个精选工具，以流程编排为主
- viewer 侧栏树能列出名字，但每行信息为零，要点开才知道

需要一份**技能级**的一页速查表，服务库主自己的「快速回忆」，不是新人引路（引路已有 SDD 入门指南）。

## What Changes

- 新增手写文档 `docs/ai-docs/技能速览.md`：按套件分组的速查表，39 个技能每个一行（技能名｜干什么｜怎么喊），一行只留**区分词**而非完整介绍；附「容易混的几组」对照区块
  - 描述以各技能中文版为原料**提炼**，不照搬 frontmatter 翻译
  - 「怎么喊」列覆盖三种触发形态：自动（模型按任务形态自调）／手动（薄入口，只能点名）／斜杠（`/opsx:xx` 命令）
- 新增守护测试（`viewer/tests/skill-quick-reference.spec.ts`）：断言速览文档列出的技能集合与 `skills/**/SKILL.md` 的 name 集合**恒等**（不漏、不多），新增技能忘更新时测试直接红——延续本项目 FOUC 键名守卫式的测试文化
- `CLAUDE.md` 硬性约束补一句豁免：跨套件全局速览存于 `docs/ai-docs/`，不属于「`docs/skills/<套件>/` 内不建索引页」的射程，避免未来语义歧义

## Capabilities

### New Capabilities

- `skill-quick-reference`: 技能速览文档的内容形态与覆盖完整性契约——全量覆盖（集合恒等，测试守护）、行级信息形态（区分词 + 触发方式）、易混对照区块

### Modified Capabilities

（无——viewer 行为不变：文档位于 `docs/ai-docs/`，现有扫描自动收录进树与全文搜索，不触碰任何既有需求）

## Impact

- 新文件：`docs/ai-docs/技能速览.md`、`viewer/tests/skill-quick-reference.spec.ts`
- 修改：`CLAUDE.md` 硬性约束一节增补一句豁免说明
- 无代码、接口、依赖变更；viewer 侧栏树与全文搜索自动受益（速览浓缩了 39 个技能的中文关键词，联想词搜索会先命中它）
