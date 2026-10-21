# add-ponytail-suite 设计

## Context

制包与安装管线本身不含套件特判：`build-offline-kit.mjs` 按 `offline-inputs.json` 的 bundle 列表逐项复制输入、核对全树指纹并生成两类宿主的本地市场清单；`offline-installer.mjs` 只在 `SUITES` 常量与帮助文案里固定了六套。ponytail v5.3.2 是单仓库发行（release 无附件资产），同一棵树同时携带 `.claude-plugin/plugin.json` 与 `.codex-plugin/plugin.json`，Claude 侧 hooks 含 band 状态栏，用户配置的 webhook 默认为空（注释明确「Empty: nothing leaves this machine」）。`prepare-offline-inputs.mjs` 是一次性脚本：要求同时提供全部七个上游输入且拒绝已存在的输出目录，而其余六套的本地来源不在本次可复得范围内。

## Goals / Non-Goals

**Goals**

- ponytail 以「本地完整插件包」方式进入 claude 与 codex 两个安装目标，与既有插件套件同一安装、冲突与验收语义。
- 输入锁定达到与 prepare 脚本同等的强度：manifest 名称/版本核对 + 全树 SHA-256 指纹。
- 规格与实现中的「六套」固定计数全部消除或更新。

**Non-Goals**

- 不重跑一次性 prepare 流程，不重新收集其余六套的上游输入。
- 不裁剪 ponytail 仓库内容（assets、benchmarks 等随插件整树收录）。
- 不修改 ponytail 插件自身（hooks、userConfig 保持上游原样）。

## Decisions

### 决策一：单源双目标，共享输入指纹

**选了什么**：v5.3.2 tag 的 tarball 解一棵树，复制到 `offline-inputs/claude/ponytail` 与 `offline-inputs/codex/ponytail`，两个 bundle 条目引用各自的 input 路径；由于仓库原生携带双宿主 manifest，两棵输入树字节相同，共享同一 `inputSha256`。

**为什么**：与 grill/premium 的「单源多宿主」对齐，但不需要 prepare 的 codexManifest 生成步骤（ponytail 自带）。备选「只做 claude 目标」被否决：离线包声明支持 codex，缺 ponytail 会让两目标套件集合不一致。

**代价**：无。codex bundle 的 `required` 用 `.codex-plugin/plugin.json`，claude bundle 用 `.claude-plugin/plugin.json`。

### 决策二：增量放置输入 + 同强度校验，不重跑 prepare

**选了什么**：手工把解出的树放进 `offline-inputs/`，随后执行与 prepare 等价的校验：`.claude-plugin/plugin.json` 与 `.codex-plugin/plugin.json` 的 name/version 必须是 `ponytail@5.3.2`；用 `fingerprintTree` 计算全树指纹回填 `offline-inputs.json`。

**为什么**：prepare 拒绝已存在的输出目录，且其余六套输入不在本机可复得；增量放置是唯一可行路径。校验强度不降：指纹锁定的是「这棵树」，与 prepare 事前固定的 `inputSha256` 具有相同的防篡改性质，只是固定时点从脚本内移到本次提交。

**备选**：清空 `offline-inputs/` 重新收集七套来源重跑 prepare。被否决：无法复得，且会让既有六套的已审计输入暴露于重新获取风险。

### 决策三：整树收录，仅排除 `.git`

**选了什么**：tarball 全量进入 payload，与 Superpowers 等插件套件的收录口径一致。

**代价与接受理由**：assets 与 benchmarks 增大 ZIP 体积；换取「插件随附组件完整」这一规格要求（hooks、i18n、示例都在），也避免为裁剪再发明一份排除规则。

### 决策四：离线安全的静态核查

**选了什么**：制包前 grep 插件 hooks 与技能文本中的网络出口（`fetch(`、`https://` 下载指令、包管理器调用），确认：技能全部为纯 prompt 文本；hooks 的网络相关配置（webhook）默认空值且文档声明不出网；band 看板仅写本地 `~/.config/ponytail/`。

**为什么**：规格要求「安装与首次使用不访问外网」；无法在本机做真实的断网沙箱验收，静态核查 + 默认值审查是该约束当前可达的验证深度。

**限制**：静态核查不能证明运行时零请求，残留风险记入验收报告的未检查项。

### 决策五：计数表述改为清单驱动

**选了什么**：规格场景「制作六套技能包」保留场景名（OpenSpec 校验器要求 MODIFIED 块完整覆盖既有场景名，不允许静默改名），正文改为「收录清单中的全部技能套件」，并在需求文本中增加「以清单为准，不依赖固定计数」；安装器帮助文案与测试断言改为「七套」并列入 ponytail。

**为什么**：需求文本里的硬计数正是本次变更的成因；正文语义化之后，下次增删套件只需改清单与计数文案，不再需要同类规格变更。

## Risks / Trade-offs

- [上游以 tag tarball 为源，无官方 release 资产可核对侧车摘要] → 以全树 SHA-256 指纹锁进 `offline-inputs.json`，指纹入库即可跨机器复核。
- [静态核查覆盖不了 hooks 的运行时全部行为] → 在验收记录中明确声明该未检查项；webhook 默认空值与本地存储路径作为主要依据。
- [kit 体积增大（assets/benchmarks）] → 接受；规格要求完整插件包，裁剪收益不及一致性损失。
- [`SUITES` 常量与帮助文案仍是代码内硬编码] → 本次只同步数字；彻底清单驱动留给后续重构，不在本变更范围。

## Migration Plan

无存量迁移：ponytail 是新增套件，既有六套的安装行为不变。重新制包后，旧的 `offline-kit/` 由构建脚本的 staging→backup→replace 流程原子替换，失败自动回滚。

## Open Questions

（无。）
