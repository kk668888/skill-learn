#!/usr/bin/env node
/**
 * 在联网维护机上汇集已经取得的上游发行物。所有来源路径都由维护者显式传入，
 * 因而不会误把当前用户机器上的任意插件缓存当作经过审核的发布输入。
 * 这一步只复制并核对本地文件；缺少引擎时必须先从官方发行页取得并核对侧车摘要。
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprintTree } from './build-offline-kit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_SHA256 = 'c7dfa8846ec59ceb3a40be99b89fba29e4f3bdd16f3c412a33f19ad8a68ccff2';

const BUNDLE_SHA256 = '358c8b6bbc2113e9910bf4adbdba4523612453ec58d56a5c1b14654416a13fe3';

const sourceFlags = [
  '--claude-superpowers', '--claude-grill', '--claude-premium', '--codex-superpowers',
  '--ponytail-plugin',
  '--openspec-package', '--impeccable-engine', '--impeccable-bundle-archive',
];

/** fs.cp 的过滤器只去掉缓存锁和仓库元数据，不丢弃 hook、依赖或隐藏 manifest。 */
async function copyDistribution(source, destination) {
  const info = await lstat(source).catch(() => { throw new Error(`缺少上游输入：${source}`); });
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`上游输入不是目录：${source}`);
  await cp(source, destination, {
    recursive: true,
    filter: (item) => !['.git', '.in_use'].includes(path.basename(item)),
  });
}

function codexManifest(claudeManifest) {
  // Codex 插件需要自己的 .codex-plugin/plugin.json；不能把 Claude 的目录改名冒充。
  // skills 指向完整技能树，随附文件与上游脚本继续保留在同一个插件内。
  return {
    name: claudeManifest.name,
    version: claudeManifest.version,
    description: claudeManifest.description,
    author: claudeManifest.author,
    homepage: claudeManifest.homepage,
    repository: claudeManifest.repository,
    license: claudeManifest.license,
    skills: './skills/',
    hooks: {},
  };
}

async function validatePackage(source, manifestPath, expectedName, expectedVersion) {
  const file = path.join(source, ...manifestPath.split('/'));
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  if (manifest.name !== expectedName || manifest.version !== expectedVersion) {
    throw new Error(`上游版本不匹配：${file}（预期 ${expectedName}@${expectedVersion}）`);
  }
  return manifest;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`用法：node prepare-offline-inputs.mjs ${sourceFlags.map((flag) => `${flag} <路径>`).join(' ')} [--output <目录>]`);
    return;
  }
  const options = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || !args[i + 1]) throw new Error(`参数不完整：${args[i]}`);
    options.set(args[i], path.resolve(args[i + 1]));
  }
  for (const flag of sourceFlags) if (!options.has(flag)) throw new Error(`缺少参数：${flag}`);
  const output = options.get('--output') ?? path.join(HERE, 'offline-inputs');
  if (await lstat(output).catch(() => null)) throw new Error(`输入目录已存在，请先人工检查：${output}`);

  const claudeSuper = options.get('--claude-superpowers');
  const claudeGrill = options.get('--claude-grill');
  const claudePremium = options.get('--claude-premium');
  const codexSuper = options.get('--codex-superpowers');
  // ponytail 单仓库同时携带两种宿主 manifest，一次校验覆盖 claude 与 codex 两个输入树。
  const ponytail = options.get('--ponytail-plugin');
  const openspec = options.get('--openspec-package');
  await validatePackage(claudeSuper, '.claude-plugin/plugin.json', 'superpowers', '7.0.0');
  const grill = await validatePackage(claudeGrill, '.claude-plugin/plugin.json', 'mattpocock-skills', '1.3.1');
  const premium = await validatePackage(claudePremium, '.claude-plugin/plugin.json', 'frontend-design-premium', '1.4.1');
  await validatePackage(codexSuper, '.codex-plugin/plugin.json', 'superpowers', '6.3.0');
  await validatePackage(ponytail, '.claude-plugin/plugin.json', 'ponytail', '5.3.2');
  await validatePackage(ponytail, '.codex-plugin/plugin.json', 'ponytail', '5.3.2');
  await validatePackage(openspec, 'package.json', '@fission-ai/openspec', '1.8.0');
  const engine = await readFile(options.get('--impeccable-engine'));
  if (createHash('sha256').update(engine).digest('hex') !== ENGINE_SHA256) {
    throw new Error('Impeccable 引擎与官方 SHA-256 侧车摘要不符');
  }
  const compiledArchive = options.get('--impeccable-bundle-archive');
  // 直接核对并解压原始官方 ZIP；不能接受一个未经验证的“已解压目录”。
  const archiveBytes = await readFile(compiledArchive);
  if (createHash('sha256').update(archiveBytes).digest('hex') !== BUNDLE_SHA256) {
    throw new Error('Impeccable 通用技能包与固定 SHA-256 摘要不符');
  }

  const staging = `${output}.building`;
  if (await lstat(staging).catch(() => null)) throw new Error(`上次的制包临时目录仍存在：${staging}`);
  await mkdir(staging, { recursive: true });
  const copies = [
    [claudeSuper, 'claude/superpowers'], [claudeGrill, 'claude/grill'],
    [claudePremium, 'claude/frontend-design-premium'], [codexSuper, 'codex/superpowers'],
    [claudeGrill, 'codex/grill'], [claudePremium, 'codex/frontend-design-premium'],
    [ponytail, 'claude/ponytail'], [ponytail, 'codex/ponytail'],
    [openspec, 'shared/openspec'],
    [path.join(HERE, 'skills/anthropics/skill-creator'), 'shared/skill-creator'],
  ];
  for (const [source, relative] of copies) await copyDistribution(source, path.join(staging, ...relative.split('/')));
  const compiledBundle = path.join(staging, 'shared/impeccable/dist/universal');
  await mkdir(compiledBundle, { recursive: true });
  const extraction = spawnSync('tar', ['-xf', compiledArchive, '-C', compiledBundle], { encoding: 'utf8' });
  if (extraction.error || extraction.status !== 0) {
    throw new Error(`解压 Impeccable 通用包失败：${extraction.stderr || extraction.error?.message}`);
  }
  if (!(await lstat(path.join(compiledBundle, '.agents/skills/impeccable/SKILL.md')).catch(() => null))?.isFile()) {
    throw new Error('Impeccable 通用包缺少 Codex 主技能');
  }
  for (const [relative, manifest] of [['codex/grill', grill], ['codex/frontend-design-premium', premium]]) {
    const target = path.join(staging, ...relative.split('/'), '.codex-plugin', 'plugin.json');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(codexManifest(manifest), null, 2)}\n`);
  }
  await cp(path.join(HERE, 'skills/impeccable/LICENSE'), path.join(staging, 'shared/impeccable/LICENSE'));
  await cp(path.join(HERE, 'skills/impeccable/NOTICE.md'), path.join(staging, 'shared/impeccable/NOTICE.md'));
  // 通用包内每种宿主都有自己的启动器。把引擎放在各自启动器优先查找的
  // 同级 bin/ 中，首次调用便不会走到下载分支。
  for (const provider of ['.agents', '.claude']) {
    const scripts = path.join(staging, 'shared/impeccable/dist/universal', provider, 'skills/impeccable/scripts');
    const launcherVersion = (await readFile(path.join(scripts, 'VERSION'), 'utf8')).trim();
    if (launcherVersion !== '0.1.16') throw new Error(`${provider} 启动器版本不是 0.1.16`);
    const engineTarget = path.join(scripts, 'bin/windows-x64/impeccable.exe');
    await mkdir(path.dirname(engineTarget), { recursive: true });
    await writeFile(engineTarget, engine);
  }
  // 固定表锁住复制、依赖闭包和生成的 Codex manifest 的全部字节。
  // 只核对插件名称与版本不能阻止同名目录混入额外脚本或被替换的依赖。
  const plan = JSON.parse(await readFile(path.join(HERE, 'offline-inputs.json'), 'utf8'));
  for (const bundle of plan.bundles) {
    if (!/^[a-f0-9]{64}$/.test(bundle.inputSha256)) throw new Error(`缺少 ${bundle.name} 的固定输入摘要`);
    const prepared = path.join(staging, ...bundle.input.split('/'));
    if (await fingerprintTree(prepared) !== bundle.inputSha256) {
      throw new Error(`${bundle.name} 的输入摘要与固定版本清单不符`);
    }
  }
  await rename(staging, output);
  console.log(`固定版本输入已准备：${output}（通用技能 ZIP SHA-256 已核对）`);
}

main().catch((error) => {
  console.error(`准备输入失败：${error.message}`);
  process.exitCode = 1;
});
