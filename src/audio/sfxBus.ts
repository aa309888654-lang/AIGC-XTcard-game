import type { SfxName } from "./AudioProvider";

export type SfxTier = "ui" | "combat" | "major" | "terminal";

const TIER_RANK: Record<SfxTier, number> = { ui: 1, combat: 2, major: 3, terminal: 4 };

export const SFX_TIER: Record<SfxName, SfxTier> = {
  uiSelect: "ui",
  uiError: "ui",
  cardDraw: "ui",
  cardReturn: "ui",
  cardSelect: "ui",
  targetLock: "ui",
  turnStart: "ui",
  turnEnd: "ui",
  manaSpend: "ui",
  reward: "ui",
  manaGain: "combat",
  cardDeploy: "combat",
  attackReady: "combat",
  attackHit: "combat",
  weaponSwing: "combat",
  weaponHitMetal: "combat",
  summonConstruct: "combat",
  spellCastArcane: "combat",
  spellImpactVoid: "combat",
  secretArm: "ui",
  secretTrigger: "major",
  discoverOpen: "ui",
  discoverConfirm: "major",
  statusFreeze: "combat",
  statusSilence: "combat",
  heroHit: "combat",
  buff: "combat",
  heal: "combat",
  skill: "combat",
  skillRadiant: "combat",
  skillVoid: "combat",
  skillArcane: "combat",
  skillIron: "combat",
  skillWild: "combat",
  shield: "major",
  shieldBreak: "major",
  guard: "major",
  revive: "major",
  unitDeath: "major",
  coreCritical: "major",
  rareReveal: "major",
  victory: "terminal",
  defeat: "terminal",
};

export const SFX_TIER_CAPS: Record<SfxTier, number> = { ui: 2, combat: 3, major: 2, terminal: 1 };

export const DUCK_FACTOR: Record<SfxTier, number> = { ui: 1, combat: 1, major: 0.72, terminal: 0.55 };
export const DUCK_MS: Record<SfxTier, number> = { ui: 0, combat: 0, major: 300, terminal: 600 };

export function getSfxTier(name: SfxName): SfxTier {
  return SFX_TIER[name];
}

export function sfxTierRank(tier: SfxTier): number {
  return TIER_RANK[tier];
}

export interface SfxGate {
  request(name: SfxName, now?: number): boolean;
  windowCounts(now?: number): Record<SfxTier, number>;
}

export function createSfxGate(windowMs = 350): SfxGate {
  const recent: Array<{ at: number; tier: SfxTier }> = [];
  const prune = (now: number) => {
    while (recent.length > 0 && now - recent[0].at >= windowMs) recent.shift();
  };
  const count = (now: number) => {
    prune(now);
    const counts: Record<SfxTier, number> = { ui: 0, combat: 0, major: 0, terminal: 0 };
    for (const entry of recent) counts[entry.tier] += 1;
    return counts;
  };
  return {
    windowCounts: count,
    request(name: SfxName, now = performance.now()) {
      const tier = getSfxTier(name);
      const counts = count(now);
      if (counts[tier] >= SFX_TIER_CAPS[tier]) return false;
      recent.push({ at: now, tier });
      return true;
    },
  };
}
