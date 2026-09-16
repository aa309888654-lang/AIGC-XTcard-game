# 社交与运营服务 API

启动：`node server/social-liveops-service.mjs`。默认端口 `3213`，需要与云存档相同的 `DATABASE_URL` 和 `CLOUD_SIGNING_SECRET`。

服务启动后依序运行 `001`、`002`、`003`、`004` 迁移。所有业务接口均要求安装主体令牌；正式上线时替换为正式账户会话。

- `GET|POST /v1/guilds/mine/chat`：读取增量聊天、发送连队聊天。单用户限制为 5 条/10 秒。
- `GET /v1/guilds/mine/contributions`：读取服务端周贡献榜。
- `GET /v1/guilds/mine/tasks`、`POST /v1/guilds/mine/tasks/:id/claim`：读取和领取连队联合任务；领取要求由服务器校验。
- `PATCH|DELETE /v1/guilds/mine/members/:playerId`：调整成员为官员/成员，或移出成员。
- `POST /v1/social/friends/request|accept`：好友请求与接受。
- `POST /v1/social/blocks`：拉黑；拉黑后禁止私聊与新申请。
- `POST /v1/social/messages`：仅好友可私聊。
- `GET|POST|DELETE /v1/social/party`：查询、创建或离开组队房间；`POST /v1/social/party/invites` 创建好友邀请，`POST /v1/social/party/invites/:id/accept` 接受。
- `GET /v1/liveops/mail`、`POST /v1/liveops/mail/:id/claim`：读邮件与服务端发放附件。
- `GET /v1/liveops/announcements`、`GET /v1/liveops/events`：读取当前公告和活动配置。
- `POST /v1/liveops/redeem`：兑换码领取，服务端校验有效期、总量和账户领取状态。
- `POST /v1/observability/client-events`：客户端遥测/崩溃事件，服务端计算指纹。
- `POST /v1/support/tickets`：提交客服工单。

贡献增加使用 `POST /internal/guild-contributions`，要求有效安装主体令牌和 `X-Internal-Key`，仅供权威对局/PvE 结算服务调用。全服邮件创建、公告、活动和兑换码创建属于受信后台命令，不向游戏客户端暴露写接口。
