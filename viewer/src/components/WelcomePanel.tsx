/** 无文档选中时的入口：统计、按套件导航、最近打开。 */
import { useMemo } from 'react'
import type { FileNode, SuiteNode, TreeRoot } from '../../shared/types'
import { collectFiles, collectSkills } from '../lib/filter'

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

export function WelcomePanel({ tree, recentPaths, onNavigate }: WelcomePanelProps) {
  const suites = tree.filter((node): node is SuiteNode => node.type === 'suite')
  const allFiles = useMemo(() => collectFiles(tree), [tree])
  const fileByPath = useMemo(() => new Map(allFiles.map((file) => [file.path, file])), [allFiles])
  const recentFiles = recentPaths.flatMap((path) => {
    const file = fileByPath.get(path)
    return file ? [file] : []
  })

  return (
    <div className="welcome">
      <header className="welcome-header">
        <h1>skill-learn 文档查看器</h1>
        <p>从套件开始，阅读技能源码与中文讲解。</p>
      </header>
      <div className="welcome-stats" aria-label="文档统计">
        <div><strong>{suites.length}</strong><span>套件</span></div>
        <div><strong>{collectSkills(tree).length}</strong><span>技能</span></div>
        <div><strong>{allFiles.length}</strong><span>文档</span></div>
      </div>
      <section className="welcome-section" aria-labelledby="suite-heading">
        <h2 id="suite-heading">浏览套件</h2>
        <div className="suite-cards">
          {suites.map((suite) => {
            const target = entryFile(suite)
            return (
              <button type="button" className="suite-card" key={suite.id}
                disabled={!target} onClick={() => target && onNavigate(target.path)}>
                <span className="suite-card-name">{suite.title}</span>
                <span className="suite-card-count">{collectSkills(suite.children).length} 个技能 · {collectFiles(suite.children).length} 篇文档</span>
              </button>
            )
          })}
        </div>
      </section>
      {recentFiles.length > 0 && (
        <section className="welcome-section" aria-labelledby="recent-heading">
          <h2 id="recent-heading">最近打开</h2>
          <div className="recent-list">
            {recentFiles.map((file) => (
              <button type="button" className="recent-item" key={file.path} onClick={() => onNavigate(file.path)}>
                <span>{file.title}</span><small>{file.path}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
