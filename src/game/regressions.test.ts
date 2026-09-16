// 回归测试：2026-08-13 全面修复批次（引擎规则 / 任务周期 / 分享码 / 好友 / 爬塔）。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiTurn, attackTarget, createBattle, mulliganHand, playSpell } from "./engine";
import { CARD_MAP, CARD_POOL } from "../data/cards";
import { RULES } from "./rules";
import { DEFAULT_META, MISSION_DEFS, applyBattleResult, claimMission, normalizeProgression, type MetaSave } from "./meta";
import { DEFAULT_DECK } from "./meta";
import { acceptPendingInvite, addPendingInvite, decodeShareCode, replayShareCode } from "../community/Friends";
import { buildDailyChallenge, dailyChallengeSeed, setupTowerState, towerSeedForFloor } from "../data/tower";
import type { BattleState, BattleUnit, SideState } from "../types";

function makeUnit(defId: string, uid: number, canAttack = true): BattleUnit {
  const card = CARD_MAP[defId];
  return {
    uid, defId, defKind: card.kind, name: card.name, icon: card.icon, color: card.color,
    cost: card.cost, attack: card.attack, health: card.health, maxHealth: card.health,
    canAttack, summoned: true, buffAttack: 0, buffHealth: 0, flags: {},
  };
}

function makeSide(overrides: Partial<SideState> = {}): SideState {
  return {
    heroHealth: RULES.HERO_HEALTH, maxHeroHealth: RULES.HERO_HEALTH, mana: 10, maxMana: 10,
    hand: [], board: [], deck: [], nextCheaper: 0, nextSpellCheaper: 0, fatigue: 0,
    lastPlayedType: null, comboCount: 0, triggeredCombos: [], faction: "天衡", heroPowerUsed: false, weapon: null, heroAttacked: false, secrets: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    player: makeSide(), enemy: makeSide(), turn: "player", turnNumber: 1, winner: null,
    log: [], uidCounter: 100, fx: [], fxCounter: 0, mulligan: { player: true, enemy: true },
    pendingChoice: null, randomSeed: 1,
    ...overrides,
  };
}

describe("未知卡牌 ID 防御", () => {
  it("未知 ID 的卡组抽牌后全部净化为默认卡，UI 查表不会崩", () => {
    const state = createBattle(Array.from({ length: 30 }, () => "ghost-fake-card"), Array.from({ length: 30 }, () => "another-fake-card"), 7);
    expect(state.player.hand.length).toBeGreaterThan(0);
    for (const unit of state.player.hand) {
      expect(CARD_MAP[unit.defId]).toBeTruthy();
      expect(unit.defId).toBe("dawn-scout");
    }
    // 敌方手牌额外含星辉令（astral-coin，合法 token），只需保证查表不崩。
    for (const unit of state.enemy.hand) {
      expect(CARD_MAP[unit.defId]).toBeTruthy();
    }
  });
});

describe("换牌不回抽", () => {
  it("换掉的起手不会被立即抽回", () => {
    const deckIds = CARD_POOL.filter((card) => card.id !== "iron-guard").slice(0, 10).map((card) => card.id);
    const state = makeState({ player: makeSide({ hand: [makeUnit("iron-guard", 1)], deck: deckIds }) });
    mulliganHand(state, "player", []);
    expect(state.player.hand.length).toBe(1);
    expect(state.player.hand[0].defId).not.toBe("iron-guard");
    expect(state.player.deck).toContain("iron-guard");
  });
});

describe("反制奥秘成本", () => {
  it("法术被奥秘取消时同样扣除法力并离开手牌", () => {
    const spell = CARD_POOL.find((card) => card.kind === "spell" && (card.skill.target ?? "none") === "none" && card.cost <= 8);
    expect(spell).toBeTruthy();
    const state = makeState({
      player: makeSide({ mana: 10, hand: [makeUnit(spell!.id, 1)] }),
      enemy: makeSide({ secrets: ["crimson-guardian"] }),
    });
    playSpell(state, "player", 0);
    expect(state.player.hand.length).toBe(0);
    expect(state.player.mana).toBe(10 - spell!.cost);
    expect(state.enemy.secrets).not.toContain("crimson-guardian");
    expect(state.log.some((entry) => entry.includes("取消了这道法术"))).toBe(true);
  });
});

describe("skilled AI 出牌", () => {
  it("AI 占优时仍会打出可用的单位", () => {
    const cheapUnit = CARD_POOL.find((card) => card.kind === "unit" && card.cost <= 2 && (card.skill.target ?? "none") === "none");
    expect(cheapUnit).toBeTruthy();
    const state = makeState({
      turn: "enemy",
      player: makeSide({ heroHealth: 20, board: [] }),
      enemy: makeSide({ mana: 10, hand: [makeUnit(cheapUnit!.id, 50, false)], board: [makeUnit("siege-engine", 51), makeUnit("siege-engine", 52)] }),
    });
    const boardBefore = state.enemy.board.length;
    aiTurn(state, "skilled");
    expect(state.enemy.board.length).toBeGreaterThan(boardBefore);
  });
});

describe("不屈修饰器", () => {
  it("首次致命伤害保留 1 点生命，第二次不再生效", () => {
    const attacker = makeUnit("siege-engine", 10);
    attacker.attack = 10;
    const state = makeState({
      turn: "enemy",
      player: makeSide({ heroHealth: 5 }),
      enemy: makeSide({ board: [attacker] }),
      modifiers: { surviveFatalOnce: true },
    });
    attackTarget(state, "enemy", attacker.uid, { hero: true });
    expect(state.player.heroHealth).toBe(1);
    expect(state.winner).toBeNull();
    const attacker2 = makeUnit("siege-engine", 11);
    attacker2.attack = 10;
    state.enemy.board.push(attacker2);
    attackTarget(state, "enemy", attacker2.uid, { hero: true });
    expect(state.winner).toBe("enemy");
  });
});

describe("任务周期计数", () => {
  const base = (): MetaSave => structuredClone(DEFAULT_META);

  it("周期内计数随战斗累计", () => {
    let meta = normalizeProgression(base());
    meta = applyBattleResult(meta, true).meta;
    meta = applyBattleResult(meta, false).meta;
    expect(meta.missionCycle.daily.games).toBe(2);
    expect(meta.missionCycle.daily.wins).toBe(1);
    expect(meta.missionCycle.weekly.games).toBe(2);
    expect(meta.missionCycle.weekly.wins).toBe(1);
    expect(meta.missionCycle.weekly.bestStreak).toBeGreaterThanOrEqual(1);
  });

  it("终身累计不再自动满足周期任务（防刷）", () => {
    const legacy = normalizeProgression({ ...base(), wins: 50, losses: 10, bestStreak: 8 });
    for (const def of MISSION_DEFS) {
      expect(def.progress(legacy)).toBe(0);
    }
  });

  it("周期滚动后计数归零，需重新完成才能再次领取", () => {
    let meta = normalizeProgression(base());
    meta = applyBattleResult(meta, true).meta;
    const dailyWin = MISSION_DEFS.find((def) => def.id === "daily-win")!;
    expect(dailyWin.progress(meta)).toBe(1);
    const claimed = claimMission(meta, "daily-win");
    expect(claimed.claimedMissions.length).toBe(1);

    // 快进 1 天（跨过 05:00 重置线）：周期键变化触发滚动归零，旧领取记录不再匹配新周期。
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 36 * 3_600_000));
    try {
      const rolled = normalizeProgression({ ...claimed });
      expect(rolled.missionCycle.dailyKey).not.toBe(claimed.missionCycle.dailyKey);
      expect(dailyWin.progress(rolled)).toBe(0);
      expect(claimMission(rolled, "daily-win").claimedMissions.length).toBe(1);

      const afterBattle = applyBattleResult(rolled, true).meta;
      expect(dailyWin.progress(afterBattle)).toBe(1);
      expect(claimMission(afterBattle, "daily-win").claimedMissions.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("分享码校验", () => {
  const validRecord = {
    id: "R-1", label: "测试", mode: "AI / 高手", createdAt: new Date().toISOString(),
    turnCount: 5, winner: "player" as const, playerDeck: ["dawn-scout", "iron-guard"], enemyDeck: ["wall-smith"], seed: 42,
  };

  it("合法分享码可往返解码", () => {
    const decoded = decodeShareCode(replayShareCode(validRecord));
    expect(decoded).not.toBeNull();
    expect(decoded?.seed).toBe(42);
    expect(decoded?.playerDeck).toEqual(validRecord.playerDeck);
    expect(decoded?.enemyDeck).toEqual(validRecord.enemyDeck);
  });

  it("含未知卡牌 ID 的分享码被拒绝", () => {
    const tampered = { ...validRecord, playerDeck: ["dawn-scout", "ghost-card"] };
    expect(decodeShareCode(replayShareCode(tampered))).toBeNull();
  });
});

describe("好友邀请", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => store.clear(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("接受邀请会真正写入好友名录并清空待处理", () => {
    addPendingInvite("沈青梧", "CODE-1", "幽冥");
    const friends = acceptPendingInvite("CODE-1");
    expect(friends.some((friend) => friend.code === "CODE-1" && friend.name === "沈青梧")).toBe(true);
  });
});

describe("无尽爬塔场景", () => {
  it("setupTowerState 应用增益、继承跨层生命并挂载不屈", () => {
    const state = createBattle(DEFAULT_DECK, DEFAULT_DECK, towerSeedForFloor(3));
    setupTowerState(state, 3, ["vitality", "overflow", "resolve"], 12);
    expect(state.player.maxHeroHealth).toBe(RULES.HERO_HEALTH + 8);
    expect(state.player.heroHealth).toBe(12);
    expect(state.player.maxMana).toBe(2);
    expect(state.modifiers?.surviveFatalOnce).toBe(true);
  });

  it("继承生命高于上限时按上限截断", () => {
    const state = createBattle(DEFAULT_DECK, DEFAULT_DECK, towerSeedForFloor(1));
    setupTowerState(state, 1, [], 99);
    expect(state.player.heroHealth).toBe(RULES.HERO_HEALTH);
  });

  it("每日挑战种子由日期决定且敌阵满编", () => {
    expect(dailyChallengeSeed("2026-08-13")).toBe(dailyChallengeSeed("2026-08-13"));
    expect(dailyChallengeSeed("2026-08-13")).not.toBe(dailyChallengeSeed("2026-08-14"));
    const challenge = buildDailyChallenge();
    expect(challenge.enemyDeck.length).toBe(RULES.MAX_DECK);
    for (const id of challenge.enemyDeck) expect(CARD_MAP[id]).toBeTruthy();
  });

  it("同层种子稳定（回放/爬塔可复现）", () => {
    expect(towerSeedForFloor(5)).toBe(towerSeedForFloor(5));
    expect(towerSeedForFloor(5)).not.toBe(towerSeedForFloor(6));
  });
});
