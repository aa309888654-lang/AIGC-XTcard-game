import { describe, expect, it } from "vitest";
import { aiTurn, attackTarget, attackWithWeapon, cloneBattleState, createBattle, createUnit, endTurn, equipWeapon, getAttackPreview, getHeroPowerState, getSpellPlayOptions, getValidTargets, getValidWeaponTargets, mulliganHand, playCard, playSpell, resolveDiscover, useHeroPower } from "./engine";
import { CARD_MAP, CARD_POOL } from "../data/cards";
import { RULES } from "./rules";
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

function uidOf(board: BattleUnit[]): number[] {
  return board.map((unit) => unit.uid);
}

describe("mulliganHand", () => {
  it("换掉的牌重洗回牌库并等量补抽，保留的牌原样留下", () => {
    const keep = makeUnit("iron-guard", 1);
    const swapOne = makeUnit("void-pickpocket", 2);
    const swapTwo = makeUnit("void-pickpocket", 3);
    const state = makeState({
      player: makeSide({ hand: [keep, swapOne, swapTwo], deck: ["dawn-horn", "dawn-scout", "sunblade", "wall-smith", "mirror-smith"] }),
    });
    mulliganHand(state, "player", [keep.uid]);
    expect(state.player.hand.length).toBe(3);
    expect(state.player.hand[0].uid).toBe(keep.uid);
    expect(state.player.hand[0].defId).toBe("iron-guard");
    expect(state.player.deck.length).toBe(5);
    expect(state.log.some((entry) => entry.includes("重新洗了 2 张"))).toBe(true);
  });

  it("全部保留时原样返回", () => {
    const state = makeState({ player: makeSide({ hand: [makeUnit("iron-guard", 1)] }) });
    const before = structuredClone(state);
    expect(mulliganHand(state, "player", [1])).toBe(state);
    expect(state).toEqual(before);
  });

  it("换牌数超过牌库时按牌库上限补抽", () => {
    const state = makeState({
      player: makeSide({ hand: [makeUnit("iron-guard", 1), makeUnit("void-pickpocket", 2)], deck: ["dawn-horn"] }),
    });
    mulliganHand(state, "player", []);
    expect(state.player.hand.length).toBe(1);
    expect(state.player.deck.length).toBe(2);
  });
});

describe("createBattle", () => {
  it("同一随机种子产生可复现的起手与牌库", () => {
    const deck = Array.from({ length: 30 }, (_, index) => CARD_POOL[index % CARD_POOL.length].id);
    const first = createBattle(deck, deck, 20260804);
    const second = createBattle(deck, deck, 20260804);
    expect(first.player.hand.map((unit) => unit.defId)).toEqual(second.player.hand.map((unit) => unit.defId));
    expect(first.enemy.hand.map((unit) => unit.defId)).toEqual(second.enemy.hand.map((unit) => unit.defId));
    expect(first.player.deck).toEqual(second.player.deck);
    expect(first.enemy.deck).toEqual(second.enemy.deck);
  });
  it("先手 3 张、后手 6 张及一枚星辉令，无先锋减费", () => {
    const deck = ["dawn-scout", "iron-guard", "void-pickpocket", "ember-adept", "wild-bloom", "sunblade", "mirror-smith", "night-conductor"];
    const state = createBattle(deck, deck);
    expect(state.player.hand.length).toBe(3);
    expect(state.enemy.hand.length).toBe(7);
    expect(state.enemy.hand.some((unit) => unit.defId === "astral-coin")).toBe(true);
    expect(state.player.hand.some((unit) => unit.defId === "astral-coin")).toBe(false);
    expect(state.player.mana).toBe(1);
    expect(state.player.maxMana).toBe(1);
    expect(state.player.nextCheaper).toBe(0);
    expect(state.turn).toBe("player");
    expect(state.winner).toBeNull();
  });

  it("阵营由牌组主阵营推断，英雄技能初始未用", () => {
    const dawnDeck = ["dawn-scout", "dawn-horn", "dawn-scout", "dawn-horn", "iron-guard", "iron-guard"];
    const umbralDeck = ["void-pickpocket", "night-tide", "void-pickpocket", "night-tide", "venom-viper", "venom-viper"];
    const state = createBattle(dawnDeck, umbralDeck);
    expect(state.player.faction).toBe("天衡");
    expect(state.enemy.faction).toBe("幽冥");
    expect(state.player.heroPowerUsed).toBe(false);
  });
});

describe("英雄技能", () => {
  it("天衡敕令：消耗 2 费恢复 3 点核心生命，每回合一次", () => {
    const state = makeState({ player: makeSide({ heroHealth: 20, mana: 6 }), enemy: makeSide({ mana: 6 }) });
    const heroPower = getHeroPowerState(state, "player");
    expect(heroPower.ready).toBe(true);
    expect(heroPower.def.name).toBe("天衡敕令");
    useHeroPower(state, "player");
    expect(state.player.heroHealth).toBe(23);
    expect(state.player.mana).toBe(4);
    expect(state.player.heroPowerUsed).toBe(true);
    expect(getHeroPowerState(state, "player").ready).toBe(false);
    const before = structuredClone(state);
    useHeroPower(state, "player");
    expect(state).toEqual(before);
  });

  it("蚀影：对敌方核心造成 2 点伤害", () => {
    const state = makeState({ player: makeSide({ mana: 6, faction: "幽冥" }), enemy: makeSide({ heroHealth: 10 }) });
    useHeroPower(state, "player");
    expect(state.enemy.heroHealth).toBe(8);
  });

  it("观星：摸 1 张牌", () => {
    const state = makeState({ player: makeSide({ mana: 6, faction: "天机", deck: ["dawn-scout"] }) });
    useHeroPower(state, "player");
    expect(state.player.hand.length).toBe(1);
    expect(state.player.deck.length).toBe(0);
  });

  it("铸垒：使目标友军 +0/+2；无合法目标时拒绝", () => {
    const ally = makeUnit("iron-guard", 1);
    const state = makeState({ player: makeSide({ mana: 6, faction: "铁律", board: [ally] }) });
    const before = structuredClone(state);
    useHeroPower(state, "player", { uid: 999 });
    expect(state).toEqual(before);
    useHeroPower(state, "player", { uid: 1 });
    expect(state.player.board[0].health).toBe(6);
    expect(state.player.board[0].maxHealth).toBe(6);
    expect(state.player.board[0].buffHealth).toBe(2);
  });

  it("春霖：治疗受伤友军；未受伤时拒绝", () => {
    const ally = makeUnit("iron-guard", 1);
    ally.health = 2;
    const state = makeState({ player: makeSide({ mana: 6, faction: "山海", board: [ally] }) });
    useHeroPower(state, "player", { uid: 1 });
    expect(state.player.board[0].health).toBe(4);
    state.player.heroPowerUsed = false;
    useHeroPower(state, "player", { uid: 1 });
    expect(state.player.mana).toBe(2);
  });

  it("费用不足时拒绝发动", () => {
    const state = makeState({ player: makeSide({ mana: 1 }) });
    const before = structuredClone(state);
    useHeroPower(state, "player");
    expect(state).toEqual(before);
  });

  it("AI 回合会自动发动英雄技能", () => {
    const state = makeState({
      player: makeSide({ board: [makeUnit("iron-guard", 1)], deck: ["dawn-scout"] }),
      enemy: makeSide({ mana: 5, faction: "幽冥", heroHealth: 30, deck: [] }),
      turn: "enemy", turnNumber: 2,
    });
    aiTurn(state, "skilled");
    expect(state.enemy.heroPowerUsed).toBe(true);
    expect(state.player.heroHealth).toBe(28);
  });
});

describe("沉默", () => {
  it("封尘咒：回退 +2/+2 附加值并移除嘲讽与折光被动", () => {
    const spell = makeUnit("dust-seal", 1);
    const foe = makeUnit("mirror-smith", 2);
    foe.buffAttack = 2;
    foe.buffHealth = 2;
    foe.attack += 2;
    foe.health += 2;
    foe.maxHealth += 2;
    const attacker = makeUnit("iron-colossus", 9);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell], board: [attacker] }), enemy: makeSide({ board: [foe] }) });
    playSpell(state, "player", 0, { uid: 2 });
    expect(state.enemy.board[0].attack).toBe(3);
    expect(state.enemy.board[0].health).toBe(5);
    expect(state.enemy.board[0].maxHealth).toBe(5);
    expect(state.enemy.board[0].flags.silenced).toBe(1);
    const targets = getValidTargets(state, "player", 9);
    expect(targets.hero).toBe(true);
  });

  it("沉默后折光甲胄不再减伤，亡语不再触发", () => {
    const spell = makeUnit("dust-seal", 1);
    const foe = makeUnit("mirror-smith", 2);
    const attacker = makeUnit("iron-colossus", 9);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell], board: [attacker] }), enemy: makeSide({ board: [foe] }) });
    playSpell(state, "player", 0, { uid: 2 });
    attackTarget(state, "player", 9, { hero: false, uid: 2 });
    expect(state.enemy.board.length).toBe(0);
  });
});

describe("剧毒", () => {
  it("蚀髓蛇：伤害被减至 1 仍算造成伤害，直接击杀且不触发反击", () => {
    const attacker = makeUnit("venom-viper", 1);
    const defender = makeUnit("mirror-smith", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [defender] }) });
    attackTarget(state, "player", 1, { hero: false, uid: 2 });
    expect(state.enemy.board.length).toBe(0);
    expect(state.player.board[0].health).toBe(2);
    expect(state.player.board[0].canAttack).toBe(false);
  });

  it("剧毒被完全免疫抵消：静滞力场首次伤害免疫则存活", () => {
    const attacker = makeUnit("venom-viper", 1);
    const defender = makeUnit("iron-colossus", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [defender] }) });
    attackTarget(state, "player", 1, { hero: false, uid: 2 });
    expect(state.enemy.board.length).toBe(1);
    expect(state.enemy.board[0].health).toBe(10);
  });
});

describe("冻结与减攻", () => {
  it("凝滞术：敌方单位下回合无法攻击，再下回合解冻", () => {
    const spell = makeUnit("stasis-seal", 1);
    const foe = makeUnit("iron-guard", 2);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell] }), enemy: makeSide({ board: [foe] }), turnNumber: 1 });
    playSpell(state, "player", 0, { uid: 2 });
    expect(state.enemy.board[0].flags.frozen).toBe(1);
    endTurn(state);
    expect(state.enemy.board[0].canAttack).toBe(false);
    expect(state.enemy.board[0].flags.frozen).toBe(0);
    endTurn(state);
    endTurn(state);
    expect(state.enemy.board[0].canAttack).toBe(true);
  });

  it("锈蚀锁链：攻击力 -2，可被沉默回退", () => {
    const spell = makeUnit("rust-fetter", 1);
    const foe = makeUnit("iron-guard", 2);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell] }), enemy: makeSide({ board: [foe] }) });
    playSpell(state, "player", 0, { uid: 2 });
    expect(state.enemy.board[0].attack).toBe(0);
    expect(state.enemy.board[0].buffAttack).toBe(-2);
    const silence = makeUnit("dust-seal", 9);
    state.player.hand.push(silence);
    playSpell(state, "player", 0, { uid: 2 });
    expect(state.enemy.board[0].attack).toBe(2);
    expect(state.enemy.board[0].buffAttack).toBe(0);
  });
});

describe("playCard", () => {
  it("法力不足时拒绝出牌并保持原状态", () => {
    const unit = makeUnit("iron-guard", 1);
    const state = makeState({ player: makeSide({ mana: 1, hand: [unit] }) });
    const before = structuredClone(state);
    expect(playCard(state, "player", 0)).toBe(state);
    expect(state).toEqual(before);
  });

  it("成功部署：扣费、上板、移出手牌、清空减费", () => {
    const unit = makeUnit("iron-guard", 1);
    const state = makeState({ player: makeSide({ mana: 5, hand: [unit], nextCheaper: 1, board: [] }) });
    playCard(state, "player", 0);
    expect(state.player.mana).toBe(4);
    expect(state.player.board.length).toBe(1);
    expect(state.player.hand.length).toBe(0);
    expect(state.player.nextCheaper).toBe(0);
    expect(state.player.board[0].summoned).toBe(true);
  });

  it("急速单位登场即可攻击，普通单位不可", () => {
    const quick = makeUnit("void-pickpocket", 1);
    const normal = makeUnit("dawn-scout", 2);
    const state = makeState({ player: makeSide({ mana: 5, hand: [quick, normal] }) });
    playCard(state, "player", 0);
    expect(state.player.board[0].canAttack).toBe(true);
    playCard(state, "player", 0);
    expect(state.player.board[1].canAttack).toBe(false);
  });

  it("战场满 6 格时拒绝部署", () => {
    const filler = Array.from({ length: RULES.MAX_BOARD }, (_, index) => makeUnit("dawn-scout", index + 1));
    const unit = makeUnit("iron-guard", 99);
    const state = makeState({ player: makeSide({ mana: 5, board: filler, hand: [unit] }) });
    const before = structuredClone(state);
    expect(playCard(state, "player", 0)).toBe(state);
    expect(state).toEqual(before);
  });

  it("手牌已满 10 张时摸牌焚毁，牌库不消耗", () => {
    const fullHand = Array.from({ length: RULES.MAX_HAND }, (_, index) => makeUnit("dawn-scout", index + 1, false));
    const state = makeState({
      player: makeSide({ deck: [] }),
      enemy: makeSide({ hand: fullHand, deck: ["dawn-horn"], mana: 1 }),
      turn: "player", turnNumber: 2,
    });
    endTurn(state);
    expect(state.enemy.hand.length).toBe(RULES.MAX_HAND);
    expect(state.enemy.deck.length).toBe(1);
    expect(state.log.some((entry) => entry.includes("手牌已满"))).toBe(true);
  });
});

describe("疲劳", () => {
  it("牌库见底后抽牌转为递增疲劳伤害", () => {
    const state = makeState({
      player: makeSide({ deck: [] }),
      enemy: makeSide({ deck: [] }),
      turn: "enemy", turnNumber: 2,
    });
    endTurn(state);
    expect(state.player.heroHealth).toBe(29);
    expect(state.player.fatigue).toBe(1);
    endTurn(state);
    expect(state.enemy.heroHealth).toBe(29);
    expect(state.enemy.fatigue).toBe(1);
    endTurn(state);
    expect(state.player.heroHealth).toBe(27);
    expect(state.player.fatigue).toBe(2);
    expect(state.log.some((entry) => entry.includes("疲劳"))).toBe(true);
  });
});

describe("连携", () => {
  it("天衡接天机触发呼应：额外摸 1 张", () => {
    const first = makeUnit("dawn-horn", 1);
    const second = makeUnit("rune-seeker", 2);
    const state = makeState({ player: makeSide({ mana: 10, hand: [first, second], deck: ["spark-star"] }) });
    playCard(state, "player", 0);
    expect(state.player.comboCount).toBe(0);
    playCard(state, "player", 0);
    expect(state.player.comboCount).toBe(1);
    expect(state.player.hand.length).toBe(1);
    expect(state.log.some((entry) => entry.includes("天衡与天机相映"))).toBe(true);
  });

  it("同类阵营衔接不触发，异类三连只触发一次呼应", () => {
    const state = makeState({
      player: makeSide({ mana: 10, hand: [makeUnit("dawn-horn", 1), makeUnit("dawn-scout", 2), makeUnit("aether-weaver", 3)], deck: ["spark-star", "spark-star"] }),
    });
    playCard(state, "player", 0);
    playCard(state, "player", 0);
    expect(state.player.comboCount).toBe(0);
    playCard(state, "player", 0);
    expect(state.player.comboCount).toBe(1);
    expect(state.player.hand.length).toBe(2);
  });
});

describe("attackTarget", () => {
  it("普通交锋：双方互换伤害，本回合攻击资格消耗", () => {
    const attacker = makeUnit("iron-guard", 1);
    const defender = makeUnit("wall-smith", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [defender] }) });
    attackTarget(state, "player", 1, { hero: false, uid: 2 });
    expect(state.enemy.board[0].health).toBe(2);
    expect(state.player.board[0].health).toBe(3);
    expect(state.player.board[0].canAttack).toBe(false);
  });

  it("击杀后单位离场", () => {
    const attacker = makeUnit("void-pickpocket", 1);
    const defender = makeUnit("dawn-scout", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [defender] }) });
    attackTarget(state, "player", 1, { hero: false, uid: 2 });
    expect(state.enemy.board.length).toBe(0);
  });

  it("守卫拦截：只能攻击嘲讽单位，核心不可选", () => {
    const attacker = makeUnit("void-pickpocket", 1);
    const guard = makeUnit("iron-guard", 2);
    const squishy = makeUnit("dawn-scout", 3);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [guard, squishy] }) });
    const targets = getValidTargets(state, "player", 1);
    expect(targets.hero).toBe(false);
    expect(targets.units).toEqual([2]);
    const before = structuredClone(state);
    expect(attackTarget(state, "player", 1, { hero: true })).toBe(state);
    expect(state).toEqual(before);
  });

  it("破晓一剑无视守卫直击核心", () => {
    const attacker = makeUnit("sunblade", 1);
    const guard = makeUnit("iron-guard", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [guard], heroHealth: 5 }) });
    const targets = getValidTargets(state, "player", 1);
    expect(targets.hero).toBe(true);
    attackTarget(state, "player", 1, { hero: true });
    expect(state.enemy.heroHealth).toBe(2);
  });

  it("核心血量归零判定胜负", () => {
    const attacker = makeUnit("sunblade", 1);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ heroHealth: 2 }) });
    attackTarget(state, "player", 1, { hero: true });
    expect(state.winner).toBe("player");
  });

  it("折光装甲：首次受到的伤害至多为 1", () => {
    const attacker = makeUnit("iron-colossus", 1);
    const defender = makeUnit("mirror-smith", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [defender] }) });
    const preview = getAttackPreview(state, "player", 1, { hero: false, uid: 2 });
    expect(preview?.damage).toBe(1);
    attackTarget(state, "player", 1, { hero: false, uid: 2 });
    expect(state.enemy.board[0].health).toBe(4);
  });

  it("永夜归来：首次死亡以 3 点生命复活", () => {
    const attacker = makeUnit("iron-colossus", 1);
    const emperor = makeUnit("void-emperor", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [emperor] }) });
    attackTarget(state, "player", 1, { hero: false, uid: 2 });
    expect(state.enemy.board.length).toBe(1);
    expect(state.enemy.board[0].health).toBe(3);
  });
});

describe("playSpell", () => {
  it("蚀影箭对敌方单位造成 3 点伤害", () => {
    const spell = makeUnit("shadow-bolt", 1);
    const victim = makeUnit("iron-guard", 2);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell] }), enemy: makeSide({ board: [victim] }) });
    playSpell(state, "player", 0, { uid: 2 });
    expect(state.enemy.board[0].health).toBe(1);
    expect(state.player.hand.length).toBe(0);
  });

  it("无合法目标时法术安全放回，状态不变", () => {
    const spell = makeUnit("shadow-bolt", 1);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell] }), enemy: makeSide({ board: [] }) });
    const before = structuredClone(state);
    expect(playSpell(state, "player", 0, { uid: 999 })).toBe(state);
    expect(state).toEqual(before);
  });

  it("地脉根须治疗友方受伤单位", () => {
    const spell = makeUnit("earth-roots", 1);
    const wounded = makeUnit("iron-guard", 2);
    wounded.health = 2;
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell], board: [wounded] }) });
    playSpell(state, "player", 0, { uid: 2 });
    expect(state.player.board[0].health).toBe(4);
  });

  it("getSpellPlayOptions 反映费用与目标模式", () => {
    const spell = makeUnit("spark-star", 1);
    const victim = makeUnit("iron-guard", 2);
    const state = makeState({ player: makeSide({ mana: 1, hand: [spell] }), enemy: makeSide({ board: [victim] }) });
    const options = getSpellPlayOptions(state, "player", 0);
    expect(options.playable).toBe(true);
    expect(options.cost).toBe(1);
    expect(options.needsTarget).toBe(true);
    expect(options.enemyUnits).toEqual([2]);

    state.player.mana = 0;
    expect(getSpellPlayOptions(state, "player", 0).playable).toBe(false);
  });

  it("无目标法术（晨曦抚伤）直接施放并治疗核心", () => {
    const spell = makeUnit("radiance-bless", 1);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell], heroHealth: 20 }), enemy: makeSide({ heroHealth: 30 }) });
    const options = getSpellPlayOptions(state, "player", 0);
    expect(options.needsTarget).toBe(false);
    playSpell(state, "player", 0);
    expect(state.player.heroHealth).toBe(24);
  });

  it("星辉令：0 费打出，本回合法力 +1 且可超出上限", () => {
    const coin = makeUnit("astral-coin", 1);
    const state = makeState({ player: makeSide({ mana: 2, maxMana: 2, hand: [coin] }) });
    const options = getSpellPlayOptions(state, "player", 0);
    expect(options.playable).toBe(true);
    expect(options.cost).toBe(0);
    playSpell(state, "player", 0);
    expect(state.player.mana).toBe(3);
    expect(state.player.hand.length).toBe(0);
    expect(state.player.maxMana).toBe(2);
  });

  it("星辉令的法力加成在回合切换后重置", () => {
    const coin = makeUnit("astral-coin", 1);
    const state = makeState({ player: makeSide({ mana: 1, maxMana: 1, hand: [coin] }), enemy: makeSide({ mana: 1, maxMana: 1 }) });
    playSpell(state, "player", 0);
    expect(state.player.mana).toBe(2);
    endTurn(state);
    endTurn(state);
    expect(state.player.mana).toBe(state.player.maxMana);
    expect(state.player.mana).toBe(2);
  });
});

describe("发现", () => {
  it("天象启示：扣费移出手牌并挂起候选，选择后加入手牌", () => {
    const spell = makeUnit("astral-insight", 1);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell] }) });
    playSpell(state, "player", 0);
    expect(state.player.mana).toBe(3);
    expect(state.player.hand.length).toBe(0);
    expect(state.pendingChoice).not.toBeNull();
    const options = state.pendingChoice!.options;
    expect(options.length).toBe(3);
    expect(options.every((defId) => ["天衡", "天机"].includes(CARD_MAP[defId].type))).toBe(true);
    resolveDiscover(state, options[0]);
    expect(state.pendingChoice).toBeNull();
    expect(state.player.hand.length).toBe(1);
    expect(state.player.hand[0].defId).toBe(options[0]);
  });

  it("候选外的选择被拒绝，选择未决时出牌与结束回合均被阻止", () => {
    const spell = makeUnit("echo-shard", 1);
    const state = makeState({ player: makeSide({ mana: 5, hand: [spell, makeUnit("dawn-scout", 2)] }) });
    playSpell(state, "player", 0);
    const before = structuredClone(state);
    resolveDiscover(state, "dawn-scout");
    expect(state).toEqual(before);
    playCard(state, "player", 0);
    expect(state).toEqual(before);
    endTurn(state);
    expect(state).toEqual(before);
    resolveDiscover(state, state.pendingChoice!.options[0]);
    expect(state.pendingChoice).toBeNull();
  });

  it("AI 回合施放回声残片会自动择优选牌", () => {
    const state = makeState({
      player: makeSide({ board: [makeUnit("iron-guard", 1)], deck: [] }),
      enemy: makeSide({ mana: 5, hand: [makeUnit("echo-shard", 2)], deck: [] }),
      turn: "enemy", turnNumber: 2,
    });
    aiTurn(state, "expert");
    expect(state.pendingChoice).toBeNull();
    expect(state.enemy.hand.some((unit) => unit.defId === state.enemy.hand[state.enemy.hand.length - 1].defId)).toBe(true);
    expect(state.enemy.hand.length).toBe(1);
    const picked = state.enemy.hand[0];
    expect(["幽冥", "山海"].includes(CARD_MAP[picked.defId].type)).toBe(true);
  });
});

describe("aiTurn", () => {
  it("敌方回合完整执行：回到我方、回合数前进、状态合法", () => {
    const state = makeState({
      player: makeSide({ board: [makeUnit("iron-guard", 1)], deck: ["dawn-scout"] }),
      enemy: makeSide({ mana: 5, hand: [makeUnit("void-pickpocket", 2)], deck: ["dawn-horn"], board: [] }),
      turn: "enemy", turnNumber: 2,
    });
    const logBefore = state.log.length;
    aiTurn(state, "skilled");
    expect(state.turn).toBe("player");
    expect(state.turnNumber).toBe(3);
    expect(state.winner).toBeNull();
    expect(state.log.length).toBeGreaterThan(logBefore);
    expect(state.player.maxMana).toBe(3);
  });

  it("胜负已分时 AI 不行动", () => {
    const state = makeState({ winner: "player", turn: "enemy" });
    const before = structuredClone(state);
    expect(aiTurn(state, "expert")).toBe(state);
    expect(state).toEqual(before);
  });
});

describe("随机衍生物", () => {
  it("古卵死亡时随机召唤一个衍生物", () => {
    const egg = makeUnit("ancient-egg", 1);
    const attacker = makeUnit("iron-colossus", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [egg] }) });
    attackTarget(state, "player", 2, { hero: false, uid: 1 });
    expect(state.enemy.board.length).toBe(1);
    const tokenId = state.enemy.board[0].defId;
    expect(["wind-wisp", "stone-golem", "sprout"]).toContain(tokenId);
    expect(state.enemy.board[0].summoned).toBe(true);
  });

  it("满编战场亡语补位：蛋亡后衍生物占据空位", () => {
    const egg = makeUnit("ancient-egg", 1);
    const attacker = makeUnit("iron-colossus", 2);
    const fullBoard = Array.from({ length: RULES.MAX_BOARD }, (_, index) => makeUnit("dawn-scout", index + 10));
    fullBoard[0] = egg;
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: fullBoard }) });
    attackTarget(state, "player", 2, { hero: false, uid: 1 });
    expect(state.enemy.board.length).toBe(RULES.MAX_BOARD);
    expect(state.enemy.board.some((unit) => unit.defId === "ancient-egg")).toBe(false);
    expect(["wind-wisp", "stone-golem", "sprout"]).toContain(state.enemy.board[state.enemy.board.length - 1].defId);
  });
});

describe("武器牌", () => {
  it("打出武器装备到英雄，扣费并移除手牌", () => {
    const state = makeState({ player: makeSide({ hand: [makeUnit("star-blade", 5)], mana: 5 }) });
    const blade = state.player.hand[0];
    equipWeapon(state, "player", 0);
    expect(state.player.mana).toBe(3);
    expect(state.player.hand).toHaveLength(0);
    expect(state.player.weapon).toMatchObject({ defId: "star-blade", attack: 2, durability: 2, maxDurability: 2 });
    expect(blade.defKind).toBe("weapon");
  });

  it("替换旧武器，英雄本回合至多攻击一次", () => {
    const state = makeState({ player: makeSide({ hand: [makeUnit("star-blade", 5), makeUnit("iron-anvil", 6)], mana: 8 }), enemy: makeSide({ board: [makeUnit("dawn-scout", 1)] }) });
    equipWeapon(state, "player", 0);
    equipWeapon(state, "player", 0);
    expect(state.player.weapon?.defId).toBe("iron-anvil");
    expect(state.player.weapon?.attack).toBe(3);
    attackWithWeapon(state, "player", { hero: false, uid: 1 });
    expect(state.enemy.board).toHaveLength(0);
    expect(state.player.weapon?.durability).toBe(1);
    expect(state.player.heroAttacked).toBe(true);
    const heroBefore = state.enemy.heroHealth;
    const enemyUid = makeUnit("dawn-scout", 2).uid;
    state.enemy.board.push(makeUnit("dawn-scout", 2));
    attackWithWeapon(state, "player", { hero: false, uid: 2 });
    expect(state.enemy.heroHealth).toBe(heroBefore);
    expect(state.player.weapon?.durability).toBe(1);
  });

  it("武器攻击核心并消耗耐久；耐久耗尽折断", () => {
    const state = makeState({ player: makeSide({ hand: [makeUnit("iron-anvil", 5)], mana: 6 }), enemy: makeSide() });
    equipWeapon(state, "player", 0);
    expect(state.enemy.heroHealth).toBe(30);
    attackWithWeapon(state, "player", { hero: true });
    expect(state.enemy.heroHealth).toBe(27);
    expect(state.player.weapon?.durability).toBe(1);
    endTurn(state);
    endTurn(state);
    expect(state.player.heroAttacked).toBe(false);
    attackWithWeapon(state, "player", { hero: true });
    expect(state.enemy.heroHealth).toBe(24);
    expect(state.player.weapon).toBeNull();
  });

  it("敌方单位还击英雄；嘲讽拦截武器攻击", () => {
    const state = makeState({ player: makeSide({ hand: [makeUnit("star-blade", 5)], mana: 4 }), enemy: makeSide({ board: [makeUnit("iron-guard", 1), makeUnit("dawn-scout", 2)] }) });
    equipWeapon(state, "player", 0);
    const valid = getValidWeaponTargets(state, "player");
    expect(valid.hero).toBe(false);
    expect(valid.units).toEqual([1]);
    attackWithWeapon(state, "player", { hero: false, uid: 1 });
    expect(state.player.heroHealth).toBe(28);
    expect(state.player.weapon?.durability).toBe(1);
  });

  it("AI 会自动装备武器并挥向目标", () => {
    const state = makeState({ player: makeSide(), turn: "enemy" });
    state.enemy.hand.push(makeUnit("star-blade", 101));
    state.enemy.mana = 6;
    aiTurn(state);
    expect(state.enemy.weapon).not.toBeNull();
    expect(state.enemy.heroAttacked).toBe(true);
    expect(state.player.heroHealth).toBeLessThan(30);
  });
});

describe("奥秘牌（事件响应）", () => {
  it("打出奥秘挂起到英雄区，扣费并移除手牌；槽位满 3 后替换最旧的", () => {
    const state = makeState({ player: makeSide({ hand: [makeUnit("mirror-guard", 5), makeUnit("spell-eater", 6), makeUnit("spike-field", 7), makeUnit("mirror-guard", 8)], mana: 10 }) });
    playSpell(state, "player", 0);
    playSpell(state, "player", 0);
    playSpell(state, "player", 0);
    expect(state.player.secrets).toEqual(["mirror-guard", "spell-eater", "spike-field"]);
    expect(state.player.mana).toBe(4);
    playSpell(state, "player", 0);
    expect(state.player.secrets).toHaveLength(3);
    expect(state.player.secrets[2]).toBe("mirror-guard");
    expect(state.player.secrets.includes("spell-eater")).toBe(true);
  });

  it("敌方单位攻击我方核心触发回光返照回血；攻击单位不触发", () => {
    const state = makeState({ player: makeSide({ secrets: ["mirror-guard"], board: [makeUnit("dawn-scout", 3)] }), enemy: makeSide({ board: [makeUnit("dawn-scout", 1)] }), turn: "enemy" });
    state.player.heroHealth = 20;
    attackTarget(state, "enemy", 1, { hero: true });
    expect(state.player.heroHealth).toBe(22);
    expect(state.player.secrets).toHaveLength(0);
    state.player.secrets.push("mirror-guard");
    state.player.heroHealth = 20;
    const foe = makeUnit("iron-guard", 2);
    state.enemy.board.push(foe);
    attackTarget(state, "enemy", 2, { hero: false, uid: 3 });
    expect(state.player.secrets).toEqual(["mirror-guard"]);
  });

  it("敌方施法触发噬术咒摸牌；敌方召唤触发铁蒺藜反伤", () => {
    const state = makeState({ player: makeSide({ secrets: ["spell-eater", "spike-field"], board: [makeUnit("dawn-scout", 1)] }), enemy: makeSide({ hand: [makeUnit("spark-star", 9)], mana: 5 }), turn: "enemy" });
    state.player.deck = ["dawn-scout", "dawn-horn"];
    const beforeHand = state.player.hand.length;
    playSpell(state, "enemy", 0, { uid: 1 });
    expect(state.player.hand.length).toBe(beforeHand + 1);
    expect(state.player.secrets).toEqual(["spike-field"]);
    state.enemy.hand.push(makeUnit("dawn-scout", 10));
    playCard(state, "enemy", state.enemy.hand.length - 1);
    expect(state.enemy.board.some((unit) => unit.defId === "dawn-scout")).toBe(false);
    expect(state.player.secrets).toHaveLength(0);
  });

  it("AI 自动挂奥秘，且玩家动作会触发敌方奥秘", () => {
    const state = makeState({ player: makeSide(), turn: "enemy" });
    state.enemy.hand.push(makeUnit("spike-field", 101));
    state.enemy.mana = 6;
    aiTurn(state);
    expect(state.enemy.secrets).toContain("spike-field");
    state.turn = "player";
    state.player.mana = 10;
    state.player.hand.push(makeUnit("dawn-scout", 1));
    playCard(state, "player", 0);
    expect(state.enemy.secrets).toHaveLength(0);
    expect(state.player.board.some((unit) => unit.defId === "dawn-scout")).toBe(false);
  });
});

describe("预演与目标", () => {
  it("getAttackPreview 计算斩杀与反击", () => {
    const attacker = makeUnit("sunblade", 1);
    const defender = makeUnit("wall-smith", 2);
    const state = makeState({ player: makeSide({ board: [attacker] }), enemy: makeSide({ board: [defender] }) });
    const preview = getAttackPreview(state, "player", 1, { hero: false, uid: 2 });
    expect(preview?.damage).toBe(3);
    expect(preview?.targetAfter).toBe(1);
    expect(preview?.attackerAfter).toBe(2);
  });

  it("createUnit 派生牌库单位数据", () => {
    const unit = createUnit("dawn-scout", 7);
    expect(unit.name).toBe("破晓斥候");
    expect(unit.cost).toBe(1);
    expect(unit.maxHealth).toBe(2);
    expect(unit.defKind).toBe("unit");
  });
});

describe("cloneBattleState", () => {
  it("深拷可变容器：修改克隆不影响原状态（与 structuredClone 语义等价）", () => {
    const deckA = CARD_POOL.slice(0, 15).map((card) => card.id);
    const deckB = CARD_POOL.slice(15, 30).map((card) => card.id);
    const state = createBattle(deckA, deckB, 42);
    state.mulligan.player = true;
    state.player.hand[0].flags.wardUsed = 1;
    state.player.secrets.push("mirror-hex");
    state.pendingChoice = { kind: "discover", side: "player", options: ["a", "b"] };
    const logBefore = [...state.log];
    const fxBefore = [...state.fx];
    const draft = cloneBattleState(state);
    draft.player.hand[0].flags.wardUsed = 0;
    draft.player.hand[0].attack = 99;
    draft.player.board.push(makeUnit("dawn-scout", 999));
    draft.player.secrets.push("dust-seal");
    draft.player.deck.pop();
    draft.player.triggeredCombos.push("combo-x");
    draft.log.push("hello");
    draft.fx.push({ id: 1, type: "attack", side: "player" });
    draft.mulligan.player = false;
    draft.pendingChoice!.options.push("c");
    expect(state.player.hand[0].flags.wardUsed).toBe(1);
    expect(state.player.hand[0].attack).not.toBe(99);
    expect(state.player.board.find((unit) => unit.uid === 999)).toBeUndefined();
    expect(state.player.secrets).toEqual(["mirror-hex"]);
    expect(state.player.triggeredCombos).toEqual([]);
    expect(state.log).toEqual(logBefore);
    expect(state.fx).toEqual(fxBefore);
    expect(state.mulligan.player).toBe(true);
    expect(state.pendingChoice?.options).toEqual(["a", "b"]);
  });

  it("AI 前瞻搜索在克隆上运行后，原状态保持不变", () => {
    const deckA = CARD_POOL.slice(0, 15).map((card) => card.id);
    const deckB = CARD_POOL.slice(15, 30).map((card) => card.id);
    const state = createBattle(deckA, deckB, 7);
    state.turn = "enemy";
    const before = JSON.stringify(state);
    const draft = cloneBattleState(state);
    draft.enemy.mana = 10;
    aiTurn(draft, "master");
    expect(JSON.stringify(state)).toBe(before);
  });
});
