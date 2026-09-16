FROM node:22-bookworm-slim AS dependencies

# 服务端依赖独立在 server/package.json（仅 pg/dotenv/esbuild），
# 避免把 react/pixi 等前端库装进服务端镜像。
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/server/node_modules ./server/node_modules
COPY server/package.json server/package-lock.json ./server/
COPY server ./server
COPY src/game ./src/game
COPY src/data ./src/data
COPY src/types.ts ./src/types.ts

USER node
