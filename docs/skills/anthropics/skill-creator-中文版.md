# skill-creator · 中文版

> **来源**：`skills/anthropics/skill-creator/SKILL.md`（本项目 skills/，镜像自 [anthropics/skills](https://github.com/anthropics/skills) 官方仓库）
> **类型**：元技能（用于创建和改进其他技能的技能）
> **触发**：模型自动触发——当用户想从零创建一个技能、修改/优化现有技能、跑 eval 测试技能、做技能性能基准测试、或优化技能 description 的触发准确率时

---

## frontmatter

| 字段 | 值 |
|------|-----|
| `name` | `skill-creator` |
| `description` | 创建新技能、修改和改进现有技能、衡量技能性能。当用户想从零创建一个技能、编辑或优化现有技能、跑 eval 测试技能、对技能性能做带方差分析的基准测试、或优化技能 description 以提升触发准确率时使用本技能。 |

（本技能无 `disable-model-invocation` 等附加字段，frontmatter 只有 `name` 与 `description` 两项。）

## 正文

一个用于创建新技能并迭代改进它们的技能。

从高层面看，创建一个技能的流程是这样的：

- 想清楚这个技能要做什么，以及大致怎么做
- 写出技能的草稿
- 出几条测试提示词，让「挂着这个技能的 Claude」跑一遍
- 帮用户从定性和定量两个维度评估结果
  - 趁后台跑测试的空档，如果还没有定量 eval 就起草一些（如果已有，可以原样用，也可以在你觉得需要调整时修改）。然后向用户解释这些 eval（如果 eval 已存在，就解释已有的那些）
  - 用 `eval-viewer/generate_review.py` 脚本把结果展示给用户看，同时让用户查看定量指标
- 根据用户对结果的评估反馈重写技能（如果定量基准里暴露出明显缺陷，也要一并处理）
- 重复，直到你满意为止
- 扩充测试集，再在更大规模上试一轮

你在使用这个技能时的职责，是判断用户当前处于流程的哪个阶段，然后介入并帮他们推进。比如用户可能说"我想做一个做 X 的技能"——你可以帮他们收敛需求、写草稿、写测试用例、确定评估方式、跑完所有提示词，然后循环往复。

反过来说，也可能用户已经有技能草稿了。这种情况你可以直接进入循环里的 eval/迭代部分。

当然，你应当始终保持灵活——如果用户说"我不需要跑一堆评估，陪我就好了"，那就照做。

技能完成后（顺序依然是灵活的），你还可以运行技能 description 优化器——我们有一个专门的独立脚本——来优化这个技能的触发效果。

> **批注**：开篇这段把技能定位成「流程导航器」而非线性脚本——先判断用户在哪一步，再介入。这与常见技能「从头到尾照做」的写法是刻意区分的：技能创建的入口五花八门（全新创建 / 已有草稿 / 只想改 description），线性流程必然有一半场景要硬掰。

酷吧？酷。

## Communicating with the user（与用户沟通）

skill-creator 的使用者对编程行话的熟悉程度跨度极大。如果你还没听说（你也不可能听说，这是最近才开始的）：Claude 的能力正在激励水管工打开终端，激励父母和祖父母去搜"怎么装 npm"。另一方面，大多数用户可能还是相当熟悉电脑的。

所以请注意从上下文线索里判断该怎么措辞！作为默认情况下的参考：

- "evaluation"（评估）和 "benchmark"（基准测试）处于边缘地带，但可以用
- "JSON" 和 "assertion"（断言）这类词，你需要先从用户身上看到明确的信号表明他们懂这些概念，才能不加解释地使用

拿不准时可以简单解释一下术语，如果不确定用户是否明白，随时可以用一句短定义来澄清。

---

## Creating a skill（创建技能）

### Capture Intent（捕获意图）

先理解用户的意图。当前对话里可能已经包含用户想沉淀为技能的工作流（比如用户说"把这个变成技能"）。如果是这样，先从对话历史里提取答案——用过的工具、步骤顺序、用户做过的纠正、观察到的输入/输出格式。缺口由用户来补，且用户确认后才进入下一步。

1. 这个技能要让 Claude 能做到什么？
2. 这个技能应该什么时候触发？（哪些用户说法/场景）
3. 期望的输出格式是什么？
4. 要不要建测试用例来验证技能有效？输出可以被客观验证的技能（文件转换、数据抽取、代码生成、固定流程步骤）适合配测试用例；输出偏主观的技能（写作风格、艺术创作）往往不需要。按技能类型给出合适的默认建议，但让用户拍板。

### Interview and Research（访谈与调研）

主动询问边界情况、输入/输出格式、示例文件、成功标准、依赖项。这部分敲定之前不要急着写测试提示词。

查看可用的 MCP——如果对调研有用（搜文档、找类似技能、查最佳实践），有 subagent 就并行调研，没有就串行。带着上下文来，减轻用户的负担。

### Write the SKILL.md（编写 SKILL.md）

基于访谈结果，填好这些组成部分：

- **name**：技能标识符
- **description**：何时触发、做什么。这是触发的主要机制——既写清楚技能做什么，也写清楚具体在什么场景用。所有"何时使用"的信息都放这里，不放正文。注意：目前 Claude 有"触发不足"（undertrigger）的倾向——明明该用却不用。为了对抗这一点，请把技能 description 写得"主动"一点。比如不要写"如何构建一个简单快速的 dashboard 来展示内部 Anthropic 数据"，而要写"如何构建一个简单快速的 dashboard 来展示内部 Anthropic 数据。只要用户提到 dashboard、数据可视化、内部指标，或想展示任何类型的公司数据——哪怕没有明说'做一个 dashboard'——都务必使用本技能。"
- **compatibility**：所需工具、依赖（可选，很少需要）
- **其余的技能内容 :)**

> **批注**：把「undertrigger 倾向 + 对抗性写法（pushy description）」明确写进创建指南，说明 description 不只是文档，而是影响模型行为的**执行代码**——它的措辞直接决定技能会不会被调用。这是官方在大量真实使用中观察到的系统性偏差，而不是理论推演。

### Skill Writing Guide（技能写作指南）

#### Anatomy of a Skill（技能的解剖结构）

```
skill-name/
├── SKILL.md（必需）
│   ├── YAML frontmatter（name、description 必需）
│   └── Markdown 指令
└── 打包资源（可选）
    ├── scripts/    - 可执行代码，用于确定性/重复性任务
    ├── references/ - 按需加载进上下文的文档
    └── assets/     - 用于输出的文件（模板、图标、字体）
```

#### Progressive Disclosure（渐进式披露）

技能采用三级加载系统：
1. **元数据**（name + description）——始终在上下文中（约 100 词）
2. **SKILL.md 正文**——技能触发时进入上下文（理想情况下 <500 行）
3. **打包资源**——按需加载（不设上限，脚本可以不加载就执行）

这些字数是近似值，需要更长尽管更长。

**关键模式：**
- SKILL.md 控制在 500 行以内；快到上限时，加一层新的层级结构，并写清楚指引告诉使用该技能的模型接下来该去哪读
- 从 SKILL.md 里清晰地引用各个文件，并写明何时该读它们
- 大的参考文件（>300 行）要有目录

**按领域组织**：当一个技能支持多个领域/框架时，按变体组织：
```
cloud-deploy/
├── SKILL.md（工作流 + 选择逻辑）
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```
Claude 只读相关的那个参考文件。

> **批注**：Progressive Disclosure 是整个技能系统的成本模型——三级结构对应「上下文窗口 = 稀缺资源」这一硬约束：元数据常驻（~100 词）保证可发现性，正文按触发加载，重资源按需读取。 scripts/ 甚至可以「不进上下文直接执行」，成本为零。

#### Principle of Lack of Surprise（无意外原则）

这不用多说，但技能里不得包含恶意软件、漏洞利用代码、或任何可能危害系统安全的内容。技能内容如果被描述出来，不应让用户对其意图感到意外。不要顺着那些要求创建误导性技能、或为未授权访问/数据外泄/其他恶意活动提供便利的请求走。像"扮演一个 XYZ"这类角色扮演技能是允许的。

#### Writing Patterns（写作模式）

指令优先使用祈使句。

**定义输出格式**——可以这样写：
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**示例模式**——带上示例很有用。可以这样组织（但如果示例里有"输入"和"输出"，措辞可以稍作变通）：
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Writing Style（写作风格）

尽量向模型解释**为什么**这件事重要，而不是堆砌沉重的、发霉的 MUST。运用心智理论（theory of mind），让技能保持通用，不要过度收窄到具体例子上。先写一版草稿，然后用新鲜的眼光重看并改进它。

### Test Cases（测试用例）

技能草稿写完后，想出 2-3 条贴近真实的测试提示词——真实用户真会说出来的那种。拿给用户看：「我想试这几条测试用例，看起来对吗，还是要再加几条？」然后跑它们。

把测试用例存到 `evals/evals.json`。先别写断言——只写提示词。断言在下一步、跑批进行中时再起草。

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

完整 schema（包括稍后要加的 `assertions` 字段）见 `references/schemas.md`。

## Running and evaluating test cases（运行与评估测试用例）

这一节是一条连续的操作序列——不要中途停下。不要用 `/skill-test` 或其他任何测试技能。

结果放在 `<技能名>-workspace/`，与技能目录同级。工作区内部按迭代组织（`iteration-1/`、`iteration-2/` 等），每次迭代内部，每个测试用例一个目录（`eval-0/`、`eval-1/` 等）。不要预先把目录全建好——走到哪建到哪。

### Step 1: Spawn all runs (with-skill AND baseline) in the same turn（第一步：同一轮里启动全部运行——带技能的和基线的）

对每个测试用例，在同一轮里启动两个 subagent——一个带技能，一个不带。这一点很重要：不要先把带技能的都启动了，回头再补基线。全部一次性启动，让它们差不多同时结束。

**带技能运行：**

```
Execute this task:
- Skill path: <技能路径>
- Task: <eval 提示词>
- Input files: <eval 的输入文件，没有就写 "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs to save: <用户关心的产物——比如 ".docx 文件"、"最终 CSV">
```

**基线运行**（同样的提示词，但基线取决于场景）：
- **创建新技能**：完全无技能。同样提示词，不写技能路径，存到 `without_skill/outputs/`。
- **改进现有技能**：用旧版本。编辑之前先给技能拍快照（`cp -r <技能路径> <workspace>/skill-snapshot/`），然后让基线 subagent 指向快照。存到 `old_skill/outputs/`。

为每个测试用例写一个 `eval_metadata.json`（断言先留空）。给每个 eval 起一个描述性名字，反映它在测什么——不要只叫"eval-0"。目录也用这个名字。如果这一轮迭代用了新的或修改过的 eval 提示词，就为每个新 eval 目录建这些文件——不要假设它们能从上一轮继承。

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

> **批注**：with-skill 与 baseline 必须**同一轮启动**，是为了控制对照实验里的时间混杂变量——不同批次跑可能赶上不同的系统负载。而 baseline 的语义随任务类型切换（无技能 vs 旧版快照），保证归因对象始终是「这次改动带来了什么」。

### Step 2: While runs are in progress, draft assertions（第二步：趁运行进行中，起草断言）

别干等着运行结束——这段时间可以产出。为每个测试用例起草定量断言，并向用户解释。如果 `evals/evals.json` 里已有断言，审一遍并解释它们各自检查什么。

好的断言是可被客观验证的、名字有描述性的——它们会显示在基准查看器里，让人扫一眼就知道每条在检查什么。主观型技能（写作风格、设计质量）更适合定性评估——不要把断言强塞给需要人类判断的东西。

起草完成后，把断言更新进 `eval_metadata.json` 和 `evals/evals.json`。同时向用户解释他们会在查看器里看到什么——定性的输出和定量的基准都有。

> **批注**：把「起草断言」安排在「跑批等待期」，是把 subagent 的异步等待变成流水线空档——等待时间不产出价值，人就闲置；断言起草恰好不需要运行结果（它定义"应该是什么"，而非"是什么"）。但这条约束的另一半同样关键：断言必须在看到结果**之前**定型，否则就是先射箭再画靶。

### Step 3: As runs complete, capture timing data（第三步：运行完成时，捕获计时数据）

每个 subagent 任务完成时，你会收到一条包含 `total_tokens` 和 `duration_ms` 的通知。立刻把这些数据存到运行目录的 `timing.json`：

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

这是捕获这些数据的唯一机会——它们只通过任务通知传来，不会持久化到别处。通知到了就处理，不要攒批。

### Step 4: Grade, aggregate, and launch the viewer（第四步：评分、汇总、启动查看器）

所有运行结束后：

1. **给每次运行评分**——启动一个 grader subagent（或串行评分），让它读 `agents/grader.md`，逐条断言对照输出做评估。结果存到各运行目录的 `grading.json`。grading.json 的 expectations 数组必须使用 `text`、`passed`、`evidence` 这三个字段（不是 `name`/`met`/`details` 或其他变体）——查看器依赖这些确切的字段名。可以程序化检查的断言，写个脚本跑，别靠肉眼——脚本更快、更可靠，还能跨迭代复用。

2. **汇总成基准**——从 skill-creator 目录运行汇总脚本：
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```
   它会产出 `benchmark.json` 和 `benchmark.md`，包含每种配置的 pass_rate、time、tokens，带均值 ± 标准差和差值。如果要手工生成 benchmark.json，查看器期望的确切 schema 见 `references/schemas.md`。
   每个 with_skill 版本放在它的 baseline 对照之前。

3. **做一次分析师检查**——读基准数据，把聚合统计可能掩盖的模式挖出来。具体看什么见 `agents/analyzer.md`（"Analyzing Benchmark Results" 一节）——比如无论有无技能都恒过的断言（无区分力）、高方差的 eval（可能不稳定）、时间/Token 的权衡。

4. **启动查看器**，定性的输出和定量的数据都带上：
   ```bash
   nohup python <skill-creator-path>/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "my-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```
   第 2 轮及以后的迭代，还要传 `--previous-workspace <workspace>/iteration-<N-1>`。

   **Cowork / 无头环境**：如果 `webbrowser.open()` 不可用或环境没有显示，用 `--static <output_path>` 改为生成一个独立 HTML 文件，不启动服务器。用户点"Submit All Reviews"时，反馈会下载为 `feedback.json` 文件。下载后，把 `feedback.json` 拷回工作区目录，供下一轮迭代读取。

注意：请用 generate_review.py 生成查看器，没必要自己写 HTML。

5. **告诉用户**，类似："我已在你的浏览器里打开结果。有两个标签页——'Outputs' 让你逐个查看测试用例并留反馈，'Benchmark' 展示定量对比。看完回来告诉我。"

> **批注**：第 4 步的 grader 字段名硬约束（`text`/`passed`/`evidence`）值得注意——它是在防一种典型的多组件系统事故：中间产物的 schema 悄悄漂移，下游静默解析失败。原文用括号点名了几个"错误变体"，说明这些变体真的发生过。

### What the user sees in the viewer（用户在查看器里看到什么）

"Outputs" 标签页一次显示一个测试用例：
- **Prompt**：给定的任务
- **Output**：技能产出的文件，尽量内联渲染
- **Previous Output**（第 2 轮起）：折叠区，显示上一轮的输出
- **Formal Grades**（如果跑了评分）：折叠区，显示断言通过/失败
- **Feedback**：一个随输入自动保存的文本框
- **Previous Feedback**（第 2 轮起）：用户上次的评论，显示在文本框下方

"Benchmark" 标签页显示统计摘要：每种配置的通过率、耗时、Token 用量，附每个 eval 的明细和分析师观察。

用前后按钮或方向键导航。看完后点"Submit All Reviews"，所有反馈会存为 `feedback.json`。

### Step 5: Read the feedback（第五步：读取反馈）

用户告诉你看完了，就读 `feedback.json`：

```json
{
  "reviews": [
    {"run_id": "eval-0-with_skill", "feedback": "the chart is missing axis labels", "timestamp": "..."},
    {"run_id": "eval-1-with_skill", "feedback": "", "timestamp": "..."},
    {"run_id": "eval-2-with_skill", "feedback": "perfect, love this", "timestamp": "..."}
  ],
  "status": "complete"
}
```

空的反馈意味着用户觉得没问题。把改进集中在用户提出了具体抱怨的测试用例上。

用完查看器后把它关掉：

```bash
kill $VIEWER_PID 2>/dev/null
```

---

## Improving the skill（改进技能）

这是循环的心脏。你已经跑完测试用例，用户已经审了结果，现在要基于他们的反馈把技能改好。

### How to think about improvements（如何思考改进）

1. **从反馈中泛化。** 宏观上正在发生的事情是：我们要创造的技能是要被用一百万次的（也许字面意义上，甚至更多），跨越无数不同的提示词。而现在你和用户只在这几个例子上反复迭代，因为这样快。用户对这些例子了如指掌，评估新输出也快。但如果你们共同开发的技能只对这几个例子有效，它就是废物。与其塞进小家子气的过拟合补丁、或压迫性的限制条款，如果有个顽固问题，不妨换个思路——换一种比喻，或推荐另一种工作模式。试错成本相对低，而且说不定就撞上好东西了。

2. **保持提示词精炼。** 移除没有产生回报的内容。务必去读转录（transcript），而不只是最终输出——如果技能在让模型把大量时间花在无效动作上，你可以试着删掉驱使它这么做的技能部分，看看会怎样。

3. **解释为什么。** 努力为你要求模型做的每件事解释**为什么**。今天的 LLM 很聪明。它们有良好的心智理论，只要 harness 给得对，就能超越死记硬背式的指令、真正把事情办好。即使用户的反馈很简短或带着火气，也要真正理解任务、理解用户为什么这么写、以及他们实际写了什么，然后把这份理解传递进指令。如果你发现自己在大写 ALWAYS 或 NEVER，或在用超级僵硬的结构，那是个黄色警报——尽可能重新组织，把推理讲清楚，让模型理解你要求的事为什么重要。这是一种更人道、更强大、也更有效的做法。

4. **寻找跨测试用例的重复劳动。** 读测试运行的转录，注意 subagent 们是否都不约而同写了相似的辅助脚本、或对某件事采取了同样的多步做法。如果 3 个测试用例全都让 subagent 写了一个 `create_docx.py` 或 `build_chart.py`，这就是技能应该打包那个脚本的强信号。写一次，放进 `scripts/`，让技能直接用。这省掉了每次调用的重复造轮子。

> **批注**：这四条是整套技能的价值观内核。第 1 条（泛化）和第 3 条（解释 why）共同构成对「提示词过拟合」的双重防线：前者管内容层面（别为个案打补丁），后者管风格层面（别用 ALL-CAPS 硬压）。第 4 条则是一个精妙的信号挖掘技巧——从**运行转录**而非技能文本里发现该打包的脚本，让技能的附属资源由实证证据驱动生长。

这个任务相当重要（我们可是要在这里创造每年数十亿美元的经济价值！），你的思考时间不是瓶颈；慢慢来，认真琢磨。建议先写一版修订稿，再换新眼光审视并改进。尽力钻进用户的脑袋，理解他们想要什么、需要什么。

### The iteration loop（迭代循环）

改进技能之后：

1. 把改进应用到技能上
2. 把所有测试用例重跑进新的 `iteration-<N+1>/` 目录，包括基线运行。如果你在创建新技能，基线永远是 `without_skill`（无技能）——每轮迭代保持一致。如果你在改进现有技能，基线选什么由你判断：用户带来的原始版本，或上一轮迭代。
3. 用 `--previous-workspace` 指向上一轮迭代，启动评审器
4. 等用户评审完并告诉你看完了
5. 读新反馈，再改进，再循环

一直继续，直到：
- 用户说满意了
- 反馈全为空（一切看起来都好）
- 你不再取得有意义的进展

---

## Advanced: Blind comparison（进阶：盲评对比）

当你想在技能的两个版本之间做更严格的对比时（比如用户问"新版本真的更好吗？"），有一套盲评系统。细节读 `agents/comparator.md` 和 `agents/analyzer.md`。基本思路：把两个输出交给一个独立 agent，不告诉它哪个是哪个，让它判断质量。然后分析赢的一方为什么赢。

这是可选项，需要 subagent，大多数用户用不上。人类评审循环通常就够了。

---

## Description Optimization（description 优化）

SKILL.md frontmatter 里的 description 字段，是决定 Claude 是否调用技能的首要机制。创建或改进技能之后，主动提出可以为触发准确率优化 description。

### Step 1: Generate trigger eval queries（第一步：生成触发 eval 查询集）

创建 20 条 eval 查询——应触发和不应触发的混合。存为 JSON：

```json
[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

查询必须贴近真实，是 Claude Code 或 Claude.ai 用户真会输入的东西。不是抽象请求，而是具体、细节丰富的请求。比如：文件路径、关于用户工作或处境的个人背景、列名和列值、公司名、URL。来点背景故事。有的可以全小写、带缩写、带错别字或口语化。长度要多样，聚焦边界情况而非一目了然的情况（用户之后有机会把关）。

坏例子：`"Format this data"`、`"Extract text from PDF"`、`"Create a chart"`

好例子：`"ok so my boss just sent me this xlsx file (its in my downloads, called something like 'Q4 sales final FINAL v2.xlsx') and she wants me to add a column that shows the profit margin as a percentage. The revenue is in column C and costs are in column D i think"`

对**应触发**的查询（8-10 条），要考虑覆盖面。同一意图的不同说法都要有——正式的、口语的。包括用户没点名技能或文件类型、但明显需要它的场景。塞一些不常见的用例，以及本技能与另一个技能竞争、但本技能应该胜出的场景。

对**不应触发**的查询（8-10 条），最有价值的是"差一点命中"（near-miss）——与本技能共享关键词或概念、但实际需要别的东西的查询。想想邻近领域、模糊措辞（天真的关键词匹配会触发但不该触发）、以及查询碰到了技能能做的事、但在那个上下文里另一个工具更合适的场景。

关键要避免的：别把不应触发的查询做得显而易见地无关。"写一个斐波那契函数"作为 PDF 技能的负例太容易了——它什么都测不出来。负例必须真的难。

> **批注**：「负例必须是 near-miss」是整套触发优化里最有含金量的一条设计——全无关的负例会让指标虚高（模型随便都能答对），只有「共享关键词但意图不同」的负例才能逼出 description 的真实判别力。这与「按 test 分数而非 train 分数选优」共同构成防过拟合的双保险。

### Step 2: Review with user（第二步：与用户一起评审）

用 HTML 模板把 eval 集拿给用户评审：

1. 读 `assets/eval_review.html` 模板
2. 替换占位符：
   - `__EVAL_DATA_PLACEHOLDER__` → eval 条目的 JSON 数组（不要加引号——它是 JS 变量赋值）
   - `__SKILL_NAME_PLACEHOLDER__` → 技能名
   - `__SKILL_DESCRIPTION_PLACEHOLDER__` → 技能当前 description
3. 写入临时文件（如 `/tmp/eval_review_<skill-name>.html`）并打开：`open /tmp/eval_review_<skill-name>.html`
4. 用户可以编辑查询、切换应触发标记、增删条目，然后点"Export Eval Set"
5. 文件下载到 `~/Downloads/eval_set.json`——去 Downloads 文件夹找最新版本，以防有多份（如 `eval_set (1).json`）

这一步很重要——坏的 eval 查询会导致坏的 description。

### Step 3: Run the optimization loop（第三步：运行优化循环）

告诉用户："这会花一些时间——我在后台跑优化循环，会定期查看。"

把 eval 集存到工作区，然后后台运行：

```bash
python -m scripts.run_loop \
  --eval-set <触发eval集路径> \
  --skill-path <技能路径> \
  --model <驱动当前会话的模型ID> \
  --max-iterations 5 \
  --verbose
```

用系统提示词里的模型 ID（驱动当前会话的那个），让触发测试与用户的真实体验一致。

运行期间，定期 tail 输出，向用户更新跑到了第几轮、分数如何。

这个脚本会自动处理完整的优化循环。它把 eval 集切成 60% 训练集和 40% 留出测试集，评估当前 description（每条查询跑 3 次以获得可靠的触发率），然后调用 Claude 基于失败案例提出改进。它会在训练集和测试集上重新评估每个新 description，最多迭代 5 次。结束时在浏览器里打开 HTML 报告，展示每轮结果，并返回带 `best_description` 的 JSON——按**测试集**分数而非训练集分数选优，以避免过拟合。

### How skill triggering works（技能触发机制是如何工作的）

理解触发机制有助于设计更好的 eval 查询。技能会带着 name + description 出现在 Claude 的 `available_skills` 列表里，Claude 根据 description 决定是否查阅某个技能。关键在于：Claude 只在**自己不容易独立完成的任务**上才去查技能——简单的、一步到位的查询（比如"读这个 PDF"）即使 description 完美匹配也可能不触发技能，因为 Claude 用基础工具就能直接处理。复杂、多步、或专业性的查询，只要 description 匹配，就能可靠地触发技能。

这意味着你的 eval 查询要有足够分量，让 Claude 真的能从查阅技能中受益。"读文件 X"这种简单查询是糟糕的测试用例——无论 description 多好它们都不会触发技能。

> **批注**：这段揭示了触发机制的一个反直觉事实——「description 匹配 ≠ 必然触发」。触发是有机会成本的（加载上下文），所以模型对简单任务会跳过技能。这让触发 eval 的查询设计从「关键词是否命中」升级为「任务复杂度是否需要技能介入」。

### Step 4: Apply the result（第四步：应用结果）

从 JSON 输出里取 `best_description`，更新到技能的 SKILL.md frontmatter。向用户展示前后对比，并报告分数。

---

### Package and Present（打包与交付，仅当 `present_files` 工具可用时）

检查你是否能访问 `present_files` 工具。不能就跳过这步。能的话，打包技能并把 .skill 文件交给用户：

```bash
python -m scripts.package_skill <技能文件夹路径>
```

打包后，把生成的 `.skill` 文件路径告诉用户，供其安装。

---

## Claude.ai-specific instructions（Claude.ai 环境的专用说明）

在 Claude.ai 上，核心工作流不变（草稿 → 测试 → 评审 → 改进 → 循环），但因为没有 subagent，一些机制要变。以下是适配要点：

**运行测试用例**：没有 subagent 就没有并行执行。对每个测试用例，读技能的 SKILL.md，然后自己遵循其指令完成测试提示词。一个一个来。这不如独立 subagent 严谨（技能是你写的，跑测试的也是你，你有全部上下文），但作为 sanity check 有用——而且人类评审环节可以补偿。跳过基线运行——直接用技能完成任务即可。

**评审结果**：如果打不开浏览器（比如 Claude.ai 的虚拟机没有显示，或你在远程服务器上），完全跳过浏览器评审器。改为直接在对话里呈现结果。对每个测试用例，展示提示词和输出。如果输出是用户需要查看的文件（如 .docx 或 .xlsx），存到文件系统并告诉用户位置，供其下载检查。在对话里直接要反馈："这个怎么样？有什么要改的吗？"

**基准测试**：跳过定量基准——它依赖基线对照，而没有 subagent 时基线没有意义。聚焦用户的定性反馈。

**迭代循环**：和之前一样——改进技能、重跑测试、收集反馈——只是中间没有浏览器评审器。如果有文件系统，你仍然可以把结果组织进迭代目录。

**description 优化**：这一节需要 `claude` CLI 工具（具体是 `claude -p`），只在 Claude Code 里有。在 Claude.ai 上跳过。

**盲评对比**：需要 subagent。跳过。

**打包**：`package_skill.py` 脚本在任何有 Python 和文件系统的地方都能跑。在 Claude.ai 上可以运行它，用户能下载生成的 `.skill` 文件。

**更新现有技能**：用户可能要求你更新一个已安装的技能，而非创建新技能。这种情况下：
- **保留原始名字。** 记下技能的目录名和 `name` frontmatter 字段——原样使用。比如已安装的技能是 `research-helper`，就输出 `research-helper.skill`（不是 `research-helper-v2`）。
- **编辑前先复制到可写位置。** 已安装的技能路径可能是只读的。复制到 `/tmp/skill-name/`，在那里编辑，从副本打包。
- **如果要手工打包，先暂存到 `/tmp/`**，再拷到输出目录——直接写可能因权限失败。

---

## Cowork-Specific Instructions（Cowork 环境的专用说明）

如果你在 Cowork 里，需要知道的主要是：

- 你有 subagent，所以主工作流（并行启动测试用例、跑基线、评分等）都能用。（不过如果超时问题严重，把测试提示词串行跑也是可以的。）
- 你没有浏览器或显示器，生成 eval 查看器时用 `--static <output_path>` 生成独立 HTML 文件而非启动服务器。然后递给用户一个链接，让他们在浏览器里点开。
- 无论什么原因，Cowork 的环境似乎让 Claude 不太愿意在跑完测试后生成 eval 查看器，所以再强调一遍：无论在 Cowork 还是 Claude Code，跑完测试后，**总是**要生成 eval 查看器，让人类在示例上先看一眼，然后你再去自己修订技能、尝试修正，用 `generate_review.py`（别写你自己的精品 HTML 代码）。提前道歉，但这里我要全大写了：在你自己评估这些输入**之前**，先生成 EVAL VIEWER。要尽快把它们送到人类眼前！
- 反馈的机制不同：因为没有常驻服务器，查看器的"Submit All Reviews"按钮会把 `feedback.json` 下载为文件。你再从那里读（可能需要先申请访问权限）。
- 打包没问题——`package_skill.py` 只要有 Python 和文件系统就行。
- description 优化（`run_loop.py` / `run_eval.py`）在 Cowork 里应该也能正常工作，因为它通过 subprocess 用 `claude -p`，不走浏览器——但请留到你把技能完全做好、用户也认可它状态不错之后再做。
- **更新现有技能**：用户可能要求你更新一个已安装的技能，而非创建新技能。遵循上面 Claude.ai 一节的更新指引。

---

## Reference files（参考文件）

agents/ 目录里有专用 subagent 的指令。需要启动对应 subagent 时再读。

- `agents/grader.md` —— 如何对照输出评估断言
- `agents/comparator.md` —— 如何在两个输出之间做盲评 A/B 对比
- `agents/analyzer.md` —— 如何分析一个版本为什么赢了另一个

references/ 目录有补充文档：
- `references/schemas.md` —— evals.json、grading.json 等的 JSON 结构

---

最后再把核心循环重复一遍，以示强调：

- 弄清楚这个技能是关于什么的
- 起草或编辑技能
- 让挂着技能的 Claude 跑测试提示词
- 和用户一起评估输出：
  - 生成 benchmark.json 并运行 `eval-viewer/generate_review.py` 帮用户评审
  - 跑定量 eval
- 循环，直到你和用户都满意
- 打包最终技能，交还给用户。

如果你有 TodoList 之类的工具，请把这些步骤加进去，以免遗漏。如果你在 Cowork，请专门把"创建 evals JSON 并运行 `eval-viewer/generate_review.py`，让人类评审测试用例"放进 TodoList，确保它发生。

祝好运！

## 附属文件

| 文件 | 作用 | 源码路径 |
|------|------|----------|
| `agents/grader.md` | grader subagent 指令：对照转录与输出评估断言，并反过来批评断言本身的质量 | `skills/anthropics/skill-creator/agents/grader.md` |
| `agents/comparator.md` | 盲评 subagent 指令：不知道技能归属的前提下，按内容/结构 rubric 对比两个输出 | `skills/anthropics/skill-creator/agents/comparator.md` |
| `agents/analyzer.md` | 事后分析师 subagent 指令："揭盲"后读双方技能与转录，分析胜负原因并产出改进建议 | `skills/anthropics/skill-creator/agents/analyzer.md` |
| `references/schemas.md` | 全部中间产物的 JSON schema：evals.json / history.json / grading.json / metrics.json / timing.json / benchmark.json / comparison.json / analysis.json | `skills/anthropics/skill-creator/references/schemas.md` |
| `assets/eval_review.html` | 触发 eval 集的用户评审页模板（含占位符替换机制） | `skills/anthropics/skill-creator/assets/eval_review.html` |
| `eval-viewer/generate_review.py` | 生成结果评审查看器（服务器模式 / `--static` 独立 HTML 模式） | `skills/anthropics/skill-creator/eval-viewer/generate_review.py` |
| `eval-viewer/viewer.html` | 查看器前端页面 | `skills/anthropics/skill-creator/eval-viewer/viewer.html` |
| `scripts/aggregate_benchmark.py` | 把一次迭代的评分/计时数据汇总为 benchmark.json / benchmark.md | `skills/anthropics/skill-creator/scripts/aggregate_benchmark.py` |
| `scripts/run_loop.py` | description 优化全自动循环（60/40 切分、每查询 3 次、最多 5 轮） | `skills/anthropics/skill-creator/scripts/` |
| `scripts/package_skill.py` | 把技能文件夹打包为 `.skill` 文件 | `skills/anthropics/skill-creator/scripts/package_skill.py` |
| `scripts/generate_report.py`、`scripts/improve_description.py`、`scripts/aggregate_benchmark.py` 等其余脚本 | 优化循环的子步骤（提议新 description、生成报告等） | `skills/anthropics/skill-creator/scripts/` |
| `LICENSE.txt` | 许可证 | `skills/anthropics/skill-creator/LICENSE.txt` |

## 相关

- [skill-creator · 详细设计讲解](./skill-creator-详细设计讲解.md)
- [anthropics 套件 · 技能原理深度讲解](./技能原理深度讲解.md)（若存在）
