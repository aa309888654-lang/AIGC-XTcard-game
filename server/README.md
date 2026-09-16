# 云存档服务

本目录提供匿名设备档案、云存档和作战连队服务。它不包含正式注册、密码登录或第三方认证；生产环境接入正式账号后，安装主体令牌应替换为账号会话令牌。

## 本地启动

```powershell
npm run cloud:db
npm run cloud:dev
npm run dev -- --port 5199
```

将 `.env.example` 复制为本地 `.env` 后，Vite 会将 `/api/cloud/*` 转发到 `http://127.0.0.1:3210/*`。未配置 `VITE_CLOUD_API_BASE` 时，客户端只保留 IndexedDB 离线队列，不会发出失败的网络请求。首次拥有指挥官档案后，客户端会创建匿名安装主体，并把档案自动同步。

生产环境必须设置独立的 `DATABASE_URL` 与高熵 `CLOUD_SIGNING_SECRET`；不得使用开发默认值。

## 当前 API

- `POST /v1/installations`：创建匿名安装主体（每 IP 限流，取 `X-Real-IP` / XFF 末段）。
- `POST /v1/sessions/refresh`：用本地保管的 `installationSecret` 换发新 accessToken（12 小时过期后保住玩家身份；每 IP 限流）。
- `GET /v1/bootstrap`：拉取云端档案文档与修订号。
- `POST /v1/sync/push`：使用幂等键和基础修订号推送 `meta/settings/decks/battle-session` 文档。
- `GET /health` / `GET /health/ready`：存活 / 就绪探针（后者校验数据库连接）。

## 作战连队 API

启动时会执行 `002_guilds.sql`，建立连队、成员和申请表。所有接口都要求有效的安装主体令牌，成员关系、成员上限和连队管理权限均由服务端校验。

- `GET /v1/guilds/mine`：读取当前玩家的连队、名册、公告和管理者可见的申请。
- `POST /v1/guilds`：创建连队。名称为 2-24 个字符，代号为 2-6 位大写字母或数字。
- `POST /v1/guilds/join`：使用 8 位邀请码加入连队。
- `GET /v1/guilds/discover`：读取公开招募连队目录；支持 `query` 查询参数。
- `POST /v1/guilds/:id/applications`：向公开招募连队提交申请。
- `PATCH /v1/guilds/mine/notice`：连队长/副连队长更新公告。
- `POST /v1/guilds/mine/applications/:id/approve|reject`：连队长/副连队长审批申请。
- `DELETE /v1/guilds/mine`：成员退出；连队长仅在没有其他成员时可解散连队。

资产账本表已经建立；货币、卡牌、商城和战斗结果的服务端权威结算将在下一阶段接入专用命令 API，不能接受客户端余额直接覆盖。
