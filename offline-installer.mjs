/**
 * 内网安装策略：统一完成静态检查，再逐套执行本地插件、项目 CLI、引擎或
 * 独立技能安装。每一步都只接受已经校验的包内路径；外部命令使用参数数组。
 */
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyOfflineKit } from './offline-kit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MARKET = 'skill-learn-offline';
const SUITES = ['superpowers', 'grill', 'frontend-design-premium', 'ponytail', 'openspec', 'impeccable', 'skill-creator'];

function usage() {
  return [
    '用法：node install-skills.mjs --tool claude|codex [选项]',
    '  --list                 查看离线包套件、版本及支持平台',
    '  --tool <名称>          目标工具：claude 或 codex',
    '  --project <路径>       目标项目，默认当前目录',
    '  --bundle <名称>        只处理指定套件，可重复使用；默认处理全部七套',
    '  --scope project|user   Claude 插件与独立技能范围，默认 project；Codex 插件由宿主管理在用户级',
    '  --dry-run             仅显示计划，不写入任何目标文件',
    '  --status              查看目标现状及冲突，不执行安装',
    '  --kit <路径>          离线目录，默认与脚本同级的 offline-kit/',
    '  --host-bin <路径>     宿主 CLI 的可执行文件；Codex Desktop 建议显式传入',
    '  --help                显示帮助',
    '',
    '预装前提：Node >= 20.19、目标工具本体。安装全程只读取本包及本地宿主。',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { tool: null, project: process.cwd(), kit: path.join(HERE, 'offline-kit'),
    scope: 'project', bundles: [], dryRun: false, status: false, list: false, help: false, hostBin: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (['--tool', '--project', '--bundle', '--scope', '--kit', '--host-bin'].includes(arg)) {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`${arg} 缺少值`);
      const value = argv[++index];
      if (arg === '--bundle') options.bundles.push(...value.split(','));
      else options[{ '--tool': 'tool', '--project': 'project', '--scope': 'scope', '--kit': 'kit', '--host-bin': 'hostBin' }[arg]] = value;
    } else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--status') options.status = true;
    else if (arg === '--list') options.list = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`未知参数：${arg}；用 --help 查看用法`);
  }
  if (!options.help && !options.list && !['claude', 'codex'].includes(options.tool)) {
    throw new Error('安装、预览和状态检查需要 --tool claude|codex');
  }
  if (!['project', 'user'].includes(options.scope)) throw new Error('--scope 只能是 project 或 user');
  for (const name of options.bundles) if (!SUITES.includes(name)) throw new Error(`未知套件：${name}`);
  options.project = path.resolve(options.project);
  options.kit = path.resolve(options.kit);
  return options;
}

/** 清单中存放的是包内路径；再次检验它，防止完成标记被人为重算后越界读取。 */
function payloadPath(kit, relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || relative.startsWith('/') ||
      relative.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`套件路径无效：${relative}`);
  }
  return path.join(kit, ...relative.split('/'));
}

function platform() { return `${process.platform}-${process.arch}`; }

/**
 * Windows 的 npm .cmd 启动器不能安全地通过无 shell 的 spawnSync 直接执行。
 * 优先解析真正的 .exe；若只有脚本，要求维护者通过 --host-bin 给出安全入口。
 */
async function findHost(tool, override) {
  if (override) {
    const absolute = path.resolve(override);
    if (!(await lstat(absolute).catch(() => null))?.isFile()) throw new Error(`宿主程序不存在：${absolute}`);
    return absolute.endsWith('.js') ? { file: process.execPath, prefix: [absolute] } : { file: absolute, prefix: [] };
  }
  if (process.platform === 'win32') {
    const names = tool === 'claude'
      ? ['claude.exe', 'node_modules/@anthropic-ai/claude-code/bin/claude.exe']
      : ['codex.exe'];
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
      for (const name of names) {
        const candidate = path.join(dir, ...name.split('/'));
        if ((await lstat(candidate).catch(() => null))?.isFile()) return { file: candidate, prefix: [] };
      }
    }
    throw new Error(`找不到 ${tool} 可执行文件；请用 --host-bin 指定已安装宿主的 .exe`);
  }
  return { file: tool, prefix: [] };
}

function run(command, args, options = {}) {
  const child = spawnSync(command.file, [...command.prefix, ...args], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    // 某些宿主在已有远程市场不可达时会等待网络；超时是明确的失败，
    // 不能让内网安装在“检查现状”阶段无限挂起。
    timeout: options.timeout ?? 15_000,
  });
  if (child.error) throw new Error(`启动 ${command.file} 失败：${child.error.message}`);
  if (child.status !== 0) throw new Error(`${command.file} 退出码 ${child.status}${child.stderr ? `：${child.stderr.trim()}` : ''}`);
  return child.stdout ?? '';
}

async function identicalTree(source, destination) {
  const targetInfo = await lstat(destination).catch(() => null);
  if (!targetInfo?.isDirectory() || targetInfo.isSymbolicLink()) return false;
  const sourceNames = (await readdir(source)).sort();
  const targetNames = (await readdir(destination)).sort();
  if (sourceNames.join('\n') !== targetNames.join('\n')) return false;
  for (const name of sourceNames) {
    const left = path.join(source, name);
    const right = path.join(destination, name);
    const info = await lstat(left);
    if (info.isDirectory()) {
      if (!(await identicalTree(left, right))) return false;
    } else if (info.isFile()) {
      const other = await lstat(right).catch(() => null);
      if (!other?.isFile() || other.isSymbolicLink() ||
          !(await readFile(left)).equals(await readFile(right))) return false;
    } else return false;
  }
  return true;
}

/** 旧版脚本曾打平复制技能；检查这些路径可避免与新插件重复触发。 */
async function skillNames(pluginRoot, dir = path.join(pluginRoot, 'skills'), names = new Set()) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ((await lstat(path.join(child, 'SKILL.md')).catch(() => null))?.isFile()) names.add(entry.name);
      else await skillNames(pluginRoot, child, names);
    }
  }
  return names;
}

function skillRoots(tool, project, scope) {
  const folder = tool === 'claude' ? '.claude' : '.agents';
  const selected = scope === 'project' ? project : os.homedir();
  return { selected: path.join(selected, folder, 'skills'), all: [
    path.join(project, folder, 'skills'), path.join(os.homedir(), folder, 'skills'),
  ] };
}

/**
 * Codex 把插件启用位写在本机 config.toml。这里只读取其固定的插件表头和
 * enabled=true，不调用可能枚举远程市场的 CLI；其他 TOML 设置保持原样。
 */
async function enabledCodexPlugins(home) {
  const content = await readFile(path.join(home, 'config.toml'), 'utf8').catch(() => '');
  const enabled = new Set();
  let section = null;
  for (const line of content.split(/\r?\n/)) {
    const plugin = line.match(/^\s*\[plugins\."([^"]+)"\]\s*(?:#.*)?$/);
    if (plugin) { section = plugin[1]; continue; }
    if (/^\s*\[/.test(line)) { section = null; continue; }
    if (section && /^\s*enabled\s*=\s*true\s*(?:#.*)?$/.test(line)) enabled.add(section);
  }
  return enabled;
}

async function pluginState(bundle, host, options, root) {
  // 旧版脚本曾把插件内技能复制到项目或用户目录。即使插件自身同版本，
  // 两份技能也可能同时触发，所以先查本地技能，再决定是否跳过插件。
  for (const name of await skillNames(root)) {
    for (const directory of skillRoots(options.tool, options.project, options.scope).all) {
      if (await lstat(path.join(directory, name)).catch(() => null)) {
        return { kind: 'conflict', detail: `已有本地技能：${path.join(directory, name)}` };
      }
    }
  }
  if (options.tool === 'codex') {
    // Codex 的 plugin list 会合并远程市场；内网预检只读取本机插件缓存。
    // 缓存目录由宿主安装命令创建，存在其他市场或版本时保守地报冲突。
    const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
    const cache = path.join(home, 'plugins', 'cache');
    const enabled = await enabledCodexPlugins(home);
    const matches = [];
    for (const market of await readdir(cache, { withFileTypes: true }).catch(() => [])) {
      if (!market.isDirectory()) continue;
      const plugin = path.join(cache, market.name, bundle.pluginName);
      for (const version of await readdir(plugin, { withFileTypes: true }).catch(() => [])) {
        if (version.isDirectory()) matches.push({ market: market.name, version: version.name });
      }
    }
    const exactId = `${bundle.pluginName}@${MARKET}`;
    const exactCache = matches.some((item) => item.market === MARKET && item.version === bundle.version);
    if (exactCache && enabled.has(exactId)) {
      return { kind: 'skip', detail: `本包同版本已安装于用户级 ${cache}` };
    }
    if (exactCache) return { kind: 'conflict', detail: `同版本缓存存在但插件未启用：${path.join(cache, MARKET, bundle.pluginName, bundle.version)}` };
    const configured = [...enabled].filter((id) => id.startsWith(`${bundle.pluginName}@`));
    if (matches.length || configured.length) {
      return { kind: 'conflict', detail: `已有其他来源插件：${[
        ...matches.map((item) => `${item.market}/${bundle.pluginName}@${item.version}`), ...configured,
      ].join(', ')}` };
    }
    return { kind: 'ready', detail: `从包内市场安装插件及随附组件（Codex 用户级：${cache}）` };
  }
  // Claude 的已安装列表只列本机插件；cwd 必须指向目标项目，才能同时
  // 看到项目和用户范围。--available 不传，避免读取在线市场可用项。
  const raw = run(host, ['plugin', 'list', '--json'], { capture: true, cwd: options.project });
  const data = JSON.parse(raw);
  const installed = Array.isArray(data) ? data : data.installed ?? [];
  const matches = installed.filter((item) => (item.name ?? item.id?.split('@')[0]) === bundle.pluginName);
  const exact = matches.find((item) => (item.id ?? item.pluginId) === `${bundle.pluginName}@${MARKET}` && item.version === bundle.version);
  if (exact) return { kind: 'skip', detail: '本包同版本已安装' };
  if (matches.length) return { kind: 'conflict', detail: `已有其他来源插件：${matches.map((item) => item.id ?? item.pluginId).join(', ')}` };
  return { kind: 'ready', detail: `从包内市场安装插件及随附组件（Claude ${options.scope} 范围）` };
}

async function stateFor(bundle, host, options, root) {
  if (bundle.method === 'plugin') return pluginState(bundle, host, options, root);
  if (bundle.method === 'skill') {
    const destination = path.join(skillRoots(options.tool, options.project, options.scope).selected, 'skill-creator');
    const existing = await lstat(destination).catch(() => null);
    if (!existing) return { kind: 'ready', detail: `复制完整技能至 ${destination}`, destination };
    if (await identicalTree(root, destination)) return { kind: 'skip', detail: '本包同版本技能已安装', destination };
    return { kind: 'conflict', detail: `已有其他来源技能：${destination}`, destination };
  }
  if (bundle.method === 'cli') {
    const config = path.join(options.project, 'openspec', 'config.yaml');
    const exists = await lstat(config).catch(() => null);
    return { kind: 'ready', detail: `用包内 CLI ${exists ? 'update' : 'init'} 项目 ${options.project}`, action: exists ? 'update' : 'init' };
  }
  if (bundle.method === 'engine') {
    const provider = options.tool === 'claude' ? '.claude' : '.agents';
    const linked = path.join(options.project, provider, 'skills', 'impeccable');
    const source = path.join(root, 'dist', 'universal', provider, 'skills', 'impeccable');
    const hooks = options.tool === 'claude'
      ? path.join(options.project, '.claude', 'settings.local.json')
      : path.join(options.project, '.codex', 'hooks.json');
    const existing = await lstat(linked).catch(() => null);
    const linkedSource = await realpath(linked).catch(() => null);
    const bundledSource = await realpath(source);
    if (existing && linkedSource !== bundledSource) {
      return { kind: 'conflict', detail: `已有其他来源的 Impeccable 技能：${linked}` };
    }
    if (linkedSource === bundledSource &&
        (await lstat(hooks).catch(() => null))?.isFile()) {
      return { kind: 'skip', detail: '本包技能链接与项目 hook 已安装' };
    }
    return { kind: 'ready', detail: `用包内引擎链接技能并安装项目 hook：${options.project}` };
  }
  throw new Error(`未知安装方式：${bundle.method}`);
}

async function execute(bundle, root, host, options, state, registered) {
  if (bundle.method === 'skill') {
    await mkdir(path.dirname(state.destination), { recursive: true });
    await cp(root, state.destination, { recursive: true, force: false, errorOnExist: true });
  } else if (bundle.method === 'plugin') {
    if (!registered.value) {
      const args = ['plugin', 'marketplace', 'add', options.kit];
      if (options.tool === 'claude') args.push('--scope', options.scope);
      run(host, args, { cwd: options.project });
      registered.value = true;
    }
    const args = options.tool === 'claude'
      ? ['plugin', 'install', `${bundle.pluginName}@${MARKET}`, '--scope', options.scope, '--json']
      : ['plugin', 'add', `${bundle.pluginName}@${MARKET}`, '--json'];
    run(host, args, { cwd: options.project });
  } else if (bundle.method === 'cli') {
    const cli = path.join(root, 'bin', 'openspec.js');
    const args = state.action === 'init'
      ? [cli, 'init', options.project, '--tools', options.tool, '--no-animation']
      : [cli, 'update', options.project];
    run({ file: process.execPath, prefix: [] }, args, {
      cwd: options.project,
      env: { ...process.env, OPENSPEC_NO_UPDATE_CHECK: '1', OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1' },
    });
  } else if (bundle.method === 'engine') {
    const provider = options.tool === 'claude' ? '.claude' : '.agents';
    const skillDir = path.join(root, 'dist', 'universal', provider, 'skills', 'impeccable');
    const engine = path.join(skillDir, 'scripts', 'bin', 'windows-x64', 'impeccable.exe');
    const command = { file: engine, prefix: [] };
    const env = { ...process.env, IMPECCABLE_SKILL_DIR: skillDir, IMPECCABLE_BIN: engine };
    run(command, ['link', `--source=${root}`, `--providers=${options.tool}`, '-y'], { cwd: options.project, env });
    run(command, ['hooks', 'on'], { cwd: options.project, env });
  }
}

export async function installOffline(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) { console.log(usage()); return; }
  const { manifest } = await verifyOfflineKit(options.kit);
  if (options.list) {
    console.log(`离线目录：${options.kit}\n发现 ${SUITES.length} 套：`);
    for (const suite of SUITES) {
      const versions = [...new Set(manifest.bundles.filter((bundle) => (bundle.suite ?? bundle.name) === suite).map((bundle) => bundle.version))];
      console.log(`  [${suite}] ${versions.join(' / ')}`);
    }
    for (const target of manifest.targets) console.log(`  支持：${target.agent} / ${target.platform}`);
    return;
  }
  const version = process.versions.node.split('.').map(Number);
  if (version[0] < 20 || (version[0] === 20 && version[1] < 19)) throw new Error('离线安装需要 Node >= 20.19');
  const projectInfo = await lstat(options.project).catch(() => null);
  if (!projectInfo?.isDirectory() || projectInfo.isSymbolicLink()) throw new Error(`目标项目不是普通目录：${options.project}`);
  await realpath(options.project);
  const supported = manifest.targets.find((target) => target.agent === options.tool && target.platform === platform());
  if (!supported) throw new Error(`离线包不支持 ${options.tool} / ${platform()}；请核对 --list`);
  const selected = options.bundles.length ? [...new Set(options.bundles)] : SUITES;
  const bundles = selected.map((suite) => {
    const bundle = manifest.bundles.find((item) => (item.suite ?? item.name) === suite &&
      supported.bundles.includes(item.name));
    if (!bundle) throw new Error(`离线包不支持 ${options.tool} 的 ${suite}`);
    return bundle;
  });
  const hostNeeded = bundles.some((bundle) => bundle.method === 'plugin');
  const host = hostNeeded ? await findHost(options.tool, options.hostBin) : null;
  if (host) run(host, ['--version'], { capture: true });

  // 先计算所有套件状态，再开始第一笔写入；摘要、平台、宿主和路径出错时目标保持原样。
  const plans = [];
  for (const bundle of bundles) {
    const root = payloadPath(options.kit, bundle.path);
    const info = await lstat(root).catch(() => null);
    if (!info?.isDirectory() || info.isSymbolicLink()) throw new Error(`缺少套件目录：${root}`);
    plans.push({ bundle, root, state: await stateFor(bundle, host, options, root) });
  }
  console.log(`${options.dryRun ? '预览' : options.status ? '状态' : '安装'}：${options.tool} / ${platform()} → ${options.project}`);
  for (const { bundle, state } of plans) console.log(`  ${bundle.suite ?? bundle.name}：${state.kind}，${state.detail}`);
  if (options.dryRun || options.status) return;

  const result = { success: [], skipped: [], failed: null, pending: [] };
  const registered = { value: false };
  for (let index = 0; index < plans.length; index++) {
    const { bundle, root, state } = plans[index];
    const name = bundle.suite ?? bundle.name;
    if (state.kind !== 'ready') { result.skipped.push(`${name}（${state.detail}）`); continue; }
    try {
      await execute(bundle, root, host, options, state, registered);
      result.success.push(name);
    } catch (error) {
      result.failed = `${name}：${error.message}`;
      result.pending = plans.slice(index + 1).map((item) => item.bundle.suite ?? item.bundle.name);
      break;
    }
  }
  console.log(`成功：${result.success.join('、') || '无'}`);
  console.log(`跳过：${result.skipped.join('、') || '无'}`);
  if (result.failed) {
    console.error(`失败：${result.failed}`);
    console.error(`未执行：${result.pending.join('、') || '无'}`);
    process.exitCode = 1;
  } else if (plans.some(({ state }) => state.kind === 'conflict')) {
    // 来源不明的内容没有被覆盖，整批仍是不完整状态；用非零退出码方便脚本识别。
    process.exitCode = 2;
  }
}
