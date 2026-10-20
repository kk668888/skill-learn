/** 局域网容器模式的来源边界，使用真实 HTTP multipart 请求验证。 */
import { afterEach, beforeEach, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request } from 'node:http'
import type { Server } from 'node:http'
import { createApiApp } from '../server/api'

const publicOrigin = 'http://192.168.8.20:5188'
let root = ''
let server: Server | null = null
let base = ''

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'viewer-origin-'))
  mkdirSync(join(root, 'docs', 'ai-docs'), { recursive: true })
})

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()))
  server = null
  rmSync(root, { recursive: true, force: true })
})

async function start(origin?: string) {
  server = createApiApp(root, {}, origin).listen(0)
  await new Promise<void>((resolve) => server!.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('测试服务没有取得端口')
  base = `http://127.0.0.1:${address.port}`
}

async function upload(host?: string, origin?: string): Promise<Response> {
  // Node fetch 会把自定义 Host 重置为目标 URL。这里用原生 HTTP 请求，
  // 才能真实验证服务端收到的 Host 与浏览器 Origin 是否分别匹配。
  const boundary = 'viewer-origin-test-boundary'
  const body = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="origin.md"\r\nContent-Type: text/markdown\r\n\r\n# 来源校验\n\r\n`
    + `--${boundary}\r\nContent-Disposition: form-data; name="targetName"\r\n\r\norigin.md\r\n`
    + `--${boundary}\r\nContent-Disposition: form-data; name="groupId"\r\n\r\nai-docs\r\n`
    + `--${boundary}--\r\n`,
  )
  return new Promise<Response>((resolve, reject) => {
    const url = new URL(`${base}/api/upload`)
    const outgoing = request(url, {
      method: 'POST',
      headers: {
        Host: host ?? url.host,
        ...(origin ? { Origin: origin } : {}),
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (incoming) => {
      const chunks: Buffer[] = []
      incoming.on('data', (chunk: Buffer) => chunks.push(chunk))
      incoming.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode })))
      incoming.on('error', reject)
    })
    outgoing.on('error', reject)
    outgoing.end(body)
  })
}

it('配置的局域网 Host 与 Origin 可以上传', async () => {
  await start(publicOrigin)
  const response = await upload('192.168.8.20:5188', publicOrigin)
  expect(response.status).toBe(201)
  expect(readdirSync(join(root, 'docs', 'ai-docs'))).toEqual(['origin.md'])
})

it.each([
  ['错误 Origin', '192.168.8.20:5188', 'http://evil.example'],
  ['错误 Host', 'evil.example', publicOrigin],
  ['缺少 Origin', '192.168.8.20:5188', undefined],
])('%s 不得在容器模式写入', async (_label, host, origin) => {
  await start(publicOrigin)
  const response = await upload(host, origin)
  expect(response.status).toBe(403)
  expect(readdirSync(join(root, 'docs', 'ai-docs'))).toEqual([])
})

it('容器启动配置缺失或不是单纯 HTTP Origin 时给出明确错误', async () => {
  const module = await import('../server/origin').catch(() => null)
  expect(module).not.toBeNull()
  expect(() => module!.requirePublicOrigin(undefined)).toThrow(/VIEWER_PUBLIC_ORIGIN/)
  expect(() => module!.requirePublicOrigin('https://192.168.8.20:5188')).toThrow(/HTTP/)
  expect(() => module!.requirePublicOrigin('http://192.168.8.20:5188/path')).toThrow(/不得含路径/)
  expect(module!.requirePublicOrigin(publicOrigin)).toBe(publicOrigin)
})

it('未配置容器来源时保留 localhost 开发模式', async () => {
  await start()
  const response = await upload()
  expect(response.status).toBe(201)
})
