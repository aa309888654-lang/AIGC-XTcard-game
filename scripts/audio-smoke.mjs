import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const audioRoot = join(process.cwd(), "public", "assets", "audio");
const files = [
  "music/lobby.ogg", "music/archive.ogg", "music/battle.mp3", "music/battle.minimax.mp3", "music/lobby-new-era.open.mp3", "music/battle-heroic-demise.open.mp3",
  "sfx/card-draw-1.ogg", "sfx/card-draw-2.ogg", "sfx/card-draw-3.ogg",
  "sfx/card-deploy-1.ogg", "sfx/card-deploy-2.ogg",
  "sfx/attack-ready-1.ogg", "sfx/attack-ready-2.ogg",
  "sfx/attack-hit-1.ogg", "sfx/attack-hit-2.ogg", "sfx/ui-select.ogg",
  "sfx/skill-1.ogg", "sfx/skill-2.ogg", "sfx/buff-1.ogg", "sfx/buff-2.ogg",
  "sfx/hero-hit-1.ogg", "sfx/hero-hit-2.ogg", "sfx/victory.ogg", "sfx/defeat.ogg",
  "sfx/weapon-swing-1.wav", "sfx/weapon-swing-2.wav", "sfx/weapon-hit-metal.wav", "sfx/summon-construct.wav",
  "sfx/spell-cast-arcane.wav", "sfx/spell-impact-void.wav", "sfx/secret-arm.wav", "sfx/secret-trigger.wav",
  "sfx/discover-open.wav", "sfx/discover-confirm.wav", "sfx/status-freeze.wav", "sfx/status-silence.wav",
  "sfx/turn-start.wav", "sfx/turn-end.wav", "sfx/mana-gain.wav", "sfx/mana-spend.wav",
  "sfx/ui-error.wav", "sfx/shield.wav", "sfx/shield-break.wav", "sfx/heal.wav", "sfx/revive.wav",
  "sfx/unit-death.wav", "sfx/core-critical.wav", "sfx/rare-reveal.wav", "sfx/reward.wav", "sfx/card-return.wav", "sfx/guard.wav",
  "sfx/card-select.wav", "sfx/target-lock.wav", "sfx/skill-radiant.wav", "sfx/skill-void.wav", "sfx/skill-arcane.wav", "sfx/skill-iron.wav", "sfx/skill-wild.wav",
];

let totalBytes = 0;
for (const relativePath of files) {
  const path = join(audioRoot, relativePath);
  const fileStat = await stat(path);
  if (fileStat.size < 4096) throw new Error(`${relativePath} 文件过小，可能不是有效音频`);
  totalBytes += fileStat.size;
  const header = await readFile(path, { encoding: null });
  if (relativePath.endsWith(".ogg") && header.subarray(0, 4).toString("ascii") !== "OggS") throw new Error(`${relativePath} 缺少 OGG 文件头`);
  if (relativePath.endsWith(".mp3")) {
    const isId3 = header.subarray(0, 3).toString("ascii") === "ID3";
    const isFrame = header[0] === 0xff && (header[1] & 0xe0) === 0xe0;
    if (!isId3 && !isFrame) throw new Error(`${relativePath} 缺少 MP3 文件头`);
  }
  if (relativePath.endsWith(".wav") && (header.subarray(0, 4).toString("ascii") !== "RIFF" || header.subarray(8, 12).toString("ascii") !== "WAVE")) throw new Error(`${relativePath} 缺少 WAV 文件头`);
}

const attributionPath = join(audioRoot, "ATTRIBUTION.md");
await access(attributionPath);
const attribution = await readFile(attributionPath, "utf8");
for (const source of ["Kenney", "artisticdude", "HaelDB", "Eponasoft", "cynicmusic", "Matthew Pablo", "CC BY 3.0", "CC0"]) {
  if (!attribution.includes(source)) throw new Error(`音频来源清单缺少 ${source}`);
}

console.log(`音频烟测通过：${files.length} 个基础部署文件，${(totalBytes / 1024 / 1024).toFixed(2)} MB，文件头与开放许可来源清单完整`);
