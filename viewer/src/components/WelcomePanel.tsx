/** 无文档选中时的学习入口：引导语、继续卡片、按套件导航与最近打开。 */
import { useMemo } from 'react'
import type { FileNode, SuiteNode, TreeRoot } from '../../shared/types'
import { collectFiles, collectSkills, findFileContext } from '../lib/filter'
import { suiteDescription, suiteKey } from '../lib/suiteTheme'

interface WelcomePanelProps {
  tree: TreeRoot
  recentPaths: string[]
  onNavigate: (path: string) => void
}

/**
 * 欢迎页卡片以“首次上手”为首选入口；树构建器目前把这篇套件级文档
 * 作为普通文件节点收录，因此用完整相对路径识别，避免同名附属文件误命中。
 * 旧的总览与技能文档回退链继续保留，兼容尚未写快速入手的套件。
 */
function entryFile(suite: SuiteNode): FileNode | undefined {
  const files = collectFiles(suite.children)
  const quickStart = files.find((file) => file.path === `docs/skills/${suite.title}/技能快速入手.md`)
  if (quickStart) return quickStart
  const intro = files.find((file) => file.role === 'suite-intro')
  if (intro) return intro
  const firstSkill = collectSkills(suite.children)[0]
  const skillFiles = firstSkill ? collectFiles(firstSkill.children) : []
  return skillFiles.find((file) => file.role === 'zh')
    ?? skillFiles.find((file) => file.role === 'source')
    ?? files[0]
}

/** 继续卡片的目标：眉标区分“接着读”与“第一次”，没有可用入口时整卡不出现。 */
interface ContinueTarget {
  suite?: string
  eyebrow: string
  description: string
  action: string
  file: FileNode
}

export function WelcomePanel({ tree, recentPaths, onNavigate }: WelcomePanelProps) {
  const suites = tree.filter((node): node is SuiteNode => node.type === 'suite')
  const allFiles = useMemo(() => collectFiles(tree), [tree])
  const fileByPath = useMemo(() => new Map(allFiles.map((file) => [file.path, file])), [allFiles])
  const recentFiles = recentPaths.flatMap((path) => {
    const file = fileByPath.get(path)
    return file ? [file] : []
  })

  const recentFile = recentPaths.length > 0 ? fileByPath.get(recentPaths[0]) : undefined
  let continueTarget: ContinueTarget | undefined
  if (recentFile) {
    const suite = findFileContext(tree, recentFile.path)?.suite
    continueTarget = {
      suite,
      eyebrow: `继续上次阅读 · ${suite ?? '文档'}`,
      description: suiteDescription(suiteKey(suite)),
      action: '继续阅读 →',
      file: recentFile,
    }
  } else {
    // 没有最近记录时，按树序找第一套有可用入口的套件作为起点。
    for (const suite of suites) {
      const target = entryFile(suite)
      if (target) {
        continueTarget = {
          suite: suite.title,
          eyebrow: `从这套开始 · ${suite.title}`,
          description: suiteDescription(suiteKey(suite.title)),
          action: '开始阅读 →',
          file: target,
        }
        break
      }
    }
  }

  return (
    <div className="welcome">
      <header className="welcome-hero">
        <div>
          <p className="welcome-eyebrow">AI 工作流学习空间</p>
          <h1>选一条路径，<br />把方法学会。</h1>
          <p className="welcome-intro">
            从套件快速入手，跟做一次完整实践；再读源码与设计讲解，理解每一步为何存在。
          </p>
          <div className="welcome-metric" aria-label="文档统计">
            <b>{suites.length}</b> 套件 <b>{collectSkills(tree).length}</b> 技能 <b>{allFiles.length}</b> 文档
          </div>
        </div>
        {continueTarget && (
          <button type="button" className="continue-card" data-suite={suiteKey(continueTarget.suite)}
            onClick={() => onNavigate(continueTarget.file.path)}>
            <span className="continue-eyebrow">{continueTarget.eyebrow}</span>
            <strong>{continueTarget.file.title}</strong>
            {continueTarget.description && <small className="continue-desc">{continueTarget.description}</small>}
            <span className="continue-link">{continueTarget.action}</span>
          </button>
        )}
      </header>
      <section className="welcome-section" aria-labelledby="suite-heading">
        <div className="section-title">
          <h2 id="suite-heading">浏览套件</h2>
          <span>选择一套，进入它的快速入手</span>
        </div>
        <div className="suite-cards">
          {suites.map((suite) => {
            const target = entryFile(suite)
            const key = suiteKey(suite.title)
            const description = suiteDescription(key)
            return (
              <button type="button" className="suite-card" data-suite={key} key={suite.id}
                disabled={!target} onClick={() => target && onNavigate(target.path)}>
                <span className="suite-card-name">{suite.title}</span>
                {description && <span className="suite-card-desc">{description}</span>}
                <span className="suite-card-count">
                  {collectSkills(suite.children).length} 个技能 · {collectFiles(suite.children).length} 篇文档
                </span>
              </button>
            )
          })}
        </div>
      </section>
      {recentFiles.length > 0 && (
        <section className="welcome-section" aria-labelledby="recent-heading">
          <h2 id="recent-heading">最近打开</h2>
          <div className="recent-list">
            {recentFiles.map((file) => {
              const suite = findFileContext(tree, file.path)?.suite
              return (
                <button type="button" className="recent-item" key={file.path} onClick={() => onNavigate(file.path)}>
                  <span>{suite ? `${suite} · ${file.title}` : file.title}</span>
                  <small>最近打开</small>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
