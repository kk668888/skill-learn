## Why

查看器目前只通过 Vite 开发服务运行，无法作为独立镜像交给 Portainer 长期运行。用户希望从局域网 IP 访问查看器，并让上传的普通 Markdown 文档留在 Docker 宿主机的项目目录中，以便容器重建后继续阅读和由宿主机 Git 管理。

## What Changes

- 增加可构建的 Docker 镜像：运行构建后的页面和同源 API，不依赖容器内的 Vite 开发服务。
- 提供适用于 Portainer Stack 的部署配置与中文操作说明；容器监听网络接口，外部访问地址可配置为局域网 IP 与端口。
- 将 `docs/ai-docs/` 和 `docs/collections/` 挂载到宿主机目录，保持现有文件路径与普通文档分组结构；技能源码、技能文档和根级 Markdown 随镜像提供。
- 调整上传接口的来源校验，使配置的局域网地址可上传，同时仍拒绝不匹配的网页来源；保留本机开发模式。
- 本次部署不提供账号密码或登录界面。能访问所发布端口的局域网用户可以阅读与上传；不包含镜像自动发布、HTTPS 网关或公网部署。

## Capabilities

### New Capabilities

- `containerized-viewer-deployment`：镜像构建、Portainer Stack 启动、局域网访问、同源页面与 API、宿主机文档挂载及部署配置的用户行为。

### Modified Capabilities

- `markdown-document-upload`：扩展“本地项目文件持久化”要求，明确容器重建后通过宿主机挂载保留上传文件，并仍由宿主机自行管理 Git。

## Impact

- 查看器运行方式：增加生产构建和服务入口，同时保留现有 `npm run dev`。
- 上传 API：将当前仅允许 `localhost` 的来源与 Host 校验扩展为显式配置的局域网访问地址。
- 仓库交付文件：Dockerfile、构建上下文排除规则、Portainer Stack 示例及部署说明。
- 文档存储：镜像中的只读项目资料与宿主机挂载的两个可写普通文档目录共用现有项目根相对路径。
