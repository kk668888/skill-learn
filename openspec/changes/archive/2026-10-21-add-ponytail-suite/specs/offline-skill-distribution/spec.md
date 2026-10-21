# offline-skill-distribution 变更规格

## MODIFIED Requirements

### Requirement: 为单一下载包预制可核验的离线内容

制包流程 SHALL 为明确列出的目标工具、操作系统和架构预制离线内容，并使这些内容随现有 `skill-learn-bundle.zip` 一同分发。ZIP 内 SHALL 包含所选套件实际安装及首次使用所需的完整本地文件、固定版本与来源信息、适用平台信息以及每个文件的校验值；插件条目 MUST 指向解压后的本地路径。缺少必需文件或依赖时，制包 MUST 失败，查看器 MUST NOT 提供看似可安装的不完整 ZIP。收录清单新增或移除套件时，SHALL 以清单为准驱动制包与下载，不依赖固定计数。

#### Scenario: 制作六套技能包

- **WHEN** 维护者为发布目标选择收录清单中的全部技能套件、目标工具及受支持平台进行制包
- **THEN** 预制内容列明每套的版本、来源、安装方式与校验信息，并随同一个资料 ZIP 收录对应插件、CLI 依赖或平台引擎

#### Scenario: 上游内容不完整

- **WHEN** 某套缺少 hook、插件清单、CLI 依赖或目标平台引擎等必需内容
- **THEN** 制包失败并指出缺失的套件和文件，不产出可供查看器下载的安装内容

### Requirement: 按套件执行适合的离线安装流程

安装入口 SHALL 保留插件与独立技能、项目生成物之间的安装边界。Superpowers、grill、frontend-design-premium 与 ponytail SHALL 从本地完整插件包安装；OpenSpec SHALL 使用包内 CLI 在指定项目初始化或更新；Impeccable SHALL 使用包内适配平台的引擎安装技能及项目 hook；单独的 skill-creator SHALL 能从完整本地技能目录安装。安装结果 SHALL 标明哪些套件成功、跳过或失败。

#### Scenario: 安装本地插件

- **WHEN** 使用者选择受支持的插件套件（含 ponytail）且本地插件包完整
- **THEN** 对应工具从本地插件市场安装技能及其随附组件，不通过只复制 `SKILL.md` 代替插件安装

#### Scenario: 初始化 OpenSpec 项目

- **WHEN** 使用者为尚未初始化的项目选择 OpenSpec
- **THEN** 包内 CLI 在该项目生成与所选工具匹配的技能和命令，而不把这些生成物默认写入全局技能目录

#### Scenario: 更新已有 OpenSpec 项目

- **WHEN** 使用者为已有 OpenSpec 配置的项目选择更新
- **THEN** 包内 CLI 在该项目更新生成物，并保留项目自己的配置

#### Scenario: 安装 Impeccable

- **WHEN** 使用者选择 Impeccable 且包内存在匹配平台的引擎
- **THEN** 技能和适用的项目 hook 安装完成，首次调用不触发引擎下载
