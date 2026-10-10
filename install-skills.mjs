#!/usr/bin/env node
/**
 * install-skills.mjs —— 技能安装脚本（跨平台：Windows / Linux / macOS）
 *
 * 作用
 *   把本目录 `skills/` 下的所有技能，安装到 Claude Code 的技能目录。
 *   会自动「打平」目录层级 —— 因为 Claude Code 要求每个技能必须是
 *   `<目标目录>/skills/<技能名>/SKILL.md` 的一层结构，而我们仓库里为了
 *   分类清晰，是按来源分组的（如 skills/grill/grill-me）。
 *
 * 为什么用 Node 而不是 .sh + .ps1 两套
 *   一份代码同时跑在 Linux 和 Windows 上，不存在两套脚本逻辑漂移的问题。
 *   Node 本身已是 OpenSpec 的运行前提（要求 Node >= 20），所以不算新增依赖。
 *
 * 用法
 *   node install-skills.mjs                    # 安装到全局 ~/.claude（默认）
 *   node install-skills.mjs --project          # 安装到 当前目录/.claude
 *   node install-skills.mjs --target <路径>     # 安装到指定目录
 *   node install-skills.mjs --bundle grill     # 只装某一套（grill/superpowers/openspec）
 *   node install-skills.mjs --dry-run          # 预览，不写任何文件
 *   node install-skills.mjs --clean            # 目标已存在时先删除再拷贝（精确镜像）
 *   node install-skills.mjs --no-commands      # 跳过斜杠命令，只装技能
 *   node install-skills.mjs --list             # 只列出发现了哪些技能
 *   node install-skills.mjs --help             # 帮助
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 本脚本所在目录（无论从哪里调用，都以脚本自身位置为基准，保证可移植） */
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 技能源码根目录：<脚本目录>/skills */
const SOURCE_ROOT = path.join(HERE, 'skills');

/** 递归扫描的最大深度，防止意外扫描到深层无关目录 */
const MAX_DEPTH = 4;

/** 从多少版本开始 Node 支持 fs.cp 等 API（低于此版本直接报错退出） */
const MIN_NODE_MAJOR = 18;

// ---------------------------------------------------------------------------
// 基础工具函数
// ---------------------------------------------------------------------------

/** 判断路径是否存在（不抛异常） */
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** 读取目录，失败时返回空数组而不是抛异常（简化上层判断） */
async function readDirSafe(p) {
  try {
    return await fs.readdir(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** 需要跳过的目录名：依赖目录与隐藏目录 */
function shouldSkipDir(name) {
  return name === 'node_modules' || name.startsWith('.');
}

// ---------------------------------------------------------------------------
// 命令行参数解析
// ---------------------------------------------------------------------------

/** 打印帮助信息 */
function printHelp() {
  const lines = [
    '',
    '技能安装脚本 —— 把 skills/ 下的技能安装到 Claude Code 技能目录',
    '',
    '用法：',
    '  node install-skills.mjs [选项]',
    '',
    '选项：',
    '  -p, --project       安装到 当前工作目录/.claude（项目级）',
    '  -g, --global        安装到 ~/.claude（全局）',
    '      --target <路径>  安装到指定目录（该目录就是 .claude 那一层）',
    '  -i, --interactive   强制询问装到全局还是项目（默认在交互式终端里已会自动询问）',
    '  -y, --yes           从不询问，直接用默认/指定的目标（供脚本与非交互场景使用）',
    '  -b, --bundle <名称>  只安装某一套（套件名用 --list 查看）',
    '  -n, --dry-run       只预览将要做什么，不写任何文件',
    '  -c, --clean         目标已存在时先整体删除再拷贝（精确镜像，会清掉多余旧文件）',
    '      --no-commands   跳过斜杠命令（只安装 skills）',
    '  -l, --list          只列出发现的技能与命令，不做安装',
    '  -h, --help          显示本帮助',
    '',
    '安装位置的选择顺序：',
    '  --target  >  --project / --global  >  交互询问（仅交互式终端）  >  默认全局',
    '',
    '示例：',
    '  node install-skills.mjs                    # 交互式选择装到全局还是项目',
    '  node install-skills.mjs -y                 # 不问，直接装到全局',
    '  node install-skills.mjs -b grill -p        # 只把 grill 那套装到当前项目',
    '  node install-skills.mjs --dry-run          # 先看看会装什么',
    '',
  ];
  console.log(lines.join('\n'));
}

/**
 * 解析命令行参数
 * @param {string[]} argv process.argv.slice(2)
 * @returns {object} 归一化后的选项对象
 */
function parseArgs(argv) {
  const opt = {
    target: null,        // 显式指定的目标目录
    project: false,      // 是否使用项目级目录
    scopeExplicit: false, // 是否显式给了 -p / -g（决定要不要交互询问）
    interactive: false,  // 强制询问安装位置
    yes: false,          // 从不询问
    dryRun: false,       // 预览模式
    clean: false,        // 精确镜像（先删后拷）
    listOnly: false,     // 只列出
    bundle: null,        // 只装某一套
    noCommands: false,   // 跳过命令
    help: false,         // 显示帮助
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // 支持 --key=value 形式
    if (arg.startsWith('--target=')) { opt.target = arg.slice('--target='.length); continue; }
    if (arg.startsWith('--bundle=')) { opt.bundle = arg.slice('--bundle='.length); continue; }

    switch (arg) {
      case '-p': case '--project': opt.project = true; opt.scopeExplicit = true; break;
      case '-g': case '--global': opt.project = false; opt.scopeExplicit = true; break;
      case '-i': case '--interactive': opt.interactive = true; break;
      case '-y': case '--yes': opt.yes = true; break;
      case '-n': case '--dry-run': opt.dryRun = true; break;
      case '-c': case '--clean': opt.clean = true; break;
      case '-l': case '--list': opt.listOnly = true; break;
      case '--no-commands': opt.noCommands = true; break;
      case '-h': case '--help': opt.help = true; break;
      case '-b': case '--bundle': opt.bundle = argv[++i]; break;
      case '--target': opt.target = argv[++i]; break;
      default:
        throw new Error(`未知参数：${arg}（用 --help 查看用法）`);
    }
  }

  return opt;
}

// ---------------------------------------------------------------------------
// 交互式选择安装位置
// ---------------------------------------------------------------------------

/**
 * 询问用户把技能装到哪里（全局 / 项目）。
 *
 * 只在交互式终端里调用；非交互场景（管道、CI、hook）必须走默认值，
 * 否则脚本会因为没有输入而一直挂住。
 *
 * 默认答案是「全局」——也就是本脚本原本的行为，
 * 所以习惯直接回车的人拿到的结果与以前完全一致。
 *
 * @returns {Promise<{targetRoot: string, project: boolean}>}
 */
async function askTarget() {
  const globalRoot = path.join(os.homedir(), '.claude');
  const projectRoot = path.join(process.cwd(), '.claude');

  console.log('');
  console.log('把技能装到哪里？');
  console.log(`  1) 全局  ${globalRoot}`);
  console.log('         所有项目都能用');
  console.log(`  2) 项目  ${projectRoot}`);
  console.log('         只有当前项目能用');
  console.log('');

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // 这里刻意不用 rl.question()，而是自己维护一个行队列。
  // 原因：管道输入时多行会一次性到达，rl.question() 只能拿到「调用之后」到达的行，
  // 先前已缓冲的行会以 'line' 事件白白丢掉 —— 于是重问时读不到输入，
  // 进程会静默退出（退出码 0 却什么都没装）。自建队列可以正确接住已到达的行。
  const bufferedLines = [];
  let waiting = null;
  let ended = false;

  rl.on('line', (line) => {
    if (waiting) { const resolve = waiting; waiting = null; resolve(line); }
    else bufferedLines.push(line);
  });

  rl.on('close', () => {
    ended = true;
    // 输入流结束（Ctrl-D 或管道读完）时唤醒还在等的那个 resolve，
    // 否则 Promise 会永远挂住，表现为脚本卡死。
    if (waiting) { const resolve = waiting; waiting = null; resolve(null); }
  });

  /** 取下 一行输入；返回 null 表示输入已结束（EOF） */
  const nextLine = () => {
    if (bufferedLines.length > 0) return Promise.resolve(bufferedLines.shift());
    if (ended) return Promise.resolve(null);
    return new Promise((resolve) => { waiting = resolve; });
  };

  try {
    // 循环直到拿到合法输入，避免一次误输就退出
    while (true) {
      process.stdout.write('选择 [1/2]（直接回车 = 1 全局）：');

      const raw = await nextLine();

      // 没有更多输入了：退回默认答案，而不是静默什么都不做
      if (raw === null) {
        console.log('');
        console.log('  未收到输入（输入流已结束），改用默认：全局。');
        return { targetRoot: globalRoot, project: false };
      }

      const answer = raw.trim();
      if (answer === '' || answer === '1') return { targetRoot: globalRoot, project: false };
      if (answer === '2') return { targetRoot: projectRoot, project: true };

      console.log('  请输入 1 或 2。');
    }
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// 技能发现
// ---------------------------------------------------------------------------

/**
 * 递归查找目录下所有技能（判定标准：目录里存在 SKILL.md）
 * 找到技能后不再向内递归，避免把技能内部的参考文件误判成技能。
 */
async function findSkills(dir, depth = 0, out = []) {
  if (depth > MAX_DEPTH) return out;

  for (const entry of await readDirSafe(dir)) {
    if (!entry.isDirectory() || shouldSkipDir(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (await exists(path.join(full, 'SKILL.md'))) {
      out.push({ name: entry.name, src: full });
    } else {
      await findSkills(full, depth + 1, out);
    }
  }

  return out;
}

/**
 * 递归查找目录下所有 .md 命令文件
 * 返回结果带上相对 base 的路径，用于在目标目录里保留原有的子目录结构。
 */
async function findCommands(dir, base = dir, depth = 0, out = []) {
  if (depth > MAX_DEPTH) return out;

  for (const entry of await readDirSafe(dir)) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      await findCommands(full, base, depth + 1, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push({ rel: path.relative(base, full), src: full });
    }
  }

  return out;
}

/**
 * 扫描 skills/ 下的所有「套件」（第一层子目录），汇总每套里的技能与命令。
 * @returns {Promise<Array<{name:string, skills:Array, commands:Array}>>}
 */
async function discoverBundles() {
  const bundles = [];

  for (const entry of await readDirSafe(SOURCE_ROOT)) {
    if (!entry.isDirectory() || shouldSkipDir(entry.name)) continue;

    const root = path.join(SOURCE_ROOT, entry.name);

    // 一套里可能有：根目录直接放技能、或再套一层 skills/、或按来源分组多层
    const skills = await findSkills(root, 0, []);

    // 命令统一从 <套件>/commands 下找，并保留其子目录结构（如 opsx/apply.md）
    const commandsRoot = path.join(root, 'commands');
    const commands = (await findCommands(commandsRoot, commandsRoot, 0, []))
      .map((c) => ({ rel: c.rel, src: c.src }));

    bundles.push({ name: entry.name, root, skills, commands });
  }

  return bundles;
}

// ---------------------------------------------------------------------------
// 内容比对（用于判断「新增 / 更新 / 无变化」）
// ---------------------------------------------------------------------------

/** 列出目录下所有文件的相对路径 */
async function listFiles(root, base = root, out = []) {
  for (const entry of await readDirSafe(root)) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) await listFiles(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full));
  }
  return out;
}

/**
 * 判断两个目录内容是否完全一致（文件清单 + 每个文件字节）
 * 一致就可以跳过拷贝，让脚本可以反复安全运行。
 */
async function dirsIdentical(srcDir, destDir) {
  if (!(await exists(destDir))) return false;

  const [srcFiles, destFiles] = [await listFiles(srcDir), await listFiles(destDir)];
  if (srcFiles.length !== destFiles.length) return false;

  srcFiles.sort();
  destFiles.sort();
  if (srcFiles.join('\n') !== destFiles.join('\n')) return false;

  // 逐个文件比对字节，任意一个不同即视为需要更新
  for (const rel of srcFiles) {
    const [a, b] = await Promise.all([
      fs.readFile(path.join(srcDir, rel)),
      fs.readFile(path.join(destDir, rel)),
    ]);
    if (!a.equals(b)) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// 安装
// ---------------------------------------------------------------------------

/** 统计结果，用于最后的汇总输出 */
function newStats() {
  return { added: [], updated: [], unchanged: [] };
}

/**
 * 安装一个技能目录
 * @param {string} src  源目录
 * @param {string} dest 目标目录
 */
async function installDir(src, dest, opt, stats, label) {
  const existed = await exists(dest);

  // 内容完全一致 —— 跳过，保证脚本可重复运行
  if (existed && (await dirsIdentical(src, dest))) {
    stats.unchanged.push(label);
    return;
  }

  // 预览模式：只记录，不落盘
  if (opt.dryRun) {
    (existed ? stats.updated : stats.added).push(label);
    return;
  }

  // --clean：先删干净，避免源里已删除的文件残留在目标目录
  if (existed && opt.clean) {
    await fs.rm(dest, { recursive: true, force: true });
  }

  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, { recursive: true, force: true });

  (existed ? stats.updated : stats.added).push(label);
}

/** 安装单个命令文件 */
async function installFile(src, dest, opt, stats, label) {
  const existed = await exists(dest);

  if (existed) {
    const [a, b] = await Promise.all([fs.readFile(src), fs.readFile(dest)]);
    if (a.equals(b)) {
      stats.unchanged.push(label);
      return;
    }
  }

  if (opt.dryRun) {
    (existed ? stats.updated : stats.added).push(label);
    return;
  }

  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);

  (existed ? stats.updated : stats.added).push(label);
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  // ---- 0. 环境检查 ----
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < MIN_NODE_MAJOR) {
    throw new Error(`需要 Node.js >= ${MIN_NODE_MAJOR}，当前为 ${process.versions.node}`);
  }

  const opt = parseArgs(process.argv.slice(2));
  if (opt.help) {
    printHelp();
    return;
  }

  // ---- 1. 确认源码目录存在 ----
  if (!(await exists(SOURCE_ROOT))) {
    throw new Error(`找不到技能源码目录：${SOURCE_ROOT}`);
  }

  // ---- 2. 扫描技能 ----
  let bundles = await discoverBundles();

  // 只装指定的一套
  if (opt.bundle) {
    const wanted = opt.bundle.toLowerCase();
    const matched = bundles.filter((b) => b.name.toLowerCase() === wanted);
    if (matched.length === 0) {
      const names = bundles.map((b) => b.name).join(' | ');
      throw new Error(`找不到套件「${opt.bundle}」，可选：${names}`);
    }
    bundles = matched;
  }

  // ---- 3. 只列出模式（不需要目标目录，提前返回以免触发询问）----
  if (opt.listOnly) {
    console.log(`\n技能源码目录：${SOURCE_ROOT}`);
    console.log(`发现 ${bundles.length} 套：\n`);
    for (const b of bundles) {
      console.log(`  [${b.name}]  ${b.skills.length} 个技能` +
        (b.commands.length ? ` + ${b.commands.length} 个命令` : ''));
      for (const s of b.skills) console.log(`      - ${s.name}`);
    }
    console.log('');
    return;
  }

  // ---- 4. 计算目标目录 ----
  // 选择顺序：--target  >  -p / -g  >  交互询问（仅交互式终端）  >  默认全局
  let targetRoot;
  let scopeText;

  if (opt.target) {
    // 最明确：直接指定了目录
    targetRoot = path.resolve(opt.target);
    scopeText = '自定义';
  } else if (opt.scopeExplicit) {
    // 用户已用 -p / -g 表态，不再多问
    targetRoot = opt.project ? path.join(process.cwd(), '.claude') : path.join(os.homedir(), '.claude');
    scopeText = opt.project ? '项目级' : '全局';
  } else if (!opt.yes && (process.stdin.isTTY || opt.interactive)) {
    // 没表态但人在终端前：问一次（回车即全局，保持原有默认行为）
    const picked = await askTarget();
    targetRoot = picked.targetRoot;
    scopeText = picked.project ? '项目级' : '全局';
  } else {
    // 非交互场景（-y、管道、CI、hook）：不能问，否则会一直挂住
    targetRoot = path.join(os.homedir(), '.claude');
    scopeText = '全局';
  }

  // ---- 5. 开始安装 ----
  const stats = newStats();

  console.log('');
  console.log(`技能来源：${SOURCE_ROOT}`);
  console.log(`安装目标：${targetRoot}  (${scopeText})`);
  console.log(opt.dryRun ? '模式：预览（不会写入任何文件）\n' : '模式：实际安装\n');

  for (const bundle of bundles) {
    console.log(`— 套件 ${bundle.name}：${bundle.skills.length} 个技能` +
      (bundle.commands.length && !opt.noCommands ? `，${bundle.commands.length} 个命令` : ''));

    for (const skill of bundle.skills) {
      const dest = path.join(targetRoot, 'skills', skill.name);
      await installDir(skill.src, dest, opt, stats, skill.name);
    }

    if (!opt.noCommands) {
      for (const cmd of bundle.commands) {
        const dest = path.join(targetRoot, 'commands', cmd.rel);
        await installFile(cmd.src, dest, opt, stats, path.join('commands', cmd.rel));
      }
    }
  }

  // ---- 6. 汇总输出 ----
  const lines = [];
  lines.push('');
  lines.push('安装结果：');
  lines.push(`  新增 ${stats.added.length} 项`);
  lines.push(`  更新 ${stats.updated.length} 项`);
  lines.push(`  无变化 ${stats.unchanged.length} 项（已是最新，跳过）`);

  const changed = [...stats.added, ...stats.updated];
  if (changed.length > 0) {
    lines.push('');
    lines.push(opt.dryRun ? '  将要处理：' : '  已处理：');
    for (const item of changed) lines.push(`    - ${item}`);
  }

  console.log(lines.join('\n'));

  // ---- 7. 提醒 ----
  console.log('');
  if (opt.dryRun) {
    console.log('这是预览模式，未写入任何文件。去掉 --dry-run 即可真正安装。');
  } else {
    console.log(`完成。目标目录：${targetRoot}`);
    console.log('提示：需要重启 Claude Code 会话，新技能才会被加载。');
  }

  // Superpowers 正常情况下是「插件」，安装成本地技能会与插件重复，给出提醒
  if (bundles.some((b) => b.name === 'superpowers')) {
    console.log('');
    console.log('注意：Superpowers 通常以插件形式安装（plugin marketplace）。');
    console.log('      若你已装了插件，再装一份本地技能会导致同名技能重复触发，');
    console.log('      建议只用 --bundle 安装 grill / openspec，或先卸载插件。');
  }

  console.log('');
}

// 统一入口，把异常转成友好提示
main().catch((err) => {
  console.error(`\n安装失败：${err.message}\n`);
  process.exitCode = 1;
});
