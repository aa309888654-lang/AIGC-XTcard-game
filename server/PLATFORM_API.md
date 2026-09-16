# 权威平台服务

`authoritative-platform.mjs` 是与现有云存档并行运行的在线游戏服务，默认监听 `3211`。它与云存档共用 PostgreSQL 和匿名安装主体令牌；正式上线时，应将安装主体令牌替换为正式账号会话。

```powershell
node server/authoritative-platform.mjs
```

启动时会执行 `001`、`002`、`003_authoritative_platform.sql`。生产环境必须提供独立的 `DATABASE_URL` 和高熵 `CLOUD_SIGNING_SECRET`。

## 权威边界

- 钱包余额只允许通过 `cloud_wallets` 和 `cloud_asset_ledger` 的事务修改。
- 商城价格由服务端目录决定，客户端提交的价格与货币会被忽略。
- 赛季经验、段位分、胜负、奖励领取均写入赛季表并保留幂等记录。
- 平台服务管理匹配队列、赛季和举报；match-engine 独占 PvP 准备、回合时限、投降、超时、战斗状态、结算与回放事件。

## API

- `GET /v1/platform/state`：钱包与当前赛季概览。
- `POST /v1/store/purchase`：服务端商城扣款。需要 `productId` 与 `idempotencyKey`。
- `GET /v1/seasons/current`：赛季等级、经验、奖励领取状态。
- `POST /v1/seasons/current/rewards/:level/claim`：领取免费赛季奖励。
- `GET /v1/rankings/current`：服务端排行榜。
- `POST|DELETE /v1/pvp/queue`：进入或取消匹配。
- `GET /v1/pvp/matches/:id?after=N`：由平台网关转发至 match-engine，返回重连快照与增量事件。
- `POST /v1/pvp/matches/:id/commands`：由平台网关转发至 match-engine；支持 `ready`、mulligan、出牌、攻击、`end_turn` 与 `concede`。
- `POST /v1/pvp/matches/:id/report`：提交举报。

## 当前交付边界

该服务已经使资产、赛季、段位和房间生命周期服务端化。现有的完整卡牌规则引擎仍位于 `src/game/engine.ts`，下一步必须将其移入可在 Node 运行的共享规则包，才能让 `play_card`、`attack`、法术、发现与随机数也成为服务端权威命令。未完成这一步前，不能开放真实 PvP 对局或将前端战斗结算切换到该平台服务。
