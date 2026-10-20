## Purpose

定义查看器作为 Docker 镜像在 Portainer 中运行时的可观察行为：局域网浏览器能访问完整阅读与上传功能，普通文档通过宿主机目录挂载持久保存，而技能资料随镜像稳定提供。

## ADDED Requirements

### Requirement: 独立镜像运行查看器

项目 SHALL 能构建可独立启动的查看器 Docker 镜像。运行中的容器 SHALL 提供构建后的页面及同源的目录、文档、搜索和上传 API，不依赖 Vite 开发服务；原有本机开发方式 SHALL 保持可用。

#### Scenario: 在 Portainer 启动镜像

- **WHEN** 用户以项目提供的部署配置在 Portainer 中启动镜像
- **THEN** 浏览器打开配置的局域网 IP 和端口后能读取首页、技能资料与普通文档，并能使用搜索和上传

#### Scenario: 保留本机开发方式

- **WHEN** 开发人员在源码仓库运行原有的查看器开发命令
- **THEN** 页面和现有 API 继续正常工作，无需先构建 Docker 镜像

### Requirement: 配置局域网访问来源

容器部署 SHALL 允许设置查看器对外使用的局域网 HTTP 地址。来自该地址的页面 SHALL 能调用上传 API；与配置地址不匹配的网页来源 MUST 被拒绝写入。此部署模式 SHALL 不要求账号、密码或登录。

#### Scenario: 从配置的局域网地址上传

- **WHEN** 用户通过配置的局域网 IP 和端口访问查看器并上传有效 Markdown 文件
- **THEN** 上传成功，且新文档立即可阅读

#### Scenario: 其他网页向上传接口提交文件

- **WHEN** 请求声明的网页来源与配置的对外地址不一致
- **THEN** 上传请求被拒绝，普通文档目录不产生新文件

#### Scenario: 免登录访问

- **WHEN** 局域网用户首次打开已发布的查看器地址
- **THEN** 查看器直接提供阅读和上传功能，不要求输入账号或密码

### Requirement: 宿主机普通文档目录挂载

Portainer 部署配置 SHALL 使 `docs/ai-docs/` 与 `docs/collections/` 对应宿主机可写目录。容器 SHALL 从这些目录读取已有 Markdown，上传时沿用原有项目根相对路径；技能源码、技能文档和根级 Markdown SHALL 可从镜像读取。

#### Scenario: 读取宿主机已有文档

- **WHEN** 宿主机的挂载目录中已有普通 Markdown 文档且容器启动
- **THEN** 文档出现在原有普通文档分组，并可通过路径读取和搜索

#### Scenario: 上传到宿主机目录

- **WHEN** 容器内用户向“AI 文章”或自建分组上传文档
- **THEN** 宿主机对应的 `docs/ai-docs/` 或 `docs/collections/<分组名>/` 出现同内容文件
