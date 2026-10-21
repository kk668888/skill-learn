#!/usr/bin/env node
/**
 * 外网制包入口。调用者先把固定版本的上游发行物放入输入目录；本程序逐字节
 * 收录普通文件、生成摘要，并在完整校验通过后一次性发布 offline/kit/。
 * 输入阶段不执行上游代码；内网安装只使用本程序发布的本地 payload。
 */
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyOfflineKit } from './offline-kit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 严格限制用户提供的输入与输出片段，不能越出各自的根目录。 */
function safePart(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.startsWith('/') ||
      /^[A-Za-z]:/.test(value) || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`制包路径无效：${value}`);
  }
  return value;
}

/** 拷贝完整目录树；拒绝链接和特殊文件，不能把宿主机的外部文件带进 ZIP。 */
async function copyTree(source, destination) {
  const stats = await lstat(source).catch(() => { throw new Error(`制包缺少输入：${source}`); });
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`制包输入不是普通目录：${source}`);
  await mkdir(destination, { recursive: true });
  const entries = (await readdir(source, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    const info = await lstat(from);
    if (info.isDirectory()) await copyTree(from, to);
    else if (info.isFile()) await copyFile(from, to);
    else throw new Error(`制包输入存在符号链接或特殊文件：${from}`);
  }
}

/** 清单只关心内容，所以按照规范化相对路径排序，文件时间不影响结果。 */
async function collectFiles(root, dir = root, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectFiles(root, absolute, files);
    else if (entry.isFile()) {
      const bytes = await readFile(absolute);
      files.push({
        path: path.relative(root, absolute).split(path.sep).join('/'),
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    } else throw new Error(`制包产物存在非普通文件：${absolute}`);
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

/**
 * 输入锁使用排序后的相对路径、字节长度和逐文件摘要计算；时间戳、压缩格式和
 * 复制目录的绝对路径均不参与，因此维护者可以在另一台机器复核同一发行物。
 */
export async function fingerprintTree(root) {
  const info = await lstat(root).catch(() => null);
  if (!info?.isDirectory() || info.isSymbolicLink()) throw new Error(`制包缺少普通输入目录：${root}`);
  const files = await collectFiles(root);
  return createHash('sha256').update(JSON.stringify(files)).digest('hex');
}

/**
 * 失败时只删除本次的临时目录，保留既有发行物。完成标记最后写入临时目录，
 * verifyOfflineKit 再读盘核对；通过后才替换最终路径。
 */
export async function buildOfflineKit({ inputRoot, outputRoot, plan }) {
  if (plan?.format !== 1 || !Array.isArray(plan.bundles) || !Array.isArray(plan.targets)) {
    throw new Error('制包计划缺少格式、套件或支持组合');
  }
  const destination = path.resolve(outputRoot);
  if (destination === path.parse(destination).root) throw new Error('不能把磁盘根目录作为制包目标');
  const staging = `${destination}.building-${randomUUID()}`;
  const backup = `${destination}.previous-${randomUUID()}`;
  let backedUp = false;
  try {
    await mkdir(staging, { recursive: true });
    for (const bundle of plan.bundles) {
      const from = path.join(path.resolve(inputRoot), ...safePart(bundle.input).split('/'));
      const to = path.join(staging, ...safePart(bundle.output).split('/'));
      if (bundle.inputSha256 && await fingerprintTree(from) !== bundle.inputSha256) {
        throw new Error(`制包输入摘要不匹配：${bundle.name}`);
      }
      await copyTree(from, to);
      if (bundle.inputSha256 && await fingerprintTree(to) !== bundle.inputSha256) {
        throw new Error(`制包复制后输入摘要不匹配：${bundle.name}`);
      }
      for (const required of bundle.required ?? []) {
        const requiredPath = path.join(to, ...safePart(required).split('/'));
        if (!(await lstat(requiredPath).catch(() => null))?.isFile()) {
          throw new Error(`制包缺少 ${bundle.name} 必需文件：${required}`);
        }
      }
    }
    // 两种宿主使用不同的市场格式。这里只生成指向本包内部路径的声明，
    // 安装阶段绝不把 HTTPS 上游地址交给插件管理器解析。
    for (const agent of ['claude', 'codex']) {
      const plugins = plan.bundles.filter((bundle) => bundle.method === 'plugin' && bundle.agent === agent);
      if (plugins.length === 0) continue;
      const marketPath = agent === 'claude'
        ? '.claude-plugin/marketplace.json'
        : '.agents/plugins/marketplace.json';
      const market = {
        name: 'skill-learn-offline',
        ...(agent === 'claude' ? { owner: { name: 'skill-learn' } } : {}),
        plugins: plugins.map((bundle) => agent === 'claude'
          ? { name: bundle.pluginName, source: `./${safePart(bundle.output)}` }
          : {
            name: bundle.pluginName,
            source: { source: 'local', path: `./${safePart(bundle.output)}` },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Developer Tools',
          }),
      };
      const destinationFile = path.join(staging, ...marketPath.split('/'));
      await mkdir(path.dirname(destinationFile), { recursive: true });
      await writeFile(destinationFile, `${JSON.stringify(market, null, 2)}\n`);
    }
    const manifest = {
      format: 1,
      targets: plan.targets,
      bundles: plan.bundles.map(({ input, output, required, ...metadata }) => ({ ...metadata, path: output })),
      files: await collectFiles(staging),
    };
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(path.join(staging, 'manifest.json'), manifestBytes);
    await writeFile(path.join(staging, 'complete.json'), `${JSON.stringify({
      manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
    })}\n`);
    await verifyOfflineKit(staging);
    if (await lstat(destination).catch(() => null)) {
      await rename(destination, backup);
      backedUp = true;
    }
    await rename(staging, destination);
    if (backedUp) await rm(backup, { recursive: true, force: true });
    return manifest;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (backedUp && !(await lstat(destination).catch(() => null))) await rename(backup, destination);
    throw error;
  }
}

/** 命令行默认采用仓库内的固定版本计划和离线输入目录。 */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('用法：node build-offline-kit.mjs [--input <目录>] [--output <目录>] [--plan <JSON>]');
  } else {
    const value = (flag, fallback) => {
      const index = args.indexOf(flag);
      if (index < 0) return fallback;
      if (!args[index + 1]) throw new Error(`${flag} 缺少路径`);
      return path.resolve(args[index + 1]);
    };
    const inputRoot = value('--input', path.join(HERE, 'inputs'));
    const outputRoot = value('--output', path.join(HERE, 'kit'));
    const planPath = value('--plan', path.join(HERE, 'offline-inputs.json'));
    try {
      const plan = JSON.parse(await readFile(planPath, 'utf8'));
      // 通用函数允许测试夹具构造小包；正式命令行发布则必须为每一套提供
      // 已审核的完整输入树摘要，不能用只有名称和版本的自定义计划绕过锁定。
      for (const bundle of plan.bundles ?? []) {
        if (!/^[a-f0-9]{64}$/.test(bundle.inputSha256)) {
          throw new Error(`发布计划缺少 ${bundle.name} 的固定输入摘要`);
        }
      }
      const manifest = await buildOfflineKit({ inputRoot, outputRoot, plan });
      console.log(`离线目录已生成：${outputRoot}（${manifest.files.length} 个文件）`);
    } catch (error) {
      console.error(`制包失败：${error.message}`);
      process.exitCode = 1;
    }
  }
}
