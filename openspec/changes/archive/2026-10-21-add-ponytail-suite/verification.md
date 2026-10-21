# ponytail v5.3.2 离线安全静态核查

核查对象：`offline-inputs/claude/ponytail`（与 `codex/ponytail` 同一棵树，指纹 `84d5a34af6049075d0ef8ab008543b4005baf1436c4f15f60095f853a2cdd63d`）。

## 结论

- **hooks/**：全部 `.js`/`.json`/`.ts` 中无 `fetch(`、`XMLHttpRequest`、`curl`/`wget`/`npm install`/`Invoke-WebRequest` 等网络出口；命中的 `http://` 仅为 SVG 命名空间声明（`www.w3.org/2000/svg`）与注释里的文档链接。
- **本地写盘**：band 看板与配置写入 `~/.config/ponytail/`（Windows 回退 `%APPDATA%\ponytail\`），不出机器。
- **webhook**：`.claude-plugin/plugin.json` 的 `userConfig.webhookUrl` 默认空字符串，插件描述明确「Empty: nothing leaves this machine」。
- **skills/**：六个技能均为纯 prompt 文本；唯一的 `npm install` 出现在 ponytail-help 的更新说明里，是给用户阅读的文档文字，不是技能运行时执行的命令。

## 未检查项

- 未在断网沙箱中做运行时验收；静态扫描不能证明 hooks 在全部宿主版本下的运行时零请求。
- `userConfig.webhookUrl` 的消费方未在插件 hooks 内发现（推测由宿主或后续流程处理）；其实现路径超出本仓库可审计范围。
