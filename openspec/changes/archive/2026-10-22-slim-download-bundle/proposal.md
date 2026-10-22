# 提案：下载 ZIP 瘦身——根级工程文档不进包

## Why

部署镜像现在完整携带仓库根目录文件（安装.bat、Dockerfile、CLAUDE.md 等）。查看器下载 ZIP 沿用「全部可浏览 Markdown」口径，会把 README、CLAUDE、AGENTS 等根级工程文档一并打进内网用户下载的离线包。这些文档是项目工程资料，对内网最终用户是噪音；下载包只需要「可阅读资料 + 安装所需」。

## What Changes

- 下载 ZIP 不再收录项目根级 Markdown（README、CLAUDE、AGENTS、CONTEXT、DESIGN 等）；它们仍在查看器目录树中可浏览
- 安装所需的双击入口 `安装.bat` 保持收录（根级文件中的唯一例外，来自安装清单而非 Markdown 扫描）
- `skills/`、`docs/` 子目录资料、`offline/` 安装内容的收录口径完全不变

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `markdown-bulk-download`：ZIP 收录范围从「含项目根级文档」收窄为「仅子目录资料」；新增根级文档排除与双击入口保留两个场景

## Impact

- `viewer/server/download.ts`：扫描清单过滤根级条目（无 `/` 的相对路径）
- `viewer/server/scanner.ts`：仅注释修正（扫描器本身不变，浏览范围不变）
- 测试：`download.spec.ts` 期望清单、取消下载测试的大文件位置、新增排除场景用例
