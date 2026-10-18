/**
 * 扫描配置与项目根目录定位。
 *
 * 收录范围（与共识一致）：
 * - skills/、docs/skills/ 与 docs/ai-docs/ 三个目录（递归）
 * - 项目根级的 *.md（不递归）
 * 排除：.claude/、.agents/（安装副本，天然不在 includeDirs 内不会被走到）、
 *       node_modules、点开头的隐藏目录/文件、viewer/ 自身（同理不会走到）
 */
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

/** 项目根目录 = viewer/ 的上一级（skill-learn/） */
export const PROJECT_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)))

/** 递归扫描的目录（相对项目根） */
export const INCLUDE_DIRS = ['skills', 'docs/skills', 'docs/ai-docs']

/** 这些名字的目录在任何层级都被跳过 */
export const EXCLUDE_DIR_NAMES = ['node_modules']
