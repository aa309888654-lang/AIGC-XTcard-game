import { CARD_MAP } from "../../data/cards";
import type { SkillFxKind } from "./types";

export type TextureKey = keyof typeof VFX_TEXTURES;
export type SignaturePattern = "scan" | "guard" | "dash" | "rise" | "slash" | "spiral" | "vortex" | "storm" | "crown" | "radial";

export interface CardSignature {
  texture: TextureKey;
  particle: TextureKey;
  secondary: number;
  pattern: SignaturePattern;
  spin: number;
}

export const VFX_TEXTURES = {
  fire: "/assets/vfx/fire.png",
  flame: "/assets/vfx/flame.png",
  flare: "/assets/vfx/flare.png",
  glow: "/assets/vfx/glow.png",
  lightning: "/assets/vfx/lightning.png",
  magicRing: "/assets/vfx/magic-ring.png",
  slash: "/assets/vfx/slash.png",
  smoke: "/assets/vfx/smoke.png",
  spark: "/assets/vfx/spark-burst.png",
  star: "/assets/vfx/star.png",
  trace: "/assets/vfx/trace.png",
  twirl: "/assets/vfx/twirl.png",
} as const;

export const KIND_COLORS: Record<SkillFxKind, number> = {
  lightning: 0x9be8ff,
  flame: 0xff754f,
  nature: 0x75e6a4,
  shield: 0xaad9ff,
  radiant: 0xffe28a,
  void: 0xa17aff,
  arcane: 0x78ddec,
};

export const SKILL_KIND_BY_LABEL: Record<string, SkillFxKind> = {
  "荒野呼唤": "lightning",
  "飘忽": "nature",
  "灼热印记": "flame",
  "预言燃烧": "flame",
  "反噬核心": "flame",
  "余辉连射": "radiant",
  "再生孢子": "nature",
  "无尽复苏": "nature",
  "回风": "nature",
  "固守": "shield",
  "折光装甲": "shield",
  "静滞力场": "shield",
  "不可退让": "shield",
  "拓荒壁垒": "shield",
  "曙光铸盾": "shield",
  "恒星加冕": "radiant",
  "日轮穿刺": "radiant",
  "星辉共鸣": "radiant",
  "星尘记忆": "radiant",
  "极光成长": "radiant",
  "永夜归来": "void",
  "蚀影咒印": "void",
  "暗潮号令": "void",
  "折跃突袭": "void",
  "猎影突袭": "void",
  "星门侦测": "arcane",
  "天机折扣": "arcane",
  "合金和弦": "arcane",
  "连环追击": "arcane",
};

export const CARD_SIGNATURES: Record<string, CardSignature> = {
  "dawn-scout": { texture: "magicRing", particle: "spark", secondary: 0xd9f6ff, pattern: "scan", spin: 0.7 },
  "iron-guard": { texture: "twirl", particle: "flare", secondary: 0xe5edf4, pattern: "guard", spin: 0.35 },
  "void-pickpocket": { texture: "slash", particle: "smoke", secondary: 0xd5c2ff, pattern: "dash", spin: 0.18 },
  "ember-adept": { texture: "fire", particle: "flame", secondary: 0xffd172, pattern: "rise", spin: 0.1 },
  "wild-bloom": { texture: "twirl", particle: "star", secondary: 0xd9ffd0, pattern: "rise", spin: 1.15 },
  "sunblade": { texture: "slash", particle: "flare", secondary: 0xfff2a8, pattern: "slash", spin: 0.25 },
  "mirror-smith": { texture: "magicRing", particle: "spark", secondary: 0xc9fbff, pattern: "guard", spin: 1.65 },
  "night-conductor": { texture: "twirl", particle: "star", secondary: 0xd8bdff, pattern: "radial", spin: -1.35 },
  "aether-weaver": { texture: "magicRing", particle: "spark", secondary: 0xf0c6ff, pattern: "spiral", spin: 2.2 },
  "dust-rider": { texture: "trace", particle: "spark", secondary: 0xf0d19d, pattern: "dash", spin: 0.08 },
  "star-archivist": { texture: "magicRing", particle: "star", secondary: 0xdce7ff, pattern: "scan", spin: -0.65 },
  "hollow-beast": { texture: "twirl", particle: "smoke", secondary: 0xa98bd9, pattern: "vortex", spin: -2.4 },
  "forge-singer": { texture: "flare", particle: "spark", secondary: 0xffc382, pattern: "radial", spin: 0.5 },
  "comet-ranger": { texture: "slash", particle: "star", secondary: 0xfff6bf, pattern: "slash", spin: 0.12 },
  "rift-oracle": { texture: "magicRing", particle: "flame", secondary: 0xe4c5ff, pattern: "spiral", spin: -1.8 },
  "bastion-warden": { texture: "twirl", particle: "flare", secondary: 0xedf5ff, pattern: "guard", spin: 0.85 },
  "thunder-herd": { texture: "lightning", particle: "spark", secondary: 0xeaffb8, pattern: "storm", spin: 0 },
  "astral-queen": { texture: "magicRing", particle: "star", secondary: 0xfff1bd, pattern: "crown", spin: 1.4 },
  "void-emperor": { texture: "twirl", particle: "smoke", secondary: 0xbea0ff, pattern: "vortex", spin: -3.1 },
  "prism-dragon": { texture: "flare", particle: "star", secondary: 0xc5fff5, pattern: "spiral", spin: 2.75 },
  "iron-colossus": { texture: "magicRing", particle: "spark", secondary: 0xdceaf5, pattern: "guard", spin: 0.15 },
  "world-root": { texture: "twirl", particle: "star", secondary: 0xdcffbd, pattern: "rise", spin: 1.9 },
  "wind-wisp": { texture: "twirl", particle: "star", secondary: 0xe9ffdb, pattern: "dash", spin: 2.4 },
  "dawn-horn": { texture: "flare", particle: "spark", secondary: 0xd9f2ff, pattern: "rise", spin: 0.9 },
  "wall-smith": { texture: "twirl", particle: "flare", secondary: 0xe8f0f7, pattern: "guard", spin: 0.5 },
  "seed-guardian": { texture: "twirl", particle: "star", secondary: 0xd9ffd9, pattern: "rise", spin: 1.05 },
  "rune-seeker": { texture: "magicRing", particle: "spark", secondary: 0xecd6ff, pattern: "scan", spin: -0.9 },
  "night-tide": { texture: "magicRing", particle: "spark", secondary: 0xd9c4ff, pattern: "spiral", spin: 1.7 },
  "sky-lantern": { texture: "flare", particle: "star", secondary: 0xdcecff, pattern: "rise", spin: 0.6 },
  "solar-judge": { texture: "slash", particle: "flare", secondary: 0xfff0b8, pattern: "slash", spin: 0.2 },
  "grave-watcher": { texture: "smoke", particle: "smoke", secondary: 0xc4b8e8, pattern: "vortex", spin: -1.4 },
  "siege-engine": { texture: "flare", particle: "spark", secondary: 0xe8f1f7, pattern: "radial", spin: 0.3 },
  "time-echo": { texture: "magicRing", particle: "spark", secondary: 0xe0ccff, pattern: "spiral", spin: 2.1 },
  "wild-mother": { texture: "twirl", particle: "star", secondary: 0xdfffb8, pattern: "rise", spin: 1.3 },
  "titan-keeper": { texture: "magicRing", particle: "flare", secondary: 0xd8e6f2, pattern: "guard", spin: 0.4 },
  "stone-golem": { texture: "twirl", particle: "flare", secondary: 0xe4edf4, pattern: "guard", spin: 0.6 },
  "sprout": { texture: "twirl", particle: "star", secondary: 0xe0ffd0, pattern: "rise", spin: 1.75 },
  "spark-star": { texture: "fire", particle: "flame", secondary: 0xffe0a0, pattern: "rise", spin: 0.2 },
  "fate-charm": { texture: "magicRing", particle: "spark", secondary: 0xf0d8ff, pattern: "spiral", spin: -1.1 },
  "shadow-bolt": { texture: "slash", particle: "smoke", secondary: 0xd0b8ff, pattern: "vortex", spin: -2.2 },
  "forge-hammer": { texture: "flare", particle: "spark", secondary: 0xffd9a8, pattern: "radial", spin: 0.45 },
  "earth-roots": { texture: "twirl", particle: "star", secondary: 0xd8ffc4, pattern: "rise", spin: 1.2 },
  "focus-spirit": { texture: "magicRing", particle: "spark", secondary: 0xe8c8ff, pattern: "spiral", spin: 2.4 },
  "radiance-bless": { texture: "flare", particle: "star", secondary: 0xfff2c8, pattern: "rise", spin: 0.8 },
  "golem-rune": { texture: "magicRing", particle: "flare", secondary: 0xe8f0f5, pattern: "guard", spin: 0.7 },
  "forget-curse": { texture: "smoke", particle: "smoke", secondary: 0xb8a0e8, pattern: "vortex", spin: -2.8 },
  "bloom-sea": { texture: "twirl", particle: "star", secondary: 0xccffb0, pattern: "storm", spin: 1.5 },
  "venom-viper": { texture: "slash", particle: "smoke", secondary: 0x9e6fd8, pattern: "vortex", spin: -1.7 },
  "stasis-seal": { texture: "magicRing", particle: "spark", secondary: 0xd4c0ff, pattern: "scan", spin: -0.4 },
  "rust-fetter": { texture: "twirl", particle: "flare", secondary: 0xd9c9a8, pattern: "guard", spin: 0.55 },
  "dust-seal": { texture: "smoke", particle: "smoke", secondary: 0xd8c0f0, pattern: "vortex", spin: -2.5 },
  "astral-insight": { texture: "magicRing", particle: "star", secondary: 0xffe9b0, pattern: "radial", spin: 0.8 },
  "echo-shard": { texture: "smoke", particle: "smoke", secondary: 0x9d79e8, pattern: "spiral", spin: -0.6 },
  "ancient-egg": { texture: "twirl", particle: "star", secondary: 0xd8ffc4, pattern: "rise", spin: 1.45 },
  "star-blade": { texture: "star", particle: "spark", secondary: 0xffe9b0, pattern: "slash", spin: 1.1 },
  "iron-anvil": { texture: "flare", particle: "flare", secondary: 0xffb066, pattern: "radial", spin: 0.9 },
  "mirror-guard": { texture: "magicRing", particle: "star", secondary: 0xffe9b0, pattern: "guard", spin: 0.6 },
  "spell-eater": { texture: "smoke", particle: "smoke", secondary: 0x9d79e8, pattern: "spiral", spin: -0.8 },
  "spike-field": { texture: "slash", particle: "spark", secondary: 0xb9c6d2, pattern: "radial", spin: 1.2 },
  "astral-coin": { texture: "star", particle: "spark", secondary: 0xfff2c0, pattern: "rise", spin: 1.6 },
  "lute-officer": { texture: "magicRing", particle: "star", secondary: 0xa8c8ff, pattern: "scan", spin: -0.55 },
  "seal-maiden": { texture: "twirl", particle: "flare", secondary: 0xc3d8ff, pattern: "guard", spin: 0.75 },
  "night-whistle": { texture: "slash", particle: "spark", secondary: 0x9cc4ff, pattern: "dash", spin: 0.22 },
  "edict-clerk": { texture: "flare", particle: "star", secondary: 0xffd98a, pattern: "rise", spin: 0.85 },
  "crimson-guardian": { texture: "slash", particle: "flare", secondary: 0xe86a6a, pattern: "slash", spin: 0.3 },
  "dawn-herald": { texture: "trace", particle: "spark", secondary: 0x81d8ff, pattern: "dash", spin: 0.12 },
  "mirror-tutor": { texture: "magicRing", particle: "spark", secondary: 0x7fc4e8, pattern: "scan", spin: -0.7 },
  "celestial-weaver": { texture: "twirl", particle: "star", secondary: 0x9fb8f5, pattern: "spiral", spin: 2.3 },
  "eclipse-princess": { texture: "flare", particle: "star", secondary: 0xf0c060, pattern: "crown", spin: 1.35 },
  "gatekeeper-old": { texture: "twirl", particle: "flare", secondary: 0xb8cce0, pattern: "guard", spin: 0.9 },
  "royal-herald": { texture: "flare", particle: "spark", secondary: 0xe8c87a, pattern: "radial", spin: 0.55 },
  "dawn-summon": { texture: "flare", particle: "star", secondary: 0xffe39a, pattern: "rise", spin: 1 },
  "star-halo": { texture: "magicRing", particle: "star", secondary: 0xb8d8ff, pattern: "scan", spin: 0.95 },
  "shadow-warden": { texture: "slash", particle: "smoke", secondary: 0x8c6cff, pattern: "dash", spin: 0.16 },
  "tide-singer": { texture: "magicRing", particle: "spark", secondary: 0x9e7dff, pattern: "spiral", spin: 1.8 },
  "ghost-bell": { texture: "twirl", particle: "star", secondary: 0xa67cff, pattern: "radial", spin: -1.2 },
  "bone-lantern": { texture: "flare", particle: "flame", secondary: 0xb08aff, pattern: "rise", spin: 0.7 },
  "void-whisper": { texture: "smoke", particle: "smoke", secondary: 0x8a6ac9, pattern: "vortex", spin: -2.6 },
  "crypt-keeper": { texture: "slash", particle: "smoke", secondary: 0x7b6fa8, pattern: "dash", spin: 0.2 },
  "abyss-reader": { texture: "twirl", particle: "smoke", secondary: 0x6b4fc4, pattern: "vortex", spin: -1.9 },
  "night-queen": { texture: "twirl", particle: "star", secondary: 0x8b6fd8, pattern: "radial", spin: -1.4 },
  "moonless": { texture: "smoke", particle: "smoke", secondary: 0x7a5cc8, pattern: "vortex", spin: -3.3 },
  "ferryman": { texture: "twirl", particle: "flare", secondary: 0x9e7dff, pattern: "guard", spin: 0.65 },
  "shadow-claw": { texture: "slash", particle: "smoke", secondary: 0x5e4a83, pattern: "slash", spin: 0.28 },
  "forgotten-curse": { texture: "smoke", particle: "smoke", secondary: 0x8b6fd8, pattern: "spiral", spin: -0.9 },
  "dusk-blade": { texture: "slash", particle: "smoke", secondary: 0x8a6ac9, pattern: "slash", spin: 0.15 },
  "star-stitcher": { texture: "magicRing", particle: "star", secondary: 0xc79aff, pattern: "scan", spin: -0.8 },
  "clock-maiden": { texture: "flare", particle: "spark", secondary: 0xb38aff, pattern: "radial", spin: 0.4 },
  "rune-calligrapher": { texture: "magicRing", particle: "spark", secondary: 0xd8a8ff, pattern: "spiral", spin: -1.3 },
  "fate-dancer": { texture: "trace", particle: "spark", secondary: 0xd783ff, pattern: "dash", spin: 0.1 },
  "thread-puppeteer": { texture: "trace", particle: "spark", secondary: 0xc79aff, pattern: "spiral", spin: 2.5 },
  "void-mathematician": { texture: "magicRing", particle: "spark", secondary: 0xb38aff, pattern: "scan", spin: -1.1 },
  "prophecy-weaver": { texture: "magicRing", particle: "star", secondary: 0xd783ff, pattern: "spiral", spin: 2.6 },
  "eclipse-calculator": { texture: "magicRing", particle: "star", secondary: 0xc79aff, pattern: "crown", spin: 1.5 },
  "chess-master": { texture: "slash", particle: "spark", secondary: 0xa583ff, pattern: "slash", spin: 0.35 },
  "hourglass": { texture: "twirl", particle: "flare", secondary: 0xb38aff, pattern: "guard", spin: 0.8 },
  "mirror-hex": { texture: "magicRing", particle: "star", secondary: 0xc79aff, pattern: "radial", spin: -0.5 },
  "star-array": { texture: "magicRing", particle: "spark", secondary: 0xd8a8ff, pattern: "scan", spin: 1.2 },
  "rivet-forger": { texture: "flare", particle: "spark", secondary: 0xa9b7c4, pattern: "radial", spin: 0.5 },
  "armor-tailor": { texture: "twirl", particle: "flare", secondary: 0xb9c6d2, pattern: "guard", spin: 0.7 },
  "siege-matron": { texture: "flare", particle: "spark", secondary: 0xb9c6d2, pattern: "radial", spin: 0.6 },
  "gear-dancer": { texture: "trace", particle: "spark", secondary: 0x93a7b9, pattern: "dash", spin: 0.14 },
  "furnace-priestess": { texture: "flare", particle: "flame", secondary: 0xf3a05c, pattern: "rise", spin: 0.65 },
  "blueprint-warden": { texture: "magicRing", particle: "flare", secondary: 0xa9b7c4, pattern: "guard", spin: 0.45 },
  "anvil-queen": { texture: "flare", particle: "flare", secondary: 0xb9c6d2, pattern: "radial", spin: 0.75 },
  "zero-warden": { texture: "magicRing", particle: "spark", secondary: 0x7b94a8, pattern: "guard", spin: 0.25 },
  "gate-mason": { texture: "twirl", particle: "flare", secondary: 0xb9c6d2, pattern: "guard", spin: 0.55 },
  "iron-dog": { texture: "slash", particle: "spark", secondary: 0xa9b7c4, pattern: "dash", spin: 0.25 },
  "rivet-storm": { texture: "flare", particle: "spark", secondary: 0xb9c6d2, pattern: "storm", spin: 0.2 },
  "wall-oath": { texture: "twirl", particle: "flare", secondary: 0xa9b7c4, pattern: "radial", spin: 0.35 },
  "root-daughter": { texture: "twirl", particle: "star", secondary: 0x8fd9a0, pattern: "rise", spin: 1.1 },
  "rain-girl": { texture: "magicRing", particle: "spark", secondary: 0x74d89a, pattern: "scan", spin: 0.85 },
  "seed-weaver": { texture: "twirl", particle: "star", secondary: 0x9bd97e, pattern: "rise", spin: 1.25 },
  "bloom-singer": { texture: "flare", particle: "star", secondary: 0xa8e68c, pattern: "radial", spin: 0.9 },
  "valley-mother": { texture: "twirl", particle: "flare", secondary: 0xa8d47e, pattern: "guard", spin: 0.95 },
  "star-fruit": { texture: "star", particle: "spark", secondary: 0xb7d85a, pattern: "rise", spin: 1.3 },
  "earth-dancer": { texture: "twirl", particle: "star", secondary: 0x9aca70, pattern: "spiral", spin: 1.6 },
  "world-bloom": { texture: "twirl", particle: "star", secondary: 0xa8e68c, pattern: "storm", spin: 1.7 },
  "wind-sister": { texture: "trace", particle: "spark", secondary: 0xc7a46b, pattern: "dash", spin: 0.09 },
  "ox-herd": { texture: "twirl", particle: "flare", secondary: 0xc7a46b, pattern: "guard", spin: 0.6 },
  "root-call": { texture: "twirl", particle: "star", secondary: 0x9bd97e, pattern: "rise", spin: 1.5 },
  "spring-rain": { texture: "magicRing", particle: "spark", secondary: 0x74d89a, pattern: "spiral", spin: 1.9 },
};

const FACTION_KIND = {
  "天衡": "radiant",
  "幽冥": "void",
  "天机": "arcane",
  "铁律": "shield",
  "山海": "nature",
} as const satisfies Record<string, SkillFxKind>;

export function skillKind(label?: string, cardId?: string): SkillFxKind {
  if (label && SKILL_KIND_BY_LABEL[label]) return SKILL_KIND_BY_LABEL[label];
  const faction = cardId ? CARD_MAP[cardId]?.type : undefined;
  return faction ? FACTION_KIND[faction] : "arcane";
}

export function parseColor(color: string | undefined, fallback: number) {
  return color?.startsWith("#") ? Number.parseInt(color.slice(1), 16) : fallback;
}

export function colorString(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function easeOut(value: number) {
  return 1 - (1 - value) ** 3;
}
