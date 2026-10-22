## MODIFIED Requirements

### Requirement: ZIP 保留查看器文档并包含安装所需文件

下载生成的 ZIP SHALL 收录下载请求开始时查看器扫描范围内各子目录的所有普通 `.md` 文件，包括技能源码、技能文档、AI 文章和自建分组；项目根级的工程 Markdown SHALL NOT 进入 ZIP（根级文档仅在查看器目录树中浏览），但安装所需的双击入口 `安装.bat` SHALL 收录在 ZIP 根级。ZIP 还 SHALL 收录 `offline/install-skills.mjs`、`skills/` 下现有的普通源码文件，以及经校验的 `offline/kit/` 完整目录。离线目录 SHALL 包含本地插件市场所需的隐藏清单、运行依赖目录和目标平台二进制。每个文件 SHALL 仅出现一次，归档内路径 SHALL 等于该文件的项目根相对路径，文件内容 SHALL 与磁盘原始字节一致。除明确列入 `offline/kit/` 清单的文件和 `安装.bat` 外，其他目录中的非 Markdown 文件、隐藏项、`node_modules` 和符号链接 MUST NOT 进入 ZIP。缺少或损坏离线目录时，查看器 MUST 在发送 ZIP 前拒绝下载，不得返回看似完整的归档。

#### Scenario: 保留全部分组及目录结构

- **WHEN** 项目中同时存在技能文件、技能文档、AI 文章、自建分组文档和根级 Markdown
- **THEN** ZIP 中包含子目录资料的原有相对路径及原始内容，不包含根级 Markdown，且不加入额外的顶层目录

#### Scenario: 根级双击入口保留

- **WHEN** 项目根级存在安装入口 `安装.bat`
- **THEN** ZIP 在根级收录该文件，解压后可直接双击启动安装向导

#### Scenario: 下载可安装的完整技能

- **WHEN** 项目中有安装脚本、技能附属文件、预制插件、OpenSpec CLI 和 Impeccable 平台引擎
- **THEN** ZIP 保留 `offline/` 内脚本与 `kit/` 的同级关系，解压后安装脚本能从同包内容完成清单中支持的离线安装

#### Scenario: 容器服务下载

- **WHEN** 用户从生产容器中的查看器下载
- **THEN** ZIP 与本机服务遵守相同的资料与离线安装归档规则，并包含镜像中的安装脚本及完整离线目录

#### Scenario: 上传后再次下载

- **WHEN** 用户成功上传新的普通 Markdown 文档后再次下载
- **THEN** 新文件以其上传后的相对路径出现在 ZIP 中

#### Scenario: 排除无关文件

- **WHEN** 项目中存在未被查看器扫描的 Markdown、离线清单以外的隐藏文件、符号链接或无关文件
- **THEN** ZIP 不包含这些文件，且只有 `offline/kit/` 中经校验的必需文件可作为隐藏清单或依赖进入 ZIP

#### Scenario: 离线内容缺失或损坏

- **WHEN** 项目存在技能源码与安装脚本，但 `offline/kit/` 缺失、清单不完整或文件摘要不匹配
- **THEN** 下载被判定为失败，查看器不提供缺件的 ZIP
