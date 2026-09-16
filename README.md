# 仙侠战线 · Xianxia Frontline

原创阵营战术卡牌游戏，使用 React、TypeScript 与 Vite 构建。玩家通过 30 张单位卡构筑战线，在天衡、幽冥、天机、铁律、山海五大阵营间建立节奏与组合技。

## 启动

```bash
npm install
npm run dev
npm run build
npm run smoke
npm run verify
```

## 对战规则

- 双方开局各获得 4 张手牌，并在各自第 1 回合拥有 1 点法力；从第 2 回合开始，每轮各自法力上限 +1，并自动获得 1 张单位卡。
- 先手 3 张起手，后手 6 张并额外获得一枚 0 费「渊辉令」（本回合法力 +1），用于抵消先手的节奏优势。
- 部署单位后，选择可攻击单位并指定敌方单位或核心。
- 守卫单位必须优先清除；曜剑郎可以无视守卫攻击核心；任一核心耐久降至 0 时战斗结束。
- 一张同名单位最多携带 2 张，卡组固定为 30 张。
- 折光装甲只会抵消该单位受到的首次伤害；尘风骑手只有在击破敌军后才可再次攻击。

## 已实现

- 暗/亮模式与靛蓝、霓虹、鎏金三色调，设置会本地保存。
- 竞技场主界面、整备库、开场加载与动态渊空背景。
- 光泽扫过、稀有度边框、入场、3D 悬浮与手牌可用态。
- 攻击、召唤、伤害、技能事件流，以及冲击、飘字、屏幕震动、核心受击与技能提示。
- `npm run smoke` 会将真实 TypeScript 引擎临时打包后模拟完整对局，并断言四类关键事件均已产生。
- 仙侠编年史串联五大阵营、22 名角色与六个时代节点，图鉴同步显示人物定位和关系档案。
- CC0 与可商用音频覆盖大厅、档案馆、战斗音乐，以及抽牌、部署、攻击、技能、增益、核心受击和胜负事件；来源分为 Kenney CC0、项目自生成 CC0 和 AI 生成语音/音乐。
- 音频总线：音效按 胜负/终局 > 免疫/复活/击杀 > 战斗 > UI 分级，滑动窗口抑制堆叠；击杀、复活、护盾、核心临界等关键事件音量独立，并可触发 2-4dB 短时背景音乐 ducking，语音享有独立优先级与冷却。
- SSR/UR 卡牌带有逐卡声音标记（五阵营音色 + UR 稀有尾音），技能音效同时参考卡面 `soundMark` 与效果 `soundSet`，守卫、护盾、治疗、复活、冲锋、炮击等事件会优先走专属声部。
- `npm run verify` 会依次执行生产构建、战斗引擎、叙事数据和音频文件完整性校验。

## 音频素材接入

- 可商用开源 SFX 候选来源、许可证门槛、首批导入清单和运行时接入步骤见 [docs/OPEN_SOURCE_SFX_INTEGRATION.md](docs/OPEN_SOURCE_SFX_INTEGRATION.md)。
- 新素材仅允许 `CC0`、已记录署名要求的 `CC BY` 或经人工审核的明确商业授权；`CC BY-NC`、授权不明的 GitHub 仓库和 Discord 附件不得直接进入发行包。

## 开源协议

本项目在 [PolyForm Small Business License 1.0.0](https://polyformproject.org/licenses/small-business/1.0.0) 下发布，详见根目录 [LICENSE](LICENSE) 与 [docs/LICENSE_zh.md](docs/LICENSE_zh.md)。

- **个人 / 微型机构 / 个人开发者**：可免费用于学习、修改、个人作品、个人作品二次发布、商业活动（包括开直播、出自出版物、销售周边、做训练营项目）；
- **企业使用**：当单位年营收 ≥ 100 万美元（按 BLS CPI-U 已对 2019 基准做通胀调整）或在职员工 + 独立承包人合计 ≥ 100 人时，需要单独签订书面商业授权。请发邮件到 `aa309888654@gmail.com` 走活动授权流程；

协议其他要点：

- 修改、衍生作品仍须沿用本协议并保留 `Required Notice`；
- 不得对专利发起攻击性主张，否则随许可同时终止；
- 软件按原样提供，不附带任何担保。

## 授权合作

- 个人使用本作品所产生的同人产品（视频、同人小说、UGC 模组、播客等）默认允许，**无须告知**。
- 商业活动授权（赛事、广播、衍生商品等）请提前至少 14 天向 `aa309888654@gmail.com` 提交计划书。

## 4K 高清位图资源（独立 Release）

`public/assets/generated-4k/cutouts/`、`non-card/` 与顶级 atlas PNG 共 297.57 MB / 114 文件，由于 GitHub receive-pack 后台 housekeeping 在主分支上对 ~176 MB 大 pack 多次 stall 5+ 分钟无法 finalize ref update，因此改以独立 GitHub Release 发布，避免阻塞主分支 commit 链。

| Resource | Release | Asset | Size | SHA-256 |
|---|---|---|---|---|
| generated-4k atlas | [v1.0.0-4k-atlas](https://github.com/aa309888654-lang/AIGC-XTcard-game/releases/tag/v1.0.0-4k-atlas) | [xianxia_frontline_4k_atlas.zip](https://github.com/aa309888654-lang/AIGC-XTcard-game/releases/download/v1.0.0-4k-atlas/xianxia_frontline_4k_atlas.zip) | 297.57 MB | `4639d413…664624c` |

下载后请将 zip 内容解压到本仓库的 `public/assets/generated-4k/` 下，与代码一同发布。

如果 GitHub 后台 housekeeping 恢复，你可以发起一个 PR 把这部分也 merge 到 master；后续版本（v1.0.1+）的 4K atlas 会同步在仓库与 Release 上发布。
