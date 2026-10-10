/**
 * 从 markdown 原文提取标题大纲（TOC 数据源）。
 *
 * 关键点：slug 必须与 rehype-slug 生成的锚点 id 一致——
 * 两边都用 github-slugger、按同样的顺序喂同样的文本，id 就能对上。
 * 所以这里要先把标题里的行内标记（**、`、链接等）剥掉再喂 slugger。
 */
import GithubSlugger from 'github-slugger'

export interface Heading {
  /** 层级 1-4 */
  depth: number
  /** 纯文本标题 */
  text: string
  /** 与页面锚点一致的 id */
  id: string
}

export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger()
  const headings: Heading[] = []
  let inFence = false
  let fenceChar = ''

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()

    // 围栏代码块的开/关（``` 或 ~~~，允许后面跟语言名）
    const fence = /^(`{3,}|~{3,})/.exec(trimmed)
    if (fence) {
      if (!inFence) {
        inFence = true
        fenceChar = fence[1]![0]!
      } else if (fence[1]![0]! === fenceChar) {
        inFence = false
      }
      continue
    }
    if (inFence) continue

    // ATX 标题：# 到 #### （更深的层级不进大纲，避免噪音）
    const heading = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      const text = stripInlineMarks(heading[2]!)
      if (text) headings.push({ depth: heading[1]!.length, text, id: slugger.slug(text) })
    }
  }
  return headings
}

/** 剥掉常见的行内 markdown 标记，让文本与渲染结果一致 */
function stripInlineMarks(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [文字](链接) → 文字
    .replace(/[*_`~]/g, '')
    .trim()
}
