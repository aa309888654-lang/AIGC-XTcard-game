import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { buildVoiceJobs, STEPAUDIO_MODEL, VOICE_FORMAT, VOICE_SAMPLE_RATE } from "./stepaudio-voice-plan.mjs";

const TTS_URL = "https://api.stepfun.com/v1/audio/speech";
const MINIMAX_TTS_URL = "https://api.minimaxi.com/v1/t2a_v2";
const MINIMAX_MODEL = "speech-2.8-hd";
const outputRoot = join(process.cwd(), "public", "assets", "audio", "voice");
const manifestPath = join(outputRoot, "manifest.json");
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const readOption = (name, fallback) => {
  const prefix = `${name}=`;
  const value = args.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
};

const dryRun = hasFlag("--dry-run");
const force = hasFlag("--force");
const only = readOption("--only", "");
const exactKeys = new Set(readOption("--keys", "").split(",").map((key) => key.trim()).filter(Boolean));
const limit = Number.parseInt(readOption("--limit", "0"), 10) || 0;
const concurrency = Math.min(5, Math.max(1, Number.parseInt(readOption("--concurrency", "5"), 10) || 5));
const requestsPerMinute = Math.min(10, Math.max(1, Number.parseInt(readOption("--rpm", "10"), 10) || 10));
const apiKey = process.env.STEPFUN_API_KEY;
const miniMaxApiKey = process.env.MINIMAX_API_KEY;

function printUsage() {
  console.log("用法: node scripts/generate-stepaudio-voices.mjs [--dry-run] [--limit=N] [--only=前缀] [--keys=键1,键2] [--force] [--concurrency=1-5] [--rpm=1-10]");
  console.log("使用 StepAudio 2.5 TTS HTTP API；密钥仅从 STEPFUN_API_KEY 当前进程环境读取。");
}

if (hasFlag("--help")) {
  printUsage();
  process.exit(0);
}

function relativeAudioPath(key) {
  return `${key}.${VOICE_FORMAT}`;
}

async function isValidWav(path) {
  try {
    const info = await stat(path);
    if (info.size < 512) return false;
    const audio = await readFile(path);
    return audio.subarray(0, 4).toString("ascii") === "RIFF" && audio.subarray(8, 12).toString("ascii") === "WAVE";
  } catch {
    return false;
  }
}

function redact(value) {
  return String(value ?? "").replaceAll(apiKey ?? "", "<redacted>").replaceAll(miniMaxApiKey ?? "", "<redacted>").slice(0, 500);
}

function ttsInstruction(job) {
  const roleAndPerformance = job.direction.replace(/允许在不改名[^。]*。/u, "");
  const instruction = [
    "中文游戏角色配音，只朗读原文，不增删改写。",
    roleAndPerformance,
    "标点自然停顿，情绪克制而清晰；必要时极轻气声起势，语气词宁少勿滥。",
  ].join(" ");
  return instruction.slice(0, 200);
}

function assertSensibleDuration(job, audio) {
  const durationSeconds = (audio.length - 44) / (VOICE_SAMPLE_RATE * 2);
  const speechUnits = job.text.replace(/[^\p{L}\p{N}]/gu, "").length;
  const minimum = Math.max(0.75, speechUnits * 0.1);
  const maximum = Math.max(16, speechUnits * 0.8);
  if (durationSeconds < minimum || durationSeconds > maximum) {
    throw new Error(`${job.key}: TTS output duration ${durationSeconds.toFixed(1)}s is not plausible for this line`);
  }
}

async function synthesizeTts(job, waitForRequestSlot) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await waitForRequestSlot();
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: STEPAUDIO_MODEL,
          voice: job.voice,
          input: job.text,
          instruction: ttsInstruction(job),
          response_format: VOICE_FORMAT,
          speed: job.pacing ?? 0.96,
          volume: 1,
          sample_rate: VOICE_SAMPLE_RATE,
          text_normalization: "enhanced",
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) {
        throw new Error(`${job.key}: StepFun TTS HTTP ${response.status}: ${redact(await response.text())}`);
      }
      const audio = Buffer.from(await response.arrayBuffer());
      if (audio.subarray(0, 4).toString("ascii") !== "RIFF" || audio.subarray(8, 12).toString("ascii") !== "WAVE") {
        throw new Error(`${job.key}: StepFun TTS did not return a WAV file`);
      }
      assertSensibleDuration(job, audio);
      return audio;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await delay(1_000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

function miniMaxEmotion(job) {
  if (job.cue === "attack") return "angry";
  if (job.cue === "death") return "sad";
  if (job.cue === "victory") return "happy";
  if (job.cue === "skill") return "fluent";
  return "calm";
}

function miniMaxText(job) {
  const cueTags = { summon: "(inhale)", death: "(exhale)", encounter: "(breath)" };
  return `${cueTags[job.cue] ?? ""}${job.text}`;
}

async function synthesizeMiniMax(job, waitForRequestSlot) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await waitForRequestSlot();
      const response = await fetch(MINIMAX_TTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${miniMaxApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MINIMAX_MODEL,
          text: miniMaxText(job),
          stream: false,
          output_format: "hex",
          aigc_watermark: false,
          language_boost: "Chinese",
          voice_setting: {
            voice_id: job.voice,
            speed: job.pacing ?? 0.96,
            vol: 1,
            pitch: 0,
            emotion: miniMaxEmotion(job),
          },
          audio_setting: {
            sample_rate: VOICE_SAMPLE_RATE,
            format: VOICE_FORMAT,
            channel: 1,
          },
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const payload = await response.json().catch(() => ({}));
      const statusCode = payload.base_resp?.status_code ?? (response.ok ? 0 : response.status);
      if (!response.ok || statusCode !== 0 || payload.data?.status !== 2 || typeof payload.data?.audio !== "string") {
        throw new Error(`${job.key}: MiniMax TTS ${statusCode}: ${redact(payload.base_resp?.status_msg ?? `HTTP ${response.status}`)}`);
      }
      if (!/^[0-9a-f]+$/iu.test(payload.data.audio) || payload.data.audio.length % 2 !== 0) {
        throw new Error(`${job.key}: MiniMax TTS returned invalid WAV encoding`);
      }
      const audio = Buffer.from(payload.data.audio, "hex");
      if (audio.subarray(0, 4).toString("ascii") !== "RIFF" || audio.subarray(8, 12).toString("ascii") !== "WAVE") {
        throw new Error(`${job.key}: MiniMax TTS did not return a WAV file`);
      }
      assertSensibleDuration(job, audio);
      return audio;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await delay(1_000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

async function writeManifest(allJobs, generatedFiles) {
  const voices = Object.fromEntries(allJobs.map((job) => [job.key, {
    voice: job.voice,
    text: job.text,
    direction: job.direction,
    pacing: job.pacing ?? 0.96,
    characterId: job.characterId ?? null,
    faction: job.faction ?? null,
    cue: job.cue ?? null,
    provider: job.provider ?? "StepFun",
  }]));
  const manifest = {
    version: 3,
    provider: "StepFun + MiniMax",
    model: `${STEPAUDIO_MODEL} + ${MINIMAX_MODEL}`,
    transport: "HTTP TTS APIs",
    sourceFormat: "wav",
    format: VOICE_FORMAT,
    sampleRate: VOICE_SAMPLE_RATE,
    aiGenerated: true,
    disclosure: "本游戏角色语音与故事旁白由 AI 语音合成生成。",
    generatedAt: new Date().toISOString(),
    plannedFiles: allJobs.length,
    files: generatedFiles,
    voices,
  };
  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporaryPath, manifestPath);
}

async function main() {
  const allJobs = await buildVoiceJobs();
  let jobs = allJobs;
  if (only) jobs = jobs.filter((job) => job.key.startsWith(only));
  if (exactKeys.size) jobs = jobs.filter((job) => exactKeys.has(job.key));
  if (limit > 0) jobs = jobs.slice(0, limit);
  if (!jobs.length) throw new Error(`没有匹配 --only=${only} 的配音任务`);

  const uniqueCharacters = new Set(jobs.map((job) => job.characterId).filter(Boolean));
  const uniqueVoices = new Set(jobs.map((job) => job.voice));
  console.log(`TTS 配音计划: ${jobs.length} 个文件，${uniqueCharacters.size} 名角色，${uniqueVoices.size} 个官方预设音色`);
  if (dryRun) {
    for (const job of jobs) console.log(`${job.key} | ${job.voice} | pacing=${job.pacing ?? 0.96} | ${job.text}`);
    return;
  }
  await mkdir(outputRoot, { recursive: true });
  let previousManifest = { files: {} };
  try {
    previousManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    // A fresh manifest is created after the first successful generation.
  }
  const generatedFiles = { ...(previousManifest.files ?? {}) };
  let generated = 0;
  let skipped = 0;
  const failed = [];
  let nextJobIndex = 0;
  let nextRequestAt = 0;
  const requestIntervalMs = Math.ceil(60_000 / requestsPerMinute);
  const waitForRequestSlot = async () => {
    const scheduledAt = Math.max(Date.now(), nextRequestAt);
    nextRequestAt = scheduledAt + requestIntervalMs;
    const waitMs = scheduledAt - Date.now();
    if (waitMs > 0) await delay(waitMs);
  };
  const generateJob = async (job, index) => {
    const relativePath = relativeAudioPath(job.key);
    const targetPath = join(outputRoot, ...relativePath.split("/"));
    if (!force && await isValidWav(targetPath)) {
      generatedFiles[job.key] = `/assets/audio/voice/${relativePath}`;
      skipped += 1;
      console.log(`[${index + 1}/${jobs.length}] 跳过已有文件 ${job.key}`);
      return;
    }
    if (job.provider === "MiniMax" && !miniMaxApiKey) throw new Error(`未设置 MINIMAX_API_KEY，无法生成缺失语音：${job.key}`);
    if ((job.provider ?? "StepFun") === "StepFun" && !apiKey) throw new Error(`未设置 STEPFUN_API_KEY，无法生成缺失语音：${job.key}`);
    await mkdir(dirname(targetPath), { recursive: true });
    const temporaryPath = `${targetPath}.tmp`;
    try {
      const audio = job.provider === "MiniMax"
        ? await synthesizeMiniMax(job, waitForRequestSlot)
        : await synthesizeTts(job, waitForRequestSlot);
      await writeFile(temporaryPath, audio);
      await rename(temporaryPath, targetPath);
      generatedFiles[job.key] = `/assets/audio/voice/${relativePath}`;
      generated += 1;
      console.log(`[${index + 1}/${jobs.length}] 已生成 ${job.key} (${(audio.length / 1024).toFixed(1)} KB)`);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  };
  const worker = async () => {
    while (nextJobIndex < jobs.length) {
      const index = nextJobIndex;
      nextJobIndex += 1;
      try {
        await generateJob(jobs[index], index);
      } catch (error) {
        const message = redact(error instanceof Error ? error.message : error);
        failed.push({ key: jobs[index].key, message });
        console.error(message);
      }
    }
  };
  console.log(`调度限制: 最多 ${concurrency} 路并发，全局 ${requestsPerMinute} 次请求/分钟。`);
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  await writeManifest(allJobs, generatedFiles);
  console.log(`混合 TTS 配音完成: 新增 ${generated}，跳过 ${skipped}，失败 ${failed.length}，资产清单共 ${Object.keys(generatedFiles).length} 个文件`);
  if (failed.length) throw new Error(`有 ${failed.length} 条语音生成失败，请按日志中的 key 重试。`);
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : error));
  process.exitCode = 1;
});
