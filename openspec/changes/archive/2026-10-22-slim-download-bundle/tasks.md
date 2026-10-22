# 任务：下载 ZIP 瘦身

## 1. 实现

- [x] 1.1 `viewer/server/download.ts`：`scanPaths` 并集前过滤根级条目（`p.includes('/')`），注释说明根级工程文档只浏览不进包
- [x] 1.2 `viewer/server/scanner.ts`：修正第 36-37 行注释（清单仍服务目录；下载侧自行过滤根级文档）

## 2. 测试

- [x] 2.1 `download.spec.ts`：期望清单移除 `README.md`；新增用例「根级工程文档不进下载包、双击入口保留」
- [x] 2.2 取消下载测试的 16MB 大文件从根级迁至 `docs/ai-docs/`，断言行为不变
- [x] 2.3 viewer 全量测试通过；`openspec validate slim-download-bundle` 通过

## 3. 收尾

- [x] 3.1 归档 change（规格 delta 合入 markdown-bulk-download），中文提交说明，secret 扫描
