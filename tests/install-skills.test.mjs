import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildOfflineKit } from '../build-offline-kit.mjs';

const SCRIPT = fileURLToPath(new URL('../install-skills.mjs', import.meta.url));
const REPO = fileURLToPath(new URL('..', import.meta.url));

/** 只构造独立技能，不依赖本机插件配置，专门检查静态验证和幂等复制。 */
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-install-'));
  const input = path.join(root, 'inputs');
  const project = path.join(root, 'project');
  const kit = path.join(root, 'kit');
  await mkdir(path.join(input, 'skill-creator', 'references'), { recursive: true });
  await mkdir(project);
  await writeFile(path.join(input, 'skill-creator', 'SKILL.md'), '# Skill Creator\n');
  await writeFile(path.join(input, 'skill-creator', 'references', 'guide.md'), '# Guide\n');
  await buildOfflineKit({
    inputRoot: input,
    outputRoot: kit,
    plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: `${process.platform}-${process.arch}`, bundles: ['skill-creator'] }],
      bundles: [{ name: 'skill-creator', suite: 'skill-creator', method: 'skill', version: 'test', source: 'fixture', license: 'MIT', input: 'skill-creator', output: 'payload/shared/skill-creator', required: ['SKILL.md'] }],
    },
  });
  return { root, project, kit };
}

/** 使用本地假宿主记录真实传入的 argv/cwd，避免测试依赖用户已安装的插件。 */
async function pluginFixture(tool) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-plugin-'));
  const input = path.join(root, 'inputs');
  const project = path.join(root, 'project');
  const kit = path.join(root, 'kit');
  const provider = tool === 'claude' ? '.claude-plugin' : '.codex-plugin';
  await mkdir(path.join(input, 'plugin', provider), { recursive: true });
  await mkdir(path.join(input, 'plugin', 'skills', 'grilling-offline-fixture'), { recursive: true });
  await mkdir(project);
  await writeFile(path.join(input, 'plugin', provider, 'plugin.json'), JSON.stringify({ name: 'demo', version: '1.0.0' }));
  await writeFile(path.join(input, 'plugin', 'skills', 'grilling-offline-fixture', 'SKILL.md'), '# Grill\n');
  await buildOfflineKit({ inputRoot: input, outputRoot: kit, plan: {
    format: 1,
    targets: [{ agent: tool, platform: `${process.platform}-${process.arch}`, bundles: ['demo'] }],
    bundles: [{ name: 'demo', suite: 'grill', agent: tool, method: 'plugin', pluginName: 'demo',
      version: '1.0.0', source: 'fixture', license: 'MIT', input: 'plugin', output: `payload/${tool}/plugins/demo` }],
  } });
  const host = path.join(root, 'host.js');
  const log = path.join(root, 'host.log');
  await writeFile(host, `const fs = require('node:fs');
fs.appendFileSync(process.env.HOST_LOG, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }) + '\\n');
if (process.argv.includes('list')) {
  if (process.env.HOST_LIST_ERROR) process.exit(9);
  process.stdout.write(process.env.HOST_LIST || '[]');
}
`);
  return { root, project, kit, host, log };
}

test('离线预览不写目标，实际安装保留附属文件，重复运行跳过', async () => {
  const state = await fixture();
  const args = ['--tool', 'codex', '--project', state.project, '--kit', state.kit, '--bundle', 'skill-creator'];
  try {
    const preview = execFileSync(process.execPath, [SCRIPT, ...args, '--dry-run'], { encoding: 'utf8' });
    assert.match(preview, /预览/);
    await assert.rejects(readFile(path.join(state.project, '.agents/skills/skill-creator/SKILL.md')), /ENOENT/);
    const installed = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
    assert.match(installed, /成功/);
    assert.equal(await readFile(path.join(state.project, '.agents/skills/skill-creator/references/guide.md'), 'utf8'), '# Guide\n');
    const repeated = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
    assert.match(repeated, /跳过/);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('静态校验失败时不写入目标目录', async () => {
  const state = await fixture();
  try {
    await writeFile(path.join(state.kit, 'payload/shared/skill-creator/SKILL.md'), '损坏');
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', state.project, '--kit', state.kit, '--bundle', 'skill-creator'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /摘要|大小/);
    await assert.rejects(readFile(path.join(state.project, '.agents/skills/skill-creator/SKILL.md')), /ENOENT/);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('来源不明的同名技能报告冲突且不覆盖', async () => {
  const state = await fixture();
  try {
    const target = path.join(state.project, '.agents/skills/skill-creator');
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'SKILL.md'), '# 其他来源\n');
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', state.project, '--kit', state.kit, '--bundle', 'skill-creator'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /冲突|conflict/);
    assert.equal(await readFile(path.join(target, 'SKILL.md'), 'utf8'), '# 其他来源\n');
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('中途命令失败时报告已完成项，并能安全重试', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-partial-'));
  const input = path.join(root, 'inputs');
  const kit = path.join(root, 'kit');
  const project = path.join(root, 'project');
  try {
    await mkdir(path.join(input, 'creator'), { recursive: true });
    await mkdir(path.join(input, 'openspec', 'bin'), { recursive: true });
    await mkdir(project);
    await writeFile(path.join(input, 'creator', 'SKILL.md'), '# Creator\n');
    await writeFile(path.join(input, 'openspec', 'bin', 'openspec.js'), 'process.exit(7)\n');
    await buildOfflineKit({ inputRoot: input, outputRoot: kit, plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: `${process.platform}-${process.arch}`, bundles: ['skill-creator', 'openspec'] }],
      bundles: [
        { name: 'skill-creator', suite: 'skill-creator', method: 'skill', version: 'test', source: 'fixture', license: 'MIT', input: 'creator', output: 'payload/creator' },
        { name: 'openspec', suite: 'openspec', method: 'cli', version: 'test', source: 'fixture', license: 'MIT', input: 'openspec', output: 'payload/openspec' },
      ],
    } });
    const args = [SCRIPT, '--tool', 'codex', '--project', project, '--kit', kit,
      '--bundle', 'skill-creator', '--bundle', 'openspec'];
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(first.status, 1);
    assert.match(first.stdout, /成功：skill-creator/);
    assert.match(first.stderr, /失败：openspec/);
    assert.equal(await readFile(path.join(project, '.agents/skills/skill-creator/SKILL.md'), 'utf8'), '# Creator\n');
    const retry = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(retry.status, 1);
    assert.match(retry.stdout, /跳过：skill-creator/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('目标平台未列入清单时在写入前停止', async () => {
  const state = await fixture();
  try {
    const manifestPath = path.join(state.kit, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.targets[0].platform = 'linux-arm64';
    const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`);
    await writeFile(manifestPath, bytes);
    const { createHash } = await import('node:crypto');
    await writeFile(path.join(state.kit, 'complete.json'), `${JSON.stringify({ manifestSha256: createHash('sha256').update(bytes).digest('hex') })}\n`);
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', state.project,
      '--kit', state.kit, '--bundle', 'skill-creator'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /不支持/);
    await assert.rejects(readFile(path.join(state.project, '.agents/skills/skill-creator/SKILL.md')), /ENOENT/);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('已有同版本 Claude 插件和旧版同名技能时仍报告冲突', async () => {
  const state = await pluginFixture('claude');
  const previous = process.env.HOST_LIST;
  const previousLog = process.env.HOST_LOG;
  try {
    process.env.HOST_LOG = state.log;
    process.env.HOST_LIST = JSON.stringify([{ name: 'demo', id: 'demo@skill-learn-offline', version: '1.0.0' }]);
    const oldSkill = path.join(state.project, '.claude', 'skills', 'grilling-offline-fixture');
    await mkdir(oldSkill, { recursive: true });
    await writeFile(path.join(oldSkill, 'SKILL.md'), '# 旧版\n');
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'claude', '--project', state.project,
      '--kit', state.kit, '--bundle', 'grill', '--host-bin', state.host, '--dry-run'], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /conflict.*已有本地技能/);
  } finally {
    if (previous === undefined) delete process.env.HOST_LIST; else process.env.HOST_LIST = previous;
    if (previousLog === undefined) delete process.env.HOST_LOG; else process.env.HOST_LOG = previousLog;
    await rm(state.root, { recursive: true, force: true });
  }
});

test('Claude 项目范围市场注册使用目标项目目录及 project 范围', async () => {
  const state = await pluginFixture('claude');
  const previous = process.env.HOST_LOG;
  try {
    process.env.HOST_LOG = state.log;
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'claude', '--project', state.project,
      '--kit', state.kit, '--bundle', 'grill', '--host-bin', state.host], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const calls = (await readFile(state.log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(calls.some(({ args, cwd }) => args.join(' ').includes('marketplace add') &&
      args.includes('--scope') && args.includes('project') && args.includes(state.kit) && cwd === state.project));
    assert.ok(calls.some(({ args, cwd }) => args.join(' ').includes('plugin list') && cwd === state.project));
  } finally {
    if (previous === undefined) delete process.env.HOST_LOG; else process.env.HOST_LOG = previous;
    await rm(state.root, { recursive: true, force: true });
  }
});

test('Codex 插件预览只检查本地状态，不调用可能查询远程市场的 plugin list', async () => {
  const state = await pluginFixture('codex');
  const previousLog = process.env.HOST_LOG;
  const previousError = process.env.HOST_LIST_ERROR;
  const previousHome = process.env.CODEX_HOME;
  try {
    process.env.HOST_LOG = state.log;
    process.env.HOST_LIST_ERROR = '1';
    process.env.CODEX_HOME = path.join(state.root, 'codex-home');
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', state.project,
      '--kit', state.kit, '--bundle', 'grill', '--host-bin', state.host, '--dry-run'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /grill：ready/);
    const calls = (await readFile(state.log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(calls.every(({ args }) => !args.includes('list')));
  } finally {
    if (previousLog === undefined) delete process.env.HOST_LOG; else process.env.HOST_LOG = previousLog;
    if (previousError === undefined) delete process.env.HOST_LIST_ERROR; else process.env.HOST_LIST_ERROR = previousError;
    if (previousHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousHome;
    await rm(state.root, { recursive: true, force: true });
  }
});

test('Codex 仅有同版本缓存但未启用时不报告已安装', async () => {
  const state = await pluginFixture('codex');
  const previousLog = process.env.HOST_LOG;
  const previousHome = process.env.CODEX_HOME;
  try {
    process.env.HOST_LOG = state.log;
    process.env.CODEX_HOME = path.join(state.root, 'codex-home');
    await mkdir(path.join(process.env.CODEX_HOME, 'plugins', 'cache', 'skill-learn-offline', 'demo', '1.0.0'), { recursive: true });
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', state.project,
      '--kit', state.kit, '--bundle', 'grill', '--host-bin', state.host, '--dry-run'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /grill：conflict.*缓存.*未启用/);
  } finally {
    if (previousLog === undefined) delete process.env.HOST_LOG; else process.env.HOST_LOG = previousLog;
    if (previousHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousHome;
    await rm(state.root, { recursive: true, force: true });
  }
});

test('Codex 同版本缓存与启用配置同时存在时重复安装跳过', async () => {
  const state = await pluginFixture('codex');
  const previousLog = process.env.HOST_LOG;
  const previousHome = process.env.CODEX_HOME;
  try {
    process.env.HOST_LOG = state.log;
    process.env.CODEX_HOME = path.join(state.root, 'codex-home');
    await mkdir(path.join(process.env.CODEX_HOME, 'plugins', 'cache', 'skill-learn-offline', 'demo', '1.0.0'), { recursive: true });
    await writeFile(path.join(process.env.CODEX_HOME, 'config.toml'), '[plugins."demo@skill-learn-offline"]\nenabled = true\n');
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', state.project,
      '--kit', state.kit, '--bundle', 'grill', '--host-bin', state.host], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /grill：skip.*本包同版本已安装/);
  } finally {
    if (previousLog === undefined) delete process.env.HOST_LOG; else process.env.HOST_LOG = previousLog;
    if (previousHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousHome;
    await rm(state.root, { recursive: true, force: true });
  }
});

test('Impeccable 已有其他来源技能时预览显示冲突', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-engine-'));
  const input = path.join(root, 'inputs');
  const kit = path.join(root, 'kit');
  const project = path.join(root, 'project');
  try {
    const relative = 'engine/dist/universal/.agents/skills/impeccable';
    await mkdir(path.join(input, ...relative.split('/')), { recursive: true });
    await writeFile(path.join(input, ...relative.split('/'), 'SKILL.md'), '# Impeccable\n');
    await mkdir(path.join(project, '.agents', 'skills', 'impeccable'), { recursive: true });
    await writeFile(path.join(project, '.agents', 'skills', 'impeccable', 'SKILL.md'), '# 其他来源\n');
    await buildOfflineKit({ inputRoot: input, outputRoot: kit, plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: `${process.platform}-${process.arch}`, bundles: ['impeccable'] }],
      bundles: [{ name: 'impeccable', method: 'engine', version: 'test', source: 'fixture', license: 'MIT',
        input: 'engine', output: 'payload/engine' }],
    } });
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', project,
      '--kit', kit, '--bundle', 'impeccable', '--dry-run'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /impeccable：conflict.*已有其他来源/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('--help 与 --list 不要求目标工具并显示离线包内容', async () => {
  const state = await fixture();
  try {
    const help = execFileSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
    assert.match(help, /--tool claude\|codex/);
    assert.match(help, /--dry-run/);
    assert.match(help, /七套/);
    const list = execFileSync(process.execPath, [SCRIPT, '--list', '--kit', state.kit], { encoding: 'utf8' });
    assert.match(list, /\[skill-creator\] test/);
    assert.match(list, new RegExp(`支持：codex / ${process.platform}-${process.arch}`));
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('ponytail 套件按插件方式解析并可被单独选择', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-ponytail-'));
  const input = path.join(root, 'inputs');
  const kit = path.join(root, 'kit');
  const project = path.join(root, 'project');
  try {
    await mkdir(path.join(input, 'plugin', '.claude-plugin'), { recursive: true });
    await mkdir(path.join(input, 'plugin', 'skills', 'ponytail'), { recursive: true });
    await mkdir(project);
    await writeFile(path.join(input, 'plugin', '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'ponytail', version: '5.3.2' }));
    await writeFile(path.join(input, 'plugin', 'skills', 'ponytail', 'SKILL.md'), '# Ponytail\n');
    await buildOfflineKit({ inputRoot: input, outputRoot: kit, plan: {
      format: 1,
      targets: [{ agent: 'claude', platform: `${process.platform}-${process.arch}`, bundles: ['ponytail-claude'] }],
      bundles: [{ name: 'ponytail-claude', suite: 'ponytail', agent: 'claude', method: 'plugin', pluginName: 'ponytail',
        version: '5.3.2', source: 'fixture', license: 'MIT', input: 'plugin', output: 'payload/claude/plugins/ponytail' }],
    } });
    const host = path.join(root, 'host.js');
    await writeFile(host, `if (process.argv.includes('list')) process.stdout.write('[]');\n`);
    const preview = spawnSync(process.execPath, [SCRIPT, '--tool', 'claude', '--project', project,
      '--kit', kit, '--bundle', 'ponytail', '--host-bin', host, '--dry-run'], { encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /ponytail：ready/);
    assert.match(preview.stdout, /从包内市场安装插件/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('--status 报告冲突现状且不修改目标', async () => {
  const state = await fixture();
  try {
    const target = path.join(state.project, '.agents/skills/skill-creator');
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'SKILL.md'), '# 其他来源\n');
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', state.project,
      '--kit', state.kit, '--bundle', 'skill-creator', '--status'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /状态：codex/);
    assert.match(result.stdout, /skill-creator：conflict/);
    assert.equal(await readFile(path.join(target, 'SKILL.md'), 'utf8'), '# 其他来源\n');
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('参数错误在解析阶段停止且不写入', async () => {
  const state = await fixture();
  const base = ['--tool', 'codex', '--project', state.project, '--kit', state.kit, '--bundle', 'skill-creator'];
  const cases = [
    { args: ['--tool', 'codex', '--bundle', 'not-a-suite'], message: /未知套件/ },
    { args: [...base, '--nope'], message: /未知参数/ },
    { args: ['--tool', '--kit', state.kit], message: /缺少值/ },
    { args: [...base, '--scope', 'both'], message: /--scope 只能是/ },
  ];
  try {
    for (const { args, message } of cases) {
      const result = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
      assert.notEqual(result.status, 0, `应失败：${args.join(' ')}`);
      assert.match(result.stderr, message);
      await assert.rejects(readFile(path.join(state.project, '.agents/skills/skill-creator/SKILL.md')), /ENOENT/);
    }
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('宿主程序缺失或宿主无法运行时在写入前停止', async () => {
  const state = await pluginFixture('claude');
  try {
    const missing = spawnSync(process.execPath, [SCRIPT, '--tool', 'claude', '--project', state.project,
      '--kit', state.kit, '--bundle', 'grill', '--host-bin', path.join(state.root, 'no-such-host.exe')],
      { encoding: 'utf8' });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /宿主程序不存在/);
    const broken = path.join(state.root, 'broken-host.js');
    await writeFile(broken, 'process.exit(3)\n');
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'claude', '--project', state.project,
      '--kit', state.kit, '--bundle', 'grill', '--host-bin', broken], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /退出码 3/);
    await assert.rejects(readFile(state.log, 'utf8'), /ENOENT/);
  } finally {
    await rm(state.root, { recursive: true, force: true });
  }
});

test('OpenSpec 用包内 CLI 在目标项目内 init 或 update，并禁用在线更新检查', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-openspec-'));
  const input = path.join(root, 'inputs');
  const kit = path.join(root, 'kit');
  try {
    await mkdir(path.join(input, 'openspec', 'bin'), { recursive: true });
    await writeFile(path.join(input, 'openspec', 'bin', 'openspec.js'), `const fs = require('node:fs');
const path = require('node:path');
const [action, project] = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({
  args: process.argv.slice(2), cwd: process.cwd(),
  noUpdateCheck: process.env.OPENSPEC_NO_UPDATE_CHECK, telemetry: process.env.OPENSPEC_TELEMETRY,
}) + '\\n');
fs.mkdirSync(path.join(project, 'openspec'), { recursive: true });
fs.writeFileSync(path.join(project, 'openspec', action === 'init' ? 'config.yaml' : 'generated.md'), action + '\\n');
`);
    await buildOfflineKit({ inputRoot: input, outputRoot: kit, plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: `${process.platform}-${process.arch}`, bundles: ['openspec'] }],
      bundles: [{ name: 'openspec', suite: 'openspec', method: 'cli', version: 'test', source: 'fixture', license: 'MIT', input: 'openspec', output: 'payload/openspec' }],
    } });
    const log = path.join(root, 'cli.log');
    const env = { ...process.env, FAKE_LOG: log };
    const fresh = path.join(root, 'fresh');
    await mkdir(fresh);
    const init = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', fresh,
      '--kit', kit, '--bundle', 'openspec'], { encoding: 'utf8', env });
    assert.equal(init.status, 0, init.stderr);
    const calls = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args, ['init', fresh, '--tools', 'codex', '--no-animation']);
    assert.equal(calls[0].cwd, fresh);
    assert.equal(calls[0].noUpdateCheck, '1');
    assert.equal(calls[0].telemetry, '0');
    assert.equal(await readFile(path.join(fresh, 'openspec', 'config.yaml'), 'utf8'), 'init\n');

    const existing = path.join(root, 'existing');
    await mkdir(path.join(existing, 'openspec'), { recursive: true });
    await writeFile(path.join(existing, 'openspec', 'config.yaml'), 'keep: true\n');
    const update = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', existing,
      '--kit', kit, '--bundle', 'openspec'], { encoding: 'utf8', env });
    assert.equal(update.status, 0, update.stderr);
    const updated = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(updated[1].args[0], 'update');
    assert.equal(await readFile(path.join(existing, 'openspec', 'config.yaml'), 'utf8'), 'keep: true\n');
    assert.equal(await readFile(path.join(existing, 'openspec', 'generated.md'), 'utf8'), 'update\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('冲突套件跳过但其余套件继续安装，整批以状态码 2 结束', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-mixed-'));
  const input = path.join(root, 'inputs');
  const kit = path.join(root, 'kit');
  const project = path.join(root, 'project');
  const previousHome = process.env.CODEX_HOME;
  try {
    process.env.CODEX_HOME = path.join(root, 'codex-home');
    await mkdir(path.join(input, 'creator'), { recursive: true });
    await mkdir(path.join(input, 'plugin', '.codex-plugin'), { recursive: true });
    await mkdir(path.join(input, 'plugin', 'skills', 'grill-offline-fixture'), { recursive: true });
    await mkdir(project);
    await writeFile(path.join(input, 'creator', 'SKILL.md'), '# Creator\n');
    await writeFile(path.join(input, 'plugin', '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'demo', version: '1.0.0' }));
    await writeFile(path.join(input, 'plugin', 'skills', 'grill-offline-fixture', 'SKILL.md'), '# Grill\n');
    await buildOfflineKit({ inputRoot: input, outputRoot: kit, plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: `${process.platform}-${process.arch}`, bundles: ['skill-creator', 'grill'] }],
      bundles: [
        { name: 'skill-creator', suite: 'skill-creator', method: 'skill', version: 'test', source: 'fixture', license: 'MIT', input: 'creator', output: 'payload/creator', required: ['SKILL.md'] },
        { name: 'grill', suite: 'grill', method: 'plugin', agent: 'codex', pluginName: 'demo',
          version: '1.0.0', source: 'fixture', license: 'MIT', input: 'plugin', output: 'payload/codex/plugins/demo' },
      ],
    } });
    const conflict = path.join(project, '.agents', 'skills', 'skill-creator');
    await mkdir(conflict, { recursive: true });
    await writeFile(path.join(conflict, 'SKILL.md'), '# 其他来源\n');
    const host = path.join(root, 'host.js');
    await writeFile(host, `if (process.argv.includes('list')) process.stdout.write('[]');\n`);
    const result = spawnSync(process.execPath, [SCRIPT, '--tool', 'codex', '--project', project,
      '--kit', kit, '--bundle', 'skill-creator', '--bundle', 'grill', '--host-bin', host], { encoding: 'utf8' });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stdout, /成功：grill/);
    assert.match(result.stdout, /跳过：skill-creator/);
    assert.equal(await readFile(path.join(conflict, 'SKILL.md'), 'utf8'), '# 其他来源\n');
  } finally {
    if (previousHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('默认读取脚本同级 offline-kit 且不依赖当前目录', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-default-kit-'));
  const project = path.join(root, 'project');
  try {
    const input = path.join(root, 'inputs');
    await mkdir(path.join(input, 'skill-creator', 'references'), { recursive: true });
    await mkdir(project);
    await writeFile(path.join(input, 'skill-creator', 'SKILL.md'), '# Skill Creator\n');
    await writeFile(path.join(input, 'skill-creator', 'references', 'guide.md'), '# Guide\n');
    await buildOfflineKit({ inputRoot: input, outputRoot: path.join(root, 'offline-kit'), plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: `${process.platform}-${process.arch}`, bundles: ['skill-creator'] }],
      bundles: [{ name: 'skill-creator', suite: 'skill-creator', method: 'skill', version: 'test', source: 'fixture', license: 'MIT', input: 'skill-creator', output: 'payload/shared/skill-creator', required: ['SKILL.md'] }],
    } });
    for (const name of ['install-skills.mjs', 'offline-installer.mjs', 'offline-kit.mjs']) {
      await cp(path.join(REPO, name), path.join(root, name));
    }
    const result = spawnSync(process.execPath, [path.join(root, 'install-skills.mjs'), '--tool', 'codex',
      '--project', project, '--bundle', 'skill-creator'], { encoding: 'utf8', cwd: project });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /成功/);
    assert.equal(await readFile(path.join(project, '.agents/skills/skill-creator/references/guide.md'), 'utf8'), '# Guide\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
