## 1. 锁定上游发行物

- [x] 1.1 为 RTK 准备流程编写失败测试：错误 SHA-256、缺少 `rtk.exe` 或许可证时拒绝输入，且不替换既有目录。
- [x] 1.2 在 `offline/prepare-offline-inputs.mjs` 增加 `--rtk-archive`，校验官方 v1.1.0 Windows x64 ZIP 的固定摘要并解压程序与两份许可证。
- [x] 1.3 在 `offline/offline-inputs.json` 为 Claude Code 和 Codex 目标加入共享 `rtk` 套件，锁定版本、来源、许可证、输入树摘要和必需文件。

## 2. 离线安装

- [x] 2.1 编写 RTK 安装测试，覆盖仅选择 RTK、预览无写入、首次安装、同内容重试、不同内容冲突及 PATH 去重。
- [x] 2.2 扩展清单校验以识别独立程序安装方式，并在安装器的 `--list`、帮助和交互选择中加入 `rtk`。
- [x] 2.3 实现当前用户固定目录安装与用户级 PATH 登记；安装前检查其他来源的命令和目标目录冲突，且不执行 `rtk init`。
- [x] 2.4 验证 PATH 写入失败后的可重试状态，确保安装结果准确报告已完成、失败和未执行项。

## 3. 发行与验收

- [x] 3.1 更新 `README.md` 的外网准备命令、套件范围、用户级 RTK 安装位置与手动启用 hook 说明。
- [x] 3.2 在维护环境用官方 ZIP 重建未入 Git 的输入和离线包，运行完整性校验与离线安装测试。
- [x] 3.3 运行 `openspec validate add-rtk-offline-installer --strict`，核对变更与实际实现一致。
