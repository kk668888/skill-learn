## ADDED Requirements

### Requirement: 将 RTK 作为可选择的离线命令行工具发行

离线发行流程 SHALL 收录固定版本、适配 Windows x64 的 RTK 官方发布物及其许可证文件，记录上游来源和可核验摘要。准备阶段 MUST 校验官方发布包摘要；制包与安装阶段 MUST 沿用现有完整性校验，缺失、篡改或平台不匹配时 MUST 在写入安装目标前失败。Claude Code 与 Codex 的安装向导及命令行模式 SHALL 均能选择 `rtk`，且 SHALL 支持只安装 `rtk`。

#### Scenario: 维护者准备 RTK 离线输入

- **WHEN** 维护者提供固定版本的官方 Windows x64 RTK 发布 ZIP
- **THEN** 准备流程核对上游摘要，保留可执行文件及许可证，并将内容纳入离线包的版本和文件校验清单

#### Scenario: 输入损坏或缺少许可证

- **WHEN** 官方 ZIP 摘要不符，或 ZIP 缺少可执行文件或许可证
- **THEN** 准备或制包失败，既有可下载的完整离线包不被替换

#### Scenario: 单独选择 RTK

- **WHEN** 使用者在 Windows x64 上为 Claude Code 或 Codex 选择 `rtk` 套件
- **THEN** 安装计划只包含 RTK，且不要求安装其他技能套件或调用在线包管理器

### Requirement: 安全安装 RTK 到当前用户环境

RTK 安装器 SHALL 将已验证的 `rtk.exe` 安装在当前 Windows 用户的固定目录，并使新启动的终端可通过用户级 PATH 找到该程序。`--dry-run` 和 `--status` SHALL 显示目标路径、PATH 变更及冲突而不写入。已安装同一包的内容时 SHALL 跳过重复复制与重复 PATH 条目；已有不同内容或目标路径被占用时 MUST 报告冲突且不得覆盖。安装过程 MUST NOT 自动执行 `rtk init`、启用 hook 或改写 Claude Code/Codex 配置。

#### Scenario: 首次安装

- **WHEN** 目标目录无冲突且用户确认安装 RTK
- **THEN** 安装器复制已校验的程序与许可证，更新用户级 PATH，并提示用户在新终端验证版本和按需手动启用 hook

#### Scenario: 重复安装

- **WHEN** 用户再次安装同一个离线包，且目标文件与 PATH 已匹配
- **THEN** 安装器报告跳过，不重复添加 PATH 条目，也不改写 hook 配置

#### Scenario: 目标存在不同来源的程序

- **WHEN** 固定安装位置已有与包内不同的 `rtk.exe` 或非预期文件
- **THEN** 安装器报告冲突，不覆盖已有内容，也不修改用户级 PATH

#### Scenario: 预览安装

- **WHEN** 使用者运行 `--bundle rtk --dry-run`
- **THEN** 显示当前用户的安装位置及预期 PATH 操作，且目标文件和用户环境均不改变
