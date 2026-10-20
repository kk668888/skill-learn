/**
 * 对真实仓库下载包进行一次离线安装前检查：脚本从解压位置寻找同级 skills/，
 * 因此只检查 --list，不实际写入用户的 Claude Code 技能目录。
 */
import { afterAll, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
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
})

it('真实下载包解压后可列出全部六套技能及命令', async () => {
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

  const output = execFileSync(process.execPath, [join(extractionRoot, 'install-skills.mjs'), '--list'], {
    cwd: extractionRoot,
    encoding: 'utf8',
  })
  expect(output).toContain('发现 6 套')
  for (const suite of ['anthropics', 'frontend-design-premium', 'grill', 'impeccable', 'openspec', 'superpowers']) {
    expect(output).toContain(`[${suite}]`)
  }
  expect(output).toContain('12 个命令')
})
