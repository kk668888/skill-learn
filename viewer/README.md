# viewer 启动

在 `viewer/` 目录安装依赖并启动开发服务：

```bash
cd viewer
npm ci
npm run dev
```

浏览器打开 `http://localhost:5188/` 直接进入技能文库（库总览）；`/overview/` 是学习总览矩阵，“开始学习”直达 grill 快速入手，“浏览技能文库”回到文库首页。开发服务支持页面热更新，文库 API 与页面同源。

生产模式在同一目录执行：

```bash
npm run build
VIEWER_PUBLIC_ORIGIN=http://localhost:5188 npm run start
```

`VIEWER_PUBLIC_ORIGIN` 须与浏览器实际访问的来源地址一致。下载完整离线包还需要在仓库根目录预制 `offline/kit/`；该目录缺失时页面和文档浏览仍可使用。
