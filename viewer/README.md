# viewer 启动

在 `viewer/` 目录安装依赖并启动开发服务：

```bash
cd viewer
npm ci
npm run dev
```

浏览器打开 `http://localhost:5188/` 进入学习总览；“开始学习”直达 grill 快速入手，“浏览技能文库”进入 `/library/`。开发服务支持页面热更新，文库 API 与页面同源。

生产模式在同一目录执行：

```bash
npm run build
VIEWER_PUBLIC_ORIGIN=http://localhost:5188 npm run start
```

`VIEWER_PUBLIC_ORIGIN` 须与浏览器实际访问的来源地址一致。下载完整离线包还需要在仓库根目录预制 `offline/kit/`；该目录缺失时页面和文档浏览仍可使用。
