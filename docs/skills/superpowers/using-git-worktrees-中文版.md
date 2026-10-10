# using-git-worktrees · 中文版

> **来源**：`skills/superpowers/using-git-worktrees/SKILL.md`
> **类型**：过程技能（工作区隔离）
> **触发**：开始需要与当前工作区隔离的功能开发时，或在执行实现计划之前

---

## frontmatter

- **name**：`using-git-worktrees`
- **description**：当开始需要与当前工作区隔离的功能开发时、或在执行实现计划之前使用——确保存在一个隔离的工作区（优先用平台原生工具，退化时用 git worktree）。

> **批注**：description 里"ensures an isolated workspace exists via native tools or git worktree fallback"这半句**例外地提到了做法**（原生工具优先），而 `writing-skills` 一般禁止在 description 里概括工作流。这里之所以可以，是因为它是**触发条件的一部分**而非流程细节——它决定了这个技能在"已经有原生工具"的环境里是否适用。

## Overview

确保工作在隔离的工作区中进行。优先使用平台原生的 worktree 工具。只有在没有原生工具可用时，才退回到手动的 `git worktree`。

**核心原则：** 先检测是否已有隔离。然后用原生工具。再退回 git。**永远不要和宿主环境对抗。**

**开始时声明：** "I'm using the using-git-worktrees skill to set up an isolated workspace."

> **批注**："Never fight the harness"（永远不要和宿主环境对抗）是这份技能的纲领，也是它与其他"建 worktree"教程最大的区别。下面 Step 0 和 Step 1a 的全部复杂度，都是这条原则的展开——**如果宿主已经提供了隔离，你再去手工建一个，就会制造宿主看不见、也管不了的状态**。

## Step 0: Detect Existing Isolation（检测是否已有隔离）

**在创建任何东西之前，先检查你是否已经身处一个隔离的工作区。**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**submodule 防护：** `GIT_DIR != GIT_COMMON` 在 git submodule 内部**同样成立**。在得出"已经在 worktree 里"的结论之前，先确认你不在 submodule 中：

```bash
# 如果这条命令返回路径，说明你在 submodule 里，而不是 worktree —— 按普通仓库处理
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**如果 `GIT_DIR != GIT_COMMON`（且不在 submodule 中）：** 你已经在一个 linked worktree 里了。跳到 Step 3（项目初始化）。**不要**再创建另一个 worktree。

带分支状态汇报：

- 在某个分支上："Already in isolated workspace at `<path>` on branch `<name>`."
- detached HEAD："Already in isolated workspace at `<path>` (detached HEAD, externally managed). Branch creation needed at finish time."

**如果 `GIT_DIR == GIT_COMMON`（或处于 submodule 中）：** 你在一个普通仓库检出中。

用户是否已经在你的指令里表明了他的 worktree 偏好？如果没有，先征求同意再创建：

> "Would you like me to set up an isolated worktree? It protects your current branch from changes."

已经声明过的偏好直接遵从，不必再问。如果用户拒绝，就地工作，跳到 Step 3。

> **批注**：submodule 防护是一个**真实踩过的坑**。判断"是否在 linked worktree 里"的标准手法是比对 `--git-dir` 和 `--git-common-dir`——但在 submodule 里这两个路径同样不相等。如果不加这道防护，AI 会在 submodule 里误判"我已在隔离工作区"，于是跳过建 worktree，而实际并没有隔离。**两个不同的原因导致同一个信号**，这是这类检测的典型陷阱。

## Step 1: Create Isolated Workspace（创建隔离工作区）

**你有两种机制。按这个顺序尝试。**

### 1a. Native Worktree Tools（原生工具，优先）

用户已经同意了隔离工作区（Step 0 的同意）。你是否已经有一个创建 worktree 的手段？它可能是名为 `EnterWorktree`、`WorktreeCreate` 的工具，一个 `/worktree` 命令，或一个 `--worktree` 标志。如果你有，用它，然后跳到 Step 3。

原生工具会自动处理目录位置、分支创建和清理。**在已经有原生工具的情况下使用 `git worktree add`，会制造出你的宿主环境看不见、也无法管理的幻影状态。**

只有在没有原生 worktree 工具可用时，才继续到 Step 1b。

### 1b. Git Worktree Fallback（git 退化方案）

**只有在 Step 1a 不适用时**才使用——也就是你没有任何原生 worktree 工具。用 git 手动创建 worktree。

#### Directory Selection（目录选择）

遵循以下优先级。**用户的显式偏好永远高于观察到的文件系统状态。**

1. **检查你的指令中是否声明了 worktree 目录偏好。** 如果用户已经指定，直接使用，不再询问。

2. **检查是否存在项目本地的 worktree 目录：**
   ```bash
   ls -d .worktrees 2>/dev/null     # 首选（隐藏目录）
   ls -d worktrees 2>/dev/null      # 备选
   ```
   找到就用。如果两者都存在，`.worktrees` 胜出。

3. **检查是否存在全局目录：**
   ```bash
   project=$(basename "$(git rev-parse --show-toplevel)")
   ls -d ~/.config/superpowers/worktrees/$project 2>/dev/null
   ```
   找到就用（为了向后兼容旧的全局路径）。

4. **如果没有任何其他指引**，默认使用项目根目录下的 `.worktrees/`。

#### Safety Verification（安全检查，仅项目本地目录）

**创建 worktree 之前，必须验证该目录已被忽略：**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**如果没有被忽略：** 加进 `.gitignore`，提交这个改动，然后再继续。

**为什么这一步至关重要：** 防止把 worktree 的内容误提交进仓库。

全局目录（`~/.config/superpowers/worktrees/`）不需要校验。

#### Create the Worktree（创建 worktree）

```bash
project=$(basename "$(git rev-parse --show-toplevel)")

# 根据选定的位置确定路径
# 项目本地：path="$LOCATION/$BRANCH_NAME"
# 全局：   path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙箱退化：** 如果 `git worktree add` 因权限错误失败（沙箱拒绝），告诉用户沙箱阻止了 worktree 创建，你改为在当前目录工作。然后就地执行初始化和基线测试。

## Step 3: Project Setup（项目初始化）

自动检测并执行相应的初始化：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## Step 4: Verify Clean Baseline（验证干净的基线）

跑测试，确保工作区从干净状态开始：

```bash
# 使用项目相应的命令
npm test / cargo test / pytest / go test ./...
```

**如果测试失败：** 报告失败情况，询问是继续还是先调查。

**如果测试通过：** 报告就绪。

### Report（汇报）

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

> **批注**：Step 4 的存在理由是**建立一个参照点**。如果基线测试是绿的，那么此后出现的任何红色，责任都在新写的代码上——不需要再花时间判断"这本来就这样吗"。如果跳过这一步并直接开写，一个预先存在的失败会混进你的调试过程，让你怀疑自己刚写的每一行。

## Quick Reference

| 情况 | 动作 |
|------|------|
| 已在 linked worktree 中 | 跳过创建（Step 0） |
| 在 submodule 中 | 按普通仓库处理（Step 0 防护） |
| 有原生 worktree 工具 | 用它（Step 1a） |
| 无原生工具 | git worktree 退化方案（Step 1b） |
| `.worktrees/` 存在 | 用它（校验已被忽略） |
| `worktrees/` 存在 | 用它（校验已被忽略） |
| 两者都存在 | 用 `.worktrees/` |
| 两者都不存在 | 查指令文件，然后默认 `.worktrees/` |
| 全局路径存在 | 用它（向后兼容） |
| 目录未被忽略 | 加进 .gitignore 并提交 |
| 创建时权限错误 | 沙箱退化，就地工作 |
| 基线测试失败 | 报告失败并询问 |
| 没有 package.json/Cargo.toml | 跳过依赖安装 |

## Common Mistakes（常见错误）

### 和宿主环境对抗

- **问题：** 平台已经提供了隔离，却还用 `git worktree add`
- **修复：** Step 0 检测已存在的隔离。Step 1a 让位给原生工具。

### 跳过检测

- **问题：** 在已有的 worktree 里再套一个 worktree
- **修复：** 创建任何东西之前，永远先跑 Step 0

### 跳过忽略校验

- **问题：** worktree 内容被纳入版本跟踪，污染 git status
- **修复：** 创建项目本地 worktree 之前，永远先用 `git check-ignore`

### 假设目录位置

- **问题：** 造成不一致，违反项目约定
- **修复：** 遵循优先级：已存在 > 全局旧路径 > 指令文件 > 默认

### 带着失败的测试继续

- **问题：** 无法区分新 bug 和既存问题
- **修复：** 报告失败，取得明确许可再继续

## Red Flags

**绝不：**

- 在 Step 0 检测到已有隔离时创建 worktree
- 在有原生 worktree 工具（如 `EnterWorktree`）时使用 `git worktree add`。**这是头号错误——有就用它。**
- 跳过 Step 1a 直接跳到 Step 1b 的 git 命令
- 不校验是否被忽略就创建 worktree（项目本地）
- 跳过基线测试验证
- 测试失败还不问就继续

**永远：**

- 先跑 Step 0 检测
- 原生工具优先于 git 退化方案
- 遵循目录优先级：已存在 > 全局旧路径 > 指令文件 > 默认
- 项目本地的目录要校验已被忽略
- 自动检测并执行项目初始化
- 验证干净的测试基线

---

## 附属文件

本技能没有附属文件——只有一个 `SKILL.md`。所有逻辑（检测、创建、初始化、基线验证）都内联在同一条流程里。

> **批注**：值得留意原文的一个小瑕疵——**步骤编号从 Step 1 直接跳到 Step 3**，没有 Step 2。这看起来像是删掉某一步（很可能是"创建分支"被合并进了 1b）之后没有重编号。它不影响执行（每一步内部自洽），但它提示这份技能经历过结构变动。

---

## 相关

- [using-git-worktrees-详细设计讲解.md](./using-git-worktrees-详细设计讲解.md) —— 本文的设计分析：为什么"不要和宿主对抗"是纲领、何时会失效
- [writing-plans-中文版.md](./writing-plans-中文版.md) —— 它产出计划，本技能在计划执行前准备环境
- [subagent-driven-development-中文版.md](./subagent-driven-development-中文版.md) —— 它的前置要求之一就是隔离工作区
- [finishing-a-development-branch-中文版.md](./finishing-a-development-branch-中文版.md) —— 收尾时负责清理本技能创建的 worktree
- [技能原理深度讲解.md](./技能原理深度讲解.md) —— Superpowers 整体原理
