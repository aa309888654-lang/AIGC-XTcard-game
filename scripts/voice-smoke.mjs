import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { buildVoiceJobs, STEPAUDIO_MODEL, STEPFUN_CHRONICLE_VOICES, VOICE_FORMAT, VOICE_SAMPLE_RATE } from "./stepaudio-voice-plan.mjs";

const root = process.cwd();
const voiceRoot = join(root, "public", "assets", "audio", "voice");
const jobs = await buildVoiceJobs();
const miniMaxVoices = new Set([
  "female-yujie-jingpin", "female-chengshu-jingpin", "female-shaonv-jingpin", "female-tianmei-jingpin",
  "Chinese (Mandarin)_Wise_Women", "Chinese (Mandarin)_Crisp_Girl", "Chinese (Mandarin)_Soft_Girl",
  "male-qn-jingying-jingpin", "male-qn-qingse-jingpin", "male-qn-daxuesheng-jingpin", "Chinese (Mandarin)_Reliable_Executive",
  "Chinese (Mandarin)_Male_Announcer", "Chinese (Mandarin)_Unrestrained_Young_Man", "Chinese (Mandarin)_Gentle_Youth", "Chinese (Mandarin)_News_Anchor",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(STEPAUDIO_MODEL === "stepaudio-2.5-tts", "编年史必须使用 StepAudio 2.5 TTS");
assert(VOICE_FORMAT === "wav" && VOICE_SAMPLE_RATE === 24000, "部署格式应为 24kHz WAV");
assert(jobs.length >= 652, `配音任务应至少 652 个，当前 ${jobs.length}`);
assert(jobs.filter((job) => job.key.startsWith("welcome/")).length === 10, "开场欢迎语必须覆盖 10 段");
assert(jobs.filter((job) => job.key.startsWith("story/chronicle-")).length === 12, "编年史必须覆盖 12 个节点");
assert(jobs.filter((job) => job.key.startsWith("story/chapter-")).length === 8, "主线篇章必须覆盖 8 段");
assert(jobs.filter((job) => job.key.startsWith("faction/")).length === 5, "阵营宣言必须覆盖五大阵营");
const characterJobs = jobs.filter((job) => job.key.startsWith("character/"));
const characterIds = new Set(characterJobs.map((job) => job.characterId));
assert(characterIds.size >= 56, `卡牌语音必须覆盖至少 56 张，当前 ${characterIds.size}`);
for (const id of characterIds) {
  assert(characterJobs.filter((job) => job.characterId === id).length === 11, `${id} 必须有 6 类事件语音和 5 条选中语`);
}

const keys = new Set();
for (const job of jobs) {
  assert(!keys.has(job.key), `资产清单键重复: ${job.key}`);
  keys.add(job.key);
  if (job.key.startsWith("story/world-premise") || job.key.startsWith("story/chronicle-")) {
    assert(job.provider === "StepFun", `${job.key} 必须由 StepAudio 2.5 配音`);
    assert(STEPFUN_CHRONICLE_VOICES.includes(job.voice), `${job.key} 使用了未核验的 StepAudio 编年史音色: ${job.voice}`);
    assert(job.pacing === 1, `${job.key} 必须使用中等语速`);
  } else {
    assert(job.provider === "MiniMax", `${job.key} 必须由 MiniMax 配音`);
    assert(miniMaxVoices.has(job.voice), `${job.key} 使用了未核验的 MiniMax 官方音色: ${job.voice}`);
  }
  assert(job.text.trim().length > 3 && job.text.length <= 1000, `${job.key} 台词为空、过短或超过限制`);
  assert(job.direction.length <= 1000, `${job.key} 的导演指令过长`);
  assert(typeof job.pacing === "number" && job.pacing >= 0.75 && job.pacing <= 1, `${job.key} 节奏超出允许范围`);
}

const manifest = JSON.parse(await readFile(join(voiceRoot, "manifest.json"), "utf8"));
assert(manifest.provider === "StepFun + MiniMax" && manifest.model.includes(STEPAUDIO_MODEL), "语音资产清单模型不一致");
assert(manifest.transport === "HTTP TTS APIs", "语音资产清单传输方式不一致");
assert(manifest.plannedFiles === jobs.length, "语音资产清单计划数量不一致");
assert(manifest.aiGenerated === true, "语音资产清单必须声明 AI 生成");
// 生成规格仍为 24kHz WAV（TTS 输出），云端交付经 optimize-assets 转码为 96kbps 单声道 MP3。
const DELIVERY_FORMAT = "mp3";
const manifestFiles = manifest.files ?? {};
assert(Object.keys(manifestFiles).length === jobs.length, "语音资产清单不完整");
for (const job of jobs) {
  assert(manifestFiles[job.key] === `/assets/audio/voice/${job.key}.${DELIVERY_FORMAT}`, `${job.key} 缺少运行时语音映射`);
}
for (const [key, publicPath] of Object.entries(manifestFiles)) {
  assert(keys.has(key), `资产清单含有未知键: ${key}`);
  const diskPath = join(root, "public", ...publicPath.split("/").filter(Boolean));
  const info = await stat(diskPath);
  assert(info.size >= 512, `${key} 文件过小`);
  const header = await readFile(diskPath);
  assert(header.subarray(0, 3).toString("ascii") === "ID3" || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0), `${key} 缺少 MP3 文件头`);
}

console.log(`语音烟测通过：56 张卡牌、5 个阵营、${new Set(jobs.map((job) => job.voice)).size} 个官方音色、${jobs.length} 个计划资产；已交付 ${Object.keys(manifest.files ?? {}).length} 个 MP3`);
