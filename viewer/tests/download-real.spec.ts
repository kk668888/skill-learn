/**
 * 对真实仓库下载包进行离线安装前检查：从 HTTP 响应解压后直接运行包内
 * 清单查询和预览，确保插件、CLI、引擎和安装脚本仍处于同一目录层级。
 */
import { afterAll, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { unzipSync } from 'fflate'
import { createApiApp } from '../server/api'
import { PROJECT_ROOT } from '../server/config'

const extractionRoot = mkdtempSync(join(tmpdir(), 'viewer-installable-'))
let server: Server | null = null

afterAll(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()))
  rmSync(extractionRoot, { recursive: true, force: true })
}, 60_000)

it('真实下载包解压后可列出七套并预览，且包含平台引擎与完整依赖', async () => {
  server = createApiApp(PROJECT_ROOT).listen(0)
  await new Promise<void>((resolve) => server!.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('测试服务没有端口')
  const response = await fetch(`http://127.0.0.1:${address.port}/api/download`)
  expect(response.status).toBe(200)
  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))

  // 完整写出 ZIP 中的相对路径，验证安装脚本的定位逻辑，而不调用安装动作。
  for (const [relative, bytes] of Object.entries(entries)) {
    const destination = join(extractionRoot, ...relative.split('/'))
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, bytes)
  }
  expect(entries['skills/impeccable/impeccable/scripts/modern-screenshot.umd.js']).toBeDefined()
  expect(entries['skills/openspec/commands/opsx/apply.md']).toBeDefined()
  expect(entries['offline/offline-installer.mjs']).toBeDefined()
  expect(entries['安装.bat']).toBeDefined()
  expect(entries['offline/kit/.claude-plugin/marketplace.json']).toBeDefined()
  expect(entries['offline/kit/.agents/plugins/marketplace.json']).toBeDefined()
  expect(entries['offline/kit/payload/shared/openspec/node_modules/yaml/package.json']).toBeDefined()
  expect(entries['offline/kit/payload/claude/plugins/ponytail/.claude-plugin/plugin.json']).toBeDefined()
  expect(entries['offline/kit/payload/claude/plugins/ponytail/skills/ponytail/SKILL.md']).toBeDefined()
  expect(entries['offline/kit/payload/codex/plugins/ponytail/.codex-plugin/plugin.json']).toBeDefined()
  expect(entries['offline/kit/payload/shared/impeccable/dist/universal/.agents/skills/impeccable/scripts/bin/windows-x64/impeccable.exe']).toBeDefined()

  const output = execFileSync(process.execPath, [join(extractionRoot, 'offline', 'install-skills.mjs'), '--list'], {
    cwd: extractionRoot,
    encoding: 'utf8',
  })
  expect(output).toContain('发现 7 套')
  for (const suite of ['skill-creator', 'frontend-design-premium', 'grill', 'impeccable', 'openspec', 'ponytail', 'superpowers']) {
    expect(output).toContain(`[${suite}]`)
  }
  const preview = execFileSync(process.execPath, [
    join(extractionRoot, 'offline', 'install-skills.mjs'), '--tool', 'codex', '--project', extractionRoot,
    '--bundle', 'skill-creator', '--dry-run',
  ], { cwd: extractionRoot, encoding: 'utf8' })
  expect(preview).toContain('预览：codex / win32-x64')
  expect(preview).toContain('skill-creator：ready')

  // 清单必须携带可追溯的来源、许可证与逐文件摘要，完成标记摘要与 ZIP 内字节一致。
  const manifest = JSON.parse(new TextDecoder().decode(entries['offline/kit/manifest.json'])) as {
    targets: { agent: string; platform: string; bundles: string[] }[]
    bundles: { name: string; version?: string; source?: string; license?: string }[]
    files: { path: string; size: number; sha256?: string }[]
  }
  expect(manifest.targets).toEqual(expect.arrayContaining([
    expect.objectContaining({ agent: 'claude', platform: 'win32-x64' }),
    expect.objectContaining({ agent: 'codex', platform: 'win32-x64' }),
  ]))
  for (const bundle of manifest.bundles) {
    expect(bundle.version, `${bundle.name} 缺少版本`).toBeTruthy()
    expect(bundle.source, `${bundle.name} 缺少来源`).toBeTruthy()
    expect(bundle.license, `${bundle.name} 缺少许可证`).toBeTruthy()
  }
  expect(manifest.files.length).toBeGreaterThan(0)
  const filesWithoutDigest = manifest.files.filter((file) => !/^[0-9a-f]{64}$/.test(file.sha256 ?? ''))
  expect(filesWithoutDigest.map((file) => file.path)).toEqual([])
  const complete = JSON.parse(new TextDecoder().decode(entries['offline/kit/complete.json'])) as { manifestSha256?: string }
  expect(complete.manifestSha256).toBe(createHash('sha256').update(entries['offline/kit/manifest.json']).digest('hex'))

  expect(entries['skill-learn-bundle.zip']).toBeUndefined()
}, 60_000)
