import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { buildExternalMusicTracks, buildMusicCueVariants, buildMusicJobs, buildMusicVariants, MUSIC_OUTPUT } from "./minimax-music-plan.mjs";

const root = process.cwd();
const musicRoot = join(root, "public", "assets", "audio", "music");
const manifest = JSON.parse(await readFile(join(musicRoot, "manifest.json"), "utf8"));
const jobs = buildMusicJobs();
const externalTracks = buildExternalMusicTracks();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isMp3(buffer) {
  return buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
}

function readMp3Spec(buffer) {
  let offset = 0;
  if (buffer.subarray(0, 3).toString("ascii") === "ID3" && buffer.length >= 10) {
    const size = ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14) | ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f);
    offset = 10 + size;
  }
  for (; offset + 4 <= buffer.length; offset += 1) {
    const header = buffer.readUInt32BE(offset);
    if (((header & 0xffe00000) >>> 0) !== 0xffe00000) continue;
    const version = (header >>> 19) & 0x3;
    const layer = (header >>> 17) & 0x3;
    const bitrateIndex = (header >>> 12) & 0xf;
    const sampleRateIndex = (header >>> 10) & 0x3;
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) continue;
    const mpeg1Bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const mpeg2Bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const sampleRates = [44100, 48000, 32000];
    const sampleRate = sampleRates[sampleRateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const bitrate = (version === 3 ? mpeg1Bitrates : mpeg2Bitrates)[bitrateIndex] * 1000;
    const channels = ((header >>> 6) & 0x3) === 3 ? 1 : 2;
    return { sampleRate, bitrate, channels };
  }
  throw new Error("找不到有效 MPEG Layer III 音频帧");
}

assert(manifest.version === 1, "MiniMax 音乐清单版本错误");
assert(typeof manifest.active === "boolean", "MiniMax 音乐清单缺少激活状态");

if (!manifest.active) {
  console.log("MiniMax 音乐烟测通过：生成音乐尚未激活，游戏将继续使用已验证的 CC0 回退 BGM");
  process.exit(0);
}

assert(["MiniMax", "Mixed"].includes(manifest.provider), "激活音乐的提供方不正确");
assert(["music-3.0", "music-2.6", "music-3.0-free", "music-2.6-free"].includes(manifest.model), "激活音乐的模型不受支持");
assert(manifest.format === "mp3" && manifest.sampleRate === MUSIC_OUTPUT.sampleRate && manifest.bitrate === MUSIC_OUTPUT.bitrate, "激活音乐的输出规格不符合 44.1kHz / 256kbps MP3");

const musicVariants = buildMusicVariants();
assert(JSON.stringify(manifest.variants) === JSON.stringify(musicVariants), "激活音乐候选池与计划不一致");
assert(JSON.stringify(manifest.cueVariants) === JSON.stringify(buildMusicCueVariants()), "胜负音乐候选池与计划不一致");
const activeTrackPaths = new Set(Object.values(manifest.tracks ?? {}));
for (const [scene, variants] of Object.entries(manifest.variants ?? {})) {
  assert(Array.isArray(variants) && variants.length > 0, `${scene} 缺少可播放的场景音乐候选`);
  for (const source of variants) assert(activeTrackPaths.has(source), `${scene} 引用了未登记到 tracks 的音乐：${source}`);
}
for (const [cue, variants] of Object.entries(manifest.cueVariants ?? {})) {
  assert(Array.isArray(variants) && variants.length > 0, `${cue} 缺少可播放的结算音乐候选`);
  for (const source of variants) assert(activeTrackPaths.has(source), `${cue} 引用了未登记到 tracks 的音乐：${source}`);
}
let verifiedJobs = 0;
for (const job of jobs) {
  const publicPath = manifest.tracks?.[job.id];
  assert(publicPath === job.outputPath, `${job.id} 的激活路径不正确`);
  const diskPath = join(root, "public", ...publicPath.split("/").filter(Boolean));
  const info = await stat(diskPath);
  assert(info.size >= 48 * 1024, `${job.id} 文件过小，可能不是有效完整音乐`);
  const data = await readFile(diskPath);
  assert(isMp3(data), `${job.id} 缺少 MP3 文件头`);
  const spec = readMp3Spec(data);
  assert(spec.sampleRate === MUSIC_OUTPUT.sampleRate, `${job.id} 实际采样率不是 ${MUSIC_OUTPUT.sampleRate}Hz`);
  // 交付层允许 128kbps 重编码（optimize-assets 降码率，节省约一半带宽）。
  assert(spec.bitrate === MUSIC_OUTPUT.bitrate || spec.bitrate === 128000, `${job.id} 实际码率不是 ${MUSIC_OUTPUT.bitrate}bps 或交付 128kbps`);
  assert(spec.channels === 2, `${job.id} 不是双声道 MP3`);
  assert(manifest.prompts?.[job.id]?.prompt === job.prompt, `${job.id} 的音乐导演提示词与计划不一致`);
  verifiedJobs += 1;
}

for (const track of externalTracks) {
  const publicPath = track.outputPath;
  const isReferenced = Object.values(manifest.tracks ?? {}).includes(publicPath)
    || Object.values(manifest.variants ?? {}).some((variants) => variants.includes(publicPath));
  assert(isReferenced, `${track.id} 未被音乐清单引用`);
  const diskPath = join(root, "public", ...publicPath.split("/").filter(Boolean));
  const info = await stat(diskPath);
  assert(info.size >= 48 * 1024, `${track.id} 开放许可音乐文件过小`);
  const data = await readFile(diskPath);
  assert(isMp3(data), `${track.id} 开放许可音乐缺少 MP3 文件头`);
  const spec = readMp3Spec(data);
  assert(spec.sampleRate === 44100 && spec.channels === 2, `${track.id} 开放许可音乐必须为 44.1kHz 双声道`);
  assert(manifest.sources?.[track.id]?.creator === track.creator, `${track.id} 缺少作者署名`);
  assert(manifest.sources?.[track.id]?.license === track.license, `${track.id} 许可证记录不正确`);
  assert(manifest.sources?.[track.id]?.sourceUrl === track.sourceUrl, `${track.id} 来源页面记录不正确`);
  verifiedJobs += 1;
}

console.log(`音乐烟测通过：${verifiedJobs}/${jobs.length + externalTracks.length} 首音乐已激活，AI 与开放许可来源、文件参数和运行时映射完整`);
