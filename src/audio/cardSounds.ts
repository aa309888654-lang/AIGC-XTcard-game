import type { SfxName } from "./AudioProvider";
import type { SfxTier } from "./sfxBus";
import { CARD_PRESENTATION, getSkillPresentation, type SoundTone } from "../data/presentation";
import { CARD_MAP } from "../data/cards";
import type { CardType } from "../types";

export const SOUND_TONE_TO_SFX: Record<SoundTone, SfxName> = {
  star: "skillRadiant",
  vacuum: "skillVoid",
  pulse: "skillArcane",
  metal: "skillIron",
  thunder: "skillWild",
};

const FACTION_TONE: Record<CardType, SoundTone> = {
  "天衡": "star",
  "幽冥": "vacuum",
  "天机": "pulse",
  "铁律": "metal",
  "山海": "thunder",
};

export interface CardSound {
  sfx: SfxName;
  tail?: SfxName;
  tier: SfxTier;
}

const SKILL_SET_TO_SFX: Record<string, SfxName> = {
  guard: "guard",
  shield: "shield",
  revive: "revive",
  heal: "heal",
  growth: "heal",
  draw: "skillRadiant",
  crown: "skillRadiant",
  verdict: "skillRadiant",
  pierce: "attackHit",
  dash: "attackReady",
  bolt: "skillRadiant",
  flame: "skillRadiant",
  thunder: "skillWild",
  prism: "skillArcane",
  arcane: "skillArcane",
  stasis: "skillArcane",
  memory: "skillVoid",
  void: "skillVoid",
  tide: "skillVoid",
  forge: "skillIron",
  metal: "skillIron",
  cannon: "attackHit",
  command: "buff",
  prophecy: "skillVoid",
  coin: "manaGain",
  skill: "skill",
};

const HIGH_IMPACT_SKILL_SETS = new Set(["revive", "shield", "guard", "crown", "growth", "prophecy", "stasis", "discover"]);

function getRarityTier(rarity: "R" | "SR" | "SSR" | "UR", hasHighImpactSkill: boolean): SfxTier {
  if (rarity === "UR") return "major";
  if (rarity === "SSR") return "major";
  return hasHighImpactSkill ? "major" : "combat";
}

function resolveSkillSetSound(cardId: string, fallbackType: CardType): SfxName | null {
  const card = CARD_MAP[cardId];
  if (!card) return null;
  const soundSet = getSkillPresentation(card.skill.effect).soundSet;
  if (soundSet in SKILL_SET_TO_SFX) return SKILL_SET_TO_SFX[soundSet];
  const tone = CARD_PRESENTATION[cardId]?.soundMark ?? FACTION_TONE[fallbackType];
  return SOUND_TONE_TO_SFX[tone];
}

export function getSkillSound(cardId: string, fallbackType: CardType): CardSound {
  const presentation = CARD_PRESENTATION[cardId];
  const rarity = presentation?.rarityBudget ?? "R";
  const card = CARD_MAP[cardId];
  const soundSet = card ? getSkillPresentation(card.skill.effect).soundSet : "skill";
  const sfx = resolveSkillSetSound(cardId, fallbackType) ?? "skill";
  const tier = getRarityTier(rarity, HIGH_IMPACT_SKILL_SETS.has(soundSet));
  if (rarity === "UR") return { sfx, tail: "rareReveal", tier };
  return { sfx, tier };
}

export function getSoundTone(cardId: string, fallbackType: CardType): SoundTone {
  return CARD_PRESENTATION[cardId]?.soundMark ?? FACTION_TONE[fallbackType];
}
