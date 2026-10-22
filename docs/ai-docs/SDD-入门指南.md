# SDD 入门指南

> 写给刚接触本仓库技能套件（superpowers、grill、openspec、frontend-design-premium、impeccable、ponytail、skill-creator）的人。
> 读完你能：知道 SDD 是什么、看懂两条工作路线、照着一个真实案例走完第一遍、卡住时知道翻哪份文档。
>
> 前提：你机器上的 Claude Code 已通过离线包装好上述技能（下载 ZIP 解压后双击 `安装.bat`，或看仓库 README 的「内网安装」章节）。

## 一、SDD 是什么

SDD（Spec-Driven Development，规格驱动开发）是一种**以规格文档为核心的 AI 协作开发方式**：先把「要做什么、做到什么算对」写成结构化文档，再让 AI 按文档实现。规格是 AI 的行为边界，也是人和人之间的共识基础。

| | 传统方式 | SDD 方式 |
|---|---|---|
| 顺序 | 边写边想，需求在代码里漂移 | 先写规格，代码照规格生成 |
| AI 的角色 | 自由发挥，质量靠运气 | 按规格执行，越界即偏差 |
| 返工 | 接口对不上、理解错需求 | 规格阶段就拦下分歧 |
| 事后 | 文档过时或不存在 | 规格文件本身就是文档，可审计 |

一句话记住它：**代码是耗材，规格是资产**。

## 二、两条路线

不是所有任务都要走完整流程。先路由：

```
                    任务来了
                       │
          ┥ 改动小？不改 UI？不需要并行？
                       │
        ┌──────── yes ─┴─ no ────────┐
        ▼                            ▼
   L 轻量档（4 步）              H 完整档（11 阶段）
   工具/后端/中小改动            产品级 feature / 改 UI / 要演示
```

### L 轻量档——日常主力，先学这个

| 步骤 | 命令 | 产出 | 停点（谁拍板） |
|------|------|------|------|
| 1 探索 | `/opsx:explore <想法>` | 想法收敛成方向 | **你**确认方向 |
| 2 提案 | `/opsx:propose <变更名>` | proposal / specs / design / tasks 四件套 | `openspec validate` 通过 + **你**拍板 |
| 3 实施 | `/opsx:apply <变更名>` | 勾选 tasks、测试全绿、提交 | 测试不过不进下一步 |
| 4 归档 | `/opsx:archive <变更名>` | 规格合入 `openspec/specs/` | 归档即闭环 |

### H 完整档——大 feature 才用，先看地图不急着走

| 阶段 | 用什么 | 备注 |
|------|--------|------|
| 1 需求脑暴 | `superpowers:brainstorming`（渐进收敛）或 `grill:grilling`（批量快问） | 产品/UI 向用前者，需求方在场用后者 |
| 2 UI 先行 | 外网：Pencil MCP；**内网：`frontend-design-premium`** | 先出设计稿与 Design Tokens，再写代码 |
| 3–4 规格与任务 | `/opsx:propose`（tasks.md 是唯一任务清单） | 大 feature 可先用 `writing-plans` 打技术草稿 |
| 5 隔离分支 | `superpowers:using-git-worktrees` | main 不受影响，可多任务并行 |
| 6 AI 执行 | `superpowers:subagent-driven-development` | 按任务分发给子代理 |
| 7–8 审查与验证 | `requesting-code-review` + `opsx:verify` + 浏览器实测（`impeccable` 看视觉） | CRITICAL 问题清零才算过 |
| 9–10 合并与归档 | `finishing-a-development-branch` + `/opsx:archive` | |
| 11 知识沉淀 | `domain-modeling` 更新术语表、必要时沉淀技能文档 | 团队还有飞书就同步飞书 |

升档信号（满足任一就考虑 H 档）：要改 UI；涉及文件多到一个人顺序做不过来；产出要给人演示。

## 三、第一次跟做（真实案例复盘）

以下是一个**真实发生并已归档**的案例：给离线安装器加交互式向导（变更名 `add-interactive-installer`，2026-10-22 归档）。它的全部产物都在仓库里，每一步你都能打开对应文件核对——这就是 SDD 的可审计性。

### 第 1 步：探索——把抱怨变成方向

起因是一句抱怨：「打命令太麻烦了，能不能选着装」。在 `/opsx:explore` 里对话收敛后，做出了两个决定：

- A：做交互式向导（核心）
- B：顺手加个 Windows 双击入口（`安装.bat`）

**停点**：方向「A 起步、B 顺手捎上」由使用者拍板，AI 不擅自扩范围。这一步不产出代码，只产出共识。

### 第 2 步：提案——四件套 + 校验门

`openspec new change add-interactive-installer` 后生成四份文档（现在在 `openspec/changes/archive/2026-10-22-add-interactive-installer/`，可直接打开）：

| 文件 | 回答的问题 |
|------|-----------|
| `proposal.md` | 为什么做、改什么、影响面 |
| `specs/…/spec.md` | 需求场景：WHEN 什么发生 THEN 该怎样 |
| `design.md` | 5 个设计决策，每个都写了「放弃了什么」 |
| `tasks.md` | 10 个带 checkbox 的可执行任务 |

**停点**：`openspec validate add-interactive-installer` 输出 `is valid` 才允许进入实施——校验不过，规格写得再漂亮也不动手。

### 第 3 步：实施——测试先行，按任务推进

`/opsx:apply add-interactive-installer`：先写会失败的测试（向导用例），再实现让测试变绿，逐个勾掉 tasks。期间实现暴露了设计错误（bat 的编码方案实测不可行），**回头改 design.md 再继续**——文档不是摆设，是实现的事实记录。收尾时根测试 23/23 全绿，才提交。

**停点**：向导本身还有一道「确认门默认 N」——一路回车等于什么都没装。SDD 的精神一以贯之：动手前必须显式确认。

### 第 4 步：归档——规格成为公共资产

`openspec archive add-interactive-installer` 后，「交互式安装向导」这条需求从变更目录**合入** `openspec/specs/offline-skill-distribution/spec.md`——下一个人改安装器时，读规格就知道它应该怎么表现，不用翻聊天记录。

### 轮到你了（约 30 分钟练习）

找一个半小时能完成的小改动（改一段文案、加一个小开关），在**练习分支**上走一遍四步。每步的完成判据：

1. explore 结束：能用一句话说出要做什么、不做什么
2. propose 结束：`openspec validate` 通过，tasks 每项都能独立执行
3. apply 结束：相关测试全绿，tasks 全部勾选
4. archive 结束：规格出现在 `openspec/specs/` 对应能力下

## 四、卡住了去哪

| 你想知道 | 翻这里 |
|----------|--------|
| 某套技能第一次怎么用 | `docs/skills/<套件>/技能快速入手.md`（每套一份） |
| 某套技能整体为什么这么设计 | `docs/skills/<套件>/技能原理深度讲解.md`（anthropics 套件暂无） |
| 某个技能原文说了什么、为什么 | `docs/skills/<套件>/<技能名>-中文版.md` 与 `-详细设计讲解.md` |
| 仓库术语是什么意思 | `CONTEXT.md` |
| 某功能现在应该怎么表现 | `openspec/specs/<能力>/spec.md`（这才是真理来源） |
