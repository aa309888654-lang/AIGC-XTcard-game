import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { buildExternalMusicTracks, buildMusicCueVariants, buildMusicJobs, buildMusicVariants, DEFAULT_MINIMAX_MUSIC_MODEL, MUSIC_OUTPUT } from "./minimax-music-plan.mjs";

const API_URL = "https://api.minimaxi.com/v1/music_generation";
const musicRoot = join(process.cwd(), "public", "assets", "audio", "music");
const manifestPath = join(musicRoot, "manifest.json");
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const option = (name, fallback) => {
  const prefix = `${name}=`;
  const found = args.find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const model = option("--model", DEFAULT_MINIMAX_MUSIC_MODEL);
const only = option("--only", "");
const force = hasFlag("--force");
const dryRun = hasFlag("--dry-run");
const apiKey = process.env.MINIMAX_API_KEY;
const defaultPause = model.endsWith("-free") ? 21000 : 800;
const pauseMs = Number.parseInt(option("--pause-ms", String(defaultPause)), 10) || defaultPause;

function printUsage() {
  console.log("用法: node scripts/generate-minimax-music.mjs [--dry-run] [--model=music-2.6] [--only=lobby] [--force] [--pause-ms=800]");
  console.log("支持 music-3.0、music-2.6 及对应 -free 模型。密钥只从 MINIMAX_API_KEY 环境变量读取。");
}

if (hasFlag("--help")) {
  printUsage();
  process.exit(0);
}

function isMp3(buffer) {
  const isId3 = buffer.subarray(0, 3).toString("ascii") === "ID3";
  const isFrame = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  return isId3 || isFrame;
}

async function validMp3(path) {
  try {
    const info = await stat(path);
    if (info.size < 48 * 1024) return false;
    return isMp3(await readFile(path));
  } catch {
    return false;
  }
}

async function replaceGeneratedFile(tempPath, targetPath) {
  const backupPath = `${targetPath}.previous`;
  await unlink(backupPath).catch(() => undefined);
  let hasBackup = false;
  try {
    await rename(targetPath, backupPath);
    hasBackup = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    await rename(tempPath, targetPath);
  } catch (error) {
    if (hasBackup) await rename(backupPath, targetPath).catch(() => undefined);
    throw error;
  }
  if (hasBackup) await unlink(backupPath).catch(() => undefined);
}

async function requestMusic(job, attempt = 1) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: job.prompt,
      is_instrumental: true,
      stream: false,
      output_format: "hex",
      aigc_watermark: false,
      audio_setting: MUSIC_OUTPUT,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  const baseResp = payload.base_resp ?? {};
  const statusCode = baseResp.status_code ?? (response.ok ? 0 : response.status);
  if (!response.ok || statusCode !== 0) {
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500 || statusCode === 1002;
    const detail = String(baseResp.status_msg ?? `HTTP ${response.status}`).replaceAll(apiKey ?? "", "<redacted>");
    if (retryable && attempt < 5) {
      await delay(1000 * 2 ** (attempt - 1));
      return requestMusic(job, attempt + 1);
    }
    throw new Error(`${job.id}: MiniMax 请求失败 (${statusCode}) ${detail}`);
  }
  if (payload.data?.status !== 2 || typeof payload.data?.audio !== "string") {
    throw new Error(`${job.id}: MiniMax 未返回完成的音频。请稍后重试该轨道。`);
  }
  if (!/^[0-9a-f]+$/i.test(payload.data.audio) || payload.data.audio.length % 2 !== 0) {
    throw new Error(`${job.id}: MiniMax 返回的音频编码无效`);
  }
  const audio = Buffer.from(payload.data.audio, "hex");
  if (!isMp3(audio)) throw new Error(`${job.id}: MiniMax 返回内容不是有效 MP3`);
  return { audio, extraInfo: payload.extra_info ?? {} };
}

async function writeManifest(jobs, externalTracks, tracks) {
  const manifest = {
    version: 1,
    active: true,
    provider: externalTracks.length ? "Mixed" : "MiniMax",
    model,
    generatedAt: new Date().toISOString(),
    format: MUSIC_OUTPUT.format,
    sampleRate: MUSIC_OUTPUT.sampleRate,
    bitrate: MUSIC_OUTPUT.bitrate,
    aiGenerated: true,
    contentOrigin: externalTracks.length ? "mixed" : "ai-generated",
    disclosure: externalTracks.length ? "本游戏背景音乐包含 AI 生成音乐与开放许可音乐。" : "本游戏背景音乐由 AI 音乐生成模型创作。",
    tracks,
    variants: buildMusicVariants(),
    cueVariants: buildMusicCueVariants(),
    prompts: Object.fromEntries(jobs.map((job) => [job.id, { title: job.title, prompt: job.prompt }])),
    sources: Object.fromEntries(externalTracks.map((track) => [track.id, {
      title: track.title,
      creator: track.creator,
      provider: track.provider,
      license: track.license,
      licenseUrl: track.licenseUrl,
      sourceUrl: track.sourceUrl,
    }])),
  };
  const tempPath = `${manifestPath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(tempPath, manifestPath);
}

async function main() {
  let jobs = buildMusicJobs();
  if (only) jobs = jobs.filter((job) => job.id === only);
  if (!jobs.length) throw new Error(`没有匹配 --only=${only} 的音乐任务`);
  console.log(`音乐计划: ${jobs.length} 首，模型 ${model}，${MUSIC_OUTPUT.sampleRate}Hz ${MUSIC_OUTPUT.bitrate / 1000}kbps MP3`);
  if (dryRun) {
    for (const job of jobs) console.log(`${job.id} | ${job.filename} | ${job.title}`);
    return;
  }
  await mkdir(musicRoot, { recursive: true });
  const activeTracks = {};
  for (const [index, job] of jobs.entries()) {
    const targetPath = join(musicRoot, job.filename);
    if (!force && await validMp3(targetPath)) {
      activeTracks[job.id] = job.outputPath;
      console.log(`[${index + 1}/${jobs.length}] 跳过已有文件 ${job.id}`);
      continue;
    }
    if (!apiKey) throw new Error(`未设置 MINIMAX_API_KEY，无法生成缺失音乐：${job.id}。请轮换已暴露的旧密钥，并在当前终端环境中设置新密钥后重试。`);
    const tempPath = `${targetPath}.tmp`;
    try {
      const { audio, extraInfo } = await requestMusic(job);
      await writeFile(tempPath, audio);
      await replaceGeneratedFile(tempPath, targetPath);
      activeTracks[job.id] = job.outputPath;
      console.log(`[${index + 1}/${jobs.length}] 已生成 ${job.id} (${(audio.length / 1024 / 1024).toFixed(2)} MB, ${extraInfo.music_duration ?? "未知"}ms)`);
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }
    if (index < jobs.length - 1) await delay(pauseMs);
  }

  const allJobs = buildMusicJobs();
  const externalTracks = buildExternalMusicTracks();
  if (only && jobs.length !== allJobs.length) {
    for (const job of allJobs) {
      const targetPath = join(musicRoot, job.filename);
      if (activeTracks[job.id] || await validMp3(targetPath)) activeTracks[job.id] = job.outputPath;
    }
  }
  for (const track of externalTracks) {
    const targetPath = join(musicRoot, track.filename);
    if (!await validMp3(targetPath)) throw new Error(`开放许可音乐 ${track.id} 缺失或格式无效：${track.filename}`);
    activeTracks[track.id] = track.outputPath;
  }
  if (Object.keys(activeTracks).length !== allJobs.length + externalTracks.length) {
    throw new Error("全部音乐必须生成并通过格式校验后才会更新 MiniMax 运行时清单。");
  }
  await writeManifest(allJobs, externalTracks, activeTracks);
  console.log("MiniMax 音乐已验收并激活：全部循环曲、胜负结算曲与战斗危急层已写入运行时清单。");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
