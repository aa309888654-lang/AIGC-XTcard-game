import { describe, expect, it } from "vitest";
import { DEFAULT_META } from "../game/meta";
import { mergeCloudMeta, toCloudMeta } from "./syncPolicy";

describe("cloud sync policy", () => {
  it("does not serialize local-only economy fields", () => {
    const cloud = toCloudMeta({ ...DEFAULT_META, starDust: 9999, collection: { "dawn-scout": 2 } });
    expect(cloud).not.toHaveProperty("starDust");
    expect(cloud).not.toHaveProperty("collection");
    expect(cloud.commander).toEqual(DEFAULT_META.commander);
  });

  it("keeps local economy when applying a remote profile", () => {
    const local = { ...DEFAULT_META, starDust: 777, collection: { "dawn-scout": 2 } };
    const merged = mergeCloudMeta(local, { commanderLevel: 9, starDust: 1, collection: {} });
    expect(merged.commanderLevel).toBe(9);
    expect(merged.starDust).toBe(777);
    expect(merged.collection).toEqual({ "dawn-scout": 2 });
  });
});
