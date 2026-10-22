export type Category = 'stage-1' | 'stage-2' | 'stage-3' | 'layer-1' | 'layer-0'
export type PresetKey = 'all' | 'brownfield' | 'greenfield' | 'cost-killer'

export interface Tool {
  id: string
  name: string
  repo: string
  category: Category
  categoryLabel: string
  badge: string
  metric: string
  slogan: string
  painPoint: string
  mechanism: string[]
  docPath?: string
  beforeTerminal: string
  afterTerminal: string
}

/**
 * 单强调色系统：石墨灰界面 + 唯一冰蓝强调。
 * 强调色只出现在：分区眉标（text）、卡片图标（text）、品牌标。
 * 阶段/层级归属由文字标签（STAGE 01/LAYER L1）与位置表达，不靠色相。
 */
export const ACCENT: Record<Category, { text: string; dot: string }> = {
  'stage-1': { text: 'text-sky-300/90', dot: 'bg-sky-300/80' },
  'stage-2': { text: 'text-sky-300/90', dot: 'bg-sky-300/80' },
  'stage-3': { text: 'text-sky-300/90', dot: 'bg-sky-300/80' },
  'layer-1': { text: 'text-sky-300/90', dot: 'bg-sky-300/80' },
  'layer-0': { text: 'text-sky-300/90', dot: 'bg-sky-300/80' },
}

export const STAGES: { id: Category; num: string; title: string; en: string; pain: string }[] = [
  {
    id: 'stage-1',
    num: '01',
    title: '需求澄清与边界对齐',
    en: 'Clarification',
    pain: '需求描述存在盲区，AI 基于隐含假设直接编码',
  },
  {
    id: 'stage-2',
    num: '02',
    title: '规范定义与任务拆解',
    en: 'Specification',
    pain: '长会话上下文易偏移，多人协作缺乏统一规范基线',
  },
  {
    id: 'stage-3',
    num: '03',
    title: '工程约束与测试闭环',
    en: 'Discipline & TDD',
    pain: '过度抽象、随意引入外部依赖、缺乏测试验证',
  },
]

export const TRACKS: { id: Category; tag: string; title: string; en: string; desc: string }[] = [
  {
    id: 'layer-1',
    tag: 'L1',
    title: '代码库结构感知与实时文档层',
    en: 'Code Intelligence & Graph',
    desc: '改善仅靠文本搜索定位不全及旧版本 API 误用问题',
  },
  {
    id: 'layer-0',
    tag: 'L0',
    title: '上下文降噪与 Token 精简层',
    en: 'Context & Token Efficiency',
    desc: '过滤终端冗余日志输入，精简模型非必要文本输出',
  },
]

export const PRESETS: Record<
  PresetKey,
  { label: string; en: string; tip: string; ids: string[] }
> = {
  all: {
    label: '全景视图',
    en: 'All',
    tip: '完整展示 AI 辅助研发的「三阶段工作流 × 双层基础支撑」工程体系。',
    ids: [],
  },
  brownfield: {
    label: '存量系统演进',
    en: 'Brownfield',
    tip: '存量系统演进策略：用 CodeGraph 梳理调用链，通过 /grill-with-docs 对齐既有设计约束，再配合 OpenSpec 与 Ponytail 控制改动范围。',
    ids: ['grill-with-docs', 'openspec', 'ponytail', 'codegraph', 'rtk'],
  },
  greenfield: {
    label: '新特性开发',
    en: '0-to-1 Feature',
    tip: '新功能交付流程：/grill-me 澄清需求边界 -> /to-spec 拆分纵向工单 -> Superpowers 按 TDD 流程闭环实现。',
    ids: ['grill-me', 'to-spec', 'superpowers', 'context7', 'caveman'],
  },
  'cost-killer': {
    label: 'Token 成本优化',
    en: 'Cost Control',
    tip: '上下文精简方案：RTK 过滤终端冗余日志 + Caveman 减少客套表述 + CodeGraph 按图检索替代全仓搜索，降低长任务 Token 消耗。',
    ids: ['rtk', 'caveman', 'ponytail', 'codegraph'],
  },
}

export const TOOLS: Tool[] = [
  {
    id: 'grill-me',
    name: '/grill-me',
    repo: 'mattpocock/skills',
    category: 'stage-1',
    categoryLabel: 'Stage 01 · 需求澄清',
    badge: '手动触发 Skill',
    metric: '前置澄清隐含假设',
    slogan: '结构化需求澄清工具：在编码前梳理决策分支，对齐设计边界。',
    painPoint: '需求描述遗漏边缘情况时，AI 容易按默认假设直接编写代码，导致后续返工。',
    mechanism: [
      '编码前先梳理问题，沿着决策树分支逐项确认设计盲区',
      '自动检索本地代码库，可通过代码确认的事实不再重复提问',
      '输出清晰的决策摘要，可直接衔接 /to-spec 生成规格说明',
    ],
    docPath: 'docs/skills/grill/grill-me-中文版.md',
    beforeTerminal:
      'User: 帮我加个用户导出 CSV 的功能。\nAgent: 好的！我已经为您创建了 ExportService、队列任务、Redis 缓存以及前端轮询组件（共改动 14 个文件）...\nUser: 等等，我只要前端表格直接转 CSV 下载啊！',
    afterTerminal:
      'User: /grill-me 帮我加个用户导出 CSV 的功能。\nAgent [Grill Mode]: 在动手前我们需要敲定 3 个关键分支：\n1. 数据量级：当前前端已加载数据直接转出，还是需要后端流式查询全量数据？\n2. 权限边界：导出内容是否包含敏感字段（如手机号需脱敏）？\n3. 异步策略：单次导出是否可能超过 10,000 行？',
  },
  {
    id: 'grill-with-docs',
    name: '/grill-with-docs',
    repo: 'mattpocock/skills',
    category: 'stage-1',
    categoryLabel: 'Stage 01 · 需求澄清',
    badge: '存量项目适配',
    metric: '同步维护 ADR/词汇表',
    slogan: '结合项目文档的需求核对工具：自动交叉比对现有代码与历史架构决策。',
    painPoint: '新需求可能与老代码隐式契约冲突，上线后才发现影响了既有业务逻辑。',
    mechanism: [
      '将变更计划与现有代码库实现进行冲突检测',
      '发现术语不一致时及时提示确认（例如代码中的 Tenant 与需求中的 Org 是否同一概念）',
      '对话结束后自动更新 GLOSSARY.md、CONTEXT.md 与 ADR 架构决策记录',
    ],
    docPath: 'docs/skills/grill/grill-with-docs-中文版.md',
    beforeTerminal:
      'User: 给订单加上退款状态。\nAgent: 已在 Order 表新增 refund_status 字段。\n(报错：老系统其实在 Payment 聚合根下管理逆向流水，导致状态机分裂)',
    afterTerminal:
      'User: /grill-with-docs 给订单加上退款状态。\nAgent: ⚠️ 检测到架构冲突：现有代码 `src/domain/payment.ts` 与 `ADR-004` 规定所有资金逆向状态均由 PaymentSettlement 维护，Order 仅存只读快照。是否遵循既有设计？',
  },
  {
    id: 'openspec',
    name: 'OpenSpec',
    repo: 'Fission-AI/OpenSpec',
    category: 'stage-2',
    categoryLabel: 'Stage 02 · 规范契约',
    badge: 'SDD CLI 框架',
    metric: '变更过程可追溯',
    slogan: '面向存量代码的轻量级规范驱动开发（SDD）标准工作流。',
    painPoint: '长会话中上下文容易偏离最初的设计边界，导致改动范围扩大。',
    mechanism: [
      '将每次迭代规范为 Proposal -> Spec -> Tasks -> Archive 四个标准阶段',
      '在本地生成结构化契约文件，作为多轮 Subagent 共享的唯一事实来源',
      '完成后自动归档合并至项目主规范树，保持文档与代码同步',
    ],
    docPath: 'docs/skills/openspec/技能快速入手.md',
    beforeTerminal:
      'Session Turn 45:\nAgent: 顺便帮您重构了路由层并升级了状态管理库...\nUser: 停！我让你改的是登录表单校验，谁让你动路由的？！',
    afterTerminal:
      '$ openspec status\n[ACTIVE CHANGE] feat-login-validation\n├── proposal.md (Approved)\n├── specs/auth-form.spec.md (Locked Boundary)\n└── tasks.md ([x] 1. Schema 校验  [ ] 2. 错误态高亮)\nAgent: 严格按照 tasks.md #2 执行，不触碰范围外文件。',
  },
  {
    id: 'to-spec',
    name: '/to-spec & /to-tickets',
    repo: 'mattpocock/skills',
    category: 'stage-2',
    categoryLabel: 'Stage 02 · 规范契约',
    badge: '纵向切片工具',
    metric: '聚焦接口契约与工单',
    slogan: '将讨论结论整理为结构化规格说明与可独立验证的纵向特性工单。',
    painPoint: "传统任务拆解常按'建表->写接口->写前端'横向切分，导致阶段产物无法独立验证。",
    mechanism: [
      '收敛讨论过程，提炼清晰的输入/输出契约与验收标准',
      '按纵向业务切片（Tracer Bullet）拆分工单，确保每个 Ticket 都能端到端验证',
      '明确标注每个工单的前置依赖（Blocked-by）关系',
    ],
    beforeTerminal:
      '拆解任务：\nTicket 1: 创建全部 8 张数据库表\nTicket 2: 编写全部 15 个后端 API\nTicket 3: 联调前端（直到最后一天才发现表结构设计错了）',
    afterTerminal:
      'User: /to-tickets\nAgent 生成纵向验证工单：\nTicket 01 [端到端最小闭环]: 单字段创建与列表展示 (含最小 Migration + API + UI + E2E)\nTicket 02 [依赖于 #01]: 批量过滤与权限拦截',
  },
  {
    id: 'ponytail',
    name: 'Ponytail 5',
    repo: 'DietrichGebert/ponytail',
    category: 'stage-3',
    categoryLabel: 'Stage 03 · 工程约束',
    badge: '编码约束层',
    metric: '抑制过度设计与冗余',
    slogan: '遵循极简工程原则：优先复用现有代码与原生能力，避免过度封装。',
    painPoint: 'AI 容易产生过度工程（Over-engineering），简单功能也倾向于编写复杂抽象或引入新依赖。',
    mechanism: [
      '引入决策阶梯（Decision Ladder）：依次确认需求必要性、现有代码复用与原生 API 能力',
      '遵循 YAGNI 原则，避免为未发生的假设需求创建抽象层、Wrapper 和工具类',
      '提供 /ponytail-review 与 /ponytail-audit 辅助识别并精简冗余代码',
    ],
    docPath: 'docs/skills/ponytail/技能快速入手.md',
    beforeTerminal:
      'User: 加个日期选择输入框。\nAgent: 已安装 `flatpickr`、`date-fns`，新建 `DatePickerFactory.tsx`、`useDateAdapter.ts` 等 4 个文件共 320 行代码。',
    afterTerminal:
      'User: 加个日期选择输入框。\nAgent [Ponytail Ladder Step 3 - 优先使用平台原生能力]:\n直接渲染原生 `<input type="date" />`（1 行代码，零依赖，支持移动端原生选择器）。',
  },
  {
    id: 'superpowers',
    name: 'Superpowers',
    repo: 'obra/superpowers',
    category: 'stage-3',
    categoryLabel: 'Stage 03 · 工程约束',
    badge: 'TDD & 子代理工作流',
    metric: '测试先行与独立审查',
    slogan: '标准化工程质量工作流：遵循测试驱动开发（TDD），通过独立子代理执行审查。',
    painPoint: "缺乏流程约束时，Agent 可能跳过测试执行，或编写流于形式的断言。",
    mechanism: [
      '执行 Red-Green-Refactor 流程：先确认测试失败（RED），再编写最小业务实现（GREEN）',
      'Subagent-Driven Development：每个子任务由独立上下文的子代理执行，减少上下文干扰',
      '双阶段审查：依次完成 Spec 合规性审查与代码质量审查',
    ],
    docPath: 'docs/skills/superpowers/技能快速入手.md',
    beforeTerminal:
      "Agent: 功能已实现，我也顺便补了单元测试，全部通过！\n(实际上断言仅写了 `expect(true).toBe(true)`，未覆盖核心逻辑)",
    afterTerminal:
      'Agent [Superpowers TDD Gate]:\n1. [RED] 编写测试 `auth.spec.ts` -> 运行失败 (Expected 401, got 200) ✅\n2. [GREEN] 编写最小拦截逻辑 -> 运行通过 ✅\n3. [REVIEW] 启动独立 Review Subagent 校验契约合规性...',
  },
  {
    id: 'codegraph',
    name: 'CodeGraph / Ctxo',
    repo: 'context-labs/codegraph',
    category: 'layer-1',
    categoryLabel: 'Layer L1 · 代码结构感知',
    badge: 'AST 图谱 MCP',
    metric: '精准定位下游影响面',
    slogan: '基于 AST 符号调用图谱替代全仓文本搜索，快速梳理跨文件调用关系。',
    painPoint: '大型代码库中仅靠文本搜索查找引用，容易遗漏隐式调用方并消耗大量 Token。',
    mechanism: [
      '基于 Tree-sitter 构建本地代码库的 AST 依赖图与符号引用拓扑',
      '通过 MCP 暴露 `find_callers`、`impact_analysis` 等精准图查询工具',
      '以更低的 Token 消耗一次性向模型提供完整的跨文件调用链',
    ],
    beforeTerminal:
      'Agent: 执行 `grep -rn "calculateTax" .` (返回 180 条匹配，含大量注释和同名变量，消耗 12,000 tokens 仍漏掉动态引用)',
    afterTerminal:
      'Agent: 调用 `codegraph:impact_analysis("calculateTax")`\n返回精准拓扑：该函数被 `CheckoutService.ts:42` 与 `InvoiceWorker.ts:108` 直接调用，改动签名需同步更新这两处（消耗 450 tokens）。',
  },
  {
    id: 'context7',
    name: 'Context7',
    repo: 'upstash/context7',
    category: 'layer-1',
    categoryLabel: 'Layer L1 · 代码结构感知',
    badge: '实时官方文档注入',
    metric: '对齐当前版本官方文档',
    slogan: '按项目依赖版本实时拉取第三方库官方文档与代码示例，减少旧版接口误用。',
    painPoint: '模型预训练数据存在时间滞后，编写新版 Next.js / Tailwind v4 / SDK 时容易混用已废弃语法。',
    mechanism: [
      '识别当前项目 `package.json` 中的精确依赖版本号',
      '按需实时检索并注入清洗后的官方最新 API 签名与用法示例',
      '低侵入融入提示词流，减少因训练数据滞后产生的不存在配置项',
    ],
    beforeTerminal:
      'Agent: 正在使用旧版 API 配置路由... \nTerminal Error: `createBrowserRouter` configuration invalid in v7...',
    afterTerminal:
      'Agent [Context7 Active]: 已实时拉取当前版本官方文档片段，采用最新标准 API 签名一次性编译通过。',
  },
  {
    id: 'rtk',
    name: 'RTK (Rust Token Killer)',
    repo: 'rtk-ai/rtk',
    category: 'layer-0',
    categoryLabel: 'Layer L0 · 上下文与成本控制',
    badge: '输入侧降噪 CLI',
    metric: '精简 60%~90% 输入 Token',
    slogan: '位于 Agent 与 Shell 之间的命令行输出过滤器，收敛终端冗余日志。',
    painPoint: '执行 `cargo test` 或 `npm run build` 常输出大量重复堆栈和进度信息，快速占满上下文窗口。',
    mechanism: [
      '透明拦截 git、test、build、linter 等高频命令行输出',
      '自动折叠全绿通过的测试项，剥离 ANSI 颜色码与重复调用栈，仅保留报错核心上下文',
      '内置 `rtk gain` 统计视图，量化记录节省的 Token 数量与成本开销',
    ],
    beforeTerminal:
      '$ npm test\nPASS src/a.test.ts (120 lines...)\nPASS src/b.test.ts (340 lines...)\n[...4,800 行冗余输出进入上下文，消耗 38,500 Tokens，触发上下文压缩...]',
    afterTerminal:
      '$ rtk npm test\n✅ 42 passed (folded) | ❌ 1 failed:\n  FAIL src/auth.test.ts > login > should reject expired token\n  AssertionError: expected 200 to be 401 (at auth.test.ts:54)\n[RTK Compressed: 38,500 -> 620 Tokens (-98.4%)]',
  },
  {
    id: 'caveman',
    name: 'Caveman (/caveman)',
    repo: 'JuliusBrussee/caveman',
    category: 'layer-0',
    categoryLabel: 'Layer L0 · 上下文与成本控制',
    badge: '输出侧文本精简',
    metric: '精简非必要自然语言输出',
    slogan: '精简模型回复中的寒暄与铺垫，聚焦代码实现与关键技术说明。',
    painPoint: '模型默认回复常带有大段客套寒暄、过渡句和重复总结，既消耗输出 Token 又拉长响应时间。',
    mechanism: [
      '省略寒暄语（Sure! I\'d be happy to...）、礼貌套话与冗长铺垫',
      '代码块、命令与技术准确性保持原样，仅压缩自然语言解释',
      '支持 Lite / Full / Ultra 多档精简级别，并提供 CLAUDE.md 规则精简辅助',
    ],
    beforeTerminal:
      "Agent: 太好了！我非常乐意帮您排查这个 React 组件重渲染的问题。经过我对代码的仔细分析，我发现原因在于您在父组件中定义了一个内联对象，这导致每次父组件更新时引用地址都会变化...(此处省略 200 字)...希望这能帮到您！",
    afterTerminal:
      'Agent [Caveman Ultra]:\nBug: inline object in `Parent.tsx:24` breaks `React.memo`.\nFix: wrap in `useMemo` or hoist static object outside component.\nDone.',
  },
]
