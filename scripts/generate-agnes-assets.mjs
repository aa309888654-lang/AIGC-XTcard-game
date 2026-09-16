import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const apiKeys = (process.env.AGNES_API_KEYS ?? process.env.AGNES_API_KEY ?? "")
  .split("|")
  .map((key) => key.trim())
  .filter(Boolean);
if (!apiKeys.length) {
  throw new Error("AGNES_API_KEYS or AGNES_API_KEY is required.");
}

const destination = resolve(process.cwd(), "public/assets/generated-4k");
const endpoint = "https://apihub.agnes-ai.com/v1/images/generations";
const chromaKey = [
  "Create the asset on a perfectly flat #00ff00 chroma-key background for background removal.",
  "The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.",
  "Keep every item fully separated with crisp edges and generous padding. Do not use #00ff00 in the subject.",
  "No cast shadows, no text, no watermark.",
].join(" ");

const assets = [
  {
    file: "battlefield-foreground-atlas-agnes-image-2-1-flash.png",
    size: "4K",
    ratio: "16:9",
    prompt: "Use case: stylized-concept. Asset type: layered battlefield foreground overlay for an original Chinese fantasy tactical card game. A dense but readable widescreen set-piece: five subtle factional foreground motifs arranged around the outer edges only, including celestial jade stone, ember-forged metal, wind-carved pale wood, abyssal obsidian, and imperial bronze. Leave the center clean for units and cards. Premium painterly game concept art, dramatic rim lighting, teal, jade, crimson, violet and gold accents, no people, no creatures, no cards, no UI, no letters, no logo, no watermark.",
  },
  {
    file: "season-celestial-convergence-banner-agnes-image-2-1-flash.png",
    size: "4K",
    ratio: "21:9",
    prompt: "Use case: stylized-concept. Asset type: seasonal event key art and shop banner for an original Chinese fantasy tactical card game. A monumental circular celestial arena above cloud seas at dusk, five elemental sigils orbiting a radiant fractured core, distant mountain silhouettes, carved stone bridges, drifting paper talismans and fine particle light. No characters or creatures. Cinematic wide composition with a clean central focal area and calm empty zones at both ends for later UI overlay. Premium high-density painted game key art, jade green, ember red, lightning cyan, violet shadow and warm gold, no text, no logo, no watermark.",
  },
  {
    file: "faction-cardback-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: "Use case: stylized-concept. Asset type: 5-cell horizontal card-back sprite atlas for an original Chinese fantasy tactical card game. Place exactly five tall ornate card backs in one evenly spaced horizontal row, each fully visible and centered in its own equal cell with generous gutters: 1 jade celestial, 2 ember forge, 3 pale windwood, 4 violet abyss, 5 imperial bronze. Every card back has an abstract faction sigil, engraved borders and identical proportions. Square canvas, straight-on orthographic view, no perspective overlap, no characters, no readable words, no numbers, no watermark.",
  },
  {
    file: "rarity-cardback-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: "Use case: stylized-concept. Asset type: 4-cell horizontal card-back sprite atlas for an original Chinese fantasy tactical card game. Place exactly four tall ornate card backs in one evenly spaced horizontal row: ordinary iron-and-paper, rare cobalt crystal filigree, epic amethyst star metal, seasonal limited aurora gold. Each has the same frame silhouette and central abstract sigil, with clear rarity material differences. Square canvas, straight-on orthographic view, no overlap, no characters, no readable words, no rarity labels, no watermark.",
  },
  {
    file: "faction-emblems-and-sideflags-atlas-agnes-image-2-1-flash.png",
    ratio: "16:9",
    prompt: `Use case: stylized-concept. Asset type: sprite atlas of five faction emblems paired with five narrow vertical battlefield side flags, in a clean 5-column layout. Motifs: jade celestial, ember forge, pale windwood, violet abyss, imperial bronze. Premium fantasy game UI ornament, consistent line weight, clear silhouettes, no people, no creatures, no cards, no letters, no logo, no watermark. ${chromaKey}`,
  },
  {
    file: "battle-status-icons-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: `Use case: stylized-concept. Asset type: 4 by 3 grid sprite atlas of exactly twelve separate game status icons with large equal cells: taunt shield, barrier shield, immunity halo, freeze crystal, silence seal, revive flame, attack increase sword, damage-over-time skull ember, stealth eye, root vines, poison droplet, stun star. Each icon is a single centered emblem with clean premium fantasy game UI rendering, crisp readable silhouette at tiny size, no text, no numbers, no borders, no watermark. ${chromaKey}`,
  },
  {
    file: "resource-reward-icons-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: `Use case: stylized-concept. Asset type: 4 by 3 grid sprite atlas of exactly twelve separate resource and reward icons: gold coin, jade shard, crystal gem, season token, chest, key, scroll, forge material, rank badge, quest seal, energy vial, ticket. Match a Chinese fantasy tactical card game, crisp premium UI icon silhouettes, centered evenly with generous padding, no text, no numbers, no watermark. ${chromaKey}`,
  },
  {
    file: "skill-vfx-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: `Use case: stylized-concept. Asset type: 4 by 2 game VFX sprite atlas, exactly eight separate visual effects in equal cells: melee slash, dash trail, distant projectile, focused beam, lightning arc, area impact burst, summoning ring, resurrection flare. Bright premium stylized fantasy energy, deliberate and readable silhouettes, each centered and isolated, no character, no weapon hand, no ground, no text, no watermark. ${chromaKey}`,
  },
  {
    file: "summons-and-derivatives-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: `Use case: stylized-concept. Asset type: 3 by 3 grid sprite atlas of exactly nine independent summon or derivative visual assets: jade sprout, wind spirit, small stone construct, temporary shield, gravity black hole, ritual circle, thorn trap, floating talisman, spectral lantern. Stylized premium Chinese fantasy tactical card game mini-unit icons, clear high-contrast silhouettes, each isolated and centered with no floor, no character, no text, no watermark. ${chromaKey}`,
  },
  {
    file: "core-state-overlays-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: `Use case: stylized-concept. Asset type: 5-cell horizontal sprite atlas of exactly five independent luminous core-state visual overlays, each centered in an equal cell: normal protective ring, hit cracked shock ring, critical red warning fracture, recovery green-gold healing orbit, victory radiant crest, collapse blackened shattered halo. Premium fantasy game VFX, clear silhouettes, no central object and no character, no text, no watermark. ${chromaKey}`,
  },
  {
    file: "card-interaction-effects-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: `Use case: stylized-concept. Asset type: 4 by 2 sprite atlas of exactly eight isolated card interaction overlays for an original tactical card game: draw swirl, shuffle vortex, discard ash burst, card flip glint, burn flame edge, lock chains, upgrade starburst, selected card highlight frame. Consistent premium fantasy UI effects, no actual cards, no hand, no text, no watermark. ${chromaKey}`,
  },
  {
    file: "battle-ui-panel-states-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: "Use case: ui-mockup. Asset type: square sprite atlas of eight empty Chinese-fantasy game UI texture panels arranged in a 4 by 2 grid. The cells are: primary button normal, hover, pressed, disabled, loading plate, dialog backdrop, confirmation panel, reward panel. All cells must contain only decorative frames and material textures, no labels, no glyphs, no readable text, no icons. Dark obsidian, jade edge light, aged bronze, restrained crimson accent, dense yet legible, front-facing, no watermark.",
  },
  {
    file: "deck-graveyard-and-targeting-atlas-agnes-image-2-1-flash.png",
    ratio: "1:1",
    prompt: `Use case: stylized-concept. Asset type: 3 by 3 sprite atlas of separate tactical card-game board accessories: deck base, graveyard base, draw pile glow, discard pile glow, attack target reticle, enemy target reticle, friendly target reticle, turn priority crest, turn timer ring. Premium Chinese fantasy game UI ornaments, centered isolated elements, no cards, no characters, no text, no watermark. ${chromaKey}`,
  },
  {
    file: "battle-log-reward-panel-background-agnes-image-2-1-flash.png",
    size: "4K",
    ratio: "4:3",
    prompt: "Use case: ui-mockup. Asset type: reusable full panel background texture for a battle log, confirmation dialog and reward summary in an original Chinese fantasy tactical card game. Frame the outer edge with aged bronze, dark jade lacquer, faint parchment fibers and restrained ember glows. Keep the central reading area quiet and dark with no ornament across the middle, very high legibility for later text overlay. No characters, no cards, no words, no numbers, no watermark.",
  },
  {
    file: "season-shop-and-quest-banners-atlas-agnes-image-2-1-flash.png",
    size: "4K",
    ratio: "16:9",
    prompt: "Use case: stylized-concept. Asset type: three wide, equal horizontal banner panels stacked vertically with clear gutters for an original Chinese fantasy card game's season shop, daily quest and rank reward screens. Top: celestial jade observatory. Middle: ember-forge contract table without people. Bottom: imperial bronze archive hall. Leave broad dark clean negative space in each panel for later UI labels. Premium painted game art, no characters, no creatures, no cards, no text, no logo, no watermark.",
  },
  {
    file: "battlefield-ambient-overlays-atlas-agnes-image-2-1-flash.png",
    size: "4K",
    ratio: "16:9",
    prompt: `Use case: stylized-concept. Asset type: five separate widescreen atmospheric battlefield overlay bands arranged horizontally for a fantasy tactical card game: drifting jade leaves, ember sparks, wind ribbons, violet void motes, imperial gold dust. Keep a fully transparent-looking empty center in each band and concentrate particles near the outer borders. Stylized luminous particles, no landscape, no characters, no text, no watermark. ${chromaKey}`,
  },
];

async function generate(asset, apiKey, worker) {
  const target = resolve(destination, asset.file);
  try {
    await access(target);
    console.log(`${basename(target)}\tskipped (already exists)`);
    return;
  } catch {
    // The file does not exist yet.
  }
  console.log(`${asset.file}\tstarting ${asset.size ?? "2K"} on lane ${worker + 1}`);
  const signal = AbortSignal.timeout(12 * 60 * 1000);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "agnes-image-2.1-flash",
      prompt: asset.prompt,
      size: asset.size ?? "2K",
      ratio: asset.ratio,
      extra_body: { response_format: "url" },
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`${asset.file}: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  const url = body?.data?.[0]?.url;
  if (!url) throw new Error(`${asset.file}: missing image URL in response.`);
  const image = await fetch(url);
  if (!image.ok) throw new Error(`${asset.file}: image download failed with ${image.status}.`);
  await writeFile(target, Buffer.from(await image.arrayBuffer()));
  console.log(`${basename(target)}\t${image.headers.get("content-length") ?? "unknown"} bytes`);
}

await mkdir(destination, { recursive: true });
const failures = [];
let cursor = 0;
await Promise.all(apiKeys.map(async (apiKey, worker) => {
  while (cursor < assets.length) {
    const asset = assets[cursor++];
    try {
      await generate(asset, apiKey, worker);
    } catch (error) {
      failures.push(`${asset.file}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`FAILED\t${asset.file}`);
    }
  }
}));
if (failures.length) {
  throw new Error(`Generation finished with ${failures.length} failure(s):\n${failures.join("\n")}`);
}
