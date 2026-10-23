/**
 * 技能速览守护测试：速览文档列出的技能集合必须与 skills/ 源码集合恒等。
 * 新增技能忘更新速览、或速览虚列技能时，这里给出缺失/多余名单。
 *
 * 解析约定（见 openspec/changes/add-skill-quick-reference/design.md）：
 * - 条目的唯一权威位置是表格首列，技能名一律反引号包裹；
 *   「容易混的几组」等散文里出现的技能名不计入条目（防对照引用被判虚列）
 * - opsx 短名走显式别名表，不做推导（规则对 propose/onboard/explore 不成立）
 * - 「怎么喊」列是编辑判断，不在守护范围（集合恒等归测试，行文质量归精修）
 */
import { expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// npm test 固定在 viewer/ 下运行，仓库根是上一级
const repoRoot = join(process.cwd(), '..')
const skillsDir = join(repoRoot, 'skills')
const docPath = join(repoRoot, 'docs', 'ai-docs', '技能速览.md')

/** opsx 短名 → SKILL.md 全名；推导规则对无 -change 后缀者不成立，显式列全 */
const OPSX_ALIASES: Record<string, string> = {
  'opsx:apply': 'openspec-apply-change',
  'opsx:archive': 'openspec-archive-change',
  'opsx:bulk-archive': 'openspec-bulk-archive-change',
  'opsx:continue': 'openspec-continue-change',
  'opsx:explore': 'openspec-explore',
  'opsx:ff': 'openspec-ff-change',
  'opsx:new': 'openspec-new-change',
  'opsx:onboard': 'openspec-onboard',
  'opsx:propose': 'openspec-propose',
  'opsx:sync': 'openspec-sync-specs',
  'opsx:update': 'openspec-update-change',
  'opsx:verify': 'openspec-verify-change',
}

/** 递归收集 skills/ 下所有 SKILL.md 的 name 字段（含 openspec 的嵌套目录） */
function collectSkillNames(): Set<string> {
  const names = new Set<string>()
  for (const entry of readdirSync(skillsDir, { recursive: true })) {
    const relative = String(entry).replace(/\\/g, '/')
    if (!relative.endsWith('/SKILL.md')) continue
    const content = readFileSync(join(skillsDir, relative), 'utf8')
    const match = content.match(/^name:\s*(.+)$/m)
    if (match) names.add(match[1].trim().replace(/^['"]|['"]$/g, ''))
  }
  return names
}

/** 提取速览文档表格首列的反引号技能名，映射为 SKILL.md 全名 */
function collectDocNames(): Set<string> {
  const doc = readFileSync(docPath, 'utf8')
  const names = new Set<string>()
  for (const line of doc.split(/\r?\n/)) {
    if (!line.trimStart().startsWith('|')) continue
    const firstCell = (line.split('|')[1] ?? '').trim()
    // 分隔行（---）与表头（无反引号）在此自然跳过
    const name = firstCell.match(/`([^`]+)`/)?.[1]
    if (!name) continue
    names.add(OPSX_ALIASES[name] ?? name)
  }
  return names
}

it('技能速览与 skills/ 的技能集合恒等（不漏不多）', () => {
  expect(existsSync(docPath), `速览文档应存在于 ${docPath}`).toBe(true)

  const skillNames = collectSkillNames()
  const docNames = collectDocNames()
  const missing = [...skillNames].filter((n) => !docNames.has(n)).sort()
  const extra = [...docNames].filter((n) => !skillNames.has(n)).sort()

  expect(missing, `速览缺失的技能（新增后忘更新？）: ${missing.join(', ') || '无'}`).toEqual([])
  expect(extra, `速览多列的技能（已删除或写错名？）: ${extra.join(', ') || '无'}`).toEqual([])
})
