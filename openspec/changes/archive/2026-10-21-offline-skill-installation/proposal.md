## Why

现有 `install-skills.mjs` 把六套技能统一复制到 Claude Code 技能目录，无法还原插件的 hook、依赖及项目初始化流程。使用者需要在完全无法访问外网的内网机器上安装和使用这些技能，因此安装所需内容必须在外网预先备齐，并在内网完成零下载安装。

## What Changes

- 增加外网制包流程，预制固定版本的完整插件、本地市场清单、OpenSpec CLI 及其依赖、Impeccable 目标平台引擎、单技能源码和文件校验清单，并把产物收入现有 `skill-learn-bundle.zip`。
- **BREAKING**：将 `install-skills.mjs` 从默认打平复制全部套件改为基于同包离线内容、明确目标工具的安装入口；保留 `--list`，旧版复制行为不再作为默认安装路径。
- 提供预览、状态检查及明确的缺件报错；内网安装与首次使用不得尝试连接外网，也不自动删除历史安装。
- **BREAKING**：现有查看器下载入口继续提供一个 ZIP，但其内容扩充为完整资料与离线安装包；构建、容器部署和下载前检查都必须保证离线 payload 齐备，否则拒绝下载。

## Capabilities

### New Capabilities

- `offline-skill-distribution`: 定义六套技能的离线制包、完整性校验、按工具安装及断网验收行为。

### Modified Capabilities

- `markdown-bulk-download`: 扩充现有 ZIP 的内容与失败条件，使一次下载同时取得资料、完整插件和离线运行依赖。

## Impact

- 影响根目录安装脚本、离线制包程序及其测试、目标工具的本地插件市场清单与安装说明。
- 影响查看器归档清单、下载测试、Docker 构建与 `markdown-bulk-download` 规格；现有 ZIP 将变大，并受离线 payload 完整性约束。
- 单一 ZIP 列明其支持的目标操作系统、架构及 Claude Code／Codex 组合；宿主工具与 Node 运行时属于明确的离线预装前提，不在安装过程中下载。
