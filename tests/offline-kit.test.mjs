import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { verifyOfflineKit } from '../offline/offline-kit.mjs';
import { buildOfflineKit, fingerprintTree } from '../offline/build-offline-kit.mjs';

/**
 * 使用极小的真实目录测试清单校验。这里刻意不模拟哈希函数：安装脚本和下载接口
 * 最终要验证的是磁盘上的原始字节，而不是清单对象本身是否看起来正确。
 */
async function makeKit() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-kit-'));
  const relative = 'payload/skills/skill-creator/SKILL.md';
  const bytes = Buffer.from('# 测试技能\n');
  const target = path.join(root, ...relative.split('/'));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  const manifest = {
    format: 1,
    targets: [{ agent: 'claude', platform: 'win32-x64', bundles: ['skill-creator'] }],
    bundles: [{ name: 'skill-creator', method: 'skill', version: 'snapshot', source: 'test', license: 'MIT' }],
    files: [{ path: relative, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }],
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(root, 'manifest.json'), manifestBytes);
  await writeFile(path.join(root, 'complete.json'), `${JSON.stringify({ manifestSha256: createHash('sha256').update(manifestBytes).digest('hex') })}\n`);
  return { root, relative, target, manifest };
}

test('完整的离线目录返回经过校验的归档文件清单', async () => {
  const kit = await makeKit();
  try {
    const checked = await verifyOfflineKit(kit.root);
    assert.deepEqual(checked.paths, ['complete.json', 'manifest.json', kit.relative]);
    assert.equal(checked.manifest.targets[0].platform, 'win32-x64');
  } finally {
    await rm(kit.root, { recursive: true, force: true });
  }
});

test('归档快照保持校验时的原始字节，即使源文件随后被等长替换', async () => {
  const kit = await makeKit();
  try {
    const original = await readFile(kit.target);
    const checked = await verifyOfflineKit(kit.root, { snapshot: true });
    await writeFile(kit.target, Buffer.alloc(original.length, 0x58));
    assert.deepEqual(checked.contents.get(kit.relative), original);
  } finally {
    await rm(kit.root, { recursive: true, force: true });
  }
});

test('磁盘快照保持已验证字节且可在下载结束后清理', async () => {
  const kit = await makeKit();
  let checked;
  try {
    const original = await readFile(kit.target);
    checked = await verifyOfflineKit(kit.root, { snapshot: 'disk' });
    await writeFile(kit.target, Buffer.alloc(original.length, 0x59));
    const snapshotFile = path.join(checked.snapshotRoot, ...kit.relative.split('/'));
    assert.deepEqual(await readFile(snapshotFile), original);
    await checked.dispose();
    await assert.rejects(readFile(snapshotFile), /ENOENT/);
  } finally {
    await checked?.dispose?.();
    await rm(kit.root, { recursive: true, force: true });
  }
});

test('缺少文件或文件字节被修改时拒绝安装', async () => {
  const kit = await makeKit();
  try {
    await writeFile(kit.target, '# 被替换\n');
    await assert.rejects(verifyOfflineKit(kit.root), /摘要|大小/);
    await rm(kit.target);
    await assert.rejects(verifyOfflineKit(kit.root), /缺少|不存在/);
  } finally {
    await rm(kit.root, { recursive: true, force: true });
  }
});

test('拒绝清单路径越界及未列入清单的额外文件', async () => {
  const kit = await makeKit();
  try {
    const manifestPath = path.join(kit.root, 'manifest.json');
    const malicious = structuredClone(kit.manifest);
    malicious.files[0].path = '../outside.txt';
    const bytes = Buffer.from(`${JSON.stringify(malicious)}\n`);
    await writeFile(manifestPath, bytes);
    await writeFile(path.join(kit.root, 'complete.json'), `${JSON.stringify({ manifestSha256: createHash('sha256').update(bytes).digest('hex') })}\n`);
    await assert.rejects(verifyOfflineKit(kit.root), /路径/);

    const valid = Buffer.from(`${JSON.stringify(kit.manifest)}\n`);
    await writeFile(manifestPath, valid);
    await writeFile(path.join(kit.root, 'complete.json'), `${JSON.stringify({ manifestSha256: createHash('sha256').update(valid).digest('hex') })}\n`);
    await writeFile(path.join(kit.root, 'extra.txt'), '不应进入下载包');
    await assert.rejects(verifyOfflineKit(kit.root), /额外/);
  } finally {
    await rm(kit.root, { recursive: true, force: true });
  }
});

test('制包只有在全部输入可用后才发布完成标记，重复制包的清单字节相同', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-build-'));
  const input = path.join(root, 'input');
  const output = path.join(root, 'offline-kit');
  const plan = {
    format: 1,
    targets: [{ agent: 'claude', platform: 'win32-x64', bundles: ['skill-creator'] }],
    bundles: [{ name: 'skill-creator', method: 'skill', version: '1.0.0', source: 'https://example.test/source', license: 'MIT', input: 'skill-creator', output: 'payload/skills/skill-creator' }],
  };
  try {
    await assert.rejects(buildOfflineKit({ inputRoot: input, outputRoot: output, plan }), /缺少/);
    await assert.rejects(readFile(path.join(output, 'complete.json')), /ENOENT/);
    await mkdir(path.join(input, 'skill-creator'), { recursive: true });
    await writeFile(path.join(input, 'skill-creator', 'SKILL.md'), '# skill-creator\n');
    await buildOfflineKit({ inputRoot: input, outputRoot: output, plan });
    const first = await readFile(path.join(output, 'manifest.json'));
    await verifyOfflineKit(output);
    await buildOfflineKit({ inputRoot: input, outputRoot: output, plan });
    assert.deepEqual(await readFile(path.join(output, 'manifest.json')), first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('固定输入摘要不符时拒绝发布离线目录', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-input-lock-'));
  const input = path.join(root, 'input');
  const output = path.join(root, 'kit');
  try {
    await mkdir(path.join(input, 'plugin'), { recursive: true });
    await writeFile(path.join(input, 'plugin', 'SKILL.md'), '# 固定内容\n');
    const digest = await fingerprintTree(path.join(input, 'plugin'));
    await writeFile(path.join(input, 'plugin', 'SKILL.md'), '# 等长篡改\n');
    await assert.rejects(buildOfflineKit({ inputRoot: input, outputRoot: output, plan: {
      format: 1,
      targets: [{ agent: 'codex', platform: 'win32-x64', bundles: ['demo'] }],
      bundles: [{ name: 'demo', method: 'skill', version: '1.0.0', source: 'fixture', license: 'MIT',
        input: 'plugin', inputSha256: digest, output: 'payload/plugin' }],
    } }), /输入摘要/);
    await assert.rejects(readFile(path.join(output, 'complete.json')), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('发布命令拒绝缺少输入摘要的自定义计划', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-learn-release-plan-'));
  const input = path.join(root, 'input');
  const output = path.join(root, 'kit');
  const planPath = path.join(root, 'plan.json');
  try {
    await mkdir(path.join(input, 'plugin'), { recursive: true });
    await writeFile(path.join(input, 'plugin', 'SKILL.md'), '# 技能\n');
    await writeFile(planPath, JSON.stringify({
      format: 1,
      targets: [{ agent: 'codex', platform: 'win32-x64', bundles: ['demo'] }],
      bundles: [{ name: 'demo', method: 'skill', version: '1.0.0', source: 'fixture', license: 'MIT',
        input: 'plugin', output: 'payload/plugin' }],
    }));
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../offline/build-offline-kit.mjs', import.meta.url)),
      '--input', input, '--output', output, '--plan', planPath], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /输入摘要/);
    await assert.rejects(readFile(path.join(output, 'complete.json')), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
