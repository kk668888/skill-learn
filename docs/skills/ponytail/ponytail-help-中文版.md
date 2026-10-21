# ponytail-help · 中文版

> **来源**：`skills/ponytail/ponytail-help/SKILL.md`
> **类型**：展示技能（速查卡；一次性展示，不改任何状态）
> **触发**：可自动触发；用户说「/ponytail-help」「ponytail help」「怎么用 ponytail」时使用

---

## frontmatter

- **name**：`ponytail-help`
- **description**：ponytail 档位、技能与命令的快速参考。一次性展示。适用于「/ponytail-help」「ponytail help」「怎么用 ponytail」。

> **批注**：把帮助做成**技能**而不是文档，是个位置选择——代理工作在对话里，够不到浏览器里的 README；速查卡放进技能目录，才进了代理的上下文可达范围。

## 正文

被调用时展示这张参考卡。一次性执行，不要改变模式、不要写标记文件、不要持久化任何东西。

## 档位

| 档位 | 触发方式 | 改变什么 |
|------|----------|----------|
| **Lite** | `/ponytail lite` | 按要求构建，用一行点名更小的选项。 |
| **Full** | `/ponytail` | 最小完整改动、逻辑需要处的一个检查、以及会说明跳过了什么和风险的回复。默认档。 |
| **Ultra** | `/ponytail ultra` | 额外质疑请求本身，在构建之前先反驳。 |

档位保持生效，直到被切换或会话结束。

## 技能

| 技能 | 触发方式 | 作用 |
|------|----------|------|
| **ponytail** | `/ponytail` | 懒惰模式本体：最少的新代码，回复说清跳过了什么、有什么风险。 |
| **ponytail-review** | `/ponytail-review` | 一次改动的质量审查：bug、安全、负载、缺测试、速度、可削减项。每个发现都说明会出什么问题、怎么修。 |
| **ponytail-audit** | `/ponytail-audit` | 同样的质量审查，面向整个仓库，带排序。 |
| **ponytail-debt** | `/ponytail-debt` | 把 `shortcut:` 注释收割成可追踪的台账。 |
| **ponytail-gain** | `/ponytail-gain` | 实测收益记分板：更少代码、更低成本、更快。 |
| **ponytail-help** | `/ponytail-help` | 本卡片。 |

在 Codex CLI 与 IDE 扩展中，用 `$ponytail:ponytail`、`$ponytail:ponytail-review` 或 `$ponytail:ponytail-help` 调用技能。Claude Code 与 OpenCode 使用上表的斜杠命令形式（OpenCode 把全部六个技能都发布为斜杠命令）。

## 退出

说「stop ponytail」或「normal mode」。随时可用 `/ponytail` 恢复。`/ponytail off` 同样有效。

## Band（Claude Code）

`/ponytail band` 隐藏提示框上方的状态条，同一命令可再次调出。`/ponytail band on` 与 `/ponytail band off` 直接设置。档位不受影响。`/ponytail band import` 把你过去的 Claude Code 会话（成本、agent 时间、token）导入看板。

## 配置默认档位

默认档位 = `full`，每个会话自动激活。修改方式：

**环境变量**（最高优先级）：

```bash
export PONYTAIL_DEFAULT_MODE=ultra
```

**配置文件**（`~/.config/ponytail/config.json`，Windows 为 `%APPDATA%\ponytail\config.json`）：

```json
{ "defaultMode": "lite" }
```

设为 `"off"` 可禁用会话启动时的自动激活，需要时手动 `/ponytail` 启用。

解析顺序：环境变量 > 配置文件 > `full`。

## 更新

启用一次自动更新：打开 `/plugin`，进入 Marketplaces，选择 ponytail，启用 auto-update。此后 Claude Code 会在启动时拉取新版本（提示时运行 `/reload-plugins`）。手动刷新：`/plugin marketplace update ponytail` 然后 `/reload-plugins`。

如果 `/plugin` 无法识别，说明你的 Claude Code 版本过旧。先更新它（`npm install -g @anthropic-ai/claude-code@latest`，或 `brew upgrade claude-code`）并重启。其他宿主使用各自的更新流程。

## 更多

完整文档与示例：<https://github.com/DietrichGebert/ponytail>

---

## 附属文件

无——本技能目录只有 `SKILL.md` 单文件。

---

## 相关

- [ponytail-help-详细设计讲解.md](./ponytail-help-详细设计讲解.md) —— 本文的设计分析：为什么这么设计、代价是什么、何时会失效
- [ponytail-中文版.md](./ponytail-中文版.md) —— 主技能本体
- [ponytail-review-中文版.md](./ponytail-review-中文版.md) ｜ [ponytail-audit-中文版.md](./ponytail-audit-中文版.md) ｜ [ponytail-debt-中文版.md](./ponytail-debt-中文版.md) ｜ [ponytail-gain-中文版.md](./ponytail-gain-中文版.md) —— 表中各技能的完整翻译
- [技能快速入手.md](./技能快速入手.md) —— 跟做一次极简实现
