# markdown-bulk-download Specification

## Purpose

定义查看器一次下载全部可浏览 Markdown 的用户行为，使用户能获得保留项目相对目录结构和原始内容的 ZIP 副本，并能识别下载失败。

## Requirements

### Requirement: 提供全部 Markdown 下载入口

查看器 SHALL 提供清晰可见的“下载全部 Markdown”操作。用户触发后，浏览器 SHALL 下载一个 `.zip` 文件；该操作 MUST 不受当前文档、目录过滤词或全文搜索状态影响。在本机开发服务和生产服务中，下载行为 SHALL 一致。

#### Scenario: 从目录页下载

- **WHEN** 用户在查看器打开目录页并点击“下载全部 Markdown”
- **THEN** 浏览器开始下载一个 ZIP 文件

#### Scenario: 搜索或过滤后下载

- **WHEN** 用户已过滤目录或查看全文搜索结果，再点击“下载全部 Markdown”
- **THEN** 下载范围仍是查看器全部可浏览 Markdown，而非当前显示的结果子集

### Requirement: ZIP 内容与查看器目录一致

下载生成的 ZIP SHALL 收录下载请求开始时查看器扫描范围内的所有普通 `.md` 文件，包括技能源码、技能文档、AI 文章、自建分组和项目根级文档。每个文件 SHALL 仅出现一次，归档内路径 SHALL 等于该文件的项目根相对路径，文件内容 SHALL 与磁盘原始字节一致。扫描范围外的文件、隐藏文件和非 `.md` 文件 MUST NOT 进入 ZIP。

#### Scenario: 保留全部分组及目录结构

- **WHEN** 项目中同时存在技能文件、技能文档、AI 文章、自建分组文档和根级 Markdown
- **THEN** ZIP 中分别包含其原有相对路径及原始内容，且不加入额外的顶层目录

#### Scenario: 上传后再次下载

- **WHEN** 用户成功上传新的普通 Markdown 文档后再次下载
- **THEN** 新文件以其上传后的相对路径出现在 ZIP 中

#### Scenario: 排除非查看器文件

- **WHEN** 项目中存在未被查看器扫描的 Markdown、隐藏文件或其他格式文件
- **THEN** ZIP 不包含这些文件

### Requirement: 下载失败可识别且不改动项目

下载 SHALL 是只读操作，MUST NOT 修改项目文档或执行 Git 暂存、提交。扫描或读取失败时，查看器 SHALL 显示下载失败信息，MUST NOT 将不完整的 ZIP 作为成功下载反馈。

#### Scenario: 文件读取失败

- **WHEN** 生成归档期间有应收录文件无法读取
- **THEN** 下载被判定为失败，界面提示用户重试或检查项目文件，不显示下载成功

#### Scenario: 下载不修改项目

- **WHEN** 用户完成一次全部 Markdown 下载
- **THEN** 项目文件内容及 Git 暂存、提交状态均未因下载改变
