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
import { verifyOfflineKit } from '../../offline-kit.mjs'

interface Entry {
  absolute: string
  relative: string
  stats: Stats
  rootReal: string
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
export async function sendMarkdownArchive(
  root: string,
  res: Response,
  scanPaths: typeof scanProject = scanProject,
): Promise<void> {
  let disposeSnapshot: (() => Promise<void>) | undefined
  try {
    const rootReal = realpathSync(root)
    // 技能目录中的 Markdown 同时被阅读扫描器和安装清单命中，Set 保证只打包一次。
    const installable = scanInstallableFiles(root)
    // 没有安装内容的空测试项目仍可下载空 ZIP。有安装脚本的项目必须先
    // 完整验证同级离线目录，随后只收录清单列出的文件及校验模块自身。
    const verified = installable.includes('install-skills.mjs')
      ? await verifyOfflineKit(join(root, 'offline-kit'), { snapshot: 'disk' })
      : null
    disposeSnapshot = verified?.dispose
    const snapshotReal = verified?.snapshotRoot ? realpathSync(verified.snapshotRoot) : null
    const offline = verified?.paths.map((name) => `offline-kit/${name}`) ?? []
    const paths = [...new Set([
      ...scanPaths(root), ...installable,
      ...(offline.length ? ['offline-kit.mjs', 'offline-installer.mjs', ...offline] : []),
    ])].sort()
    const entries: Entry[] = paths.map((relativePath) => {
      const offlineEntry = relativePath.startsWith('offline-kit/')
      const absolute = offlineEntry && verified?.snapshotRoot
        ? join(verified.snapshotRoot, ...relativePath.slice('offline-kit/'.length).split('/'))
        : join(root, ...relativePath.split('/'))
      // 先完成所有预检，使常见缺失/不可读错误能在 ZIP 响应开始前返回 JSON。
      // 离线条目从私有磁盘快照读取，始终是校验过的原字节；其他资料仍
      // 从项目根读取。两类条目在预检和真正打开源流时均校验路径及句柄。
      if (offlineEntry && !snapshotReal) throw new Error('离线归档快照缺失')
      const entryRoot = offlineEntry ? snapshotReal! : rootReal
      const { handle, stats } = openVerifiedFile(entryRoot, absolute)
      closeSync(handle)
      return { absolute, relative: relativePath, stats, rootReal: entryRoot }
    })

    const zip = new yazl.ZipFile()
    const output = zip.outputStream as PassThrough
    const active = new Set<ReadStream>()
    let cancelled = false
    let cleaning = false
    const cleanup = async () => {
      if (cleaning) return
      cleaning = true
      // 客户端中断时先等待所有已销毁源流关闭，再删除 Windows 上的临时
      // 文件；正常下载的 close 事件也走同一个清理入口。
      await Promise.all([...active].map((source) => new Promise<void>((resolve) => source.once('close', resolve))))
      await disposeSnapshot?.()
      disposeSnapshot = undefined
    }
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
    res.once('close', () => {
      if (!res.writableEnded) cancel()
      void cleanup().catch((error: Error) => console.error(`清理离线归档快照失败：${error.message}`))
    })

    for (const entry of entries) {
      zip.addReadStreamLazy(entry.relative, {
        size: entry.stats.size,
        mtime: entry.stats.mtime,
        mode: entry.stats.mode,
      }, (callback) => {
        if (cancelled) return callback(new Error('下载已取消'), null as never)
        try {
          // 实际读取时重新校验，随后由同一个 fd 创建流；不让 ZIP 库按路径重开。
          const { handle, stats } = openVerifiedFile(entry.rootReal, entry.absolute)
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
    await disposeSnapshot?.()
    if (res.headersSent || res.destroyed) res.destroy()
    else res.status(500).json({ error: '打包完整资料失败，请检查项目文件后重试' })
  }
}
