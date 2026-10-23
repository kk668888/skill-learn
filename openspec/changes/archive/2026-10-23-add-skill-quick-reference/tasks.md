# Tasks: 技能速览文档

## 1. 守护测试先行（RED）

- [x] 1.1 在 `viewer/tests/` 新建 `skill-quick-reference.spec.ts`：扫描 `skills/**/SKILL.md` 提取 `name` 集合；解析速览文档**表格首列**的反引号技能名并应用 12 条 opsx 显式别名表（`opsx:new` → `openspec-new-change` 等，见 design.md 决策 2）；双向断言不漏不多，失败信息列出缺失与多余名单
- [x] 1.2 运行测试确认 RED（速览文档尚不存在，测试因文件缺失而失败）

## 2. 速览文档（GREEN）

- [x] 2.1 创建 `docs/ai-docs/技能速览.md`：按套件分组的表格（技能｜干什么｜怎么喊），技能名一律反引号；superpowers/openspec/grill/ponytail 各一表，三个单技能套件合并一张表（套件名注在括号里）；文档头部放三种触发形态图例（自动/手动/斜杠）
- [x] 2.2 逐行对照各技能**中文版**与详细设计讲解，精修「干什么」一句话——只留区分词，不照搬 frontmatter 翻译；重点核实 `opsx:propose` 与 `opsx:ff` 的分工差异（两者原文描述高度相似）
- [x] 2.3 撰写「容易混的几组」对照区块：openspec 三种开工方式（new/propose/ff）、写计划（writing-plans vs opsx:new）、执行（executing-plans vs subagent-driven-development vs opsx:apply）、审查（requesting-code-review vs ponytail-review）、写技能（writing-skills vs skill-creator）、收尾（finishing-a-development-branch vs opsx:archive vs opsx:sync）
- [x] 2.4 运行守护测试确认 GREEN

## 3. 规则豁免与收尾

- [x] 3.1 `CLAUDE.md` 硬性约束一节增补一句：跨套件全局速览存于 `docs/ai-docs/技能速览.md`，不属于「`docs/skills/<套件>/` 内不建索引页」的射程
- [x] 3.2 全量测试通过 + `openspec validate add-skill-quick-reference` 通过
