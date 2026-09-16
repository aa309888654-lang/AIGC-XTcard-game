#!/usr/bin/env node
/**
 * 资源优化管线（幂等，可重复执行；用于云端 Web 部署前的体积压缩）。
 *
 * 步骤：
 *   png     全部 PNG 有损量化（sharp palette quality 80，保持 .png 扩展名、
 *           零代码改动），已是调色板图或压缩后更大则保留原文件
 *   voice   1,334 个语音 WAV → 96kbps 单声道 MP3（ffmpeg-static），
 *           同步更新 voice/manifest.json 的文件路径
 *   music   音乐 MP3（>3MB 的 256kbps 源）重编码为 128kbps，只减不增
 *   font    ZCOOLXiaoWei TTF → WOFF2（wawoff2 无损转换）
 *   favicon 从卡面生成 64×64 站点图标
 *   archive 把无代码引用的 source 源素材目录与根目录散落大文件移入「原素材存档/」
 *
 * 用法：
 *   node scripts/optimize-assets.mjs              # 全部步骤
 *   node scripts/optimize-assets.mjs png voice    # 只跑指定步骤
 *   node scripts/optimize-assets.mjs --dry-run    # 只报告不写入
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const ffmpegPath = require("ffmpeg-static");
const { compress } = await import("wawoff2").catch(() => ({ compress: null }));

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_ASSETS = path.join(ROOT, "public", "assets");
const ARCHIVE_DIR = path.join(ROOT, "原素材存档");
const DRY_RUN = process.argv.includes("--dry-run");
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const STEPS = requested.length ? requested : ["png", "voice", "music", "font", "favicon", "archive"];
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;

async function walk(dir, predicate, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

const runFfmpeg = (args) => new Promise((resolve) => {
  const child = spawn(ffmpegPath, args, { stdio: "ignore" });
  child.on("error", () => resolve(false));
  child.on("exit", (code) => resolve(code === 0));
});

async function withConcurrency(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  });
  await Promise.all(runners);
}

// ---------- 1. PNG 有损量化 ----------
async function stepPng() {
  const files = await walk(PUBLIC_ASSETS, (file) => file.toLowerCase().endsWith(".png"));
  let saved = 0, converted = 0, skipped = 0;
  console.log(`[png] ${files.length} 个 PNG 待检查…`);
  await withConcurrency(files, 4, async (file) => {
    try {
      const image = sharp(file, { limitInputPixels: false });
      const meta = await image.metadata();
      if (meta.format !== "png") return;
      // 已是 8bit 调色板图（上一轮已量化）则跳过，保证幂等。
      if (meta.palette && (meta.depth === "uchar" || meta.depth === "ub")) { skipped += 1; return; }
      const before = statSync(file).size;
      const buffer = await image.png({ palette: true, quality: 80, compressionLevel: 9, effort: 7 }).toBuffer();
      if (buffer.length >= before * 0.98) { skipped += 1; return; }
      if (!DRY_RUN) await fs.writeFile(file, buffer);
      saved += before - buffer.length;
      converted += 1;
      if (converted % 50 === 0) console.log(`[png] 已量化 ${converted}（跳过 ${skipped}），累计节省 ${mb(saved)}`);
    } catch (error) {
      console.warn(`[png] 跳过 ${path.relative(ROOT, file)}: ${error.message}`);
      skipped += 1;
    }
  });
  console.log(`[png] 完成：量化 ${converted}，跳过 ${skipped}，节省 ${mb(saved)}`);
}

// ---------- 2. 语音 WAV → MP3 ----------
async function stepVoice() {
  const voiceDir = path.join(PUBLIC_ASSETS, "audio", "voice");
  const wavs = await walk(voiceDir, (file) => file.toLowerCase().endsWith(".wav"));
  console.log(`[voice] ${wavs.length} 个 WAV 待转码…`);
  let saved = 0, converted = 0;
  await withConcurrency(wavs, 6, async (file) => {
    const mp3File = file.replace(/\.wav$/i, ".mp3");
    try {
      const before = statSync(file).size;
      if (!DRY_RUN) {
        const ok = await runFfmpeg(["-y", "-i", file, "-codec:a", "libmp3lame", "-b:a", "96k", "-ac", "1", mp3File]);
        if (!ok) throw new Error("ffmpeg failed");
        if (statSync(mp3File).size >= before) {
          await fs.rm(mp3File, { force: true });
          throw new Error("mp3 not smaller");
        }
        await fs.rm(file, { force: true });
      }
      saved += before - (DRY_RUN ? Math.round(before * 0.13) : statSync(mp3File).size);
      converted += 1;
      if (converted % 200 === 0) console.log(`[voice] 已转码 ${converted}/${wavs.length}，累计节省 ${mb(saved)}`);
    } catch (error) {
      console.warn(`[voice] 保留 WAV ${path.relative(ROOT, file)}: ${error.message}`);
    }
  });
  // 更新 manifest 中已转码文件的扩展名。
  const manifestPath = path.join(voiceDir, "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    let updated = 0;
    for (const [key, value] of Object.entries(manifest.files ?? {})) {
      if (typeof value !== "string" || !value.endsWith(".wav")) continue;
      const local = path.join(PUBLIC_ASSETS, value.replace(/^\/assets\//, ""));
      if (!existsSync(local) && existsSync(local.replace(/\.wav$/i, ".mp3"))) {
        manifest.files[key] = value.replace(/\.wav$/i, ".mp3");
        updated += 1;
      }
    }
    if (manifest.format === "wav") manifest.format = "mp3";
    if (!DRY_RUN && updated) {
      await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(`[voice] manifest 已更新 ${updated} 条路径 → .mp3`);
    }
  }
  console.log(`[voice] 完成：转码 ${converted}，节省 ${mb(saved)}`);
}

// ---------- 3. 音乐降码率 ----------
async function stepMusic() {
  const musicDir = path.join(PUBLIC_ASSETS, "audio", "music");
  const mp3s = (await walk(musicDir, (file) => file.toLowerCase().endsWith(".mp3")))
    .filter((file) => statSync(file).size > 3 * 1024 * 1024);
  console.log(`[music] ${mp3s.length} 个大 MP3 待重编码（>3MB）…`);
  let saved = 0;
  await withConcurrency(mp3s, 3, async (file) => {
    const tmp = `${file}.tmp.mp3`;
    try {
      const before = statSync(file).size;
      if (!DRY_RUN) {
        const ok = await runFfmpeg(["-y", "-i", file, "-codec:a", "libmp3lame", "-b:a", "128k", tmp]);
        if (!ok) throw new Error("ffmpeg failed");
        if (statSync(tmp).size >= before) throw new Error("not smaller");
        await fs.rename(tmp, file);
      }
      saved += before * 0.5;
    } catch (error) {
      if (existsSync(tmp)) await fs.rm(tmp, { force: true });
      console.warn(`[music] 保留 ${path.relative(ROOT, file)}: ${error.message}`);
    }
  });
  console.log(`[music] 完成：预计节省约 ${mb(saved)}`);
}

// ---------- 4. 字体 WOFF2 ----------
async function stepFont() {
  if (!compress) { console.warn("[font] wawoff2 不可用，跳过"); return; }
  const ttf = path.join(PUBLIC_ASSETS, "fonts", "ZCOOLXiaoWei-Regular.ttf");
  const woff2 = ttf.replace(/\.ttf$/i, ".woff2");
  if (!existsSync(ttf)) { console.log("[font] TTF 不存在（已转换），跳过"); return; }
  const before = statSync(ttf).size;
  if (!DRY_RUN) {
    const compressed = await compress(await fs.readFile(ttf));
    await fs.writeFile(woff2, compressed);
    await fs.rm(ttf, { force: true });
  }
  console.log(`[font] ZCOOLXiaoWei: ${mb(before)} → ${DRY_RUN ? "~" : mb(statSync(woff2).size)} (woff2)`);
}

// ---------- 5. favicon ----------
async function stepFavicon() {
  const source = path.join(PUBLIC_ASSETS, "cards", "astral-queen.png");
  const target = path.join(PUBLIC_ASSETS, "brand", "favicon-64.png");
  if (existsSync(target)) { console.log("[favicon] 已存在，跳过"); return; }
  if (!existsSync(source)) { console.warn("[favicon] 源图缺失，跳过"); return; }
  if (!DRY_RUN) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await sharp(source, { limitInputPixels: false }).resize(64, 64, { fit: "cover" }).png({ palette: true, quality: 90 }).toFile(target);
  }
  console.log(`[favicon] 已生成 ${path.relative(ROOT, target)}`);
}

// ---------- 6. 源素材归档 ----------
async function stepArchive() {
  const moves = [
    { from: path.join(PUBLIC_ASSETS, "ui", "generated", "shop", "source"), to: path.join(ARCHIVE_DIR, "ui-generated-shop-source") },
    { from: path.join(PUBLIC_ASSETS, "ui", "generated", "navigation", "source"), to: path.join(ARCHIVE_DIR, "ui-generated-navigation-source") },
    { from: path.join(ROOT, "首页视频背景.mp4"), to: path.join(ARCHIVE_DIR, "首页视频背景.mp4") },
  ];
  const rootPngs = (await fs.readdir(ROOT)).filter((name) => /^[0-9a-f-]{36}\.png$/i.test(name));
  for (const name of rootPngs) moves.push({ from: path.join(ROOT, name), to: path.join(ARCHIVE_DIR, name) });
  for (const move of moves) {
    if (!existsSync(move.from)) continue;
    if (existsSync(move.to)) { console.log(`[archive] 目标已存在，跳过 ${path.relative(ROOT, move.to)}`); continue; }
    if (!DRY_RUN) {
      await fs.mkdir(path.dirname(move.to), { recursive: true });
      renameSync(move.from, move.to);
    }
    console.log(`[archive] ${path.relative(ROOT, move.from)} → ${path.relative(ROOT, move.to)}`);
  }
}

for (const step of STEPS) {
  const handlers = { png: stepPng, voice: stepVoice, music: stepMusic, font: stepFont, favicon: stepFavicon, archive: stepArchive };
  const handler = handlers[step];
  if (!handler) { console.error(`未知步骤: ${step}`); process.exit(1); }
  await handler();
}
console.log(DRY_RUN ? "[optimize-assets] dry-run 结束（未写入）" : "[optimize-assets] 全部完成");
