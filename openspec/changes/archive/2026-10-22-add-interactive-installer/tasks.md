# 任务：离线安装器交互式向导

## 1. 向导核心

- [x] 1.1 在 `offline/offline-installer.mjs` 新增可注入的 `prompt(question, default)`（readline/promises 实现为默认注入项）与 `isInteractive()`（argv 为空且 stdin.isTTY）入口分支；非 TTY 无参数时打印 usage 并以非零退出码结束
- [x] 1.2 实现向导提问序列：目标工具（1/2）→ 安装范围（1/2，仅 Claude）→ 套件编号多选（回车=全部，`1,3,5`=部分，非法输入重问）→ 项目目录（默认当前目录）→ Codex 时 host-bin 路径（可留空自动查找），构造与 parseArgs 同构的 options 对象
- [x] 1.3 接入现有管线：向导选项走同一套 kit 校验、plans 计算与计划打印；计划后 `(y/N)` 确认门，默认 N 时干净退出不写入

## 2. 测试（TDD，先于实现）

- [x] 2.1 写失败测试：假 prompt 序列驱动向导全流程（默认全选、部分编号选择、确认 y、默认 N 放弃），断言 options 构造与不写入
- [x] 2.2 写失败测试：非 TTY 无参数 → usage + 非零退出；带参数 → 走 flag 模式行为不变（现有用例回归即证据）
- [x] 2.3 跑 `node --test tests/install-skills.test.mjs` 至全部通过，确认现有 flag 模式用例零回归

## 3. 双击入口

- [x] 3.1 新增 `安装.bat`（chcp 65001 → node 版本检查中文报错 → 调用 offline/install-skills.mjs → pause），验证双击路径与中文输出

## 4. 文档与收尾

- [x] 4.1 更新 `offline/offline-installer.mjs` usage 文案（向导入口说明）与 README「内网安装」章节（向导用法 + bat 双击 + SmartScreen 解锁注记）
- [x] 4.2 更新 CLAUDE.md / AGENTS.md 的 `offline/` 行说明（提及向导入口）
- [x] 4.3 本地全量验证：根测试 + viewer 测试 + `openspec validate add-interactive-installer`；提交前 secret 扫描
