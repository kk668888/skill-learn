/**
 * 网页更新包制包前的只读校验入口。直接复用安装器的清单与逐文件摘要校验，
 * 让 PowerShell 制包脚本只根据退出码决定能否继续发布。
 */
import { verifyOfflineKit } from '../offline/offline-kit.mjs';

const kit = process.argv[2];
if (!kit) {
  console.log('离线目录校验失败：缺少 kit 路径');
  process.exitCode = 1;
} else {
  try {
    await verifyOfflineKit(kit);
  } catch (error) {
    console.log(`离线目录校验失败：${error.message}`);
    process.exitCode = 1;
  }
}
