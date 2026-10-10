# finishing-a-development-branch · 中文版

> **来源**：`skills/superpowers/finishing-a-development-branch/SKILL.md`
> **类型**：过程技能（收尾决策）
> **触发**：实现完成、测试全过、需要决定如何整合这些工作时

---

## frontmatter

- **name**：`finishing-a-development-branch`
- **description**：当实现完成、所有测试通过、你需要决定如何整合这些工作时使用——通过给出 merge、PR 或清理的结构化选项来引导开发工作的收尾。

> **批注**：description 里的 "presenting structured options"（给出**结构化**选项）是刻意的措辞。它预告了这份技能最核心的一条纪律——**呈现恰好 4 个（或 3 个）选项，而不是开放式地问"接下来怎么办？"**。开放式提问把决策成本推回给用户，而结构化菜单让一次回复就能推进。

## Overview

通过呈现清晰的选项并处理所选流程，来引导开发工作的收尾。

**核心原则：** 验证测试 → 检测环境 → 呈现选项 → 执行所选 → 清理。

**开始时声明：** "I'm using the finishing-a-development-branch skill to complete this work."

## The Process

### Step 1: Verify Tests（验证测试）

**在呈现选项之前，先验证测试通过：**

```bash
# 运行项目的测试套件
npm test / cargo test / pytest / go test ./...
```

**如果测试失败：**

```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

停下。不要进入 Step 2。

**如果测试通过：** 继续 Step 2。

### Step 2: Detect Environment（检测环境）

**在呈现选项之前，先确定工作区状态：**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

这决定了展示哪套菜单，以及清理如何进行：

| 状态 | 菜单 | 清理 |
|------|------|------|
| `GIT_DIR == GIT_COMMON`（普通仓库） | 标准 4 选项 | 没有 worktree 需要清理 |
| `GIT_DIR != GIT_COMMON`，具名分支 | 标准 4 选项 | 基于来源判定（见 Step 6） |
| `GIT_DIR != GIT_COMMON`，detached HEAD | 精简 3 选项（无 merge） | 不清理（由外部管理） |

> **批注**：菜单的形状随环境变化——detached HEAD 下**移除 merge 选项**。理由很实在：detached HEAD 上没有一个可以合并回去的本地分支（它是由外部环境管理的）。但这也意味着这个技能承认：**不是所有情况下四个选项都成立**，宁可少给一个也不给一个执行会失败的错误选项。

### Step 3: Determine Base Branch（确定基准分支）

```bash
# 尝试常见的基准分支
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

或者直接问："这个分支是从 main 分出来的，对吗？"

### Step 4: Present Options（呈现选项）

**普通仓库和具名分支的 worktree——恰好呈现这 4 个选项：**

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Detached HEAD——恰好呈现这 3 个选项：**

```
Implementation complete. You're on a detached HEAD (externally managed workspace).

1. Push as new branch and create a Pull Request
2. Keep as-is (I'll handle it later)
3. Discard this work

Which option?
```

**不要添加解释**——保持选项简洁。

> **批注**："恰好这 4 个"和"不要添加解释"两条约束合起来，是在**保护菜单本身**。菜单的价值在于它是一个**封闭的、可一眼扫完的**选择集；一旦开始给每个选项加说明、或者临时发明第 5 个选项，菜单就退化成了一段需要阅读理解的文章。原文在「常见错误」里也对这一点做了强调——问题是"开放式提问"，修复是"present exactly 4 structured options"。

### Step 5: Execute Choice（执行所选）

#### Option 1: Merge Locally（本地合并）

```bash
# 取得主仓库根目录，保证 CWD 安全
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# 先合并 —— 在删除任何东西之前确认成功
git checkout <base-branch>
git pull
git merge <feature-branch>

# 在合并结果上验证测试
<test command>

# 只有在合并成功之后：清理 worktree（Step 6），然后删除分支
```

随后：清理 worktree（Step 6），然后删除分支：

```bash
git branch -d <feature-branch>
```

> **批注**：注意那句注释——"**先合并 —— 在删除任何东西之前确认成功**"。这是对顺序的强调：合并有可能失败（冲突、测试挂掉），而如果在合并成功之前就把 worktree 清了、分支删了，回退的路就断了。**不可逆动作排在可逆动作之后**，是一条贯穿这份技能的模式（Step 6 的清理同理）。

#### Option 2: Push and Create PR（推送并创建 PR）

```bash
# 推送分支
git push -u origin <feature-branch>

# 创建 PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

**不要清理 worktree** —— 用户需要它活着，以便根据 PR 反馈继续迭代。

#### Option 3: Keep As-Is（保持现状）

汇报："Keeping branch `<name>`. Worktree preserved at `<path>`."

**不要清理 worktree。**

#### Option 4: Discard（丢弃）

**先确认：**

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

等待**精确**确认。

如果确认了：

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

然后：清理 worktree（Step 6），然后强制删除分支：

```bash
git branch -D <feature-branch>
```

> **批注**：确认方式要求**打出 'discard' 这个词**，而不是按 y/n 或点确定。这个设计针对的是**确认疲劳**——用户面对一串对话框时会对"是否继续"形成肌肉记忆，随手回车。要求输入一个特定的词，强制这次交互**必须被有意识地阅读和复述**，从而打破自动回应的惯性。同一个手法出现在 `systematic-debugging` 的"你想删除几小时的成果吗"这类设计中。

### Step 6: Cleanup Workspace（清理工作区）

**只对 Option 1 和 4 运行。** Option 2 和 3 **永远**保留 worktree。

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

**如果 `GIT_DIR == GIT_COMMON`：** 普通仓库，没有 worktree 需要清理。完成。

**如果 worktree 路径位于 `.worktrees/`、`worktrees/` 或 `~/.config/superpowers/worktrees/` 之下：** 这个 worktree 是 Superpowers 创建的——清理归我们。

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
git worktree remove "$WORKTREE_PATH"
git worktree prune  # 自愈：清理任何陈旧的登记项
```

**其他情况：** 这个工作区归宿主环境（harness）所有。**不要**移除它。如果你的平台提供了退出工作区的工具，用它。否则，把工作区原样留下。

> **批注**：这就是 **provenance check**（来源判定）——**只清理你自己创建的东西**。判定依据是路径前缀：只要 worktree 落在 `using-git-worktrees` 约定的那几个目录下，就认为是自己建的。这与 `using-git-worktrees` 里"不要和宿主环境对抗"是同一条原则的另一面：**对方建的东西你别动，否则会制造宿主看不见的状态**。
>
> `git worktree prune` 被注释为"自愈"，也值得留意——它清理的是**陈旧的登记项**（比如手动删了目录但 git 还记着）。这一条把"清理"从"删除目录"扩展到了"让 git 的登记状态也恢复一致"。

## Quick Reference

| 选项 | 合并 | 推送 | 保留 worktree | 删除分支 |
|------|------|------|---------------|----------|
| 1. 本地合并 | 是 | - | - | 是 |
| 2. 创建 PR | - | 是 | 是 | - |
| 3. 保持现状 | - | - | 是 | - |
| 4. 丢弃 | - | - | - | 是（强制） |

## Common Mistakes（常见错误）

**跳过测试验证**

- **问题：** 合并坏代码，创建会失败的 PR
- **修复：** 提供选项之前永远先验证测试

**开放式提问**

- **问题：** "接下来该怎么做？"是有歧义的
- **修复：** 恰好呈现 4 个结构化选项（detached HEAD 时 3 个）

**为 Option 2 清理 worktree**

- **问题：** 移除了用户为 PR 迭代所需的 worktree
- **修复：** 只对 Option 1 和 4 清理

**先删分支再移除 worktree**

- **问题：** `git branch -d` 失败，因为 worktree 仍引用着该分支
- **修复：** 先合并，再移除 worktree，最后删分支

**在 worktree 内部运行 git worktree remove**

- **问题：** CWD 在被移除的 worktree 里时，命令会静默失败
- **修复：** 执行 `git worktree remove` 之前，永远先 `cd` 到主仓库根目录

**清理宿主环境拥有的 worktree**

- **问题：** 移除宿主创建的 worktree 会造成幻影状态
- **修复：** 只清理 `.worktrees/`、`worktrees/` 或 `~/.config/superpowers/worktrees/` 之下的

**丢弃没有确认**

- **问题：** 意外删除工作成果
- **修复：** 要求打字输入 "discard" 确认

## Red Flags

**绝不：**

- 带着失败的测试继续
- 不验证结果上的测试就合并
- 不经确认就删除工作成果
- 未经明确请求就 force-push
- 在确认合并成功之前移除 worktree
- 清理不是自己创建的 worktree（来源判定）
- 在 worktree 内部运行 `git worktree remove`

**永远：**

- 提供选项之前先验证测试
- 展示菜单之前先检测环境
- 恰好呈现 4 个选项（detached HEAD 时 3 个）
- Option 4 必须取得打字确认
- 只对 Option 1 和 4 清理 worktree
- 移除 worktree 之前 `cd` 到主仓库根目录
- 移除之后运行 `git worktree prune`

---

## 附属文件

本技能没有附属文件——只有一个 `SKILL.md`。

---

## 相关

- [finishing-a-development-branch-详细设计讲解.md](./finishing-a-development-branch-详细设计讲解.md) —— 本文的设计分析：为什么必须有显式决策点、provenance 判定的漏洞
- [using-git-worktrees-中文版.md](./using-git-worktrees-中文版.md) —— 与本技能成对：它负责建，本技能负责按来源判定该不该删
- [subagent-driven-development-中文版.md](./subagent-driven-development-中文版.md) —— 它的终态就是调用本技能
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— Superpowers 整体原理
