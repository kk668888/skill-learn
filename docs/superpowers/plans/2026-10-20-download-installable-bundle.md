# 完整技能下载包实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让查看器下载一个同时包含可浏览文档、完整技能源码和可选安装脚本的 ZIP。

**Architecture:** 保留现有 HTTP 下载接口及 ZIP 流式写入；新增专门枚举技能源码树的清单函数，再与原有 Markdown 清单合并。继续用现有文件句柄校验读取全部条目。Docker 镜像补入脚本，前端准确展示下载范围。

**Tech Stack:** TypeScript、Express、yazl、Vitest、React、Node.js 安装脚本。

---

## 文件职责

- `viewer/server/archive-inventory.ts`：只负责列出安装脚本与 `skills/` 下可归档的普通文件，并阻止含技能但缺脚本的包。
- `viewer/server/download.ts`：合并两份清单、去重并沿用流式安全归档。
- `viewer/tests/download.spec.ts`：通过 HTTP 解包检查路径、字节、安全排除项和错误响应。
- `viewer/tests/download-real.spec.ts`：下载真实项目并在临时目录运行安装脚本的 `--list`。
- `viewer/src/components/SidebarMenu.tsx`、`viewer/src/api/client.ts` 及相关测试：更新按钮文案和 ZIP 文件名。
- `Dockerfile`：复制根级安装脚本进入运行镜像。
- `openspec/specs/markdown-bulk-download/spec.md`：改写下载包的行为契约。

## Task 1：固定完整 ZIP 的可观察内容

- [ ] 在 `viewer/tests/download.spec.ts` 的临时项目中写入 `install-skills.mjs`、`skills/demo/scripts/run.js`、`skills/demo/commands/example.md`，并写入隐藏文件、`node_modules` 文件及项目其他位置的 `.js`。
- [ ] 将首个 HTTP 测试的 ZIP 清单断言扩展为脚本、技能附属文件、命令与既有 Markdown；逐一比较原始字节。增加有技能但脚本缺失时返回 JSON 错误的测试，以及附属文件变为符号链接时不读取外部内容的测试。
- [ ] 运行 `npm test -- tests/download.spec.ts`，确认新测试因缺少安装文件而失败。

## Task 2：实现受限的技能源码清单

- [ ] 在 `viewer/server/archive-inventory.ts` 递归枚举 `skills/` 的普通文件，跳过点开头文件或目录、`node_modules` 和符号链接；路径统一为 `/` 分隔的项目相对路径并排序。
- [ ] 当枚举到技能文件时，要求根级 `install-skills.mjs` 是普通文件；无技能文件的空项目继续返回空清单。安装脚本只作为 ZIP 条目，不在服务端执行。
- [ ] 在 `viewer/server/download.ts` 用 `Set` 合并 `scanProject(root)` 和新清单并排序，再调用原有预检、按需读取与取消处理；响应文件名改为 `skill-learn-bundle.zip`。
- [ ] 运行 `npm test -- tests/download.spec.ts`，修正实现直到定向测试通过。

## Task 3：确认解压后确实能发现全部技能

- [ ] 在 `viewer/tests/download-real.spec.ts` 以真实项目根下载 ZIP，将条目写入临时目录，用 `execFileSync(process.execPath, ['install-skills.mjs', '--list'])` 执行解压副本。
- [ ] 断言输出包含六个套件，以及至少一个非 Markdown 附属文件；测试结束删除临时目录，不运行实际安装。
- [ ] 运行 `npm test -- tests/download-real.spec.ts` 并确认通过。

## Task 4：更新界面、容器和规格

- [ ] 先修改 `viewer/tests/download-control.spec.tsx` 与 `viewer/tests/download-client.spec.ts`，断言按钮显示“下载完整资料与技能包”，浏览器保存 `skill-learn-bundle.zip`；运行定向测试并确认旧实现失败。
- [ ] 修改 `viewer/src/components/SidebarMenu.tsx` 与 `viewer/src/api/client.ts`，使文案和文件名通过定向测试；更新 `viewer/server/api.ts` 与下载相关注释，避免继续描述为仅下载 Markdown。
- [ ] 在 `Dockerfile` 的 `/app` 工作目录复制 `install-skills.mjs`；核对脚本与已复制的 `skills/` 同级。
- [ ] 修改 `openspec/specs/markdown-bulk-download/spec.md`：说明完整包内容、安装仍由用户选择、排除规则和容器一致性，保留原有失败与只读要求。

## Task 5：整体验证与提交

- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build`、`openspec validate --specs` 和 `git diff --check`，逐项核对退出码与失败数量。
- [ ] 核对暂存文件不包含用户未跟踪的 `docs/ai-docs/todo.md`，再用中文提交说明提交本次实现、测试、规格与计划。
