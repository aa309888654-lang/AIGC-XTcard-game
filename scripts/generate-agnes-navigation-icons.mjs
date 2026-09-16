import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const apiKeys = (process.env.AGNES_API_KEYS ?? process.env.AGNES_API_KEY ?? "")
  .split("|")
  .map((key) => key.trim())
  .filter(Boolean);

if (!apiKeys.length) {
  throw new Error("AGNES_API_KEYS or AGNES_API_KEY is required. Configure it in your local shell, not in project files.");
}

const endpoint = "https://apihub.agnes-ai.com/v1/images/generations";
const assetRoot = resolve(process.cwd(), "public/assets/ui/generated");
const chromaHelper = "C:/Users/jickchen/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py";
const chromaKey = "Use a perfectly uniform flat #00ff00 green background. No shadow, floor, reflection, gradient, texture, glow, border, or lighting variation in the background.";
const constraints = "Exactly one isolated object only. Do not make a collage, sprite sheet, atlas, grid, duplicate, alternate version, or a second scene. Center the single object with generous empty padding. No text, letters, numerals, logo, watermark, character, hand, card, or UI frame.";

const assets = [
  ["command-room", "an ancient xianxia sect gate with one jade command seal"],
  ["deck-library", "a single closed bamboo-bound cultivation manual with one jade bookmark"],
  ["training-field", "one crossed pair of antique practice swords tied by a red cord"],
  ["mission-scroll", "one rolled celestial mission scroll sealed with red wax"],
  ["rank-crown", "one dignified bronze and jade crown"],
  ["collection-archive", "one carved wooden archive cabinet with a circular jade latch"],
  ["chronicle-book", "one weathered xianxia chronicle book with a gold cloud clasp"],
  ["treasure-chest", "one small bronze treasure chest with jade inlay"],
  ["sect-hall", "one miniature xianxia sect hall with curved eaves and a jade plaque without writing"],
].map(([file, subject]) => ({
  file,
  group: "navigation",
  prompt: `Use case: stylized-concept. Asset type: premium Chinese xianxia game navigation icon. Subject: ${subject}. Front-facing, crisp readable silhouette at small UI size, polished hand-painted game icon rendering. ${constraints} ${chromaKey}`,
}));

const shopAssets = [
  ["eclipse-booster", "one ornate bronze and jade sealed treasure chest"],
  ["echo-cache", "one small crystal echo reliquary with a jade core"],
  ["dusk-banner", "one rolled violet expedition banner with a bronze pole"],
  ["astral-frame", "one circular commander nameplate frame with a star-ring jewel"],
  ["vanguard-order", "one stamped bronze military dispatch tablet"],
  ["celestial-title", "one radiant gold sun-crown title medallion"],
  ["moonless-avatar", "one empty obsidian moonlit avatar frame with violet jade trim, a single continuous circular frame ornament with a completely empty transparent center"],
  ["lantern-banner", "one warm paper lantern banner ornament with a red tassel"],
  ["tome-skin", "one closed cloud-step cultivation book cover with jade clasps"],
  ["supply-badge", "one six-point bronze supply progress seal with a jade center"],
].map(([file, subject]) => ({
  file,
  group: "shop",
  prompt: `Use case: stylized-concept. Asset type: premium Chinese xianxia game shop icon. Subject: ${subject}. Front-facing, centered, crisp silhouette, polished hand-painted game icon rendering. ${constraints} ${chromaKey}`,
}));

assets.push(...shopAssets);

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function generate(asset, apiKey) {
  const sourceDirectory = resolve(assetRoot, asset.group, "source");
  const destinationDirectory = resolve(assetRoot, asset.group);
  const source = resolve(sourceDirectory, `${asset.file}-source.png`);
  const destination = resolve(destinationDirectory, `${asset.file}.png`);
  if (await exists(destination)) {
    console.log(`${basename(destination)} skipped`);
    return;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "agnes-image-2.1-flash", prompt: asset.prompt, size: "4K", ratio: "1:1", extra_body: { response_format: "url" } }),
    signal: AbortSignal.timeout(12 * 60 * 1000),
  });
  if (!response.ok) throw new Error(`${asset.file}: ${response.status} ${await response.text()}`);
  const url = (await response.json())?.data?.[0]?.url;
  if (!url) throw new Error(`${asset.file}: missing image URL`);
  const image = await fetch(url, { signal: AbortSignal.timeout(2 * 60 * 1000) });
  if (!image.ok) throw new Error(`${asset.file}: download failed (${image.status})`);
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(destinationDirectory, { recursive: true });
  await writeFile(source, Buffer.from(await image.arrayBuffer()));
  await execFileAsync("python", [chromaHelper, "--input", source, "--out", destination, "--auto-key", "border", "--soft-matte", "--transparent-threshold", "12", "--opaque-threshold", "220", "--despill"]);
  console.log(`${basename(destination)} done`);
}

await mkdir(assetRoot, { recursive: true });
const failures = [];
let cursor = 0;
await Promise.all(apiKeys.map(async (apiKey) => {
  while (cursor < assets.length) {
    const asset = assets[cursor++];
    try { await generate(asset, apiKey); } catch (error) { failures.push(String(error)); console.error(`FAILED ${asset.file}`); }
  }
}));
if (failures.length) throw new Error(failures.join("\n"));
