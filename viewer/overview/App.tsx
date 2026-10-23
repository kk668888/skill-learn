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
import { ThemeToggle } from './ThemeToggle'
import { applyTheme, initTheme, oppositeTheme, persistTheme, type Theme } from './theme'

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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        dimmed ? 'scale-[0.98] border-transparent bg-slate-500/15 opacity-25 grayscale' : '',
        !dimmed && selected
          ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
          : '',
        !dimmed && !selected
          ? 'border-line bg-card/80 hover:border-line-strong hover:bg-card'
          : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={15}
          className={`shrink-0 transition ${
            selected ? 'text-accent-text' : 'text-faint group-hover:text-accent/80'
          }`}
        />
        <span
          className={`truncate font-display text-[14px] font-semibold ${
            selected ? 'text-heading' : 'text-fg'
          }`}
        >
          {tool.name}
        </span>
      </div>
      <div
        className={`mt-1 truncate text-xs transition ${
          selected ? 'text-accent-text/90' : 'text-faint group-hover:text-fg-muted'
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
          <span className="font-mono text-xs font-bold text-accent">{stage.num}</span>
          <h3 className="font-display text-[15px] font-semibold text-heading">{stage.title}</h3>
        </div>
        <p className="mt-1 text-xs leading-snug text-faint">{stage.pain}</p>
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
          <span className="font-mono text-xs font-bold text-accent">{track.tag}</span>
          <h3 className="text-sm font-semibold text-heading">{track.title}</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-faint">{track.desc}</p>
      </div>
      <div className={`grid flex-1 gap-2.5 ${cards.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {cards.map((t) => (
          <ToolCard key={t.id} tool={t} state={cardState(t.id)} />
        ))}
      </div>
    </section>
  )
}

/** 极简代码对比块：左边框色标 + 独立深色终端底（两套主题下均保持深底） */
function TerminalWindow({ kind, title, text }: { kind: 'bad' | 'good'; title: string; text: string }) {
  const bad = kind === 'bad'
  return (
    <div className={`border-l-2 pl-3 ${bad ? 'border-bad/70' : 'border-good/70'}`}>
      <div
        className={`mb-1 font-mono text-[11px] font-medium ${
          bad ? 'text-bad/85' : 'text-good/85'
        }`}
      >
        {title}
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-code p-3 font-mono text-xs leading-relaxed text-slate-200">
        {text}
      </pre>
    </div>
  )
}

function Inspector({ tool }: { tool: Tool }) {
  return (
    <div className="p-5 lg:p-6">
      <div className="mb-2 flex items-center justify-between font-mono text-xs text-faint">
        <span className="text-accent/90">{tool.categoryLabel}</span>
        <span>{tool.repo}</span>
      </div>

      {/* 第一视觉焦点：工具名 + 一句话核心定位 */}
      <h2 className="font-display text-2xl font-bold text-heading">{tool.name}</h2>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-fg">{tool.slogan}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-faint">{tool.painPoint}</p>
      {tool.docPath && (
        <a
          href={`/#/?path=${encodeURIComponent(tool.docPath)}`}
          className="mt-4 inline-flex rounded-md border border-accent/40 px-3 py-2 text-xs font-semibold text-accent-text transition hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          阅读完整技能文档 →
        </a>
      )}

      {/* 第二视觉焦点：终端前后效果对比（最直观的价值验证） */}
      <div className="mt-5 border-t border-line-soft pt-4">
        <h3 className="text-[11px] font-medium tracking-widest text-faint">效果对比</h3>
        <div className="mt-2.5 space-y-3">
          <TerminalWindow kind="bad" title="未使用时" text={tool.beforeTerminal} />
          <TerminalWindow kind="good" title={`启用 ${tool.name} 后`} text={tool.afterTerminal} />
        </div>
      </div>

      {/* 第三级补充：核心机制 */}
      <div className="mt-5 border-t border-line-soft pt-4">
        <h3 className="text-[11px] font-medium tracking-widest text-faint">核心机制</h3>
        <ol className="mt-2 space-y-1.5">
          {tool.mechanism.map((m, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-fg-secondary">
              <span className="shrink-0 font-mono text-faint">·</span>
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
  // 主题状态：挂载时从 localStorage 恢复（默认白天），切换后同步 DOM 与持久化
  const [theme, setTheme] = useState<Theme>(() => initTheme())

  function toggleTheme() {
    // 副作用（DOM 写入、持久化）必须在 updater 之外执行：
    // React 18 StrictMode 会双调用 updater，updater 必须是纯函数；
    // 本函数只由点击事件调用，读取闭包内的 theme 无 stale closure 风险。
    const next = oppositeTheme(theme)
    applyTheme(next)
    persistTheme(next)
    setTheme(next)
  }

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
    <div className="flex min-h-screen flex-col bg-page text-sm text-fg lg:h-screen lg:overflow-hidden">
      <header className="z-20 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-header px-5 py-3 lg:h-14 lg:flex-nowrap lg:py-0">
        <div className="flex shrink-0 items-center gap-2.5">
          <DraftingCompass size={18} className="text-accent" />
          <span className="font-display text-[15px] font-bold tracking-wide text-heading">
            AI 工程工具矩阵
          </span>
          <span className="hidden font-mono text-xs text-faint sm:inline">v2.5</span>
        </div>

        <nav className="flex flex-wrap items-center gap-1" aria-label="场景配方切换">
          <span className="mr-1 text-xs font-medium text-fg-muted">按场景聚焦：</span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key, i) => {
            const active = preset === key
            return (
              <button
                key={key}
                onClick={() => setPreset(key)}
                aria-pressed={active}
                className={`rounded-md px-2.5 py-1 text-[13px] leading-none transition ${
                  active
                    ? 'bg-accent/15 font-semibold text-accent-text ring-1 ring-accent/40'
                    : 'text-fg-muted hover:bg-hover-fill hover:text-fg'
                }`}
              >
                {PRESETS[key].label}
                <span className="ml-1 font-mono text-[11px] opacity-60">[{i + 1}]</span>
              </button>
            )
          })}
        </nav>

        {/* 主题切换固定在顶栏最右；窄屏换行时 ml-auto 保证靠右对齐 */}
        <div className="ml-auto flex shrink-0 items-center">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

      </header>

      <section className="border-b border-line bg-hero px-5 py-7 lg:px-6 lg:py-8" aria-labelledby="overview-title">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 font-mono text-xs font-semibold tracking-widest text-accent-text">SKILL-LEARN / 学习导航</p>
            <h1 id="overview-title" className="font-display text-2xl font-bold tracking-tight text-heading sm:text-3xl">从需求澄清开始，理解 AI 开发工作流</h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">跟着一个实例学习技能如何协作，或直接进入文库查阅中文文档。下方地图帮助你找到每个工具在流程中的位置。</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:shrink-0">
            <a href={`/#/?path=${encodeURIComponent('docs/skills/grill/技能快速入手.md')}`} className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-hero">开始学习 →</a>
            <a href="/" className="inline-flex items-center justify-center rounded-md border border-line-strong px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-hero">浏览技能文库 ↗</a>
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
              preset === 'all' ? 'text-fg-muted' : 'font-medium text-accent-text'
            }`}
          >
            {PRESETS[preset].tip}
          </p>

          {/* 区块 A：横向三阶段工作流（单一容器 + 纵向三列分割线） */}
          <div className="mb-6">
            <h2 className="mb-2 font-mono text-[11px] font-medium tracking-widest text-faint">
              01 · 研发阶段流水线
            </h2>
            <div className="grid grid-cols-1 divide-y divide-line-soft rounded-xl border border-line bg-panel md:grid-cols-3 md:divide-x md:divide-y-0">
              <StageColumn stage={STAGES[0]} cardsOf={cardsOf} cardState={cardState} />
              <StageColumn stage={STAGES[1]} cardsOf={cardsOf} cardState={cardState} />
              <StageColumn stage={STAGES[2]} cardsOf={cardsOf} cardState={cardState} />
            </div>
          </div>

          {/* 区块 B：全流程基础支撑底座（单一容器 + 横向两行分割线） */}
          <div>
            <h2 className="mb-2 font-mono text-[11px] font-medium tracking-widest text-faint">
              02 · 全流程常驻底座
            </h2>
            <div className="divide-y divide-line-soft rounded-xl border border-line bg-panel">
              {TRACKS.map((track) => (
                <Track key={track.tag} track={track} cardsOf={cardsOf} cardState={cardState} />
              ))}
            </div>
          </div>
        </main>

        {/* ── 区域 3：右侧选中工具详情抽屉（独立浅色层级面板） ─── */}
        <aside
          className="w-full shrink-0 border-t border-line bg-aside lg:h-full lg:w-[38%] lg:min-w-[400px] lg:overflow-y-auto lg:border-l lg:border-t-0"
          aria-label="工具详情"
        >
          <Inspector key={selectedTool.id} tool={selectedTool} />
        </aside>
      </div>

    </div>
  )
}
