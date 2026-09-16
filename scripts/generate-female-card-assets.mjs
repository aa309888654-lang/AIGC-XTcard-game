import { access, mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "方案", "GPT-Image-2_顶级女性角色卡牌提示词.md");
const outputDir = resolve(root, "public", "assets", "cards");
const manifestPath = resolve(root, "docs", "image-prompts", "female-character-card-assets.json");
const endpoint = "https://apihub.agnes-ai.com/v1/images/generations";
const minimumRequestIntervalMs = 3 * 60 * 1000;
const manifestOnly = process.argv.includes("--manifest-only");
const keys = (process.env.AGNES_API_KEYS ?? process.env.AGNES_API_KEY ?? "")
  .split("|").map((key) => key.trim()).filter(Boolean);
if (!manifestOnly && !keys.length) throw new Error("Set AGNES_API_KEYS as a | separated list of keys.");

const common = "用于高端东方仙侠科幻战术卡牌游戏的角色素材，GPT-Image-2，2D digital character illustration，电影级构图，精致线稿，真实材质，脸部与手部结构准确，角色美貌但不低俗，服装完整且符合职业身份。主体单人，正面或三分之二角度，主体位于中央，四周保留至少 12% 安全边距，头发、武器、肩甲、衣摆不能被裁切。不要卡牌边框、不要文字、不要字母、不要数字、不要 Logo、不要水印、不要其他人物、不要现代物品、不要摄影棚产品照、不要廉价手游风、不要日式萌系、不要欧美超级英雄风、不要过度裸露、不要幼态化、不要夸张胸部或不自然身体比例。生成干净的角色图，不添加场景叙事文字；背景可为低对比度阵营氛围，但不能遮挡脸部、服装纹理和武器轮廓。";

function parseAssets(markdown) {
  const lines = markdown.split(/\r?\n/);
  const assets = [];
  let section = null;
  let variant = null;
  let inFence = false;
  let buf = [];
  const flush = () => {
    if (!buf.length || !section) return;
    const prompt = buf.join("\n").trim();
    if (prompt) assets.push({ id: section.id, rarity: section.rarity, variant, prompt });
    buf = [];
  };
  for (const line of lines) {
    const heading = line.match(/^###\s+(\d+)\.\d+\s+`([^`]+)`/);
    const sub = line.match(/^####\s+([ABC])\s+·/);
    if (!inFence && heading) { flush(); section = { id: heading[2], rarity: heading[1] === "2" ? "SSR" : "UR" }; variant = null; }
    if (!inFence && sub && section?.rarity === "UR") { flush(); variant = { A: "hero", B: "close", C: "scene" }[sub[1]]; }
    if (line.trim().startsWith("```") ) { if (inFence) flush(); inFence = !inFence; continue; }
    if (inFence) buf.push(line);
  }
  flush();
  return assets.filter((item) => item.prompt.includes("Primary request:"));
}

async function generate(asset, key, lane) {
  const filename = asset.rarity === "UR" ? `${asset.id}-${asset.variant}-v1.png` : `${asset.id}-v1.png`;
  const target = resolve(outputDir, filename);
  try { await access(target); console.log(`${filename}\tskipped`); return { ...asset, filename, skipped: true }; } catch {}
  const ratio = asset.variant === "scene" ? "3:2" : "2:3";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "agnes-image-2.1-flash", prompt: `${asset.prompt}\n${common}`, size: "4K", ratio, extra_body: { response_format: "url" } }),
    signal: AbortSignal.timeout(20 * 60 * 1000),
  });
  if (!response.ok) throw new Error(`${filename}: ${response.status} ${await response.text()}`);
  const body = await response.json();
  const url = body?.data?.[0]?.url;
  if (!url) throw new Error(`${filename}: response did not include an image URL`);
  const image = await fetch(url);
  if (!image.ok) throw new Error(`${filename}: download failed ${image.status}`);
  await writeFile(target, Buffer.from(await image.arrayBuffer()));
  console.log(`${filename}\tgenerated on lane ${lane + 1}`);
  return { ...asset, filename };
}

await mkdir(outputDir, { recursive: true });
const assets = parseAssets(await readFile(source, "utf8"));
if (assets.length !== 30) throw new Error(`Expected 30 prompts, found ${assets.length}`);
if (manifestOnly) {
  const existing = [];
  for (const asset of assets) {
    const filename = asset.rarity === "UR" ? `${asset.id}-${asset.variant}-v1.png` : `${asset.id}-v1.png`;
    try { const stat = await (await import("node:fs/promises")).stat(resolve(outputDir, filename)); existing.push({ ...asset, filename, bytes: stat.size, status: "complete" }); }
    catch { existing.push({ ...asset, filename, status: "pending" }); }
  }
  await writeFile(manifestPath, JSON.stringify({ model: "agnes-image-2.1-flash", generatedAt: new Date().toISOString(), count: existing.filter((item) => item.status === "complete").length, total: existing.length, assets: existing }, null, 2), "utf8");
  console.log(`Wrote manifest only: ${manifestPath}`);
  process.exit(0);
}
const results = [];
let cursor = 0;
const failures = [];
await Promise.all(keys.map(async (key, lane) => {
  let lastRequestAt = 0;
  while (cursor < assets.length) {
    const asset = assets[cursor++];
    const waitMs = Math.max(0, minimumRequestIntervalMs - (Date.now() - lastRequestAt));
    if (waitMs) {
      console.log(`lane ${lane + 1}\twaiting ${Math.ceil(waitMs / 1000)}s for Agnes rate limit`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastRequestAt = Date.now();
    try { results.push(await generate(asset, key, lane)); }
    catch (error) { failures.push(`${asset.id}-${asset.variant ?? "card"}: ${error instanceof Error ? error.message : String(error)}`); }
  }
}));
if (failures.length) throw new Error(`Generation failed for ${failures.length} asset(s):\n${failures.join("\n")}`);

// Runtime card art uses the selected first variant; retain stable v1 source files for production review.
for (const asset of results.filter((item) => item.rarity === "SSR" || item.variant === "hero")) {
  const sourceFile = resolve(outputDir, asset.filename);
  const runtimeFile = resolve(outputDir, `${asset.id}.png`);
  try { await access(runtimeFile); } catch { await copyFile(sourceFile, runtimeFile); }
}
await writeFile(manifestPath, JSON.stringify({ model: "agnes-image-2.1-flash", generatedAt: new Date().toISOString(), count: results.length, assets: results }, null, 2), "utf8");
console.log(`Wrote ${results.length} assets and ${manifestPath}`);
