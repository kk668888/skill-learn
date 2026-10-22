# 提案：为离线安装器增加交互式向导

## Why

当前安装器是纯 flag 驱动：内网用户必须一次记全 `--tool`、`--scope`、`--bundle`、`--project`、`--host-bin` 五个参数的名字与语义才能开始安装，上手门槛高、易敲错。安装决策（装什么、装到哪）本应在安装时逐步询问，而不是要求用户预先全部记熟。同时现有命令行一把梭的模式缺少「确认再动手」的停点。

## What Changes

- 安装器新增**交互式向导入口**：不带参数且终端可交互（TTY）时启动，逐步询问目标工具 → 安装范围 → 套件多选（回车=全部，输编号=部分）→ 项目目录 →（Codex 时）host-bin 路径，最后展示安装计划并要求确认（默认 N，直接回车不动手）
- 向导复用现有 dry-run 的计划输出作为确认页；确认后才进入现有执行流程
- 带任意参数时**保持现有 flag 行为完全不变**（自动化与测试路径）；无参数且 stdin 非 TTY 时打印 usage 提示，不猜测
- 包内新增 `安装.bat`（Windows 双击入口）：检查 Node 版本后调用向导，设置 `chcp 65001` 保证中文输出
- 向导全程零依赖：仅用 Node 内置 `node:readline/promises`，菜单为「输数字 + 回车」形式，兼容 Windows conhost

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `offline-skill-distribution`：安装流程需求新增交互式向导入口——无参数 TTY 启动向导、确认门（默认放弃）、TTY 检测兜底、`安装.bat` 双击入口；现有 flag 模式作为自动化路径原样保留

## Impact

- `offline/offline-installer.mjs`：`installOffline` 入口分支 + 新增向导选项收集模块（readline 提问），计划展示与执行循环复用
- `offline/install-skills.mjs`：无变化（透传 argv）
- 新增 `安装.bat`（打包进入 `offline/`，随 ZIP 分发）
- 测试：`tests/install-skills.test.mjs` 增加向导分支用例（模拟 TTY stdin）与 flag 模式回归；`--help`/usage 文案更新
- 文档：README「内网安装」章节、CLAUDE.md / AGENTS.md offline/ 行说明更新
- 无新增 npm 依赖；ZIP 包内容多一个 bat 文件
