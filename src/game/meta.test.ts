import { beforeAll, describe, expect, it } from "vitest";
import { craftCard, DEFAULT_META, DEFAULT_DECK, disenchantCard, DUST_TABLE, isCampaignUnlocked, loadMeta, MAX_CARD_COPIES, openPack, PACK_COST, PACK_SIZE, recordCampaignWin } from "./meta";
import { CARD_POOL } from "../data/cards";

function createStore() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  } as Storage;
}

beforeAll(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createStore();
});

describe("卡包开包", () => {
  it("扣除星辉并返回 5 张卡，新卡进入收藏", () => {
    const meta = { ...DEFAULT_META, starDust: 1000, collection: {} };
    const beforeDust = meta.arcaneDust;
    const { meta: next, results } = openPack(meta);
    expect(next.starDust).toBe(1000 - PACK_COST);
    expect(results).toHaveLength(1);
    expect(results[0].cards).toHaveLength(PACK_SIZE);
    for (const card of results[0].cards) {
      expect(CARD_POOL.some((entry) => entry.id === card.defId)).toBe(true);
      if (card.isNew) {
        expect(next.collection[card.defId]).toBe(1);
      } else {
        expect(next.arcaneDust).toBeGreaterThan(beforeDust);
      }
    }
  });

  it("保底位必为 SR 及以上稀有度", () => {
    const meta = { ...DEFAULT_META, starDust: PACK_COST * 100, collection: {} };
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const { results } = openPack(meta, 1);
      meta.starDust -= PACK_COST;
      const guaranteed = results[0].cards[PACK_SIZE - 1];
      expect(["SR", "SSR", "UR"]).toContain(guaranteed.rarity);
    }
  });

  it("星辉不足时拒绝开包", () => {
    const meta = { ...DEFAULT_META, starDust: PACK_COST - 1 };
    const { results } = openPack(meta);
    expect(results).toHaveLength(0);
    expect(meta.starDust).toBe(PACK_COST - 1);
  });

  it("溢出卡（已满 2 张）自动折算为尘晶", () => {
    const meta = { ...DEFAULT_META, starDust: PACK_COST, collection: {}, arcaneDust: 0 };
    const fullCollection: Record<string, number> = {};
    for (const card of CARD_POOL) fullCollection[card.id] = MAX_CARD_COPIES;
    const metaFull: typeof meta = { ...meta, collection: fullCollection };
    const { meta: next, results } = openPack(metaFull);
    expect(results[0].totalDust).toBeGreaterThanOrEqual(DUST_TABLE.R.disenchant);
    expect(next.arcaneDust).toBe(results[0].totalDust);
  });
});

describe("分解与合成", () => {
  it("分解扣减收藏并返还尘晶", () => {
    const meta = { ...DEFAULT_META, collection: { "dawn-scout": 2 }, arcaneDust: 0 };
    const next = disenchantCard(meta, "dawn-scout");
    expect(next.collection["dawn-scout"]).toBe(1);
    expect(next.arcaneDust).toBe(DUST_TABLE.R.disenchant);
  });

  it("未拥有的卡不可分解", () => {
    const meta = { ...DEFAULT_META, collection: {} };
    const next = disenchantCard(meta, "dawn-scout");
    expect(next.collection["dawn-scout"] ?? 0).toBe(0);
    expect(next.arcaneDust).toBe(meta.arcaneDust);
  });

  it("合成消耗尘晶并加卡，满 2 张后拒绝", () => {
    const meta = { ...DEFAULT_META, collection: { "dawn-scout": 1 }, arcaneDust: 500 };
    const next = craftCard(meta, "dawn-scout");
    expect(next.collection["dawn-scout"]).toBe(2);
    expect(next.arcaneDust).toBe(500 - DUST_TABLE.R.craft);
    const again = craftCard(next, "dawn-scout");
    expect(again.collection["dawn-scout"]).toBe(2);
  });

  it("尘晶不足时拒绝合成", () => {
    const meta = { ...DEFAULT_META, collection: { "astral-queen": 0 }, arcaneDust: 10 };
    const next = craftCard(meta, "astral-queen");
    expect(next.collection["astral-queen"] ?? 0).toBe(0);
    expect(next.arcaneDust).toBe(10);
  });
});

describe("战役进度", () => {
  it("通关记录幂等，解锁按通关数量推进", () => {
    const meta = { ...DEFAULT_META };
    expect(isCampaignUnlocked(meta.campaignCleared, 0)).toBe(true);
    expect(isCampaignUnlocked(meta.campaignCleared, 1)).toBe(false);
    const next = recordCampaignWin(meta, "prologue");
    expect(next.campaignCleared).toEqual(["prologue"]);
    expect(isCampaignUnlocked(next.campaignCleared, 1)).toBe(true);
    const again = recordCampaignWin(next, "prologue");
    expect(again.campaignCleared).toHaveLength(1);
  });
});

describe("存档兼容", () => {
  it("旧存档缺少新字段时回落到默认收藏与尘晶", () => {
    const legacy = JSON.stringify({ starDust: 42, wins: 3 });
    (globalThis as unknown as { localStorage: Storage }).localStorage.setItem("astra-frontline-meta-v1", legacy);
    const meta = loadMeta();
    expect(meta.arcaneDust).toBe(DEFAULT_META.arcaneDust);
    expect(meta.campaignCleared).toEqual([]);
    expect(meta.collection["dawn-scout"]).toBe(2);
    for (const id of DEFAULT_DECK) expect((meta.collection[id] ?? 0)).toBeGreaterThanOrEqual(2);
    expect(meta.starDust).toBe(42);
  });
});
