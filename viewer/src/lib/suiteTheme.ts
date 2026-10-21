/**
 * 套件识别映射的唯一来源：套件名 → 稳定 key（供 data-suite 属性与 CSS 变量）
 * 与欢迎页短语。未知套件一律回退 default，不因缺少映射隐藏内容。
 */
export type SuiteThemeKey =
  | 'openspec'
  | 'superpowers'
  | 'grill'
  | 'impeccable'
  | 'anthropics'
  | 'frontend-design-premium'
  | 'default'

const DESCRIPTIONS: Record<Exclude<SuiteThemeKey, 'default'>, string> = {
  openspec: '提案与变更',
  superpowers: '开发实践',
  grill: '深挖问题',
  impeccable: '设计质量',
  anthropics: '创建技能',
  'frontend-design-premium': '产品界面设计',
}

export function suiteKey(title: string | undefined): SuiteThemeKey {
  const normalized = title?.trim().toLowerCase()
  // hasOwn 而非 in：套件名叫 toString 时不能命中 Object 原型属性。
  return normalized && Object.hasOwn(DESCRIPTIONS, normalized) ? (normalized as SuiteThemeKey) : 'default'
}

export function suiteDescription(key: SuiteThemeKey): string {
  return key === 'default' ? '' : DESCRIPTIONS[key]
}
