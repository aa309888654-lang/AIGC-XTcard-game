import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const apiKeys = (process.env.AGNES_API_KEYS ?? "")
  .split("|")
  .map((key) => key.trim())
  .filter(Boolean);

if (apiKeys.length < 4) throw new Error("Four AGNES_API_KEYS values are required for the four-lane priority pack.");

const endpoint = "https://apihub.agnes-ai.com/v1/images/generations";
const destination = resolve(process.cwd(), "output/imagegen/priority-pack");
const chromaKey = "Create the asset on a perfectly flat #00ff00 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Keep every subject fully separated with crisp edges and generous padding. Do not use #00ff00 in the subject. No cast shadows, no text, no numbers, no logo, no watermark.";

const assets = [
  {
    file: "achievement-emblems-atlas-source.png",
    prompt: `Use case: stylized-concept. Asset type: 4 by 2 sprite atlas of seven dedicated achievement emblems plus one empty decorative reserve cell for an original Chinese fantasy tactical card game. Reading order: first-victory rising gate and dawn star, five-wins five-point constellation, ten-wins ten-ray celestial seal, thirty-wins rift merit medal, three-win-streak triple flame crest, five-win-streak unbroken sun ribbon, thousand-season-points crystal rank crown, reserve ornamental seal. Each emblem must be clearly distinct, premium embossed jade, bronze, gold, violet crystal and restrained crimson materials, centered in equal cells, crisp silhouette at 48 pixels. No character, no card, no readable lettering. ${chromaKey}`,
  },
  {
    file: "reward-props-atlas-source.png",
    prompt: `Use case: stylized-concept. Asset type: 4 by 3 sprite atlas of twelve standalone reward and inventory props for an original Chinese fantasy tactical card game. Reading order: star-dust coin, guild mark medallion, arcane dust crystal, epic secret chest, basic supply chest, faction relic bundle, prism capsule, archive key, crafting shard, season token, card pack, challenge ticket. Each is a fully visible centered object with a premium high-end game UI silhouette, differentiated material and color, generous padding, no hand, no character, no readable lettering. ${chromaKey}`,
  },
  {
    file: "elite-combat-vfx-atlas-source.png",
    prompt: `Use case: stylized-concept. Asset type: 4 by 2 sprite atlas of eight isolated SSR and UR tactical combat effects for an original Chinese fantasy card game. Reading order: astral spear impact, forge shockwave, jade root resurrection, void gravity collapse, prism lightning arc, imperial sun execution seal, legendary summon gate, legendary unit death disintegration. Each cell contains only abstract energy and particles, no person, no creature, no weapon hand, no card, no ground. Very high contrast and readable at gameplay scale, cinematic jade, ember, gold, violet and cyan light, no text. ${chromaKey}`,
  },
  {
    file: "season-social-cosmetics-atlas-source.png",
    prompt: `Use case: stylized-concept. Asset type: 4 by 3 sprite atlas of twelve cosmetic and social decorations for an original Chinese fantasy tactical card game. Reading order: eclipse avatar frame, underworld avatar frame, celestial avatar frame, forge avatar frame, stargate title ribbon, rift title ribbon, five-key title ribbon, jade guild crest, ember guild crest, void guild crest, rank-up laurel, seasonal event wreath. Empty portrait openings where appropriate, premium ornamental game UI, centered isolated items, clear at small size, no person, no card, no text or letters. ${chromaKey}`,
  },
];

async function generate(asset, apiKey, lane) {
  console.log(`${basename(asset.file)} starting on lane ${lane + 1}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "agnes-image-2.1-flash",
      prompt: asset.prompt,
      size: "4K",
      ratio: "1:1",
      extra_body: { response_format: "url" },
    }),
    signal: AbortSignal.timeout(12 * 60 * 1000),
  });
  if (!response.ok) throw new Error(`${asset.file}: ${response.status} ${await response.text()}`);

  const body = await response.json();
  const url = body?.data?.[0]?.url;
  if (!url) throw new Error(`${asset.file}: missing image URL`);
  const image = await fetch(url);
  if (!image.ok) throw new Error(`${asset.file}: download failed with ${image.status}`);
  const target = resolve(destination, asset.file);
  await writeFile(target, Buffer.from(await image.arrayBuffer()));
  console.log(`${basename(target)} completed`);
}

await mkdir(destination, { recursive: true });
const results = await Promise.allSettled(assets.map((asset, lane) => generate(asset, apiKeys[lane], lane)));
const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${assets[index].file}: ${result.reason}`] : []);
if (failures.length) throw new Error(`Priority asset pack failed:\n${failures.join("\n")}`);
