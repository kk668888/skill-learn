/**
 * 将全部可浏览 Markdown 和可安装技能源码流式写入同一个 ZIP 响应。
 * 条目来自两份受限清单；每个源流按需打开，并在客户端取消时主动关闭。
 */
import {
  closeSync, constants, createReadStream, fstatSync, lstatSync, openSync, realpathSync, statSync,
} from 'node:fs'
import type { ReadStream, Stats } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import type { PassThrough } from 'node:stream'
import type { Response } from 'express'
import yazl from 'yazl'
import { scanProject } from './scanner'
import { scanInstallableFiles } from './archive-inventory'

interface Entry {
  absolute: string
  relative: string
  stats: Stats
}

/**
 * 在打开前后分别校验路径和文件身份：拒绝最后一段符号链接，要求真实路径仍
 * 位于项目根内，并用已打开句柄的 dev/ino 对照检查，避免归档再按路径重开。
 */
function openVerifiedFile(rootReal: string, absolute: string): { handle: number; stats: Stats } {
  if (!lstatSync(absolute).isFile()) throw new Error('归档条目不是普通文件')
  const resolved = realpathSync(absolute)
  const underRoot = relative(rootReal, resolved)
  if (underRoot === '..' || underRoot.startsWith(`..${sep}`) || isAbsolute(underRoot)) {
    throw new Error('归档条目越过项目根目录')
  }
  const expected = statSync(resolved)
  const handle = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const stats = fstatSync(handle)
    if (!stats.isFile() || stats.dev !== expected.dev || stats.ino !== expected.ino) {
      throw new Error('归档文件在校验时发生变化')
    }
    return { handle, stats }
  } catch (error) {
    closeSync(handle)
    throw error
  }
}

/** scanPaths 可注入，仅供故障测试精确模拟“扫描后文件消失”。 */
export function sendMarkdownArchive(
  root: string,
  res: Response,
  scanPaths: typeof scanProject = scanProject,
): void {
  try {
    const rootReal = realpathSync(root)
    // 技能目录中的 Markdown 同时被阅读扫描器和安装清单命中，Set 保证只打包一次。
    const paths = [...new Set([...scanPaths(root), ...scanInstallableFiles(root)])].sort()
    const entries: Entry[] = paths.map((relativePath) => {
      const absolute = join(root, ...relativePath.split('/'))
      // 先完成所有预检，使常见缺失/不可读错误能在 ZIP 响应开始前返回 JSON。
      const { handle, stats } = openVerifiedFile(rootReal, absolute)
      closeSync(handle)
      return { absolute, relative: relativePath, stats }
    })

    const zip = new yazl.ZipFile()
    const output = zip.outputStream as PassThrough
    const active = new Set<ReadStream>()
    let cancelled = false
    const cancel = (error?: Error) => {
      if (cancelled) return
      cancelled = true
      // yazl 不会从输出流销毁自动级联到源文件；显式关闭才能释放文件句柄。
      for (const source of active) source.destroy()
      output.destroy()
      if (!res.destroyed) res.destroy(error)
    }

    // 监听器必须早于 addReadStreamLazy：它可能立即请求首个源流。
    zip.on('error', (error: Error) => cancel(error))
    output.on('error', (error: Error) => cancel(error))
    res.once('close', () => { if (!res.writableEnded) cancel() })

    for (const entry of entries) {
      zip.addReadStreamLazy(entry.relative, {
        size: entry.stats.size,
        mtime: entry.stats.mtime,
        mode: entry.stats.mode,
      }, (callback) => {
        if (cancelled) return callback(new Error('下载已取消'), null as never)
        try {
          // 实际读取时重新校验，随后由同一个 fd 创建流；不让 ZIP 库按路径重开。
          const { handle, stats } = openVerifiedFile(rootReal, entry.absolute)
          if (stats.size !== entry.stats.size) {
            closeSync(handle)
            throw new Error('归档文件大小已变化')
          }
          const source = createReadStream(entry.absolute, { fd: handle, autoClose: true })
          active.add(source)
          source.once('close', () => active.delete(source))
          source.once('error', (error) => zip.emit('error', error))
          callback(null, source)
        } catch (error) {
          callback(error as Error, null as never)
        }
      })
      if (cancelled) return
    }

    // 固定文件名避免响应头注入；no-store 避免共享设备缓存整份资料。
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="skill-learn-bundle.zip"')
    res.setHeader('Cache-Control', 'no-store')
    output.pipe(res)
    zip.end()
  } catch {
    if (res.headersSent || res.destroyed) res.destroy()
    else res.status(500).json({ error: '打包完整资料失败，请检查项目文件后重试' })
  }
}
