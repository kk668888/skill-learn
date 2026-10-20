# 第一阶段只负责构建：Vite 和 TypeScript 打包器不进入最终镜像。
FROM node:22-bookworm-slim AS build
WORKDIR /app/viewer
COPY viewer/package.json viewer/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY viewer/ ./
RUN npm run build

# 最终镜像保留 Node 生产依赖和项目资料，上传只写入两个挂载目录。
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/viewer
COPY viewer/package.json viewer/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/viewer/dist ./dist
COPY --from=build /app/viewer/dist-server ./dist-server

WORKDIR /app
COPY skills/ ./skills/
COPY docs/skills/ ./docs/skills/
COPY docs/ai-docs/ ./docs/ai-docs/
COPY *.md ./
# collections 当前可能尚不存在；容器路径先建好，部署时由宿主机绑定挂载覆盖。
RUN mkdir -p docs/collections && chown -R node:node docs/ai-docs docs/collections

USER node
EXPOSE 5188
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5188/api/tree').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "viewer/dist-server/main.js"]
