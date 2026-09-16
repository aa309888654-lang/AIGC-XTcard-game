import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const apiKeys = (process.env.AGNES_API_KEYS ?? "").split("|").map((key) => key.trim()).filter(Boolean);
if (apiKeys.length < 4) throw new Error("Four AGNES_API_KEYS values are required.");

const endpoint = "https://apihub.agnes-ai.com/v1/images/generations";
const destination = resolve(process.cwd(), "output/imagegen/priority-pack");
const chromaKey = "Use a perfectly flat solid #00ff00 chroma-key background. The entire background must be exactly the same green with no texture, shadow, gradients, lighting, floor, reflections or particles. Do not use green in any subject. No text, no letters, no numbers, no symbols that resemble writing, no watermark.";

const assets = [
  {
    file: "elite-skill-vfx-atlas-v2-source.png",
    prompt: `Use case: stylized-concept. Asset type: 2 by 2 sprite atlas with four strictly non-figurative premium combat effects for an original Chinese fantasy tactical card game. Equal cells, generous gutters. Upper left: violet astral spear impact made only of energy and stars. Upper right: ember forge shockwave made only of molten metal light and sparks. Lower left: cyan prism lightning arc made only of lightning and crystal light. Lower right: gold imperial sun execution seal made only of abstract circular energy. Absolutely no people, faces, hands, figures, creatures, cards, weapons, furniture, gates, buildings, ground, or props. Each effect centered and isolated with a clean silhouette suitable for gameplay. ${chromaKey}`,
  },
  {
    file: "elite-death-summon-vfx-atlas-source.png",
    prompt: `Use case: stylized-concept. Asset type: 2 by 2 sprite atlas with four strictly non-figurative premium state-transition effects for an original Chinese fantasy tactical card game. Equal cells, generous gutters. Upper left: jade root resurrection spiral. Upper right: violet void death disintegration particles. Lower left: legendary golden summoning ring. Lower right: legendary crimson-black terminal collapse halo. Only abstract energy, light, smoke and particles. Absolutely no people, faces, hands, figures, creatures, cards, weapons, gates, buildings, ground, or props. Every cell centered, isolated and readable at gameplay scale. ${chromaKey}`,
  },
  {
    file: "season-social-cosmetics-atlas-v2-source.png",
    prompt: `Use case: stylized-concept. Asset type: 2 by 2 sprite atlas with four empty decorative game UI cosmetics. Equal cells, generous gutters. Upper left: eclipse avatar frame, circular empty center. Upper right: underworld avatar frame, circular empty center. Lower left: stargate title ribbon with completely blank central plate. Lower right: jade guild crest with blank central shield. Premium Chinese fantasy UI ornament, clean symmetrical silhouette, no character portrait, no card, no logo. No text, no letters, no runes, no readable marks anywhere. ${chromaKey}`,
  },
  {
    file: "terminal-reward-vfx-atlas-source.png",
    prompt: `Use case: stylized-concept. Asset type: 2 by 2 sprite atlas with four strictly non-figurative reward and terminal UI effects for an original Chinese fantasy tactical card game. Equal cells, generous gutters. Upper left: victory laurel aurora burst. Upper right: defeat cracked seal fade. Lower left: chest-opening golden spark burst without any chest. Lower right: rank-up jade and violet halo. Only abstract light, energy, particles and ornamental shapes. Absolutely no characters, creatures, cards, props, chests, hands, buildings, ground or text. ${chromaKey}`,
  },
];
const requestedFiles = new Set((process.env.AGNES_ASSET_FILES ?? "").split(",").map((file) => file.trim()).filter(Boolean));
const selectedAssets = requestedFiles.size ? assets.filter((asset) => requestedFiles.has(asset.file)) : assets;
if (!selectedAssets.length) throw new Error("No requested asset files matched the refinement pack.");

async function generate(asset, apiKey, lane) {
  console.log(`${basename(asset.file)} starting on lane ${lane + 1}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "agnes-image-2.1-flash", prompt: asset.prompt, size: "4K", ratio: "1:1", extra_body: { response_format: "url" } }),
    signal: AbortSignal.timeout(12 * 60 * 1000),
  });
  if (!response.ok) throw new Error(`${asset.file}: ${response.status} ${await response.text()}`);
  const body = await response.json();
  const url = body?.data?.[0]?.url;
  if (!url) throw new Error(`${asset.file}: missing image URL`);
  const image = await fetch(url);
  if (!image.ok) throw new Error(`${asset.file}: download failed with ${image.status}`);
  await writeFile(resolve(destination, asset.file), Buffer.from(await image.arrayBuffer()));
  console.log(`${basename(asset.file)} completed`);
}

await mkdir(destination, { recursive: true });
const results = await Promise.allSettled(selectedAssets.map((asset, lane) => generate(asset, apiKeys[lane], lane)));
const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${selectedAssets[index].file}: ${result.reason}`] : []);
if (failures.length) throw new Error(`Priority refinement failed:\n${failures.join("\n")}`);
