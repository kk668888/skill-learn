## Why

现有离线发行包可以安装多套 AI 工作流，但缺少 RTK 命令行程序。内网用户无法使用上游推荐的 winget 或在线下载方式，需要可核验、可重复的本地安装流程。

## What Changes

- 将 RTK 官方 v1.1.0 Windows x64 发布物加入固定版本输入清单，校验上游 SHA-256 和包内逐文件摘要。
- 在 Claude Code 与 Codex 的离线安装向导和 `--bundle rtk` 命令行模式中提供 RTK。
- 将 `rtk.exe` 安装到当前 Windows 用户的固定目录，维护用户级 PATH；预览显示写入位置和冲突。
- 安装只提供可执行文件；是否运行 `rtk init` 并启用 hook 由用户自行决定。
- 更新离线制包、安装说明及相关验收测试。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `offline-skill-distribution`：扩展离线发行清单与安装器，支持 RTK 命令行程序的准备、校验、用户级安装及冲突处理。

## Impact

涉及 `offline/offline-inputs.json`、`offline/prepare-offline-inputs.mjs`、`offline/offline-kit.mjs`、`offline/offline-installer.mjs`、`README.md` 及离线测试。发布包增加约 6.8 MB 的官方 ZIP 源输入，制成的包内只携带所需可执行文件与许可证材料；首次发布需要在维护机重新准备输入并制包。
