# MiniMax 背景音乐部署

## 音乐计划

音乐覆盖首页大厅、编年史图鉴、战斗、整备库、任务、商城、连队、胜利、失败、战斗危急层与航行氛围。18 首由 MiniMax 生成，其中 10 首为可轮换的场景备用曲；首页与整备库共用 Matthew Pablo 的开放许可曲目 `The Fall of Arcana`（CC BY 3.0）。AI 音乐默认使用 `music-2.6`，输出为 44.1kHz / 256kbps MP3；需要时可通过参数切换为 `music-3.0`。胜负曲为结算短曲；危急层会在核心低于 10 点时低音量叠加在战斗曲上。

## 安全要求

不要把 API 密钥写入仓库、命令参数或 `.env` 文件。对话中出现过的密钥应先在 MiniMax 控制台轮换，然后只在当前 PowerShell 会话设置新密钥：

```powershell
$env:MINIMAX_API_KEY = Read-Host "MiniMax API Key"
```

## 生成命令

先查看全部音乐计划，不产生费用：

```powershell
npm run music-plan
```

使用推荐模型生成并替换全部 BGM：

```powershell
npm run music-generate
```

使用上一代模型：

```powershell
npm run music-generate -- --model=music-2.6
```

免费模型限速为每分钟 3 次，生成器会自动使用 21 秒间隔：

```powershell
npm run music-generate -- --model=music-3.0-free
```

生成器不会覆盖原 CC0 文件。它在全部 MiniMax MP3 都通过格式校验后才会更新 `public/assets/audio/music/manifest.json`，游戏随后自动切换；任一首失败时仍保持现有已激活音乐。生成后执行：

```powershell
npm run music-smoke
```

## 发行说明

生成音乐由 MiniMax 音乐模型创作，不属于 CC0 音乐包。发行前应根据当前 MiniMax 服务条款确认商业使用范围，并在产品资料中保留 AI 生成音乐说明。
