/**
 * scanner 单元测试：目录扫描与排除规则。
 *
 * 用临时目录构造一个微型项目结构，验证：
 * - 只扫 includeDirs（技能、AI 文章、自建普通文档）+ 根级 *.md
 * - 跳过 node_modules 与点开头的隐藏目录
 * - 返回正斜杠相对路径且排序确定
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanProject } from '../server/scanner'

let root = ''

beforeAll(() => {
  // 构造微型项目：
  // <root>/skills/superpowers/a/SKILL.md            收
  // <root>/skills/superpowers/a/references/x.md     收
  // <root>/skills/node_modules/evil.md              排除（node_modules）
  // <root>/skills/.hidden/h.md                       排除（点开头目录）
  // <root>/docs/skills/superpowers/a-中文版.md       收
  // <root>/docs/ai-docs/README.md                   收（AI 文章入口）
  // <root>/README.md / CLAUDE.md                     收（根级 *.md）
  // <root>/viewer/index.html                         不在扫描范围
  // <root>/node_modules/x.md                         根级只看文件不看目录
  root = mkdtempSync(join(tmpdir(), 'viewer-scan-'))
  const mk = (...segs: string[]) => {
    const p = join(root, ...segs)
    mkdirSync(p, { recursive: true })
    return p
  }
  const put = (...segs: string[]) => writeFileSync(join(root, ...segs), '# test\n')

  mk('skills', 'superpowers', 'a', 'references')
  put('skills', 'superpowers', 'a', 'SKILL.md')
  put('skills', 'superpowers', 'a', 'references', 'x.md')
  mk('skills', 'node_modules')
  put('skills', 'node_modules', 'evil.md')
  mk('skills', '.hidden')
  put('skills', '.hidden', 'h.md')
  mk('docs', 'skills', 'superpowers')
  put('docs', 'skills', 'superpowers', 'a-中文版.md')
  mk('docs', 'ai-docs')
  put('docs', 'ai-docs', 'README.md')
  mk('docs', 'collections', '读书笔记')
  put('docs', 'collections', '读书笔记', '第一章.md')
  put('README.md')
  put('CLAUDE.md')
  mk('viewer')
  put('viewer', 'no.txt') // viewer 目录本身就不该被扫到
  mk('node_modules')
  put('node_modules', 'x.md')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('scanProject', () => {
  it('只返回 includeDirs 下的 md + 根级 md，路径为正斜杠相对路径', () => {
    const files = scanProject(root)
    expect(files).toEqual([
      'CLAUDE.md',
      'README.md',
      'docs/ai-docs/README.md',
      'docs/collections/读书笔记/第一章.md',
      'docs/skills/superpowers/a-中文版.md',
      'skills/superpowers/a/SKILL.md',
      'skills/superpowers/a/references/x.md',
    ])
  })

  it('结果排序确定（两次扫描一致）', () => {
    expect(scanProject(root)).toEqual(scanProject(root))
  })
})
