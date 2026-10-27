/**
 * 离线发行目录的唯一校验入口。制包、安装和下载均使用同一份清单契约，
 * 避免某个入口只检查文件存在，而另一个入口接受了不同的文件集合。
 */
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const SHA256 = /^[a-f0-9]{64}$/;
const NAME = /^[a-z][a-z0-9-]*$/;

/** 清单路径一律使用相对 POSIX 路径，禁止空段、反斜杠和跨目录引用。 */
function checkRelativePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') ||
      value.startsWith('/') || /^[A-Za-z]:/.test(value) ||
      value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`离线清单路径无效：${value}`);
  }
  return value;
}

/**
 * 遍历磁盘上的实际条目，包含隐藏目录与依赖目录。清单之外的普通文件、
 * 任意位置的符号链接都被拒绝，避免归档与安装看到不同的内容。
 */
async function walkFiles(root, dir = root, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) throw new Error(`离线目录存在符号链接：${absolute}`);
    if (info.isDirectory()) await walkFiles(root, absolute, found);
    else if (info.isFile()) found.push(path.relative(root, absolute).split(path.sep).join('/'));
    else throw new Error(`离线目录存在非普通文件：${absolute}`);
  }
  return found;
}

/** 验证字段形态，防止一个形式正确的完成标记掩盖缺失的来源或适用平台。 */
function checkManifest(manifest) {
  if (!manifest || manifest.format !== 1 || !Array.isArray(manifest.targets) ||
      !Array.isArray(manifest.bundles) || !Array.isArray(manifest.files) ||
      manifest.targets.length === 0 || manifest.bundles.length === 0 || manifest.files.length === 0) {
    throw new Error('离线清单缺少版本、目标、套件或文件');
  }
  const bundles = new Set();
  for (const bundle of manifest.bundles) {
    if (!bundle || !NAME.test(bundle.name) || bundles.has(bundle.name) ||
        !['plugin', 'cli', 'engine', 'skill', 'executable'].includes(bundle.method) ||
        ![bundle.version, bundle.source, bundle.license].every((v) => typeof v === 'string' && v.trim())) {
      throw new Error('离线清单的套件版本、来源、安装方式或许可证无效');
    }
    bundles.add(bundle.name);
  }
  for (const target of manifest.targets) {
    if (!target || !['claude', 'codex'].includes(target.agent) ||
        !/^(win32|linux|darwin)-(x64|arm64)$/.test(target.platform) ||
        !Array.isArray(target.bundles) || target.bundles.length === 0 ||
        target.bundles.some((name) => !bundles.has(name))) {
      throw new Error('离线清单的支持组合无效');
    }
  }
  const paths = new Set();
  for (const file of manifest.files) {
    checkRelativePath(file?.path);
    if (paths.has(file.path) || !Number.isSafeInteger(file.size) || file.size < 0 || !SHA256.test(file.sha256)) {
      throw new Error(`离线清单文件摘要、大小或重复路径无效：${file.path}`);
    }
    paths.add(file.path);
  }
  return paths;
}

/**
 * 成功返回 ZIP 应收录的完整文件路径。完成标记绑定 manifest 的原始字节，
 * manifest 再绑定每个 payload 的原始字节；任一阶段不一致都不能下载或安装。
 */
export async function verifyOfflineKit(root, options = {}) {
  const stat = await lstat(root).catch(() => { throw new Error(`缺少离线目录：${root}`); });
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('离线目录不是普通目录');
  const [manifestBytes, completeBytes] = await Promise.all([
    readFile(path.join(root, 'manifest.json')).catch(() => { throw new Error('缺少离线清单 manifest.json'); }),
    readFile(path.join(root, 'complete.json')).catch(() => { throw new Error('缺少离线完成标记 complete.json'); }),
  ]);
  let manifest;
  let complete;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
    complete = JSON.parse(completeBytes.toString('utf8'));
  } catch {
    throw new Error('离线清单或完成标记不是合法 JSON');
  }
  if (complete?.manifestSha256 !== createHash('sha256').update(manifestBytes).digest('hex')) {
    throw new Error('离线清单摘要与完成标记不一致');
  }
  const declared = checkManifest(manifest);
  const expected = new Set(['manifest.json', 'complete.json', ...declared]);
  const actual = new Set(await walkFiles(root));
  for (const name of actual) if (!expected.has(name)) throw new Error(`离线目录包含额外文件：${name}`);
  for (const name of expected) if (!actual.has(name)) throw new Error(`离线目录缺少文件：${name}`);
  // 下载请求保留已经验过摘要的字节快照。这样即使源文件在预检之后被
  // 等长替换，ZIP 仍只会包含已验证内容，不会产生清单与正文不符的包。
  const contents = options.snapshot === true ? new Map([
    ['manifest.json', manifestBytes], ['complete.json', completeBytes],
  ]) : undefined;
  // 服务端下载采用私有临时目录，逐文件校验后立即落盘；单个请求只需保留
  // 当前文件的内存。失败时删除半成品，成功后由响应生命周期调用 dispose。
  let snapshotRoot;
  try {
    if (options.snapshot === 'disk') {
      snapshotRoot = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-snapshot-'));
      await Promise.all([
        writeFile(path.join(snapshotRoot, 'manifest.json'), manifestBytes),
        writeFile(path.join(snapshotRoot, 'complete.json'), completeBytes),
      ]);
    }
    for (const file of manifest.files) {
      const bytes = await readFile(path.join(root, ...file.path.split('/')));
      if (bytes.length !== file.size) throw new Error(`离线文件大小不一致：${file.path}`);
      if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
        throw new Error(`离线文件摘要不一致：${file.path}`);
      }
      contents?.set(file.path, bytes);
      if (snapshotRoot) {
        const destination = path.join(snapshotRoot, ...file.path.split('/'));
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, bytes);
      }
    }
  } catch (error) {
    if (snapshotRoot) await rm(snapshotRoot, { recursive: true, force: true });
    throw error;
  }
  return {
    manifest,
    paths: [...expected].sort(),
    contents,
    snapshotRoot,
    dispose: snapshotRoot ? () => rm(snapshotRoot, { recursive: true, force: true }) : undefined,
  };
}
