# skill-learn

项目技能源码、中文资料和离线发行内容由查看器的“下载完整资料与离线技能包”操作合并成一个 `skill-learn-bundle.zip`。ZIP 解压后不会自动安装。首次发布支持 **Windows x64** 上已预装的 Claude Code 或 Codex；Node.js 需为 20.19 或更高版本。实际可用组合以包内 `offline-kit/manifest.json` 为准。

## 外网维护机制包

维护机先取得 [offline-inputs.json](offline-inputs.json) 锁定版本的五类发行物：Claude Code 的三套完整插件、Codex Superpowers 插件、OpenSpec 1.8.0 npm 包及依赖，以及 Impeccable 的 `engine-v0.1.16` Windows x64 引擎和通用技能 ZIP。仓库内的 `skills/anthropics/skill-creator` 是独立技能来源，版本以本仓库快照与文件树摘要标识。输入表记录每套完整文件树的 SHA-256、来源、许可证和必需文件；准备及制包阶段都会核对文件树。Impeccable 引擎与通用技能 ZIP 还会核对原始下载文件的摘要。

```powershell
node prepare-offline-inputs.mjs `
  --claude-superpowers <Superpowers-7.0.0插件目录> `
  --claude-grill <mattpocock-skills-1.3.1插件目录> `
  --claude-premium <frontend-design-premium-1.4.1插件目录> `
  --codex-superpowers <Superpowers-6.3.0-Codex插件目录> `
  --openspec-package <OpenSpec-1.8.0完整npm包目录> `
  --impeccable-engine <impeccable-windows-x64.exe> `
  --impeccable-bundle-archive <官方universal技能ZIP>
node build-offline-kit.mjs
node --test tests/offline-kit.test.mjs
```

准备程序只接受明确的本地来源路径；它不在内网安装阶段下载文件。`build-offline-kit.mjs` 校验必需文件和每个文件的 SHA-256，最后生成 `offline-kit/complete.json`。`offline-inputs/` 和 `offline-kit/` 是未纳入 Git 的构建产物。发布前须在维护机上重新制包并运行查看器测试；目录缺失或损坏时，下载接口拒绝发送 ZIP，Docker 构建也会失败。

## 内网安装

把查看器下载的 ZIP 整体解压到目标机器，保留 `install-skills.mjs` 与 `offline-kit/` 的同级关系。先查看支持范围和安装计划：

```powershell
node install-skills.mjs --list
node install-skills.mjs --tool claude --project <项目目录> --dry-run
node install-skills.mjs --tool codex --host-bin <codex.exe路径> --project <项目目录> --dry-run
```

核对冲突后去掉 `--dry-run` 执行。可重复加 `--bundle <名称>` 只选部分套件，用 `--status` 查看现状。`--scope project|user` 控制 Claude 插件与独立技能的安装范围；Codex 插件管理器当前只提供用户级安装，预览会显示其用户级缓存路径，Codex 独立技能仍按 `--scope` 安装。安装器逐项报告成功、跳过和失败；来源不明的同名插件或技能不会被覆盖，旧版脚本留下的副本也不会自动删除。OpenSpec 只在指定项目初始化或更新；Impeccable 以包内编译技能链接到项目并安装项目 hook，因此**安装后仍需保留解压目录**，否则链接的技能和引擎会失效。独立的 skill-creator 连同附属文件复制到目标工具的项目技能目录。在 Windows PowerShell 中运行 skill-creator 随附的 Python 校验脚本前设置 `$env:PYTHONUTF8='1'`，避免系统默认编码无法输出脚本中的字符。

上游参考：[Impeccable](https://github.com/pbakaus/impeccable)。
