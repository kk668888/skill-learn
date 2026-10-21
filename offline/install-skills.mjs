#!/usr/bin/env node
/**
 * 离线安装的稳定入口。所有实际策略位于同级 offline-installer.mjs，
 * 因而从 ZIP 解压后，无论当前工作目录是什么，都能定位同包清单。
 */
import { installOffline } from './offline-installer.mjs';

installOffline().catch((error) => {
  console.error(`安装失败：${error.message}`);
  process.exitCode = 1;
});
