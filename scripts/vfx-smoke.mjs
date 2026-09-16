import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const cardSource = await readFile(join(root, "src", "data", "cards.ts"), "utf8");
const vfxSource = await readFile(join(root, "src", "components", "vfx", "data.ts"), "utf8");

const cards = [...cardSource.matchAll(/\{ id: "([^"]+)"[^\r\n]*?skill:\s*\{[^}]*?effect: "([^"]+)"/g)].map((match) => ({ id: match[1], effect: match[2] }));
const cardIds = cards.map((card) => card.id);
const inertCards = cards.filter((card) => card.effect === "none");
if (inertCards.length) throw new Error(`卡牌缺少实际技能：${inertCards.map((card) => card.id).join(", ")}`);
const signatureBlock = vfxSource.match(/const CARD_SIGNATURES:[\s\S]+?= \{([\s\S]+?)\n\};/);
if (!signatureBlock) throw new Error("未找到 CARD_SIGNATURES 配置");
const signatures = [...signatureBlock[1].matchAll(/^\s+"([^"]+)":\s*\{([^}]+)\}/gm)].map((match) => ({ id: match[1], value: match[2].replace(/\s+/g, "") }));
const signatureIds = signatures.map((signature) => signature.id);
const missing = cardIds.filter((id) => !signatureIds.includes(id));
const unknown = signatureIds.filter((id) => !cardIds.includes(id));
if (missing.length) throw new Error(`缺少专属技能特效：${missing.join(", ")}`);
if (unknown.length) throw new Error(`特效配置引用未知卡牌：${unknown.join(", ")}`);
const signatureOwners = new Map();
for (const signature of signatures) {
  const owners = signatureOwners.get(signature.value) ?? [];
  owners.push(signature.id);
  signatureOwners.set(signature.value, owners);
}
const duplicateSignatures = [...signatureOwners.values()].filter((owners) => owners.length > 1);
if (duplicateSignatures.length) throw new Error(`存在重复视觉签名：${duplicateSignatures.map((owners) => owners.join(", ")).join("; ")}`);

const textures = ["fire", "flame", "flare", "glow", "lightning", "magic-ring", "slash", "smoke", "spark-burst", "star", "trace", "twirl"];
await Promise.all(textures.map((name) => access(join(root, "public", "assets", "vfx", `${name}.png`))));
await access(join(root, "public", "assets", "vfx", "LICENSE-KENNEY-CC0.txt"));

console.log(`VFX 烟测通过：${cardIds.length} 张卡牌均有实际技能与专属视觉签名，${textures.length} 个 CC0 纹理与许可文件完整`);
