# add-ponytail-suite 提案

## Why

仓库刚收录了 ponytail 套件的技能源码与全套中文文档（七套），但离线安装链路仍是六套的固定清单：`offline-installer.mjs` 的 SUITES、制包清单与主规格都只认原有六套。不接通的话，内网用户下载的离线包装不上 ponytail，查看器里能读、装不上，套件价值缺了一半。

## What Changes

- 把 ponytail 作为第七套接入离线分发：按插件方式（claude 与 codex 两个目标）从本地完整插件包安装，与 Superpowers、grill、frontend-design-premium 同一安装边界。
- 制包输入新增 ponytail 插件源（固定版本、来源与校验值），`offline-inputs.json` 增加 claude/codex 两个 bundle 条目。
- `offline-installer.mjs` 套件清单加入 `ponytail`，帮助文案「六套」改为「七套」。
- 主规格 `offline-skill-distribution` 的套件枚举与六套表述同步为七套。
- 受影响的测试与真实下载验收同步更新（冒烟、安装器、离线包、真实下载）。

## Capabilities

### New Capabilities

（无——ponytail 并入既有的离线分发能力，不引入新能力。）

### Modified Capabilities

- `offline-skill-distribution`：套件清单从六套扩为七套；「按套件执行适合的离线安装流程」需求新增 ponytail 从本地完整插件包安装的要求；相关场景的「六套」固定计数改为收录清单驱动。

## Impact

- 制包管线：`prepare-offline-inputs.mjs`、`build-offline-kit.mjs`、`offline-inputs.json`、`offline-inputs/`（新增 ponytail 输入）。
- 安装入口：`offline-installer.mjs`（SUITES 与帮助文案）。
- 产物：`offline-kit/` 重新生成，包含 ponytail 插件 payload 与清单校验值。
- 测试：`tests/install-skills.test.mjs`、`tests/offline-kit.test.mjs`、`viewer/tests/download-real.spec.ts`、`viewer/tests/download.spec.ts` 等涉及套件集合的断言。
- 规格：`openspec/specs/offline-skill-distribution/spec.md`。
