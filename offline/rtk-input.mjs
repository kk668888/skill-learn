/**
 * 固定版本 RTK 发布 ZIP 的准备入口。先验证整个归档的官方摘要，再提取
 * 可执行文件与两份许可证；失败只清理本次临时目录，不触碰既有输入树。
 */
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';

export const RTK_ARCHIVE_SHA256 = 'c9a8f7a8bad471e64a343314168f38d2399a06fa327cdf5772fb0e645d99ea6f';
const REQUIRED = ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE'];

/** 支持测试传入夹具摘要；生产调用始终使用上方固定的官方 SHA-256。 */
export async function prepareRtkArchive(archive, destination, expectedSha256 = RTK_ARCHIVE_SHA256) {
  const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
  if (digest !== expectedSha256) throw new Error('RTK 官方 ZIP 的 SHA-256 不匹配');
  if (await lstat(destination).catch(() => null)) throw new Error(`RTK 输入目录已存在：${destination}`);

  // 只提取预期的三个顶层文件。版本锁定的摘要保证归档结构来自已核验发行物。
  const entries = spawnSync('tar', ['-tf', archive], { encoding: 'utf8' });
  if (entries.error || entries.status !== 0) throw new Error(`无法读取 RTK ZIP：${entries.stderr || entries.error?.message}`);
  const names = new Set(entries.stdout.split(/\r?\n/).filter(Boolean));
  for (const name of REQUIRED) if (!names.has(name)) throw new Error(`RTK ZIP 缺少 ${name}`);

  const temporary = `${destination}.building-${randomUUID()}`;
  await mkdir(path.dirname(destination), { recursive: true });
  await mkdir(temporary);
  try {
    const extracted = spawnSync('tar', ['-xf', archive, '-C', temporary, ...REQUIRED], { encoding: 'utf8' });
    if (extracted.error || extracted.status !== 0) throw new Error(`无法提取 RTK ZIP：${extracted.stderr || extracted.error?.message}`);
    for (const name of REQUIRED) {
      if (!(await lstat(path.join(temporary, name))).isFile()) throw new Error(`RTK 输入不是普通文件：${name}`);
    }
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}
