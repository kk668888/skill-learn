import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildOfflineKit } from '../offline/build-offline-kit.mjs';
import { prepareRtkArchive } from '../offline/rtk-input.mjs';
import { inspectRtkInstall, installRtk } from '../offline/rtk-install.mjs';

const INSTALLER = fileURLToPath(new URL('../offline/install-skills.mjs', import.meta.url));

/** 生成最小 ZIP，检验准备逻辑处理的是归档字节，而非一个伪造的目录。 */
async function archiveFixture(names = ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rtk-input-test-'));
  const source = path.join(root, 'source');
  const archive = path.join(root, 'rtk.zip');
  await mkdir(source);
  for (const name of names) await writeFile(path.join(source, name), `fixture:${name}`);
  const zipped = spawnSync('tar', ['-a', '-cf', archive, '-C', source, ...names], { encoding: 'utf8' });
  assert.equal(zipped.status, 0, zipped.stderr);
  assert.equal((await readFile(archive)).subarray(0, 2).toString(), 'PK');
  const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
  return { root, archive, digest };
}

test('RTK 输入准备拒绝错误摘要且不替换既有输出', async () => {
  const fixture = await archiveFixture();
  const target = path.join(fixture.root, 'prepared');
  try {
    await mkdir(target);
    await writeFile(path.join(target, 'keep.txt'), '保留');
    await assert.rejects(prepareRtkArchive(fixture.archive, target, '0'.repeat(64)), /SHA-256/);
    assert.equal(await readFile(path.join(target, 'keep.txt'), 'utf8'), '保留');
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

for (const omitted of ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) {
  test(`RTK 输入准备拒绝缺少 ${omitted} 且不发布目录`, async () => {
    const fixture = await archiveFixture(['rtk.exe', 'LICENSE', 'LICENSE-ENGINE'].filter((name) => name !== omitted));
    const target = path.join(fixture.root, 'prepared');
    try {
      await assert.rejects(prepareRtkArchive(fixture.archive, target, fixture.digest), new RegExp(omitted.replace('.', '\\.')));
      await assert.rejects(readFile(path.join(target, 'rtk.exe')), /ENOENT/);
    } finally { await rm(fixture.root, { recursive: true, force: true }); }
  });
}

test('RTK 输入准备成功后只发布程序与两份许可证', async () => {
  const fixture = await archiveFixture();
  const target = path.join(fixture.root, 'prepared');
  try {
    await prepareRtkArchive(fixture.archive, target, fixture.digest);
    for (const name of ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) {
      assert.equal(await readFile(path.join(target, name), 'utf8'), `fixture:${name}`);
    }
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('RTK 用户安装支持预检、重复跳过及 PATH 去重', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rtk-install-test-'));
  const source = path.join(root, 'source');
  const target = path.join(root, 'Programs', 'rtk');
  let userPath = path.join(root, 'existing');
  const pathAccess = { read: () => userPath, write: (value) => { userPath = value; } };
  try {
    await mkdir(source);
    for (const name of ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) await writeFile(path.join(source, name), `fixture:${name}`);
    const ready = await inspectRtkInstall(source, target, pathAccess, '');
    assert.equal(ready.kind, 'ready');
    await assert.rejects(readFile(path.join(target, 'rtk.exe')), /ENOENT/);
    await installRtk(source, target, pathAccess);
    assert.equal(await readFile(path.join(target, 'rtk.exe'), 'utf8'), 'fixture:rtk.exe');
    assert.equal(userPath.split(path.delimiter).filter((part) => part.toLowerCase() === target.toLowerCase()).length, 1);
    assert.equal((await inspectRtkInstall(source, target, pathAccess, '')).kind, 'skip');
    await installRtk(source, target, pathAccess);
    assert.equal(userPath.split(path.delimiter).filter((part) => part.toLowerCase() === target.toLowerCase()).length, 1);
    await writeFile(path.join(target, 'rtk.exe'), 'different');
    assert.equal((await inspectRtkInstall(source, target, pathAccess, '')).kind, 'conflict');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('RTK PATH 写入失败后可从已复制程序重试', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rtk-retry-test-'));
  const source = path.join(root, 'source');
  const target = path.join(root, 'rtk');
  let userPath = '';
  try {
    await mkdir(source);
    for (const name of ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) await writeFile(path.join(source, name), name);
    await assert.rejects(installRtk(source, target, { read: () => userPath, write: () => { throw new Error('注册表写入失败'); } }), /注册表写入失败/);
    assert.equal(await readFile(path.join(target, 'rtk.exe'), 'utf8'), 'rtk.exe');
    await installRtk(source, target, { read: () => userPath, write: (value) => { userPath = value; } });
    assert.equal(userPath, target);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('RTK 已通过环境变量登记用户 PATH 时不重复加入绝对路径', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rtk-env-path-test-'));
  const source = path.join(root, 'source');
  const target = path.join(root, 'rtk');
  const previous = process.env.RTK_PATH_TEST_ROOT;
  try {
    process.env.RTK_PATH_TEST_ROOT = root;
    await mkdir(source);
    for (const name of ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) await writeFile(path.join(source, name), name);
    let current = '%RTK_PATH_TEST_ROOT%\\rtk';
    const access = { read: () => current, write: (value) => { current = value; } };
    await installRtk(source, target, access);
    assert.equal(current, '%RTK_PATH_TEST_ROOT%\\rtk');
  } finally {
    if (previous === undefined) delete process.env.RTK_PATH_TEST_ROOT;
    else process.env.RTK_PATH_TEST_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test('RTK 登记 PATH 时保留原有空段及结尾分隔符', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rtk-raw-path-test-'));
  const source = path.join(root, 'source');
  const target = path.join(root, 'rtk');
  let current = 'C:\\Tools;;D:\\Other;';
  const access = { read: () => current, write: (value) => { current = value; } };
  try {
    await mkdir(source);
    for (const name of ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) await writeFile(path.join(source, name), name);
    await installRtk(source, target, access);
    assert.equal(current, `C:\\Tools;;D:\\Other;${target}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('RTK 单独预览不安装程序也不调用宿主 CLI', { skip: process.platform !== 'win32' }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rtk-cli-test-'));
  const source = path.join(root, 'inputs', 'rtk');
  const project = path.join(root, 'project');
  const kit = path.join(root, 'kit');
  const local = path.join(root, 'local');
  try {
    await mkdir(source, { recursive: true });
    await mkdir(project);
    for (const name of ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE']) await writeFile(path.join(source, name), name);
    await buildOfflineKit({ inputRoot: path.join(root, 'inputs'), outputRoot: kit, plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: 'win32-x64', bundles: ['rtk'] }],
      bundles: [{ name: 'rtk', suite: 'rtk', method: 'executable', version: 'fixture', source: 'fixture', license: 'test', input: 'rtk', output: 'payload/shared/rtk', required: ['rtk.exe', 'LICENSE', 'LICENSE-ENGINE'] }],
    } });
    const result = spawnSync(process.execPath, [INSTALLER, '--tool', 'codex', '--project', project,
      '--kit', kit, '--bundle', 'rtk', '--dry-run'], { encoding: 'utf8', env: { ...process.env, LOCALAPPDATA: local } });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /rtk：ready/);
    assert.match(result.stdout, /Programs\\rtk/);
    assert.match(result.stdout, /用户 PATH 将添加/);
    await assert.rejects(readFile(path.join(local, 'Programs', 'rtk', 'rtk.exe')), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
