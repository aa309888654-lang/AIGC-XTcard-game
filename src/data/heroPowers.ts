import type { CardType, SpellTargetMode } from "../types";

export interface HeroPowerDef {
  name: string;
  desc: string;
  cost: number;
  effect: string;
  value: number;
  target?: SpellTargetMode;
  icon: string;
}

export const HERO_POWERS: Record<CardType, HeroPowerDef> = {
  天衡: { name: "天衡敕令", desc: "恢复 3 点核心生命。", cost: 2, effect: "hero-power-heal-hero", value: 3, icon: "☲" },
  铁律: { name: "铸垒", desc: "使一个友方单位获得 +0/+2。", cost: 2, effect: "hero-power-buff", value: 2, target: "ally-unit", icon: "☱" },
  幽冥: { name: "幽冥蚀", desc: "对敌方核心造成 2 点伤害。", cost: 2, effect: "hero-power-damage-hero", value: 2, icon: "☷" },
  天机: { name: "观星", desc: "摸 1 张牌。", cost: 2, effect: "hero-power-draw", value: 1, icon: "☴" },
  山海: { name: "春霖", desc: "为一个友方单位恢复 3 点生命。", cost: 2, effect: "hero-power-heal-unit", value: 3, target: "ally-unit", icon: "☳" },
};
