# add-ponytail-suite 任务

## 1. 输入锁定

- [x] 1.1 下载 DietrichGebert/ponytail v5.3.2 tarball 并解压到独立目录；核对 `.claude-plugin/plugin.json` 与 `.codex-plugin/plugin.json` 的 name/version 均为 `ponytail@5.3.2`
- [x] 1.2 把解压树（tarball 无 .git，整树）复制为 `offline-inputs/claude/ponytail` 与 `offline-inputs/codex/ponytail`
- [x] 1.3 用 `fingerprintTree` 计算全树指纹，在 `offline-inputs.json` 新增 `ponytail-claude` / `ponytail-codex` 两个 bundle 条目（method plugin、version 5.3.2、source 指向 release tag、license MIT、required 覆盖双 manifest、LICENSE 与主技能 SKILL.md），并把 targets 的 bundles 列表各加 `ponytail-claude` / `ponytail-codex`
- [x] 1.4 静态核查插件 hooks 与技能文本：无运行时下载出口，webhook 默认空值仅本地写盘；把结论与未检查项记入变更目录

## 2. 测试先行

- [x] 2.1 `tests/install-skills.test.mjs` 新增用例：`--list` 与 `--bundle ponytail` 在合成 kit 上按插件方式解析；先跑 RED
- [x] 2.2 `viewer/tests/download-real.spec.ts` 套件清单改为七套（含 ponytail）并断言解压内容含 ponytail 插件；先跑 RED
- [x] 2.3 `offline-installer.mjs` 帮助文案「六套」改「七套」的断言先行（若有对应测试则更新，无则在 2.1 中一并覆盖）

## 3. 实现

- [x] 3.1 `offline-installer.mjs`：`SUITES` 加入 `ponytail`，帮助文案六套→七套
- [x] 3.2 `prepare-offline-inputs.mjs`：新增 `--ponytail-plugin <路径>` 分支，校验双 manifest 后复制到 `claude/ponytail` 与 `codex/ponytail`（供未来全量重跑 prepare 使用）
- [x] 3.3 跑绿第 2 节全部测试

## 4. 制包与端到端验收

- [x] 4.1 `node build-offline-kit.mjs` 重新生成 `offline-kit/`，确认构建自带 `verifyOfflineKit` 通过且 manifest 含两个 ponytail bundle 与本地市场条目
- [x] 4.2 `node install-skills.mjs --list` 显示七套；`--tool claude --dry-run` 与 `--tool codex --dry-run` 的计划行包含 ponytail 且不写任何文件
- [x] 4.3 全套测试最终跑绿（viewer vitest + 根目录 node --test），并核对真实下载测试通过
