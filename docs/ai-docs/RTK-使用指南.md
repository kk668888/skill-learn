# RTK 1.1.0 使用指南（Windows 离线版）

本文针对本项目离线包内的 **RTK 1.1.0 / Windows x64**。RTK（Rust Token Killer）在命令输出进入 AI 助手上下文前压缩冗余信息，例如把测试成功项折叠为计数、精简 `git` 输出。它统计的是**命令输出**的估算 token 节省量，不能直接当作整个会话或账单的节省比例。

本项目只发行 `rtk.exe` 和两份许可证文件，**不含独立的 RTK Proxy**。离线安装器也不会自动运行 `rtk init` 或改动 Claude Code、Codex 的 hook。可以先手动调用 RTK，确定适合自己的命令后，再决定是否开启自动重写。

## 1. 从离线包装好 RTK

先把查看器下载的 `skill-learn-bundle.zip` 完整解压，在解压目录打开 PowerShell。需要 Windows x64 和 Node.js 20.19 或更高版本。下面以 Codex 为例；使用 Claude Code 时，把 `codex` 改为 `claude`：

```powershell
node offline/install-skills.mjs --list
node offline/install-skills.mjs --tool codex --bundle rtk --dry-run
node offline/install-skills.mjs --tool codex --bundle rtk
```

第二行只预览目标目录、PATH 变更及可能的冲突；确认计划后才运行第三行。也可以双击包根目录的 `安装.bat`，在向导中只选择 `rtk` 并确认安装。RTK 始终安装到当前用户的 `%LOCALAPPDATA%\Programs\rtk`，并加入**用户级 PATH**；安装器的 `--scope project|user` 不改变这个位置。已有其他来源的 RTK 或目标目录内容不一致时，安装器会报告冲突，不会覆盖。

安装后**打开新的终端**，运行：

```powershell
rtk --version
```

本离线包预期显示 `rtk 1.1.0`。此时程序已可手动使用，但 AI 助手尚未自动改写命令。

## 2. 先手动使用

在项目目录里运行以下只读命令，观察压缩后的输出：

```powershell
rtk git status
rtk git log -n 5
rtk read --head-lines 20 README.md
rtk gain --text
```

`rtk git status`、`rtk git log` 会给出紧凑的仓库状态和提交记录；`rtk read` 在这里仅读取文件前 20 行；`rtk gain --text` 显示已有的命令输出节省统计。统计刚开始可能没有记录。其他支持的命令可用 `rtk --help` 查看，具体选项用 `rtk <子命令> --help` 查看。RTK 也能包装测试命令，例如 `rtk test <测试程序> <参数>`；它会实际执行测试，只是把结果中的成功项压缩，因此先确认原命令本身安全。

过滤后的输出若省略了你正在排查的细节，可以用 `rtk bypass <命令> <参数>` 执行一次不压缩的命令，例如：

```powershell
rtk bypass git status --short
```

若输出里提供了恢复用的哈希，也可查看 `rtk recall --help`，按哈希取回被省略的内容。需要逐字核对原始输出时，直接运行原命令即可。

## 3. 按需启用 AI 助手自动重写

只有你希望 Claude Code 或 Codex 的**终端命令**自动经过 RTK 时才做这一步。先预览，不要把安装程序成功误认为 hook 已启用：

| 目标 | 预览命令 | 确认后执行 |
| --- | --- | --- |
| Claude Code（当前用户） | `rtk init --global --dry-run` | `rtk init --global` |
| Codex（当前用户） | `rtk init --global --codex --dry-run` | `rtk init --global --codex` |

预览会列出准备创建或修改的配置文件，并明确显示 `Nothing written`。RTK 1.1.0 在当前环境中，Claude Code 的用户级预览涉及 `~/.claude/CLAUDE.md`、`settings.json` 和 RTK 配置；Codex 的用户级预览涉及 `~/.codex/AGENTS.md`、`RTK.md` 和 `hooks.json`。实际改动以**你自己机器上的预览结果**为准，确认后再执行右列命令并重启对应助手。

如果想只在某个项目启用，可在该项目目录运行 `rtk init --dry-run`（Claude Code）或 `rtk init --codex --dry-run`（Codex），再决定是否去掉 `--dry-run`。项目级初始化可能改动 `CLAUDE.md`、`AGENTS.md` 等项目规则；在本仓库尤其要先检查预览，避免未经审查地改写现有规范。自动重写只作用于目标工具支持的 shell 命令调用；助手内置的读文件、搜索等工具不一定经过这个 hook。

重启助手后，可让它运行一次 `git status`，再用 `rtk gain --history` 查看 RTK 是否处理过命令。若没有记录，先用上节的手动命令确认程序正常，再检查 `rtk init` 的预览和目标工具是否实际加载了 hook。

## 4. 常见问题

| 现象 | 检查办法 |
| --- | --- |
| `rtk` 命令找不到 | 打开新终端；运行 `Get-Command rtk -All`，检查 `%LOCALAPPDATA%\Programs\rtk` 是否在用户 PATH 中。 |
| 版本不是 1.1.0 | `Get-Command rtk -All` 查看是否有另一份 `rtk.exe` 排在前面；安装器不会覆盖其他来源。 |
| 能手动运行，但 AI 输出没变化 | 离线安装只装程序。先运行对应的 `rtk init ... --dry-run`，确认并执行初始化，然后重启助手。 |
| 压缩后缺少排错细节 | 对该命令使用 `rtk bypass`，或按输出中的恢复提示使用 `rtk recall`；必要时直接运行原命令。 |

## 资料来源

- 本项目的 `offline/offline-inputs.json`、`offline/rtk-install.mjs` 和 `README.md`：离线版本、安装位置及 hook 策略。
- [RTK v1.1.0 发布版本说明](https://github.com/rtk-ai/rtk/blob/v1.1.0/README.md) 与本离线包 `rtk.exe --help`：命令及 `init` 选项。上游中文 README 的版本示例可能滞后，本篇以实际打包的 1.1.0 程序为准。
