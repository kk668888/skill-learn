import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  DraftingCompass,
  FileSearch,
  FileText,
  HelpCircle,
  ListChecks,
  Minimize2,
  Network,
  Scissors,
  ShieldCheck,
  Terminal as TerminalIcon,
} from 'lucide-react'
import { PRESETS, STAGES, TOOLS, TRACKS, type PresetKey, type Tool } from './data'

const ICONS: Record<string, LucideIcon> = {
  'grill-me': HelpCircle,
  'grill-with-docs': FileSearch,
  openspec: FileText,
  'to-spec': ListChecks,
  ponytail: Scissors,
  superpowers: ShieldCheck,
  codegraph: Network,
  context7: BookOpen,
  rtk: TerminalIcon,
  caveman: Minimize2,
}

interface CardState {
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
}

/** 工具卡：突出工具名，弱化未选中态的副标题，使视线第一时间锁定工具本身 */
function ToolCard({ tool, state }: { tool: Tool; state: CardState }) {
  const { selected, dimmed } = state
  const Icon = ICONS[tool.id]
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      data-testid="tool-card"
      data-selected={selected}
      onClick={() => state.onSelect(tool.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          state.onSelect(tool.id)
        }
      }}
      className={[
        'group relative min-w-0 cursor-pointer rounded-lg border px-3.5 py-2.5 text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
        dimmed ? 'scale-[0.98] border-transparent bg-slate-900/20 opacity-25 grayscale' : '',
        !dimmed && selected
          ? 'border-sky-400 bg-sky-500/15 shadow-[0_0_0_1px_rgba(56,189,248,0.3)]'
          : '',
        !dimmed && !selected
          ? 'border-slate-800 bg-[#0E131B]/80 hover:border-slate-600 hover:bg-[#0E131B]'
          : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={15}
          className={`shrink-0 transition ${
            selected ? 'text-sky-300' : 'text-slate-500 group-hover:text-sky-400/80'
          }`}
        />
        <span
          className={`truncate font-display text-[14px] font-semibold ${
            selected ? 'text-white' : 'text-slate-100'
          }`}
        >
          {tool.name}
        </span>
      </div>
      <div
        className={`mt-1 truncate text-xs transition ${
          selected ? 'text-sky-200/90' : 'text-slate-500 group-hover:text-slate-400'
        }`}
      >
        {tool.metric}
      </div>
    </div>
  )
}

/** 阶段列：突出阶段名，压暗痛点注解 */
function StageColumn({
  stage,
  cardsOf,
  cardState,
}: {
  stage: (typeof STAGES)[number]
  cardsOf: (cat: string) => Tool[]
  cardState: (id: string) => CardState
}) {
  return (
    <section className="flex flex-col p-4">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-sky-400">{stage.num}</span>
          <h3 className="font-display text-[15px] font-semibold text-white">{stage.title}</h3>
        </div>
        <p className="mt-1 text-xs leading-snug text-slate-500">{stage.pain}</p>
      </div>
      <div className="mt-auto flex flex-col gap-2.5">
        {cardsOf(stage.id).map((t) => (
          <ToolCard key={t.id} tool={t} state={cardState(t.id)} />
        ))}
      </div>
    </section>
  )
}

/** 底座轨道行：突出轨道名，将辅助说明弱化为次级注解 */
function Track({
  track,
  cardsOf,
  cardState,
}: {
  track: (typeof TRACKS)[number]
  cardsOf: (cat: string) => Tool[]
  cardState: (id: string) => CardState
}) {
  const cards = cardsOf(track.id)
  return (
    <section className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="sm:w-52 sm:shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-sky-400">{track.tag}</span>
          <h3 className="text-sm font-semibold text-white">{track.title}</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{track.desc}</p>
      </div>
      <div className={`grid flex-1 gap-2.5 ${cards.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {cards.map((t) => (
          <ToolCard key={t.id} tool={t} state={cardState(t.id)} />
        ))}
      </div>
    </section>
  )
}

/** 极简代码对比块：左边框色标 + 独立深色代码底 */
function TerminalWindow({ kind, title, text }: { kind: 'bad' | 'good'; title: string; text: string }) {
  const bad = kind === 'bad'
  return (
    <div className={`border-l-2 pl-3 ${bad ? 'border-red-400/70' : 'border-emerald-400/70'}`}>
      <div
        className={`mb-1 font-mono text-[11px] font-medium ${
          bad ? 'text-red-300/80' : 'text-emerald-300/80'
        }`}
      >
        {title}
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0A0E14] p-3 font-mono text-xs leading-relaxed text-slate-200">
        {text}
      </pre>
    </div>
  )
}

function Inspector({ tool }: { tool: Tool }) {
  return (
    <div className="p-5 lg:p-6">
      <div className="mb-2 flex items-center justify-between font-mono text-xs text-slate-500">
        <span className="text-sky-400/90">{tool.categoryLabel}</span>
        <span>{tool.repo}</span>
      </div>

      {/* 第一视觉焦点：工具名 + 一句话核心定位 */}
      <h2 className="font-display text-2xl font-bold text-white">{tool.name}</h2>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-100">{tool.slogan}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{tool.painPoint}</p>
      {tool.docPath && (
        <a
          href={`/library/#/?path=${encodeURIComponent(tool.docPath)}`}
          className="mt-4 inline-flex rounded-md border border-sky-400/40 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:border-sky-300 hover:bg-sky-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          阅读完整技能文档 →
        </a>
      )}

      {/* 第二视觉焦点：终端前后效果对比（最直观的价值验证） */}
      <div className="mt-5 border-t border-slate-800/80 pt-4">
        <h3 className="text-[11px] font-medium tracking-widest text-slate-500">效果对比</h3>
        <div className="mt-2.5 space-y-3">
          <TerminalWindow kind="bad" title="未使用时" text={tool.beforeTerminal} />
          <TerminalWindow kind="good" title={`启用 ${tool.name} 后`} text={tool.afterTerminal} />
        </div>
      </div>

      {/* 第三级补充：核心机制 */}
      <div className="mt-5 border-t border-slate-800/80 pt-4">
        <h3 className="text-[11px] font-medium tracking-widest text-slate-500">核心机制</h3>
        <ol className="mt-2 space-y-1.5">
          {tool.mechanism.map((m, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
              <span className="shrink-0 font-mono text-slate-500">·</span>
              <span>{m}</span>
            </li>
          ))}
        </ol>
      </div>

    </div>
  )
}

export default function App() {
  const [selectedId, setSelectedId] = useState('rtk')
  const [preset, setPreset] = useState<PresetKey>('all')

  const presetIds = useMemo(() => new Set(PRESETS[preset].ids), [preset])
  const selectedTool = TOOLS.find((t) => t.id === selectedId) ?? TOOLS[0]

  // 数字键 [1]-[4] 快速切换场景配方
  useEffect(() => {
    const map: Record<string, PresetKey> = {
      '1': 'all',
      '2': 'brownfield',
      '3': 'greenfield',
      '4': 'cost-killer',
    }
    const onKey = (e: KeyboardEvent) => {
      if (map[e.key]) setPreset(map[e.key])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function cardState(id: string): CardState {
    return {
      selected: id === selectedId,
      dimmed: preset !== 'all' && !presetIds.has(id),
      onSelect: setSelectedId,
    }
  }

  const cardsOf = (cat: string) => TOOLS.filter((t) => t.category === cat)

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F17] text-sm text-slate-200 lg:h-screen lg:overflow-hidden">
      <header className="z-20 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-800 bg-[#080B11] px-5 py-3 lg:h-14 lg:flex-nowrap lg:py-0">
        <div className="flex shrink-0 items-center gap-2.5">
          <DraftingCompass size={18} className="text-sky-400" />
          <span className="font-display text-[15px] font-bold tracking-wide text-white">
            AI 工程工具矩阵
          </span>
          <span className="hidden font-mono text-xs text-slate-500 sm:inline">v2.5</span>
        </div>

        <nav className="flex flex-wrap items-center gap-1" aria-label="场景配方切换">
          <span className="mr-1 text-xs font-medium text-slate-400">按场景聚焦：</span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key, i) => {
            const active = preset === key
            return (
              <button
                key={key}
                onClick={() => setPreset(key)}
                aria-pressed={active}
                className={`rounded-md px-2.5 py-1 text-[13px] leading-none transition ${
                  active
                    ? 'bg-sky-400/20 font-semibold text-sky-300 ring-1 ring-sky-400/40'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`}
              >
                {PRESETS[key].label}
                <span className="ml-1 font-mono text-[11px] opacity-60">[{i + 1}]</span>
              </button>
            )
          })}
        </nav>

      </header>

      <section className="border-b border-slate-800 bg-[#0E1520] px-5 py-7 lg:px-6 lg:py-8" aria-labelledby="overview-title">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 font-mono text-xs font-semibold tracking-widest text-sky-300">SKILL-LEARN / 学习导航</p>
            <h1 id="overview-title" className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">从需求澄清开始，理解 AI 开发工作流</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">跟着一个实例学习技能如何协作，或直接进入文库查阅中文文档。下方地图帮助你找到每个工具在流程中的位置。</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:shrink-0">
            <a href={`/library/#/?path=${encodeURIComponent('docs/skills/grill/技能快速入手.md')}`} className="inline-flex items-center justify-center rounded-md bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1520]">开始学习 →</a>
            <a href="/library/" className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1520]">浏览技能文库 ↗</a>
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ── 区域 2：左侧全景矩阵画布（上下两大正交区块） ─────── */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4 lg:px-6 lg:py-5">
          {/* 顶部当前场景导读（去除多余交互提示噪音） */}
          <p
            data-testid="tip"
            className={`mb-5 text-[13px] ${
              preset === 'all' ? 'text-slate-400' : 'font-medium text-sky-200'
            }`}
          >
            {PRESETS[preset].tip}
          </p>

          {/* 区块 A：横向三阶段工作流（单一容器 + 纵向三列分割线） */}
          <div className="mb-6">
            <h2 className="mb-2 font-mono text-[11px] font-medium tracking-widest text-slate-500">
              01 · 研发阶段流水线
            </h2>
            <div className="grid grid-cols-1 divide-y divide-slate-800/80 rounded-xl border border-slate-800/90 bg-[#121824] md:grid-cols-3 md:divide-x md:divide-y-0">
              <StageColumn stage={STAGES[0]} cardsOf={cardsOf} cardState={cardState} />
              <StageColumn stage={STAGES[1]} cardsOf={cardsOf} cardState={cardState} />
              <StageColumn stage={STAGES[2]} cardsOf={cardsOf} cardState={cardState} />
            </div>
          </div>

          {/* 区块 B：全流程基础支撑底座（单一容器 + 横向两行分割线） */}
          <div>
            <h2 className="mb-2 font-mono text-[11px] font-medium tracking-widest text-slate-500">
              02 · 全流程常驻底座
            </h2>
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/90 bg-[#121824]">
              {TRACKS.map((track) => (
                <Track key={track.tag} track={track} cardsOf={cardsOf} cardState={cardState} />
              ))}
            </div>
          </div>
        </main>

        {/* ── 区域 3：右侧选中工具详情抽屉（独立浅色层级面板） ─── */}
        <aside
          className="w-full shrink-0 border-t border-slate-800 bg-[#151D2B] lg:h-full lg:w-[38%] lg:min-w-[400px] lg:overflow-y-auto lg:border-l lg:border-t-0"
          aria-label="工具详情"
        >
          <Inspector key={selectedTool.id} tool={selectedTool} />
        </aside>
      </div>

    </div>
  )
}
