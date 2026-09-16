# StepAudio 配音部署

## 采用的模型

预生成并部署到游戏的固定台词采用混合方案：男性角色、无性别实体和叙事旁白使用 StepFun `stepaudio-2.5-tts`；所有女性角色使用 MiniMax `speech-2.8-hd`。两者均通过官方 HTTP 接口直接生成 24kHz WAV。角色性别、身份、性格、情绪、停顿和语气词要求均在每条任务的导演指令或模型参数中明确传递。

## 安全要求

不要把 API 密钥写入仓库、命令参数或 `.env` 文件。聊天中暴露过的密钥应先在 StepFun 控制台吊销并更换，然后只在执行生成命令的当前终端设置：

```powershell
$env:STEPFUN_API_KEY = Read-Host "StepFun API Key"
$env:MINIMAX_API_KEY = Read-Host "MiniMax API Key"
```

变量只在当前 PowerShell 进程中有效。生成器不会打印或保存密钥。

## 生成命令

先核对全部任务，不产生费用：

```powershell
npm run voice-plan
```

建议先生成 12 个旁白与阵营试听文件：

```powershell
npm run voice-generate -- --only=story/
npm run voice-generate -- --only=faction/
```

生成一名角色试听：

```powershell
npm run voice-generate -- --only=character/astral-queen/
```

确认音质后按最多 5 路并发、每分钟最多 10 次请求生成全部 652 个文件。此批文本远低于 5,000,000 TPM：

```powershell
npm run voice-generate -- --force --concurrency=5 --rpm=10
```

任务支持断点续传：有效的现有 WAV 会自动跳过。使用 `--force` 才会覆盖已有文件。所有输出位于 `public/assets/audio/voice/`，运行时通过 `manifest.json` 查找，不会在代码中硬编码实际文件状态。

## 阵营声音原则

| 阵营 | 声音方向 |
| --- | --- |
| 天衡 | 明亮、仪式化、克制权威 |
| 幽冥 | 低声、贴近、危险、记忆回响 |
| 天机 | 精准、疏离、快速推演 |
| 铁律 | 沉稳、纪律、金属般决断 |
| 山海 | 自然、风化、开阔、直觉化 |

项目共配置 56 张卡牌、6 类战斗台词、每张 5 段随机选中台词、10 段随机开场欢迎语、12 段编年史、8 段主线篇章、世界序章和 5 个阵营介绍，共 652 个音频任务。产品界面与发行资料应保留“角色语音与故事旁白由 AI 语音合成生成”的说明。
