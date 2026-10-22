/** 容器及本机生产模式的统一入口；项目资料路径沿用 config.ts 的项目根。 */
import { join } from 'node:path'
import { PROJECT_ROOT } from './config'
import { requirePublicOrigin } from './origin'
import { createProductionApp } from './production'

const port = Number(process.env.PORT ?? '5188')
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT 必须是 1 到 65535 之间的整数')
}

const staticDir = join(PROJECT_ROOT, 'viewer', 'dist')
const publicOrigin = requirePublicOrigin(process.env.VIEWER_PUBLIC_ORIGIN)
// 容器内必须监听所有接口，Portainer 映射的宿主机端口才能转发到服务。
createProductionApp(PROJECT_ROOT, staticDir, publicOrigin).listen(port, '0.0.0.0', () => {
  process.stdout.write(`学习总览与技能文库已启动，端口 ${port}\n`)
})
