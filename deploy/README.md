# Portainer 部署说明

本文说明如何把学习总览与 Markdown 技能文库构建为 Docker 镜像，并通过 Portainer Stack 在局域网中长期运行。部署完成后，局域网内的浏览器可以免登录阅读、搜索和上传文档。

- Stack 示例文件：[portainer-stack.yml](./portainer-stack.yml)
- 部署不提供账号密码：能访问所发布端口的局域网用户都可以读写文档，请只在受信任的局域网使用。

## 1. 准备宿主机目录与权限

容器以非 root 用户 `node`（uid/gid 均为 1000）运行，需要写入的只有两个普通文档目录，它们必须落在宿主机项目目录里，方便你用 Git 管理。

在宿主机的项目目录中确认或创建这两个目录：

```bash
cd /path/to/skill-learn        # 换成你的实际路径
mkdir -p docs/ai-docs docs/collections
```

再把它们的属主改为 uid 1000（容器运行用户）。如果你的宿主机登录用户本身就是 uid 1000（Linux 第一个普通用户通常是），这步通常已经满足：

```bash
sudo chown -R 1000:1000 docs/ai-docs docs/collections
```

注意两点：

- **不要搬迁已有文件。** `docs/ai-docs/` 里已有的 AI 文章会原样出现在查看器的“AI 文章”分组；`docs/collections/` 里每个子目录对应一个自建分组。
- 技能源码（`skills/`）、技能文档（`docs/skills/`）和根级 Markdown **不需要**挂载，它们随镜像只读提供。

## 2. 构建或提供镜像

**情况 A：Portainer 管理的就是这台机器的 Docker Engine（最常见）**

先按根目录 README 的步骤生成并校验 `offline/kit/`，再在项目根目录构建镜像。构建上下文是仓库根：

```bash
docker build -t skill-learn-viewer:latest .
```

构建完成后镜像就在本机 Engine 上，Portainer 的 Stack 可以直接引用 `skill-learn-viewer:latest`。

**情况 B：Portainer 管理另一台主机**

先把镜像送到那台主机，二选一：

- 推送到你自选的镜像仓库，然后在目标主机 `docker pull`；
- 或 `docker save skill-learn-viewer:latest -o viewer.tar` 拷贝过去，再 `docker load -i viewer.tar`。

## 3. 在 Portainer 中创建 Stack 并填写变量

1. Portainer → 目标环境 → **Stacks** → **+ Add stack**，名称如 `skill-learn-viewer`。
2. **Build method** 选 **Web editor**，把 `deploy/portainer-stack.yml` 的全部内容粘贴进去。
3. 展开 **Environment variables**，添加三个变量：

   | 变量 | 示例值 | 说明 |
   | ---- | ------ | ---- |
   | `VIEWER_IMAGE` | `skill-learn-viewer:latest` | 第 2 步得到的镜像名:标签 |
   | `VIEWER_HOST_DIR` | `/home/xx/skill-learn` | 宿主机项目绝对路径；Windows Docker Desktop 写 `C:/projects/skill-learn` 这类正斜杠路径 |
   | `VIEWER_PUBLIC_ORIGIN` | `http://192.168.1.20:5188` | 浏览器实际使用的局域网地址，协议、IP/主机名、端口都要与访问时输入的一致 |

4. **Deploy the stack**。任一变量缺失时 Stack 会拒绝启动并提示是哪个变量没填；容器启动时还会再校验 `VIEWER_PUBLIC_ORIGIN` 的格式，配置错误会在容器日志里给出明确原因后退出。

部署完成后等健康检查通过（约 15 秒启动期 + 首次检查），Container 状态应显示 **healthy**。

## 4. 访问与更新

**访问：** 在局域网任意设备浏览器打开 `http://<宿主机IP>:5188/`（或你改过的宿主机端口）进入学习总览；点“开始学习”进入 grill 快速入手，点“浏览技能文库”或直接打开 `/library/` 阅读、搜索、上传。上传的文档立即出现在对应分组并落盘到宿主机目录。

**更新两类内容的做法不同：**

| 内容 | 更新方式 |
| ---- | -------- |
| 普通文档（`docs/ai-docs/`、`docs/collections/`） | 直接编辑宿主机目录里的文件即可，无需动容器 |
| 技能源码、技能文档、根级 Markdown | 它们是镜像内的只读快照：改完源码后重新 `docker build`，再在 Stack 页面点 **Update the stack**（勾选 Re-pull image 不适用本地镜像时，直接重新 deploy 即可让容器用新镜像重建） |

注意：镜像里也打包了一份 `docs/ai-docs/` 快照，但运行时被宿主机绑定挂载遮住，**宿主机目录才是权威内容**。

## 5. 回滚

- 回滚程序：把 `VIEWER_IMAGE` 改回旧镜像标签（或重新构建旧版本代码），重新 Deploy the stack 即可。
- 彻底下线：Stack 页面 **Stop this stack** 或删除 Stack。
- 两种操作都**不会**删除宿主机上的 `docs/ai-docs/` 与 `docs/collections/`，上传的文档始终以普通文件形式留在项目目录，Git 暂存与提交由你在宿主机自行完成——容器内没有 Git，上传也不会执行任何 Git 操作。

## 6. 免登录局域网访问范围

- 本次部署**没有账号、密码或登录界面**，Portainer 自身的登录也保护不了查看器端口：只要设备能访问 `<宿主机IP>:5188`，就能读、搜、传。
- Origin 校验只用于拦截“其他网页跨站提交上传”，不是身份认证：懂技术的局域网用户用脚本自行带上该 Origin 头也能写入。真正的边界是“受信任的局域网”本身。
- **不要**把该端口映射到公网或做端口转发；流量为 HTTP 明文。将来需要访问控制或 HTTPS 时，应另立变更（例如挂在受信任的反向代理之后）。
