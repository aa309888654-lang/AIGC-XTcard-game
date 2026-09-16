// ── 商城外观道具 · 统一定义与读取 ──────────────────────
// 商城（ShopView）写入 ownedShopItems，这里负责把已拥有外观真正「展示」出来：
// 顶栏名牌（称号/星环）、指挥官档案（外观陈列）、本地排行榜行（称号）。

export interface CosmeticDef {
  id: string;
  /** 展示用名称（称号类为称号文本）。 */
  label: string;
  icon: string;
  desc: string;
}

export const COSMETIC_ITEMS: CosmeticDef[] = [
  { id: "celestial-title", label: "承星者", icon: "☀", desc: "日冕称号 · 展示在名牌、档案与本地排行榜。" },
  { id: "astral-frame", label: "星环名牌", icon: "✦", desc: "指挥官名牌动态星环。" },
  { id: "moonless-avatar", label: "无月头像框", icon: "☾", desc: "幽冥配色头像框。" },
  { id: "dusk-banner", label: "幽冥军旗", icon: "⚑", desc: "大厅连队旗帜纹章。" },
  { id: "lantern-banner", label: "万灯旌旗", icon: "☼", desc: "大厅点灯旌旗。" },
  { id: "tome-skin", label: "典籍书皮", icon: "▣", desc: "整备库卡组界面皮面。" },
];

export function ownedCosmetics(ownedShopItems: string[]): CosmeticDef[] {
  const owned = new Set(ownedShopItems);
  return COSMETIC_ITEMS.filter((item) => owned.has(item.id));
}

/** 当前激活的称号文本（未拥有「日冕称号」则为 null）。 */
export function activeTitle(ownedShopItems: string[]): string | null {
  return ownedShopItems.includes("celestial-title") ? "承星者" : null;
}

export function hasCosmetic(ownedShopItems: string[], id: string): boolean {
  return ownedShopItems.includes(id);
}
