# 设计：下载 ZIP 瘦身

## Context

ZIP 条目目前来自三份清单的并集：`scanPaths`（浏览扫描，含根级 md）+ `installable`（skills 源码 + 安装脚本 + 安装.bat）+ `offline`（kit 校验文件）。根级工程文档只经 `scanPaths` 进入 ZIP，因此在并集前对 `scanPaths` 一侧过滤即可，安装清单与离线清单不受影响。

## Decisions

### 决策一：在 download.ts 的并集处过滤，不改扫描器

`scanPaths(root).filter((p) => p.includes('/'))`——子目录路径必含 `/`，根级条目必不含。扫描器继续返回根级 md（浏览目录树需要它们），两个消费方各取所需。备选：给扫描器加选项参数。否决：多一个参数就多一处调用方要改，而过滤语义属于「下载包要什么」，归下载侧。

### 决策二：安装.bat 的例外由既有清单自然保证

`安装.bat` 经 `scanInstallableFiles`（安装清单）进入 ZIP，不经过 Markdown 扫描，过滤天然不影响它。不需要新增白名单逻辑。

## Risks / Trade-offs

- [内网用户拿不到 ZIP 内的 README 安装说明] → 双击 `安装.bat` 即向导，自解释；README 仍在内网 viewer 首页可读
- [16MB 取消下载测试依赖根级大文件] → 大文件迁到 `docs/ai-docs/`，测试语义不变（仍是「传输中取消」）
- [浏览与下载口径分叉] → 有意为之：浏览=全部资料，下载=资料子集+安装内容；规格场景已分别描述
