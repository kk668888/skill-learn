# 设计：离线安装器交互式向导

## Context

安装器（`offline/offline-installer.mjs`）当前为纯 flag 驱动，`installOffline` 已清晰分为「parseArgs 收集选项 → 校验 kit → 计算 plans → 打印计划 → 执行循环」五段。计划打印（原 dry-run 输出）与执行循环可直接复用，缺的只是交互式的选项收集来源。内网环境约束：不能 npm install（必须零依赖）、Windows 为第一目标平台（老 conhost 可能仍在用）。

## Goals / Non-Goals

**Goals:**

- 无参数 + TTY 时进入向导，逐步收集安装决策并提供默认值
- 向导终点复用现有计划展示，加一道显式确认门（默认放弃）
- `安装.bat` 双击入口，零终端知识可用
- 现有 flag 模式行为与测试完全不变

**Non-Goals:**

- 不做方向键/多光标的 TUI（inquirer 类），不引入任何依赖
- 不做 viewer 网页端安装（安装发生在用户机器，viewer 在服务器，网页够不着本机）
- 不改动安装执行策略本身（冲突检测、跳过逻辑等保持现状）

## Decisions

### 决策一：入口约定——无参数 + TTY 才进向导

`argv` 为空且 `process.stdin.isTTY` 为真 → 向导；`argv` 非空 → 现有 parseArgs 路径；`argv` 为空但非 TTY → 打印 usage 并以非零退出码结束（不猜测）。向导收集完的答案构造出与 parseArgs 同构的 options 对象，注入同一管线——向导只是选项的第二个来源，计划与执行代码零分叉。

备选：向导作为独立子命令（`--wizard`）。否决：双击 bat 场景里多一个要传的参数，且「无参数 = 最常用路径 = 向导」的映射最直觉。

### 决策二：零依赖 readline + 数字菜单

用内置 `node:readline/promises`（Node ≥ 20.19 内置，满足现有版本下限）。菜单统一「输数字 + 回车」形式，不做方向键多选——conhost 对 ANSI 转义序列支持参差，数字菜单在任何 Windows 终端都稳定，且实现体量小一个数量级。套件多选采用「回车=全部；输入 `1,3,5`=部分」，回显已选清单后确认。

### 决策三：确认门默认 N

向导终点打印与 dry-run 完全一致的计划文本，随后 `(y/N)`。默认 N 意味着「一路回车 = 什么都没装」——向导把命令行模式缺失的停点补上了，而不是降低安全性。取消路径（回车/N/Ctrl+C）在计划阶段之后、任何写入之前，目标保持原样。

### 决策四：`安装.bat` 十行壳，GBK 编码 + CRLF，不用 PowerShell

bat 内容：`chcp 936`（简体中文代码页）→ 检查 `node -v` ≥ 20.19（给出明确中文报错）→ `node "%~dp0offline\install-skills.mjs"` → `pause`，并把安装器退出码透传给调用方。选 bat 而非 ps1：bat 无 ExecutionPolicy 拦截问题，双击即走。放在包根目录（ZIP 解压后第一眼可见），指向 offline/ 内的向导。

> **实现修正**：原设想「UTF-8 保存 + `chcp 65001`」实测不可行——cmd 按当前控制台代码页逐行解码批次文件，CP936 控制台下 UTF-8 中文字节会被错拆，行边界损毁（冒烟中 rem 行粘连成碎片命令）；且 `chcp 65001` 无法让 cmd 事后按 UTF-8 重读。因此定稿为：**文件以 GBK 编码 + CRLF 行尾保存**（UTF-8 + LF 各自独立复现解析崩坏），chcp 之前保持纯 ASCII，chcp 936 之后中文行按 GBK 正确解析；node 自身输出经 WriteConsoleW 渲染，不受代码页影响。LF 行尾同样会导致多行括号块解析异常，必须 CRLF。

### 决策五：向导提问可注入，测试不依赖真 TTY

提问函数集中为一个可注入的 `prompt(question, default)`（readline 实现仅是默认注入），测试以假 prompt 序列驱动向导全流程——断言默认值逻辑、编号解析、计划确认分支，不需要模拟 TTY。

## Risks / Trade-offs

- [老 conhost 中文乱码] → bat 内 `chcp 65001` + Node 侧统一 UTF-8 输出；`--list` 等现有输出已验证中文可行
- [用户中途 Ctrl+C] → readline 关闭即退出（非零码）；确认门保证此刻尚无任何写入
- [数字菜单输错] → 非法输入原问重试（带剩余次数上限？不需要——循环重问即可，无副作用操作）
- [bat 被 SmartScreen 拦截] → 内网 ZIP 来自自家人工拷贝，无 Mark-of-the-Web 传播链；如有，右键解除锁定为标准操作，README 注明
- [两套入口的文案漂移] → usage 文本单一来源：flag 模式的 usage() 同时被向导入口提示引用
