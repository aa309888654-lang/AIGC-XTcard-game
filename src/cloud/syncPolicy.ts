import type { MetaSave } from "../game/meta";

export const LOCAL_ONLY_META_FIELDS = ["starDust", "guildMarks", "ownedShopItems", "arcaneDust", "collection", "passTier"] as const;

export type CloudMeta = Omit<MetaSave, (typeof LOCAL_ONLY_META_FIELDS)[number]>;

export function toCloudMeta(meta: MetaSave): CloudMeta {
  const { starDust, guildMarks, ownedShopItems, arcaneDust, collection, passTier, ...cloudMeta } = meta;
  void starDust;
  void guildMarks;
  void ownedShopItems;
  void arcaneDust;
  void collection;
  void passTier;
  return cloudMeta;
}

export function mergeCloudMeta(localMeta: MetaSave, remoteMeta: Partial<MetaSave>): MetaSave {
  return {
    ...localMeta,
    ...remoteMeta,
    starDust: localMeta.starDust,
    guildMarks: localMeta.guildMarks,
    ownedShopItems: localMeta.ownedShopItems,
    arcaneDust: localMeta.arcaneDust,
    collection: localMeta.collection,
    passTier: localMeta.passTier,
  };
}
