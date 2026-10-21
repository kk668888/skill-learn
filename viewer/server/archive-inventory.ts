/**
 * 为完整下载包列出安装所需的文件。查看器目录扫描仍只服务于 Markdown 阅读；
 * 这里单独扫描 skills/，让安装脚本需要的程序、资源和命令随同源码一起离线保存。
 */
import { lstatSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 只把技能源码树中的普通文件加入清单；隐藏项和依赖目录不属于可分发源码。
 * Dirent 对符号链接的 isFile/isDirectory 均为 false，因此不会递归到链接目标。
 * 归档读取阶段还会重新核对文件身份，以防清单生成后路径被替换。
 */
export function scanInstallableFiles(root: string): string[] {
  const files: string[] = []
  const skillsRoot = join(root, 'skills')

  try {
    const stats = lstatSync(skillsRoot)
    if (!stats.isDirectory()) throw new Error('技能源码目录不是普通目录')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    // 空的临时项目允许下载空 ZIP，供无资料时正常显示下载结果。
    return installerPaths(root, files)
  }

  walk(skillsRoot, ['skills'])
  return installerPaths(root, files)

  /** 路径片段直接来自目录项，归档路径统一使用正斜杠以保持跨平台一致。 */
  function walk(absolute: string, segments: string[]): void {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const child = join(absolute, entry.name)
      const childSegments = [...segments, entry.name]
      if (entry.isDirectory()) walk(child, childSegments)
      else if (entry.isFile()) files.push(childSegments.join('/'))
    }
  }
}

/**
 * 安装脚本位于 offline/ 内。若技能文件已经存在却缺少脚本，就在开始
 * 发送 ZIP 前抛错，避免用户收到一个外观正常、解压后却无法安装的包。
 */
function installerPaths(root: string, files: string[]): string[] {
  try {
    if (!lstatSync(join(root, 'offline', 'install-skills.mjs')).isFile()) {
      throw new Error('技能安装脚本不是普通文件')
    }
    // 反向缺失同样是坏包：只有脚本、没有技能源码时，--list 会显示零套。
    if (files.length === 0) throw new Error('存在安装脚本，但找不到技能源码')
    files.push('offline/install-skills.mjs')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    if (files.length > 0) throw new Error('技能源码存在，但缺少 install-skills.mjs')
  }
  return files.sort()
}
