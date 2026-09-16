import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const apiKey = process.env.HUBWAY_API_KEY;
const apiBase = (process.env.HUBWAY_API_BASE ?? "https://hubway.cc/v1").replace(/\/$/, "");
const target = process.argv[2] ?? "all";
if (!apiKey) throw new Error("HUBWAY_API_KEY is required.");

const cards = [
  ["dawn-scout", "破晓斥候", "a swift celestial scout crossing a luminous star gate"], ["iron-guard", "铁誓卫士", "an oathbound knight holding a tower shield in a dark iron citadel"], ["void-pickpocket", "幽冥窃影", "a nimble female shadow thief emerging from violet dimensional smoke"], ["ember-adept", "余烬学徒", "a young fire mage holding a living ember orb in a ruined academy"], ["wild-bloom", "山海花灵", "an ancient flower spirit rising from storm swept wild grass"], ["sunblade", "曜剑郎", "a radiant sunblade duelist in gold plate armor charging through dawn"], ["mirror-smith", "镜界锻师", "a prism armor blacksmith forging mirrored metal with cyan sparks"], ["night-conductor", "夜幕都统", "an elegant dark commander conducting a spectral army beneath a purple eclipse"], ["aether-weaver", "天机织命者", "an arcane weaver stitching luminous violet magic rings in the air"], ["dust-rider", "尘风骑手", "a desert rider racing through a sandstorm on a mechanical beast"], ["star-archivist", "典籍司丞", "a celestial archivist in a moonlit library with floating star maps"], ["hollow-beast", "无面凶兽", "a colossal abyssal beast with a glowing hollow chest in black mist"], ["forge-singer", "熔炉吟游者", "a warrior bard striking a glowing forge with a musical hammer"], ["comet-ranger", "流星猎手", "a comet ranger firing a starlight bow across an alien night sky"], ["rift-oracle", "天机散人", "a blind rift oracle with floating violet eyes and cosmic prophecy scrolls"], ["bastion-warden", "铁壁司命", "a veteran fortress warden standing before an enormous shattered wall"], ["thunder-herd", "雷霆兽群", "a herd of thunder beasts stampeding over a glowing grassland"], ["astral-queen", "星冕女帝", "a regal astral queen wearing a stellar crown on a celestial throne"], ["void-emperor", "冥府判官", "a void emperor in dark violet armor commanding a legion in an eclipse hall"], ["prism-dragon", "棱镜古龙", "an immense crystal prism dragon flying through aurora clouds"], ["iron-colossus", "天穹兵俑", "a towering ancient war machine of iron and brass in a ruined city"], ["world-root", "万木灵根", "a colossal world tree root glowing with emerald life in a dark wasteland"], ["wind-wisp", "风灵", "a small luminous wind spirit swirling through ancient grass"],
];
const backgrounds = [
  ["lobby-background", "wide fantasy game lobby background: giant celestial astrolabe on the left, dark gothic citadel on the right, ancient gold filigree, blue and amber twilight, empty central space for title, premium dark fantasy game key art, no text, no logo, no interface"],
  ["battle-background", "wide top-down dark fantasy card battle table, obsidian and slate stone arena, faint blue runic geometry, antique gold borders, candlelit corners, clear central playing area, premium strategy game environment, no cards, no text, no logo, no interface"],
];
const archivePortraits = [
  ["yinluo", "殷萝", "an adult female Tianheng law officer, composed and incisive, in ivory and antique-gold magistrate robes with pale jade tablets; she holds a slim seal-breaking brush and a half-burned case file before the royal archive, restrained dawn light and subtle vermilion seal dust"],
  ["xuanji", "玄玑", "an adult female Tianji fate-stitcher, cool and observant, in indigo and silver scholar robes; both hands adjust a floating double-ring astrolabe with fractured starlight over a dark observatory, her face unobscured"],
  ["suhe", "苏禾", "an adult female Shanhai root-codex keeper, gentle and resilient, in moss-green field robes with a jadewood seed case; she cradles luminous seeds and living roots in a misty primordial wilds sanctuary"],
  ["qingyao", "青遥", "an adult female Youming ferry physician, calm and compassionate, in charcoal, bone-white and muted violet medical robes; she holds a white bone bell and a small medicine satchel beside the black river ferry under moonlit mist"],
  ["linzhu", "林铸", "an adult female Iron Law forge seal inspector, stern and candid, in black iron workshop armor and a weathered forge apron; she grips a dark steel measuring rule before a low glowing furnace, sparks and forged route markers behind her"],
  ["wanqing", "闻青", "an adult female Tianheng royal seal reader, cautious and defiant, in refined amber and pale-blue court scholar robes; she studies a broken half royal seal and three hidden lines of a decree in a candlelit record chamber"],
  ["luyin", "陆引", "an adult female Tianji memory cartographer, bright and stubborn, in teal-blue travel scholar attire; she unfolds a luminous tide map while a brass measuring ruler and drifting paper map fragments orbit her on a rain-swept shore"],
  ["zhuiyue", "追月", "an adult female Shanhai tide-line guide, athletic and decisive, in sea-green expedition armor with a moon-pattern rope coiled around one arm; she faces a moving coast and misty mountain surf at blue-hour"],
  ["huanling", "桓铃", "an adult female Youming nameless courier, quiet and agile, in layered dark-violet messenger robes; she holds a seven-hole bell and a sealed letter at a shadowed riverside gate, soft soul-lantern light catching her face"],
  ["luojin", "罗谨", "an adult male Iron Law border captain, steady and weathered, in practical iron lamellar armor and a dark field cloak; he carries a rain-worn military tag and stands before a storm-battered refuge wall"],
  ["wenbai", "闻白", "an adult male Tianheng investigator, elegant and unreadable, in warm grey and old-gold civil robes; he pours tea beside a vermilion seal box and open testimony documents in a quiet tribunal archive"],
  ["shenzhu", "沈逐", "an adult male Shanhai root patrol ranger, reserved and patient, in earth-green travel armor with a stone whistle at his neck; he examines a living root vein in retreating mountains after rain, carrying a field journal"],
];
async function generateImage(id, prompt, size, directory) {
  try {
    await access(join(directory, `${id}.png`));
    console.log(`skipped ${id}`);
    return;
  } catch {
    // The asset does not exist yet.
  }
  let response;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    response = await fetch(`${apiBase}/images/generations`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-image-2", prompt, size, quality: "high", n: 1 }), signal: AbortSignal.timeout(90_000) });
    if (response.ok || response.status !== 429 || attempt === 6) break;
    const delay = attempt * 25_000;
    console.log(`rate limited ${id}, retrying in ${delay / 1000}s`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  if (!response?.ok) throw new Error(`${id}: ${response?.status} ${await response?.text()}`);
  const image = (await response.json()).data?.[0];
  if (!image) throw new Error(`${id}: API returned no image data`);
  const bytes = image.b64_json ? Buffer.from(image.b64_json, "base64") : Buffer.from(await (await fetch(image.url)).arrayBuffer());
  await writeFile(join(directory, `${id}.png`), bytes);
  console.log(`generated ${id}`);
}
const cardDirectory = join(process.cwd(), "public", "assets", "cards");
const backgroundDirectory = join(process.cwd(), "public", "assets", "backgrounds");
const portraitDirectory = join(process.cwd(), "public", "assets", "characters", "archive");
await mkdir(cardDirectory, { recursive: true });
await mkdir(backgroundDirectory, { recursive: true });
await mkdir(portraitDirectory, { recursive: true });
if (target === "backgrounds" || target === "all") for (const [id, prompt] of backgrounds) await generateImage(id, prompt, "1536x1024", backgroundDirectory);
if (target !== "backgrounds" && target !== "portraits" && !archivePortraits.some(([id]) => id === target)) {
  const selected = target === "all" ? cards : cards.filter(([id]) => id === target);
  if (!selected.length) throw new Error(`Unknown card id: ${target}`);
  for (const [id, name, scene] of selected) await generateImage(id, `Dark fantasy collectible card artwork for ${name}: ${scene}. Vertical portrait, one primary subject, dramatic cinematic light, intricate realistic painted textures, rich deep navy and antique gold palette, premium strategy card game art. Artwork only. No card border, no frame, no text, no letters, no numbers, no watermark.`, "1024x1536", cardDirectory);
}
if (target === "portraits" || target === "all" || archivePortraits.some(([id]) => id === target)) {
  const selected = target === "portraits" || target === "all" ? archivePortraits : archivePortraits.filter(([id]) => id === target);
  for (const [id, name, scene] of selected) {
    await generateImage(id, `Premium Chinese xianxia tactical card game personnel portrait for ${name}: ${scene}. Vertical 2:3 adult half-body character illustration, subject centered with 12% safe padding; face, hands, costume silhouette and signature prop are clearly visible. Cinematic 2D digital painting, precise anatomy, rich silk, jade, lacquered metal and weathered-paper textures, faction atmosphere kept low contrast. No card frame, border, text, letters, numbers, logo, watermark, other people, modern objects, sexualization, childish features, cropped head, cropped hands or cropped clothing.`, "1024x1536", portraitDirectory);
  }
}
