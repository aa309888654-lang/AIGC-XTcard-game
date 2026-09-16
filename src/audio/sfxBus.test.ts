import { describe, expect, it } from "vitest";
import { createSfxGate, DUCK_FACTOR, DUCK_MS, getSfxTier, SFX_TIER, SFX_TIER_CAPS, type SfxTier } from "./sfxBus";

const ALL_SFX_NAMES = [
  "uiSelect", "uiError", "cardDraw", "cardDeploy", "cardReturn", "cardSelect", "targetLock",
  "attackReady", "attackHit", "weaponSwing", "weaponHitMetal", "summonConstruct", "spellCastArcane",
  "spellImpactVoid", "secretArm", "secretTrigger", "discoverOpen", "discoverConfirm", "statusFreeze", "statusSilence",
  "skill", "skillRadiant", "skillVoid", "skillArcane", "skillIron",
  "skillWild", "buff", "heroHit", "turnStart", "turnEnd", "manaGain", "manaSpend", "shield",
  "shieldBreak", "heal", "revive", "unitDeath", "coreCritical", "rareReveal", "reward", "guard",
  "victory", "defeat",
] as const;

describe("sfxBus 分级表", () => {
  it("每个 SfxName 都有分级", () => {
    for (const name of ALL_SFX_NAMES) {
      expect(SFX_TIER[name], name).toBeDefined();
    }
    expect(Object.keys(SFX_TIER)).toHaveLength(ALL_SFX_NAMES.length);
  });

  it("胜负/终局为最高级，免疫/复活/击杀为 major，战斗与 UI 为低两级", () => {
    expect(getSfxTier("victory")).toBe("terminal");
    expect(getSfxTier("defeat")).toBe("terminal");
    expect(getSfxTier("coreCritical")).toBe("major");
    expect(getSfxTier("revive")).toBe("major");
    expect(getSfxTier("shield")).toBe("major");
    expect(getSfxTier("unitDeath")).toBe("major");
    expect(getSfxTier("secretTrigger")).toBe("major");
    expect(getSfxTier("discoverConfirm")).toBe("major");
    expect(getSfxTier("attackHit")).toBe("combat");
    expect(getSfxTier("weaponSwing")).toBe("combat");
    expect(getSfxTier("statusFreeze")).toBe("combat");
    expect(getSfxTier("uiSelect")).toBe("ui");
    expect(getSfxTier("secretArm")).toBe("ui");
  });

  it("duck 参数：级别越高压低越多、时长越长", () => {
    expect(DUCK_FACTOR.terminal).toBeLessThan(DUCK_FACTOR.major);
    expect(DUCK_FACTOR.major).toBeLessThan(1);
    expect(DUCK_FACTOR.ui).toBe(1);
    expect(DUCK_MS.terminal).toBeGreaterThan(DUCK_MS.major);
    expect(DUCK_MS.ui).toBe(0);
  });
});

describe("sfxBus 滑动窗口门控", () => {
  it("同窗口 combat 超过上限（3）后被拦截", () => {
    const gate = createSfxGate();
    const now = 1_000;
    expect(gate.request("attackHit", now)).toBe(true);
    expect(gate.request("attackHit", now)).toBe(true);
    expect(gate.request("attackHit", now)).toBe(true);
    expect(gate.request("attackHit", now)).toBe(false);
  });

  it("ui 上限 2、major 上限 2、terminal 上限 1", () => {
    const gate = createSfxGate();
    const now = 2_000;
    expect(gate.request("uiSelect", now)).toBe(true);
    expect(gate.request("uiSelect", now)).toBe(true);
    expect(gate.request("uiSelect", now)).toBe(false);
    expect(gate.request("coreCritical", now)).toBe(true);
    expect(gate.request("coreCritical", now)).toBe(true);
    expect(gate.request("coreCritical", now)).toBe(false);
    expect(gate.request("victory", now)).toBe(true);
    expect(gate.request("defeat", now)).toBe(false);
  });

  it("低级别打满不阻塞高级别", () => {
    const gate = createSfxGate();
    const now = 3_000;
    for (let i = 0; i < SFX_TIER_CAPS.combat + 2; i += 1) gate.request("attackHit", now);
    for (let i = 0; i < SFX_TIER_CAPS.ui + 2; i += 1) gate.request("uiSelect", now);
    expect(gate.request("unitDeath", now)).toBe(true);
    expect(gate.request("victory", now)).toBe(true);
  });

  it("窗口过期后计数释放", () => {
    const gate = createSfxGate(350);
    const start = 4_000;
    for (let i = 0; i < SFX_TIER_CAPS.combat; i += 1) gate.request("attackHit", start + i * 100);
    expect(gate.request("attackHit", start + 100)).toBe(false);
    expect(gate.request("attackHit", start + 1_000)).toBe(true);
  });

  it("验收场景：同一秒 5 个事件（4 命中 + 1 击杀）→ 最高优先级仍播放", () => {
    const gate = createSfxGate();
    const now = 5_000;
    const hits = [0, 1, 2, 3].map(() => gate.request("attackHit", now)).filter(Boolean).length;
    const death = gate.request("unitDeath", now);
    expect(death).toBe(true);
    expect(hits).toBe(SFX_TIER_CAPS.combat);
    expect(gate.windowCounts(now).combat).toBe(SFX_TIER_CAPS.combat);
  });
});
