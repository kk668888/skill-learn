/**
 * search 单元测试：全文搜索纯逻辑。
 *
 * 验证：大小写不敏感、中文子串、行号、
 * 单文件命中条数上限、结果文件数上限、长行截断、空查询。
 */
import { describe, it, expect } from 'vitest'
import { searchDocs } from '../server/search'
import type { SearchMatch } from '../shared/types'

const longLine = 'x'.repeat(300) + ' keyword ' + 'y'.repeat(300)

const entries = [
  { path: 'a.md', title: 'a', content: 'Hello World\nsecond line' },
  { path: 'b.md', title: 'b', content: '中文内容\n包含 KEYWORD 的一行' },
  {
    path: 'c.md',
    title: 'c',
    content: 'keyword first\nnope\nkeyword second\nkeyword third\nkeyword fourth\nkeyword fifth',
  },
  { path: 'd-long.md', title: 'd', content: longLine },
  { path: 'e1.md', title: 'e1', content: 'zzz keyword' },
  { path: 'e2.md', title: 'e2', content: 'zzz keyword' },
]

describe('searchDocs', () => {
  it('英文大小写不敏感，行号从 1 开始', () => {
    const res = searchDocs(entries, 'hello')
    expect(res).toHaveLength(1)
    expect(res[0].path).toBe('a.md')
    expect(res[0].matches[0].line).toBe(1)
    expect(res[0].matches[0].text).toContain('Hello World')
  })

  it('中文按子串匹配', () => {
    const res = searchDocs(entries, '中文')
    expect(res.map((r) => r.path)).toContain('b.md')
    const b = res.find((r) => r.path === 'b.md')!
    expect(b.matches[0].line).toBe(1)
  })

  it('单文件最多保留 maxMatchesPerFile 条命中（默认 3）', () => {
    const res = searchDocs(entries, 'keyword')
    const c = res.find((r) => r.path === 'c.md')!
    expect(c.matches).toHaveLength(3)
    // 保留的是靠前的命中
    expect(c.matches.map((m: SearchMatch) => m.line)).toEqual([1, 3, 4])
  })

  it('结果按路径排序且受 maxFiles 限制', () => {
    const res = searchDocs(entries, 'keyword', { maxFiles: 3 })
    expect(res).toHaveLength(3)
    // 排序确定：按 path 升序
    expect(res.map((r) => r.path)).toEqual([...res.map((r) => r.path)].sort())
  })

  it('超长行被截断，避免一整行撑爆界面', () => {
    const res = searchDocs(entries, 'keyword')
    const d = res.find((r) => r.path === 'd-long.md')!
    expect(d.matches[0].text.length).toBeLessThanOrEqual(161) // 160 字符 + 省略号
  })

  it('空查询 / 纯空白查询返回空结果', () => {
    expect(searchDocs(entries, '')).toEqual([])
    expect(searchDocs(entries, '   ')).toEqual([])
  })

  it('无命中返回空结果', () => {
    expect(searchDocs(entries, '不存在的关键词')).toEqual([])
  })
})
