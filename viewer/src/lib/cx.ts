/** 拼接条件 class 的小工具：cx('a', cond && 'b') → "a b" */
export function cx(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ')
}
