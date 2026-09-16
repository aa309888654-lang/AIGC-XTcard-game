import type { FxEvent } from "../types";

export const GENERATED_ASSETS = {
  cardInteraction: "/assets/generated-4k/cutouts/card-interaction-effects-atlas-agnes-image-2-1-flash-cutout.png",
  factionCardbacks: "/assets/generated-4k/faction-cardback-atlas-agnes-image-2-1-flash.png",
  deckGraveyard: "/assets/generated-4k/cutouts/deck-graveyard-and-targeting-atlas-agnes-image-2-1-flash-cutout.png",
  battlePanels: "/assets/generated-4k/battle-ui-panel-states-atlas-agnes-image-2-1-flash.png",
  statusIcons: "/assets/generated-4k/non-card/cutouts/status-effects-expansion-atlas-agnes-image-2-1-flash-cutout.png",
  combatUi: "/assets/generated-4k/non-card/cutouts/combat-ui-icons-exact-atlas-agnes-image-2-1-flash-cutout.png",
  skillVfx: "/assets/generated-4k/non-card/cutouts/skill-effects-exact-atlas-agnes-image-2-1-flash-cutout.png",
  summonDerivatives: "/assets/generated-4k/non-card/cutouts/summons-and-temporaries-exact-atlas-agnes-image-2-1-flash-cutout.png",
  coreStates: "/assets/generated-4k/non-card/cutouts/core-critical-animation-frames-agnes-image-2-1-flash-cutout.png",
  coreHit: "/assets/generated-4k/non-card/cutouts/core-hit-animation-frames-agnes-image-2-1-flash-cutout.png",
  coreRecovery: "/assets/generated-4k/non-card/cutouts/core-recovery-animation-frames-agnes-image-2-1-flash-cutout.png",
  coreResult: "/assets/generated-4k/non-card/cutouts/core-victory-collapse-animation-frames-agnes-image-2-1-flash-cutout.png",
  battlefieldForeground: "/assets/generated-4k/battlefield-foreground-atlas-agnes-image-2-1-flash.png",
  battlefieldWidgets: "/assets/generated-4k/non-card/cutouts/battlefield-widgets-exact-atlas-agnes-image-2-1-flash-cutout.png",
  battleTimeline: "/assets/generated-4k/non-card/cutouts/combat-timeline-and-round-icons-atlas-agnes-image-2-1-flash-cutout.png",
  endRewardVfx: "/assets/generated-4k/non-card/cutouts/match-end-and-reward-vfx-atlas-agnes-image-2-1-flash-cutout.png",
  cardback: "/assets/shop/universal-cardback-gpt-image-2.png",
} as const;

export type GeneratedStatus = "taunt" | "barrier" | "immunity" | "freeze" | "silence" | "revive" | "attack" | "damage" | "poison" | "weaken" | "pierce" | "lifesteal" | "shieldBreak" | "tauntLock" | "cannotAttack" | "combo" | "arcane" | "trap";

export function statusFrame(effect: string): { frame: GeneratedStatus; label: string } | null {
  if (["taunt", "last-stand"].includes(effect)) return { frame: "taunt", label: "守卫" };
  if (["ward", "ward-start", "stasis-field"].includes(effect)) return { frame: effect === "stasis-field" ? "immunity" : "barrier", label: effect === "stasis-field" ? "免疫" : "护盾" };
  if (effect === "spell-freeze") return { frame: "freeze", label: "冻结" };
  if (effect === "spell-silence") return { frame: "silence", label: "沉默" };
  if (effect === "revive") return { frame: "revive", label: "复活" };
  if (["battlecry-buff", "spell-buff", "spell-buff-all", "end-buff", "turn-grow"].includes(effect)) return { frame: "attack", label: "增幅" };
  if (["venom", "turn-burn", "death-burst", "death-strike", "end-ping"].includes(effect)) return { frame: "damage", label: "持续伤害" };
  if (["poison", "toxic"].includes(effect)) return { frame: "poison", label: "中毒" };
  if (["weaken", "weakness"].includes(effect)) return { frame: "weaken", label: "虚弱" };
  if (["pierce", "penetrate"].includes(effect)) return { frame: "pierce", label: "穿透" };
  if (["lifesteal", "drain"].includes(effect)) return { frame: "lifesteal", label: "吸血" };
  if (["shield-break", "barrier-break"].includes(effect)) return { frame: "shieldBreak", label: "护盾破裂" };
  if (["taunt-lock", "forced-target"].includes(effect)) return { frame: "tauntLock", label: "嘲讽锁定" };
  if (["cannot-attack", "disarm"].includes(effect)) return { frame: "cannotAttack", label: "不可攻击" };
  if (["combo", "combo-chain"].includes(effect)) return { frame: "combo", label: "连击" };
  if (["arcane", "arcane-surge"].includes(effect)) return { frame: "arcane", label: "秘法" };
  if (["trap", "secret"].includes(effect)) return { frame: "trap", label: "陷阱" };
  return null;
}

export function skillVfxFrame(event: FxEvent): number {
  if (event.type === "win") return 9;
  if (event.type === "summon") return 8;
  if (event.label?.includes("雷") || event.label?.includes("电") || event.label?.includes("奔雷")) return 5;
  if (event.label?.includes("冰") || event.label?.includes("霜")) return 6;
  if (event.label?.includes("箭") || event.label?.includes("远程")) return 2;
  if (event.label?.includes("火") || event.label?.includes("燃烧") || event.type === "damage") return 3;
  if (event.label?.includes("黑洞") || event.label?.includes("虚空")) return 10;
  if (event.label?.includes("治疗") || event.label?.includes("复苏") || event.label?.includes("复活")) return 7;
  if (event.type === "attack") return event.label?.includes("突袭") || event.label?.includes("追击") ? 1 : 0;
  return 4;
}

export function summonFrame(event: FxEvent): number {
  if (event.label?.includes("风灵") || event.label?.includes("回风")) return 1;
  if (event.label?.includes("石俑") || event.label?.includes("构装")) return 2;
  if (event.label?.includes("护盾") || event.label?.includes("装甲")) return 3;
  if (event.label?.includes("黑洞") || event.label?.includes("反噬")) return 4;
  if (event.label?.includes("陷阱") || event.label?.includes("蒺藜")) return 5;
  if (event.label?.includes("图腾")) return 6;
  if (event.label?.includes("结界") || event.label?.includes("法阵")) return 7;
  return 0;
}
