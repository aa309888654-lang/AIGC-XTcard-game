import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildVoiceJobs } from "./stepaudio-voice-plan.mjs";

const root = process.cwd();
const allJobs = await buildVoiceJobs();
console.log(`语音计划（复用 stepaudio-voice-plan）: ${allJobs.length} 个任务`);

const voiceRoot = join(root, "public", "assets", "audio", "voice");
const samplesPerSecond = 24000;
const seconds = 1;
const dataSize = samplesPerSecond * seconds * 2;
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(samplesPerSecond, 24);
header.writeUInt32LE(samplesPerSecond * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(dataSize, 40);
const silence = Buffer.alloc(dataSize);

let created = 0;
for (const job of allJobs) {
  const file = join(voiceRoot, `${job.key}.wav`);
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.concat([header, silence]));
    created += 1;
  }
}

const manifestPath = join(voiceRoot, "manifest.json");
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { version: 3 };
const files = Object.fromEntries(allJobs.map((job) => [job.key, `/assets/audio/voice/${job.key}.wav`]));
const voices = Object.fromEntries(allJobs.map((job) => [job.key, {
  voice: job.voice, text: job.text, direction: job.direction ?? "", pacing: job.pacing ?? 0.9,
  characterId: job.characterId ?? null, faction: job.faction ?? null, cue: job.cue ?? null, provider: job.provider ?? "MiniMax",
}]));
const manifest = {
  version: 3, provider: "MiniMax", model: "speech-2.8-hd", transport: "HTTP T2A API",
  sourceFormat: "wav", format: "wav", sampleRate: 24000, aiGenerated: true,
  disclosure: previous.disclosure ?? "本游戏角色语音与故事旁白由 AI 语音合成生成。",
  generatedAt: new Date().toISOString(), plannedFiles: allJobs.length, files, voices,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`新增占位 WAV: ${created} 个 | manifest 更新为 ${allJobs.length} 条`);
