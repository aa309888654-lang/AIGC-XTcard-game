import type { AiDifficulty, BattleState, BattleUnit, BattleWeapon, CardDef, CardType, CombatTargetRef, FxEvent, SideState, SpellPlayOptions } from "../types";
import { CARD_MAP, CARD_POOL, TOKEN_POOL } from "../data/cards";
import { HERO_POWERS, type HeroPowerDef } from "../data/heroPowers";
import { RULES } from "./rules";

const MAX_MANA = RULES.MAX_MANA;
const MAX_HAND = RULES.MAX_HAND;
const MAX_BOARD = RULES.MAX_BOARD;
const HERO_HEALTH = RULES.HERO_HEALTH;
const START_HAND_FIRST = RULES.START_HAND_FIRST;
const START_HAND_SECOND = RULES.START_HAND_SECOND;

type Side = "player" | "enemy";

function getSide(state: BattleState, side: Side): SideState {
  return side === "player" ? state.player : state.enemy;
}

function getOtherSide(side: Side): Side {
  return side === "player" ? "enemy" : "player";
}

function getOpponent(state: BattleState, side: Side): SideState {
  return getSide(state, getOtherSide(side));
}

function getCard(defId: string): CardDef {
  return CARD_MAP[defId] ?? CARD_MAP["dawn-scout"]!;
}

function random(state: BattleState) {
  state.randomSeed = (Math.imul(state.randomSeed, 1664525) + 1013904223) >>> 0;
  return state.randomSeed / 0x100000000;
}

function pick<T>(state: BattleState, items: readonly T[]): T | undefined {
  return items.length ? items[Math.floor(random(state) * items.length)] : undefined;
}

function pushLog(state: BattleState, message: string) {
  state.log.push(message);
  if (state.log.length > 40) state.log.splice(0, state.log.length - 40);
}

function pushFx(state: BattleState, event: Omit<FxEvent, "id">) {
  state.fxCounter += 1;
  state.fx.push({ id: state.fxCounter, ...event });
  if (state.fx.length > 48) state.fx.splice(0, state.fx.length - 48);
}

// 战斗状态克隆：按字段浅拷贝可变容器（数组/对象），标量与字符串天然安全。
// 比 structuredClone 快一个数量级以上，供每次玩家操作快照与 AI 前瞻搜索复用，
// 避免 AI 每个候选动作用结构化克隆深拷整个状态造成 GC 压力。
function cloneUnit(unit: BattleUnit): BattleUnit {
  return { ...unit, flags: { ...unit.flags } };
}

function cloneSide(side: SideState): SideState {
  return {
    ...side,
    hand: side.hand.map(cloneUnit),
    board: side.board.map(cloneUnit),
    deck: [...side.deck],
    triggeredCombos: [...side.triggeredCombos],
    secrets: [...side.secrets],
    weapon: side.weapon ? { ...side.weapon } : null,
  };
}

export function cloneBattleState(state: BattleState): BattleState {
  return {
    ...state,
    player: cloneSide(state.player),
    enemy: cloneSide(state.enemy),
    log: [...state.log],
    fx: state.fx.map((event) => ({ ...event })),
    mulligan: { ...state.mulligan },
    pendingChoice: state.pendingChoice ? { ...state.pendingChoice, options: [...state.pendingChoice.options] } : null,
    modifiers: state.modifiers ? { ...state.modifiers } : undefined,
  };
}

function nextUid(state: BattleState) {
  state.uidCounter += 1;
  return state.uidCounter;
}

function shuffle<T>(state: BattleState, items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random(state) * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

export function createUnit(defId: string, uid: number): BattleUnit {
  const card = getCard(defId);
  // defId 净化为实际解析到的卡：未知 ID（分享码/脏存档）不会漏进 UI 的 CARD_MAP 查找。
  return { uid, defId: card.id, defKind: card.kind, name: card.name, icon: card.icon, color: card.color, cost: card.cost, attack: card.attack, health: card.health, maxHealth: card.health, canAttack: false, summoned: false, buffAttack: 0, buffHealth: 0, flags: {} };
}

function createWeapon(defId: string): BattleWeapon {
  const card = getCard(defId);
  return { defId: card.id, name: card.name, icon: card.icon, color: card.color, attack: card.attack, durability: card.durability, maxDurability: card.durability };
}

function inferFaction(deck: string[]): CardType {
  const counts = new Map<CardType, number>();
  for (const id of deck) {
    const type = getCard(id)?.type;
    if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  let best: CardType = "天衡";
  let bestCount = -1;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

export function createBattle(playerDeck: string[], enemyDeck: string[], seed = Date.now() >>> 0): BattleState {
  const emptySide = (deck: string[]): SideState => ({ heroHealth: HERO_HEALTH, maxHeroHealth: HERO_HEALTH, mana: 1, maxMana: 1, hand: [], board: [], deck: [...deck], nextCheaper: 0, nextSpellCheaper: 0, fatigue: 0, lastPlayedType: null, comboCount: 0, triggeredCombos: [], faction: inferFaction(deck), heroPowerUsed: false, weapon: null, heroAttacked: false, secrets: [] });
  const state: BattleState = { player: emptySide(playerDeck), enemy: emptySide(enemyDeck), turn: "player", turnNumber: 1, winner: null, log: ["天门已开，双方牌库洗毕。", "起手补给：先手 3 张，后手 6 张及一枚星辉令。"], uidCounter: 0, fx: [], fxCounter: 0, mulligan: { player: false, enemy: false }, pendingChoice: null, randomSeed: seed || 1 };
  shuffle(state, state.player.deck);
  shuffle(state, state.enemy.deck);
  for (let index = 0; index < START_HAND_FIRST; index += 1) drawCardInner(state, "player");
  for (let index = 0; index < START_HAND_SECOND; index += 1) drawCardInner(state, "enemy");
  state.enemy.hand.push(createUnit("astral-coin", nextUid(state)));
  return state;
}

export function aiMulligan(state: BattleState, difficulty: AiDifficulty = "skilled"): BattleState {
  if (state.winner || state.mulligan.enemy) return state;
  const threshold = difficulty === "novice" ? Infinity : difficulty === "skilled" ? 4 : 3;
  const keep = state.enemy.hand.filter((unit) => unit.cost <= threshold).map((unit) => unit.uid);
  mulliganHand(state, "enemy", keep);
  state.mulligan.enemy = true;
  return state;
}

export function mulliganHand(state: BattleState, side: Side, keepUids: number[]): BattleState {
  const target = getSide(state, side);
  const kept = target.hand.filter((unit) => keepUids.includes(unit.uid));
  const swapped = target.hand.filter((unit) => !keepUids.includes(unit.uid));
  if (swapped.length === 0) return state;
  const redrawCount = Math.min(swapped.length, target.deck.length);
  target.hand = kept;
  // 先从牌库补牌，再把换掉的卡洗回去——保证换牌不会抽回同一张。
  for (let index = 0; index < redrawCount; index += 1) drawCardInner(state, side);
  target.deck.push(...swapped.map((unit) => unit.defId));
  shuffle(state, target.deck);
  pushLog(state, `${side === "player" ? "我方" : "敌方"}重新洗了 ${redrawCount} 张起手。`);
  return state;
}

function aiMulliganInternal(state: BattleState, difficulty: AiDifficulty) {
  if (state.mulligan.enemy) return;
  const threshold = difficulty === "novice" ? Infinity : difficulty === "skilled" ? 4 : 3;
  const keep = state.enemy.hand.filter((unit) => unit.cost <= threshold).map((unit) => unit.uid);
  mulliganHand(state, "enemy", keep);
  state.mulligan.enemy = true;
}

function boostUnit(state: BattleState, side: Side, unit: BattleUnit, attack: number, health: number) {
  unit.attack += attack;
  unit.health += health;
  unit.maxHealth += health;
  unit.buffAttack += attack;
  unit.buffHealth += health;
  pushFx(state, { type: "buff", side, uid: unit.uid, value: Math.max(Math.abs(attack), Math.abs(health)) });
}

function silenceUnit(state: BattleState, side: Side, unit: BattleUnit) {
  if (unit.flags.silenced === 1) return;
  unit.flags.silenced = 1;
  if (unit.buffAttack !== 0 || unit.buffHealth !== 0) {
    unit.attack -= unit.buffAttack;
    unit.maxHealth -= unit.buffHealth;
    unit.health = Math.min(unit.health, unit.maxHealth);
    unit.buffAttack = 0;
    unit.buffHealth = 0;
  }
  pushFx(state, { type: "skill", side, uid: unit.uid, label: "封尘" });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}「${unit.name}」的附加效果被尘封。`);
}

function passiveEffect(unit: BattleUnit): string | null {
  return unit.flags.silenced === 1 ? null : getCard(unit.defId).skill.effect;
}

function healUnit(state: BattleState, side: Side, unit: BattleUnit, amount: number) {
  const restored = Math.min(amount, unit.maxHealth - unit.health);
  if (restored <= 0) return;
  unit.health += restored;
  pushFx(state, { type: "buff", side, uid: unit.uid, value: restored });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}「${unit.name}」恢复 ${restored} 点生命。`);
}

function healHero(state: BattleState, side: Side, amount: number, source?: BattleUnit, label?: string) {
  const target = getSide(state, side);
  const restored = Math.min(amount, target.maxHeroHealth - target.heroHealth);
  if (restored <= 0) return;
  target.heroHealth += restored;
  pushFx(state, { type: "buff", side, value: restored, uid: source?.uid, label });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}核心恢复 ${restored} 点生命。`);
}

function isPair(left: CardType, right: CardType, first: CardType, second: CardType) {
  return (left === first && right === second) || (left === second && right === first);
}

// 本回合相邻部署的两张不同阵营牌，会凑成一次限定的呼应。
function applyFactionCombo(state: BattleState, side: Side, unit: BattleUnit) {
  const target = getSide(state, side);
  const previous = target.lastPlayedType;
  const current = getCard(unit.defId).type;
  target.lastPlayedType = current;
  if (!previous) return;
  const comboKey = [previous, current].sort().join(":");
  if (previous === current || target.triggeredCombos.includes(comboKey)) return;
  const triggerCombo = (label: string) => {
    target.triggeredCombos.push(comboKey);
    target.comboCount += 1;
    triggerSkill(state, side, unit, label);
  };
  if (isPair(previous, current, "天衡", "天机")) {
    triggerCombo("星辉相映");
    drawCardInner(state, side);
    pushLog(state, `呼应 ${target.comboCount}：天衡与天机相映，额外摸 1 张牌。`);
    return;
  }
  if (isPair(previous, current, "幽冥", "天机")) {
    triggerCombo("蚀影咒印");
    dealHeroDamage(state, getOtherSide(side), 1, unit, "蚀影咒印");
    pushLog(state, `呼应 ${target.comboCount}：幽冥与天机联手，敌方核心受 1 点伤害。`);
    return;
  }
  if (isPair(previous, current, "铁律", "山海")) {
    triggerCombo("拓荒壁垒");
    boostUnit(state, side, unit, 0, 2);
    pushLog(state, `呼应 ${target.comboCount}：铁律与山海夯土为垒，「${unit.name}」获得 +0/+2。`);
    return;
  }
  if (isPair(previous, current, "天衡", "铁律")) {
    triggerCombo("曙光铸盾");
    for (const ally of target.board) {
      if (ally.uid !== unit.uid) boostUnit(state, side, ally, 0, 1);
    }
    pushLog(state, `呼应 ${target.comboCount}：天衡与铁律联防，其他友军获得 +0/+1。`);
    return;
  }
  if (isPair(previous, current, "幽冥", "山海")) {
    triggerCombo("猎影突袭");
    unit.canAttack = true;
    pushLog(state, `呼应 ${target.comboCount}：幽冥与山海协击，「${unit.name}」获得本回合攻击资格。`);
  }
}

function drawCardInner(state: BattleState, side: Side): boolean {
  const target = getSide(state, side);
  if (target.deck.length === 0) {
    target.fatigue += 1;
    target.heroHealth -= target.fatigue;
    pushFx(state, { type: "damage", side, value: target.fatigue, label: "牌尽" });
    pushFx(state, { type: "heroHit", side, value: target.fatigue });
    pushLog(state, `${side === "player" ? "我方" : "敌方"}牌库见底，承受 ${target.fatigue} 点疲劳伤害。`);
    checkWinner(state);
    return false;
  }
  if (target.hand.length >= MAX_HAND) {
    pushLog(state, `${side === "player" ? "我方" : "敌方"}手牌已满，新牌就地焚毁。`);
    return false;
  }
  const unit = createUnit(target.deck.shift()!, nextUid(state));
  target.hand.push(unit);
  pushLog(state, `${side === "player" ? "我方" : "敌方"}摸到「${unit.name}」。`);
  return true;
}

function tutorCard(state: BattleState, side: Side, pool?: CardType[]): boolean {
  const target = getSide(state, side);
  const candidates = target.deck.filter((id) => !pool || pool.includes(getCard(id).type));
  if (candidates.length === 0) {
    pushLog(state, `${side === "player" ? "我方" : "敌方"}牌库中没有符合检索要求的牌。`);
    return false;
  }
  if (target.hand.length >= MAX_HAND) {
    pushLog(state, `${side === "player" ? "我方" : "敌方"}手牌已满，检索的牌就地焚毁。`);
    return false;
  }
  const defId = pick(state, candidates)!;
  target.deck.splice(target.deck.indexOf(defId), 1);
  target.hand.push(createUnit(defId, nextUid(state)));
  pushFx(state, { type: "buff", side, value: 1, label: getCard(defId).name });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}从牌库中检索到「${getCard(defId).name}」。`);
  return true;
}

function counterSpellCast(state: BattleState, side: Side, defId: string) {
  const holder = getSide(state, side);
  if (holder.secrets.length >= 3) {
    const dropped = holder.secrets.shift();
    pushLog(state, `奥秘槽位已满，「${dropped ? CARD_MAP[dropped].name : "旧咒"}」自行散去。`);
  }
  holder.secrets.push(defId);
  pushFx(state, { type: "skill", side, label: `奥秘部署：${getCard(defId).skill.name}` });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}布下反制咒印「${getCard(defId).skill.name}」。`);
}

function addToBoard(state: BattleState, side: Side, unit: BattleUnit): boolean {
  const target = getSide(state, side);
  if (target.board.length >= MAX_BOARD) return false;
  target.board.push(unit);
  return true;
}

function summonToken(state: BattleState, side: Side, tokenId: string): BattleUnit | null {
  const token = createUnit(tokenId, nextUid(state));
  token.summoned = true;
  if (!addToBoard(state, side, token)) {
    pushLog(state, `战场已满，「${token.name}」没能站上阵线。`);
    return null;
  }
  pushFx(state, { type: "summon", side, uid: token.uid, label: token.name });
  applySummonSkill(state, side, token);
  return token;
}

function summonRandomToken(state: BattleState, side: Side): BattleUnit | null {
  if (TOKEN_POOL.length === 0) return null;
  const tokenDef = pick(state, TOKEN_POOL);
  if (!tokenDef) return null;
  const token = summonToken(state, side, tokenDef.id);
  if (token) pushLog(state, `${side === "player" ? "我方" : "敌方"}的裂隙里钻出「${token.name}」。`);
  return token;
}

function triggerSkill(state: BattleState, side: Side, unit: BattleUnit, label: string) {
  pushFx(state, { type: "skill", side, uid: unit.uid, label });
}

function getCardCost(state: BattleState, side: Side, unit: BattleUnit): number {
  const target = getSide(state, side);
  const base = Math.max(0, unit.cost - target.nextCheaper);
  return unit.defKind === "spell" ? Math.max(0, base - target.nextSpellCheaper) : base;
}

export function playCard(state: BattleState, side: Side, handIndex: number): BattleState {
  if (state.winner || state.turn !== side || state.pendingChoice) return state;
  const target = getSide(state, side);
  const unit = target.hand[handIndex];
  if (!unit) return state;
  if (unit.defKind === "spell") return playSpell(state, side, handIndex, undefined, true);
  if (unit.defKind === "weapon") return equipWeapon(state, side, handIndex);
  if (target.board.length >= MAX_BOARD) return state;
  const cost = getCardCost(state, side, unit);
  if (cost > target.mana) return state;
  target.mana -= cost;
  target.nextCheaper = 0;
  target.nextSpellCheaper = 0;
  target.hand.splice(handIndex, 1);
  unit.summoned = true;
  unit.canAttack = getCard(unit.defId).skill.effect === "quick" || getCard(unit.defId).skill.effect === "quick-overkill-draw";
  addToBoard(state, side, unit);
  pushFx(state, { type: "summon", side, uid: unit.uid, label: unit.name });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}落子「${unit.name}」。`);
  applySummonSkill(state, side, unit);
  applyFactionCombo(state, side, unit);
  triggerSecrets(state, getOtherSide(side), { kind: "unit-summoned", unit });
  checkWinner(state);
  return state;
}

export function equipWeapon(state: BattleState, side: Side, handIndex: number): BattleState {
  if (state.winner || state.turn !== side || state.pendingChoice) return state;
  const target = getSide(state, side);
  const card = target.hand[handIndex];
  if (!card || card.defKind !== "weapon") return state;
  const cost = getCardCost(state, side, card);
  if (cost > target.mana) return state;
  target.mana -= cost;
  target.nextCheaper = 0;
  target.nextSpellCheaper = 0;
  target.hand.splice(handIndex, 1);
  const previous = target.weapon;
  const nextWeapon = createWeapon(card.defId);
  target.weapon = nextWeapon;
  pushFx(state, { type: "summon", side, label: nextWeapon.name });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}装备「${nextWeapon.name}」（${nextWeapon.attack} 攻 / ${nextWeapon.durability} 耐）。${previous ? `「${previous.name}」退下阵线。` : ""}`);
  checkWinner(state);
  return state;
}

export function getWeaponState(state: BattleState, side: Side) {
  const target = getSide(state, side);
  const weapon = target.weapon;
  if (!weapon) return null;
  const ready = !state.winner && state.turn === side && !target.heroAttacked && !state.pendingChoice;
  return { ...weapon, ready, heroAttacked: target.heroAttacked };
}

export function getValidWeaponTargets(state: BattleState, side: Side) {
  const holder = getSide(state, side);
  const opponent = getOpponent(state, side);
  const result = { hero: false, units: [] as number[] };
  if (!holder.weapon || holder.heroAttacked || state.winner || state.turn !== side || state.pendingChoice) return result;
  const taunts = opponent.board.filter((unit) => passiveEffect(unit) === "taunt" || passiveEffect(unit) === "last-stand");
  if (taunts.length) result.units = taunts.map((unit) => unit.uid);
  else {
    result.hero = true;
    result.units = opponent.board.map((unit) => unit.uid);
  }
  return result;
}

export function attackWithWeapon(state: BattleState, side: Side, target: { hero: boolean; uid?: number }): BattleState {
  if (state.winner || state.turn !== side || state.pendingChoice) return state;
  const holder = getSide(state, side);
  const weapon = holder.weapon;
  if (!weapon || holder.heroAttacked) return state;
  const valid = getValidWeaponTargets(state, side);
  if ((target.hero && !valid.hero) || (!target.hero && (!target.uid || !valid.units.includes(target.uid)))) return state;
  pushFx(state, { type: "attack", side, value: weapon.attack, label: weapon.name });
  if (target.hero) {
    dealHeroDamage(state, getOtherSide(side), weapon.attack, undefined, weapon.name);
    triggerSecrets(state, getOtherSide(side), { kind: "attack-hero" });
    pushLog(state, `${side === "player" ? "我方" : "敌方"}挥「${weapon.name}」斩向敌方核心，造成 ${weapon.attack} 点伤害。`);
  } else if (target.uid) {
    const defender = getOpponent(state, side).board.find((unit) => unit.uid === target.uid);
    if (!defender) return state;
    const outcome = dealUnitDamage(state, getOtherSide(side), defender, weapon.attack);
    pushLog(state, `「${weapon.name}」劈中「${defender.name}」，造成 ${outcome.dealt} 点伤害。`);
    if (outcome.survived && defender.attack > 0) {
      dealHeroDamage(state, side, defender.attack, defender, defender.name);
      pushLog(state, `「${defender.name}」还击，${side === "player" ? "我方" : "敌方"}核心受 ${defender.attack} 点伤害。`);
    }
  }
  weapon.durability -= 1;
  if (weapon.durability <= 0) {
    pushLog(state, `「${weapon.name}」折断了。`);
    holder.weapon = null;
  }
  holder.heroAttacked = true;
  checkWinner(state);
  return state;
}

export function getSpellPlayOptions(state: BattleState, side: Side, handIndex: number): SpellPlayOptions {
  const empty = (needsTarget: boolean, targetMode: SpellPlayOptions["targetMode"]): SpellPlayOptions => ({ playable: false, cost: 0, needsTarget, targetMode, enemyUnits: [], allyUnits: [] });
  if (state.winner || state.turn !== side) return empty(false, "none");
  const target = getSide(state, side);
  const unit = target.hand[handIndex];
  if (!unit || unit.defKind !== "spell") return empty(false, "none");
  const skill = getCard(unit.defId).skill;
  const targetMode = skill.target ?? "none";
  const cost = getCardCost(state, side, unit);
  if (cost > target.mana) return empty(targetMode !== "none", targetMode);
  return {
    playable: true,
    cost,
    needsTarget: targetMode !== "none",
    targetMode,
    enemyUnits: targetMode === "enemy-unit" ? getOpponent(state, side).board.map((ally) => ally.uid) : [],
    allyUnits: targetMode === "ally-unit" ? target.board.map((ally) => ally.uid) : [],
  };
}

export function playSpell(state: BattleState, side: Side, handIndex: number, target?: { uid?: number }, force?: boolean): BattleState {
  if (state.winner || state.turn !== side || state.pendingChoice) return state;
  const player = getSide(state, side);
  const opponent = getOpponent(state, side);
  const unit = player.hand[handIndex];
  if (!unit || unit.defKind !== "spell") return state;
  const skill = getCard(unit.defId).skill;
  const targetMode = skill.target ?? "none";
  const cost = getCardCost(state, side, unit);
  if (cost > player.mana) return state;
  if (targetMode !== "none") {
    const candidates = targetMode === "enemy-unit" ? opponent.board : player.board;
    const chosen = candidates.find((ally) => ally.uid === target?.uid);
    if (!chosen) return state;
  }
  player.mana -= cost;
  player.nextCheaper = 0;
  player.nextSpellCheaper = 0;
  player.hand.splice(handIndex, 1);
  // 反制奥秘在扣费与弃牌之后结算：被取消的法术同样消耗资源，不能留在手里重放。
  const counterId = opponent.secrets.find((id) => getCard(id).skill.effect === "counter-spell");
  if (counterId) {
    opponent.secrets = opponent.secrets.filter((id) => id !== counterId);
    pushFx(state, { type: "skill", side: getOtherSide(side), label: `奥秘触发：${getCard(counterId).skill.name}` });
    pushLog(state, `${side === "player" ? "敌方" : "我方"}的「${getCard(counterId).skill.name}」应声而动，取消了这道法术。`);
    checkWinner(state);
    return state;
  }
  pushFx(state, { type: "spell", side, label: skill.name });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}施展「${skill.name}」。`);
  if (skill.effect.startsWith("secret-")) {
    playSecret(state, side, unit);
    checkWinner(state);
    return state;
  }
  if (skill.effect === "counter-spell") {
    counterSpellCast(state, side, unit.defId);
    checkWinner(state);
    return state;
  }
  applySpellEffect(state, side, unit, skill.value ?? 1, target?.uid);
  triggerSecrets(state, getOtherSide(side), { kind: "spell-cast" });
  checkWinner(state);
  return state;
}

function playSecret(state: BattleState, side: Side, unit: BattleUnit) {
  const holder = getSide(state, side);
  if (holder.secrets.length >= 3) {
    const dropped = holder.secrets.shift();
    pushLog(state, `奥秘槽位已满，「${dropped ? CARD_MAP[dropped].name : "旧咒"}」自行散去。`);
  }
  holder.secrets.push(unit.defId);
  pushFx(state, { type: "skill", side, label: `奥秘部署：${getCard(unit.defId).skill.name}` });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}布下神秘咒印「${getCard(unit.defId).skill.name}」。`);
}

type SecretEvent =
  | { kind: "attack-hero"; attacker?: BattleUnit }
  | { kind: "spell-cast" }
  | { kind: "unit-summoned"; unit: BattleUnit };

function triggerSecrets(state: BattleState, side: Side, event: SecretEvent) {
  if (state.winner) return;
  const holder = getSide(state, side);
  if (holder.secrets.length === 0) return;
  const triggered: string[] = [];
  for (const defId of [...holder.secrets]) {
    const card = getCard(defId);
    const skill = card.skill;
    const matches =
      (event.kind === "attack-hero" && skill.effect === "secret-heal") ||
      (event.kind === "spell-cast" && skill.effect === "secret-draw") ||
      (event.kind === "unit-summoned" && skill.effect === "secret-strike");
    if (!matches) continue;
    triggered.push(defId);
    holder.secrets = holder.secrets.filter((id) => id !== defId);
    pushFx(state, { type: "skill", side, label: `奥秘触发：${skill.name}` });
    pushLog(state, `${side === "player" ? "我方" : "敌方"}的「${skill.name}」应声而动。`);
    if (skill.effect === "secret-heal") {
      healHero(state, side, skill.value ?? 3, undefined, skill.name);
    } else if (skill.effect === "secret-draw") {
      drawCardInner(state, side);
    } else if (skill.effect === "secret-strike" && event.kind === "unit-summoned") {
      const summoned = event.unit;
      const liveUnit = getOpponent(state, side).board.find((ally) => ally.uid === summoned.uid);
      if (liveUnit) {
        dealUnitDamage(state, getOtherSide(side), liveUnit, skill.value ?? 2);
        pushLog(state, `铁蒺藜扎穿「${liveUnit.name}」。`);
      }
    }
  }
  if (triggered.length > 0) checkWinner(state);
}

function applySpellEffect(state: BattleState, side: Side, unit: BattleUnit, value: number, targetUid?: number) {
  const player = getSide(state, side);
  const opponent = getOpponent(state, side);
  const effect = getCard(unit.defId).skill.effect;
  const findEnemy = () => opponent.board.find((ally) => ally.uid === targetUid);
  const findAlly = () => player.board.find((ally) => ally.uid === targetUid);
  if (effect === "spell-strike") {
    const foe = findEnemy();
    if (foe) dealUnitDamage(state, getOtherSide(side), foe, value);
    return;
  }
  if (effect === "spell-hero-damage") {
    dealHeroDamage(state, getOtherSide(side), value);
    return;
  }
  if (effect === "spell-hero-heal") {
    healHero(state, side, value);
    return;
  }
  if (effect === "spell-burst") {
    for (const foe of [...opponent.board]) dealUnitDamage(state, getOtherSide(side), foe, value);
    pushLog(state, `法术波及所有敌方单位，各受 ${value} 点伤害。`);
    return;
  }
  if (effect === "spell-draw") {
    for (let index = 0; index < value; index += 1) drawCardInner(state, side);
    return;
  }
  if (effect === "spell-draw-discount") {
    drawCardInner(state, side);
    player.nextSpellCheaper = 1;
    pushLog(state, "下一张法术费用 -1。");
    return;
  }
  if (effect === "spell-temp-mana") {
    player.mana += value;
    pushFx(state, { type: "skill", side, label: "天光 +1 法力" });
    pushLog(state, `星辉令展开：本回合法力 +${value}。`);
    return;
  }
  if (effect === "spell-buff") {
    const ally = findAlly();
    if (ally) {
      boostUnit(state, side, ally, value, value);
      pushLog(state, `「${ally.name}」获得 +${value}/+${value}。`);
    }
    return;
  }
  if (effect === "spell-heal") {
    const ally = findAlly();
    if (ally) healUnit(state, side, ally, value);
    return;
  }
  if (effect === "spell-summon") {
    const token = summonToken(state, side, "stone-golem");
    if (token) pushLog(state, "法术召来 2/3「石俑」。");
    return;
  }
  if (effect === "spell-silence") {
    const foe = findEnemy();
    if (foe) silenceUnit(state, getOtherSide(side), foe);
    return;
  }
  if (effect === "spell-freeze") {
    const foe = findEnemy();
    if (foe) {
      foe.flags.frozen = 1;
      pushFx(state, { type: "skill", side: getOtherSide(side), uid: foe.uid, label: "凝滞" });
      pushLog(state, `「${foe.name}」被凝滞，下回合无法攻击。`);
    }
    return;
  }
  if (effect === "spell-weak") {
    const foe = findEnemy();
    if (foe) {
      boostUnit(state, getOtherSide(side), foe, -value, 0);
      pushLog(state, `「${foe.name}」攻击力 -${value}。`);
    }
    return;
  }
  if (effect === "spell-buff-all") {
    let count = 0;
    for (const ally of player.board) {
      boostUnit(state, side, ally, 1, 1);
      count += 1;
    }
    pushLog(state, `全体友军获得 +1/+1（${count} 个单位）。`);
  }
  if (effect === "spell-tutor-draw") {
    tutorCard(state, side, getCard(unit.defId).skill.pool);
    drawCardInner(state, side);
    return;
  }
  if (effect === "spell-heal-or-draw") {
    const ally = findAlly();
    if (ally && ally.health < ally.maxHealth) {
      healUnit(state, side, ally, value);
    } else {
      drawCardInner(state, side);
    }
    return;
  }
  if (effect === "discover") {
    const pool = getCard(unit.defId).skill.pool;
    const options = rollDiscover(state, pool);
    if (options.length) {
      state.pendingChoice = { kind: "discover", side, options };
      pushFx(state, { type: "spell", side, label: "发现" });
      pushLog(state, `${side === "player" ? "我方" : "敌方"}翻开星图，从中挑选一张。`);
    } else {
      pushLog(state, "星图空空如也，什么也没有发现。");
    }
  }
}

function rollDiscover(state: BattleState, pool?: CardType[]): string[] {
  const candidates = CARD_POOL.filter((card) => !pool || pool.includes(card.type)).map((card) => card.id);
  const picked: string[] = [];
  while (picked.length < 3 && candidates.length) {
    const index = Math.floor(random(state) * candidates.length);
    picked.push(candidates.splice(index, 1)[0]);
  }
  return picked;
}

export function resolveDiscover(state: BattleState, defId: string): BattleState {
  if (state.winner || !state.pendingChoice || state.pendingChoice.kind !== "discover") return state;
  const { side, options } = state.pendingChoice;
  if (!options.includes(defId)) return state;
  const target = getSide(state, side);
  if (target.hand.length >= MAX_HAND) {
    pushLog(state, `「${getCard(defId).name}」落进已满的手牌，化为飞灰。`);
  } else {
    target.hand.push(createUnit(defId, nextUid(state)));
    pushFx(state, { type: "buff", side, value: 1, label: getCard(defId).name });
    pushLog(state, `${side === "player" ? "我方" : "敌方"}从星图中拾起「${getCard(defId).name}」。`);
  }
  state.pendingChoice = null;
  checkWinner(state);
  return state;
}

function chooseDiscoverOption(state: BattleState, options: string[]): string {
  let best = options[0];
  let bestScore = -Infinity;
  for (const defId of options) {
    const card = getCard(defId);
    const unit = createUnit(defId, 0);
    const value = card.kind === "spell" ? 1.4 : playPriority(state, "enemy", unit);
    const score = value + (card.cost <= state.enemy.mana ? 2 : -card.cost * 0.4);
    if (score > bestScore) {
      bestScore = score;
      best = defId;
    }
  }
  return best;
}

function applySummonSkill(state: BattleState, side: Side, unit: BattleUnit) {
  const target = getSide(state, side);
  const opponent = getOpponent(state, side);
  const skill = getCard(unit.defId).skill;
  const effect = skill.effect;
  const value = skill.value ?? 0;
  if (effect === "battlecry-draw") {
    triggerSkill(state, side, unit, skill.name);
    drawCardInner(state, side);
  }
  if (effect === "battlecry-hero-damage") {
    triggerSkill(state, side, unit, skill.name);
    dealHeroDamage(state, getOtherSide(side), value, unit, skill.name);
  }
  if (effect === "battlecry-hero-heal") {
    triggerSkill(state, side, unit, skill.name);
    healHero(state, side, value, unit, skill.name);
  }
  if (effect === "battlecry-hero-damage-draw") {
    triggerSkill(state, side, unit, skill.name);
    dealHeroDamage(state, getOtherSide(side), 1, unit, skill.name);
    drawCardInner(state, side);
  }
  if (effect === "battlecry-spell-discount") {
    triggerSkill(state, side, unit, skill.name);
    target.nextSpellCheaper = 1;
    pushLog(state, `「${unit.name}」给下一张法术腾了 1 点费用。`);
  }
  if (effect === "battlecry-buff") {
    triggerSkill(state, side, unit, skill.name);
    for (const ally of target.board) {
      if (ally.uid === unit.uid) continue;
      boostUnit(state, side, ally, 1, 0);
    }
    pushLog(state, `「${unit.name}」让全体友军攻击力 +1。`);
  }
  if (effect === "battlecry-board-damage") {
    triggerSkill(state, side, unit, skill.name);
    for (const foe of [...opponent.board]) dealUnitDamage(state, getOtherSide(side), foe, value);
    pushLog(state, `「${unit.name}」震得所有敌方单位各受 ${value} 点伤害。`);
  }
  if (effect === "battlecry-discount") {
    triggerSkill(state, side, unit, skill.name);
    target.nextCheaper = Math.max(target.nextCheaper, 1);
    pushLog(state, `「${unit.name}」让下一张牌费用 -1。`);
  }
  if (effect === "battlecry-token") {
    triggerSkill(state, side, unit, skill.name);
    const token = summonToken(state, side, "wind-wisp");
    if (token) pushLog(state, `「${unit.name}」唤来 2/2「风灵」。`);
  }
  if (effect === "battlecry-banner") {
    triggerSkill(state, side, unit, skill.name);
    for (const ally of target.board) {
      if (ally.uid === unit.uid) continue;
      boostUnit(state, side, ally, 1, 1);
    }
    pushLog(state, `「${unit.name}」为所有友军加冕 +1/+1。`);
  }
  if (effect === "ward-start") {
    triggerSkill(state, side, unit, skill.name);
    pushLog(state, `「${unit.name}」披上折光甲胄。`);
  }
  if (effect === "wisp-core-heal") {
    triggerSkill(state, side, unit, skill.name);
    const restored = Math.min(1, target.maxHeroHealth - target.heroHealth);
    target.heroHealth += restored;
    pushFx(state, { type: "buff", side, value: restored });
    pushLog(state, restored > 0 ? `「${unit.name}」为我方核心恢复 1 点生命。` : `「${unit.name}」唤起回风，核心生命已满。`);
  }
  if (effect === "quick" || effect === "taunt") triggerSkill(state, side, unit, skill.name);
  if (effect === "counter-spell") {
    triggerSkill(state, side, unit, skill.name);
    counterSpellCast(state, side, unit.defId);
    pushLog(state, `「${unit.name}」立起反制咒印，敌方下一道法术将被取消。`);
  }
  if (effect === "battlecry-tutor") {
    triggerSkill(state, side, unit, skill.name);
    tutorCard(state, side, skill.pool);
  }
  if (effect === "battlecry-mana") {
    triggerSkill(state, side, unit, skill.name);
    target.mana += value;
    pushLog(state, `「${unit.name}」让本回合法力 +${value}。`);
  }
  if (effect === "conditional-buff") {
    const opponent = getOpponent(state, side);
    if (opponent.board.length > target.board.length) {
      triggerSkill(state, side, unit, skill.name);
      boostUnit(state, side, unit, value, value);
      pushLog(state, `「${unit.name}」见敌军势众，获得 +${value}/+${value}。`);
    }
  }
  if (effect === "conditional-damage") {
    const opponent = getOpponent(state, side);
    if (opponent.heroHealth <= 15) {
      triggerSkill(state, side, unit, skill.name);
      dealHeroDamage(state, getOtherSide(side), value, unit, skill.name);
      pushLog(state, `「${unit.name}」看准核心虚弱，造成 ${value} 点伤害。`);
    }
  }
  if (effect === "overkill-draw" || effect === "quick-overkill-draw") {
    if (effect === "quick-overkill-draw") triggerSkill(state, side, unit, skill.name);
  }
  if (opponent.heroHealth <= 0) checkWinner(state);
}

function dealHeroDamage(state: BattleState, side: Side, damage: number, source?: BattleUnit, label?: string) {
  const target = getSide(state, side);
  target.heroHealth -= damage;
  pushFx(state, { type: "damage", side, uid: source?.uid, value: damage, label });
  pushFx(state, { type: "heroHit", side, value: damage });
  // side 是受击方（武器反噬时可能是施伤方自己的核心），战报按实际受击阵营描述。
  if (source) pushLog(state, `「${source.name}」让${side === "player" ? "我方" : "敌方"}核心受 ${damage} 点伤害。`);
  checkWinner(state);
}

function isWardEffect(effect: string | null) {
  return effect === "ward" || effect === "ward-start";
}

function dealUnitDamage(state: BattleState, side: Side, unit: BattleUnit, damage: number, source?: BattleUnit): { survived: boolean; dealt: number } {
  // 0 点伤害不触发折光/凝滞——一次空挥不应烧掉护盾次数。
  if (damage <= 0) {
    pushFx(state, { type: "damage", side, uid: source?.uid, targetUid: unit.uid, value: 0, label: source?.name });
    return { survived: true, dealt: 0 };
  }
  const effect = passiveEffect(unit);
  const hasWard = isWardEffect(effect) && unit.flags.wardUsed !== 1;
  const hasStasis = effect === "stasis-field" && unit.flags.stasisUsed !== 1;
  const actual = hasStasis ? 0 : hasWard ? Math.min(1, damage) : damage;
  if (hasWard) {
    unit.flags.wardUsed = 1;
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    pushLog(state, `「${unit.name}」的折光甲胄把伤害压到了 1 点。`);
  }
  if (hasStasis) {
    unit.flags.stasisUsed = 1;
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    pushLog(state, `「${unit.name}」定住时间，这次伤害被完全拦下。`);
  }
  unit.health -= actual;
  pushFx(state, { type: "damage", side, uid: source?.uid, targetUid: unit.uid, value: actual, label: source?.name });
  if (unit.health <= 0 && effect === "last-stand" && unit.flags.lastStand !== 1) {
    unit.flags.lastStand = 1;
    unit.health = 1;
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    pushLog(state, `「${unit.name}」以 1 点生命守住阵线。`);
  }
  if (unit.health <= 0) {
    handleDeath(state, side, unit);
    return { survived: false, dealt: actual };
  }
  return { survived: true, dealt: actual };
}

function handleDeath(state: BattleState, side: Side, unit: BattleUnit) {
  const target = getSide(state, side);
  const effect = passiveEffect(unit);
  if (effect === "revive" && unit.flags.revived !== 1) {
    unit.flags.revived = 1;
    unit.health = Math.min(3, unit.maxHealth);
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    pushLog(state, `「${unit.name}」从暮色里回来了。`);
    return;
  }
  const index = target.board.findIndex((ally) => ally.uid === unit.uid);
  if (index >= 0) target.board.splice(index, 1);
  if (effect === "death-draw") {
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    drawCardInner(state, side);
  }
  if (effect === "death-burst") {
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    dealHeroDamage(state, getOtherSide(side), getCard(unit.defId).skill.value ?? 2, unit, getCard(unit.defId).skill.name);
  }
  if (effect === "death-strike") {
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    const foe = pick(state, getOpponent(state, side).board);
    if (foe) {
      dealUnitDamage(state, getOtherSide(side), foe, getCard(unit.defId).skill.value ?? 2);
      pushLog(state, `「${unit.name}」临走还咬了「${foe.name}」一口。`);
    }
  }
  if (effect === "death-token") {
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    const sprout = summonToken(state, side, "sprout");
    if (sprout) pushLog(state, `「${unit.name}」入土，土里冒出一株 1/1「幼苗」。`);
  }
  if (effect === "death-random-token") {
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    summonRandomToken(state, side);
  }
  if (effect === "death-tutor") {
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    tutorCard(state, side, getCard(unit.defId).skill.pool);
  }
  if (effect === "death-heal") {
    triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
    healHero(state, side, getCard(unit.defId).skill.value ?? 1);
    pushLog(state, `「${unit.name}」还土，我方核心恢复 ${getCard(unit.defId).skill.value ?? 1} 点生命。`);
  }
  pushLog(state, `「${unit.name}」离开了战场。`);
}

export function getValidTargets(state: BattleState, side: Side, attackerUid: number) {
  const attacker = getSide(state, side).board.find((unit) => unit.uid === attackerUid);
  if (!attacker || !attacker.canAttack || attacker.attack <= 0) return { hero: false, units: [] as number[] };
  const opponent = getOpponent(state, side);
  const taunts = opponent.board.filter((unit) => passiveEffect(unit) === "taunt" || passiveEffect(unit) === "last-stand");
  if (taunts.length && passiveEffect(attacker) !== "pierce") return { hero: false, units: taunts.map((unit) => unit.uid) };
  return { hero: true, units: opponent.board.map((unit) => unit.uid) };
}

export interface AttackPreview {
  valid: boolean;
  attackerHealth: number;
  attackerAfter: number;
  targetHealth: number;
  targetAfter: number;
  targetName: string;
  damage: number;
  retaliation: number;
  notes: string[];
}

type PreviewImpact = { damage: number; after: number; notes: string[]; canCounter: boolean };

function previewImpact(unit: BattleUnit, incoming: number): PreviewImpact {
  const effect = passiveEffect(unit);
  const notes: string[] = [];
  const damage = damageAgainst(unit, incoming);
  if (effect === "stasis-field" && unit.flags.stasisUsed !== 1) notes.push("免疫");
  else if (isWardEffect(effect) && unit.flags.wardUsed !== 1 && incoming > damage) notes.push("减至 1");
  let after = unit.health - damage;
  if (after <= 0 && effect === "last-stand" && unit.flags.lastStand !== 1) {
    after = 1;
    notes.push("不可退让：保留 1");
  }
  if (after <= 0 && effect === "revive" && unit.flags.revived !== 1) {
    after = Math.min(3, unit.maxHealth);
    notes.push(`永夜归来：复活至 ${after}`);
    return { damage, after, notes, canCounter: false };
  }
  if (after <= 0) notes.push("致死");
  return { damage, after: Math.max(0, after), notes, canCounter: after > 0 };
}

export function getAttackPreview(state: BattleState, side: Side, attackerUid: number, target: CombatTargetRef): AttackPreview | null {
  const attacker = getSide(state, side).board.find((unit) => unit.uid === attackerUid);
  if (!attacker) return null;
  const valid = getValidTargets(state, side, attackerUid);
  const isValid = target.hero ? valid.hero : Boolean(target.uid && valid.units.includes(target.uid));
  if (!isValid) return null;
  if (target.hero) {
    const hero = getOpponent(state, side);
    const notes = hero.heroHealth <= attacker.attack ? ["斩杀核心"] : [];
    if (passiveEffect(attacker) === "lifesteal") notes.push(`吸血 ${attacker.attack}`);
    return {
      valid: true,
      attackerHealth: attacker.health,
      attackerAfter: attacker.health,
      targetHealth: hero.heroHealth,
      targetAfter: Math.max(0, hero.heroHealth - attacker.attack),
      targetName: "敌方核心",
      damage: attacker.attack,
      retaliation: 0,
      notes,
    };
  }
  const defender = getOpponent(state, side).board.find((unit) => unit.uid === target.uid);
  if (!defender) return null;
  const defenderResult = previewImpact(defender, attacker.attack);
  const attackerResult = defenderResult.canCounter && defender.attack > 0 ? previewImpact(attacker, defender.attack) : { damage: 0, after: attacker.health, notes: [], canCounter: true };
  const notes = [...defenderResult.notes, ...attackerResult.notes];
  if (passiveEffect(attacker) === "lifesteal" && defenderResult.damage > 0) notes.push(`吸血 ${defenderResult.damage}`);
  return {
    valid: true,
    attackerHealth: attacker.health,
    attackerAfter: attackerResult.after,
    targetHealth: defender.health,
    targetAfter: defenderResult.after,
    targetName: defender.name,
    damage: defenderResult.damage,
    retaliation: attackerResult.damage,
    notes,
  };
}

export function attackTarget(state: BattleState, side: Side, attackerUid: number, target: { hero: boolean; uid?: number }): BattleState {
  if (state.winner || state.turn !== side || state.pendingChoice) return state;
  const attacker = getSide(state, side).board.find((unit) => unit.uid === attackerUid);
  if (!attacker || !attacker.canAttack || attacker.attack <= 0) return state;
  const valid = getValidTargets(state, side, attackerUid);
  if ((target.hero && !valid.hero) || (!target.hero && (!target.uid || !valid.units.includes(target.uid)))) return state;
  const effect = passiveEffect(attacker);
  const activeAttacker = getSide(state, side).board.find((unit) => unit.uid === attackerUid);
  if (!activeAttacker) return state;
  const isLifesteal = effect === "lifesteal";
  if (effect === "pierce") triggerSkill(state, side, activeAttacker, getCard(activeAttacker.defId).skill.name);
  pushFx(state, { type: "attack", side, uid: activeAttacker.uid, value: activeAttacker.attack, label: activeAttacker.name });
  let defeatedUnit = false;
  let dealtDamage = 0;
  if (target.hero) {
    dealtDamage = activeAttacker.attack;
    dealHeroDamage(state, getOtherSide(side), activeAttacker.attack, activeAttacker);
    triggerSecrets(state, getOtherSide(side), { kind: "attack-hero", attacker: activeAttacker });
    if (isLifesteal) healHero(state, side, dealtDamage, activeAttacker, "雪冤");
  } else if (target.uid) {
    const defender = getOpponent(state, side).board.find((unit) => unit.uid === target.uid);
    if (!defender) return state;
    const outcome = dealUnitDamage(state, getOtherSide(side), defender, activeAttacker.attack, activeAttacker);
    defeatedUnit = !outcome.survived;
    dealtDamage = outcome.dealt;
    if (effect === "venom" && outcome.survived && outcome.dealt > 0) {
      const poisoned = getOpponent(state, side).board.find((unit) => unit.uid === target.uid);
      if (poisoned) {
        const defenderEffect = passiveEffect(poisoned);
        if (defenderEffect === "last-stand" && poisoned.flags.lastStand !== 1) {
          poisoned.flags.lastStand = 1;
          poisoned.health = 1;
          triggerSkill(state, getOtherSide(side), poisoned, getCard(poisoned.defId).skill.name);
          pushLog(state, `「${poisoned.name}」以 1 点生命守住阵线。`);
        } else {
          handleDeath(state, getOtherSide(side), poisoned);
          defeatedUnit = true;
        }
      }
    }
    if (isLifesteal && dealtDamage > 0) healHero(state, side, dealtDamage, activeAttacker, "雪冤");
    if (!defeatedUnit) {
      const aliveDefender = getOpponent(state, side).board.find((unit) => unit.uid === target.uid);
      if (aliveDefender && aliveDefender.attack > 0) dealUnitDamage(state, side, activeAttacker, aliveDefender.attack, aliveDefender);
    }
    if (effect === "splash-hero") {
      triggerSkill(state, side, activeAttacker, getCard(activeAttacker.defId).skill.name);
      dealHeroDamage(state, getOtherSide(side), 1, activeAttacker, getCard(activeAttacker.defId).skill.name);
    }
    if (defeatedUnit && (effect === "overkill-draw" || effect === "quick-overkill-draw")) {
      triggerSkill(state, side, activeAttacker, getCard(activeAttacker.defId).skill.name);
      drawCardInner(state, side);
      pushLog(state, `「${activeAttacker.name}」衔枚得手，摸 1 张牌。`);
    }
  }
  const finalAttacker = getSide(state, side).board.find((unit) => unit.uid === attackerUid);
  if (finalAttacker) {
    finalAttacker.canAttack = effect === "double-strike" && defeatedUnit;
    if (finalAttacker.canAttack) {
      triggerSkill(state, side, finalAttacker, getCard(finalAttacker.defId).skill.name);
      pushLog(state, `「${finalAttacker.name}」击破敌军，还能再出手一次。`);
    }
  }
  checkWinner(state);
  return state;
}

function runTurnStart(state: BattleState, side: Side) {
  const target = getSide(state, side);
  target.lastPlayedType = null;
  target.comboCount = 0;
  target.triggeredCombos = [];
  for (const unit of [...target.board]) {
    const effect = passiveEffect(unit);
    if (effect === "turn-grow") {
      boostUnit(state, side, unit, 1, 0);
      triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
      pushLog(state, `「${unit.name}」攻击力 +1。`);
    }
    if (effect === "turn-burn") {
      triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
      for (const enemy of [...getOpponent(state, side).board]) dealUnitDamage(state, getOtherSide(side), enemy, 1, unit);
      pushLog(state, `「${unit.name}」推了推命盘，所有敌军各受 1 点伤害。`);
    }
  }
}

function runTurnEnd(state: BattleState, side: Side) {
  const target = getSide(state, side);
  for (const unit of [...target.board]) {
    const effect = passiveEffect(unit);
    const value = getCard(unit.defId).skill.value ?? 1;
    if (effect === "end-heal") {
      const wounded = target.board.filter((ally) => ally.health < ally.maxHealth).sort((a, b) => a.health - b.health)[0];
      if (wounded) {
        wounded.health = Math.min(wounded.maxHealth, wounded.health + value);
        triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
        pushFx(state, { type: "buff", side, uid: wounded.uid, value });
        pushLog(state, `「${unit.name}」替「${wounded.name}」续了 ${value} 点生命。`);
      }
    }
    if (effect === "end-heal-one") {
      const wounded = target.board.filter((ally) => ally.health < ally.maxHealth).sort((a, b) => a.health - b.health)[0];
      if (wounded) {
        wounded.health = Math.min(wounded.maxHealth, wounded.health + value);
        triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
        pushFx(state, { type: "buff", side, uid: wounded.uid, value });
      }
    }
    if (effect === "end-heal-all") {
      const wounded = target.board.filter((ally) => ally.health < ally.maxHealth);
      if (wounded.length) {
        triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
        for (const ally of wounded) {
          ally.health = Math.min(ally.maxHealth, ally.health + 1);
          pushFx(state, { type: "buff", side, uid: ally.uid, value: 1 });
        }
        pushLog(state, `「${unit.name}」让 ${wounded.length} 名受伤友军各恢复 1 点生命。`);
      }
    }
    if (effect === "end-buff") {
      const allies = target.board.filter((ally) => ally.uid !== unit.uid);
      const ally = pick(state, allies);
      if (ally) {
        boostUnit(state, side, ally, 1, 0);
        triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
      }
    }
    if (effect === "end-ping") {
      const foe = pick(state, getOpponent(state, side).board);
      if (foe) {
        triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
        dealUnitDamage(state, getOtherSide(side), foe, value, unit);
      }
    }
    if (effect === "end-conditional-buff") {
      if (target.hand.length >= 5) {
        const allies = target.board.filter((ally) => ally.uid !== unit.uid);
        const ally = pick(state, allies);
        if (ally) {
          boostUnit(state, side, ally, value, value);
          triggerSkill(state, side, unit, getCard(unit.defId).skill.name);
          pushLog(state, `「${unit.name}」见手牌殷实，替「${ally.name}」缝上一针 +${value}/+${value}。`);
        }
      }
    }
  }
}

function checkWinner(state: BattleState) {
  if (state.winner) return;
  if (state.player.heroHealth <= 0 && state.modifiers?.surviveFatalOnce) {
    state.modifiers.surviveFatalOnce = false;
    state.player.heroHealth = 1;
    pushFx(state, { type: "skill", side: "player", label: "不屈" });
    pushLog(state, "不屈意志护住最后的星火，核心以 1 点生命守住阵线。");
  }
  if (state.player.heroHealth <= 0) {
    state.winner = "enemy";
    pushFx(state, { type: "win", side: "enemy" });
    pushLog(state, "我方核心失守，暮色吞没了战线。");
  } else if (state.enemy.heroHealth <= 0) {
    state.winner = "player";
    pushFx(state, { type: "win", side: "player" });
    pushLog(state, "敌方核心崩塌，我方守住星门。");
  }
}

function playPriority(state: BattleState, side: Side, unit: BattleUnit): number {
  if (unit.defKind === "weapon") {
    const alreadyHeld = getSide(state, side).weapon ? 1.4 : 3.2;
    return unit.attack * 2 + alreadyHeld - unit.cost * 0.3;
  }
  if (getCard(unit.defId).skill.effect.startsWith("secret-") || getCard(unit.defId).skill.effect === "counter-spell") {
    const alreadySet = getSide(state, side).secrets.length;
    return 3.4 - alreadySet * 0.8 - unit.cost * 0.3;
  }
  const allies = getSide(state, side).board.length;
  const effect = passiveEffect(unit) ?? "";
  const skillValue: Record<string, number> = {
    "battlecry-draw": 2,
    "battlecry-hero-damage": 2,
    "battlecry-hero-heal": 1.6,
    "battlecry-hero-damage-draw": 3,
    "battlecry-spell-discount": 1.8,
    "battlecry-buff": allies * 1.8,
    "battlecry-board-damage": 2.2,
    "battlecry-discount": 1.4,
    "battlecry-token": 2.8,
    "battlecry-banner": allies * 2.2,
    quick: 2.2,
    taunt: 1.2,
    ward: 1.6,
    "ward-start": 1.6,
    "stasis-field": 2.4,
    "end-heal-all": Math.max(1.8, allies * 0.8),
    "end-heal-one": 1,
    "end-ping": 1.6,
    "death-token": 1.6,
    "death-strike": 2.4,
    "wisp-core-heal": 0.8,
    lifesteal: 2,
    venom: 1.8,
    "spell-silence": 3,
    "spell-freeze": 2.6,
    "spell-weak": 2.2,
    "battlecry-tutor": 2.6,
    "battlecry-mana": 2.4,
    "conditional-buff": 1.8,
    "conditional-damage": 2.4,
    "overkill-draw": 2.2,
    "quick-overkill-draw": 2.6,
    "end-conditional-buff": 1.6,
  };
  return unit.attack + unit.health * 0.72 + (skillValue[effect] ?? 0) - unit.cost * 0.3;
}

function damageAgainst(unit: BattleUnit, damage: number): number {
  const effect = passiveEffect(unit);
  if (effect === "stasis-field" && unit.flags.stasisUsed !== 1) return 0;
  const isFreshWard = isWardEffect(effect) && unit.flags.wardUsed !== 1;
  return isFreshWard ? Math.min(1, damage) : damage;
}

function evaluateState(state: BattleState, side: Side): number {
  const me = getSide(state, side);
  const foe = getOpponent(state, side);
  const unitValue = (unit: BattleUnit) => unit.attack + unit.health * 0.8;
  let score = (me.heroHealth - foe.heroHealth) * 2.2;
  score += me.board.reduce((sum, unit) => sum + unitValue(unit), 0);
  score -= foe.board.reduce((sum, unit) => sum + unitValue(unit), 0);
  score += (me.hand.length - foe.hand.length) * 0.5;
  score += Math.min(2, me.nextCheaper + me.nextSpellCheaper) * 1.2;
  score += me.secrets.length * 1.6;
  score -= foe.secrets.length * 1.6;
  return score;
}

function chooseSpellTarget(state: BattleState, side: Side, unit: BattleUnit): { uid?: number } | undefined {
  const player = getSide(state, side);
  const opponent = getOpponent(state, side);
  const targetMode = getCard(unit.defId).skill.target ?? "none";
  const strike = getCard(unit.defId).skill.value ?? 0;
  if (targetMode === "enemy-unit") {
    const ranked = [...opponent.board].sort((a, b) => {
      const killsA = damageAgainst(a, strike) >= a.health ? 1000 : 0;
      const killsB = damageAgainst(b, strike) >= b.health ? 1000 : 0;
      return (killsB - killsA) || (b.attack * 3 + b.health) - (a.attack * 3 + a.health);
    });
    return ranked[0] ? { uid: ranked[0].uid } : undefined;
  }
  if (targetMode === "ally-unit") {
    const effect = getCard(unit.defId).skill.effect;
    const rank = effect === "spell-heal"
      ? [...player.board].sort((a, b) => (a.health - a.maxHealth) - (b.health - b.maxHealth))[0]
      : [...player.board].sort((a, b) => b.attack * 3 + b.health - (a.attack * 3 + a.health))[0];
    return rank ? { uid: rank.uid } : undefined;
  }
  return undefined;
}

function spellValue(state: BattleState, side: Side, unit: BattleUnit): number {
  const skill = getCard(unit.defId).skill;
  const effect = skill.effect;
  const value = skill.value ?? 0;
  const player = getSide(state, side);
  const opponent = getOpponent(state, side);
  if (effect === "spell-strike") {
    if (opponent.board.some((foe) => damageAgainst(foe, value) >= foe.health)) return 7 + value;
    return 2.4 + value * 1.3;
  }
  if (effect === "spell-hero-damage") {
    if (opponent.heroHealth <= value) return 14;
    return 2 + value;
  }
  if (effect === "spell-hero-heal") {
    if (player.heroHealth >= player.maxHeroHealth) return 0.2;
    return 1.6 + value * 0.6;
  }
  if (effect === "spell-burst") {
    if (!opponent.board.length) return 0.2;
    return 2 + opponent.board.length * value * 1.4;
  }
  if (effect === "spell-draw") return 1.6 + value * 1.8;
  if (effect === "spell-draw-discount") return 3;
  if (effect === "spell-temp-mana") return player.mana >= player.maxMana ? 2.2 + value * 0.8 : 4.5;
  if (effect === "spell-buff") {
    if (!player.board.length) return 0.2;
    const top = Math.max(...player.board.map((ally) => ally.attack + ally.health));
    return 1.6 + value * 1.4 + top * 0.2;
  }
  if (effect === "spell-heal") {
    if (!player.board.some((ally) => ally.health < ally.maxHealth)) return 0.2;
    return 1.4 + value * 0.7;
  }
  if (effect === "spell-summon") return 2.6;
  if (effect === "spell-buff-all") return 1 + player.board.length * 2;
  if (effect === "spell-tutor-draw") return 3.6;
  if (effect === "spell-heal-or-draw") {
    if (player.board.some((ally) => ally.health < ally.maxHealth)) return 1.8 + value * 0.6;
    return 2.4;
  }
  return 0;
}

function chooseAiTarget(state: BattleState, attacker: BattleUnit, difficulty: AiDifficulty): { hero: boolean; uid?: number } | null {
  const valid = getValidTargets(state, "enemy", attacker.uid);
  if (difficulty === "novice") {
    const firstTarget = valid.units[0];
    return firstTarget ? { hero: false, uid: firstTarget } : valid.hero ? { hero: true } : null;
  }
  if (valid.hero && state.player.heroHealth <= attacker.attack) return { hero: true };
  const candidates = valid.units
    .map((uid) => state.player.board.find((unit) => unit.uid === uid))
    .filter((unit): unit is BattleUnit => Boolean(unit))
    .map((defender) => {
      const damage = damageAgainst(defender, attacker.attack);
      const survivesLethal = passiveEffect(defender) === "last-stand" && defender.flags.lastStand !== 1 && damage >= defender.health;
      const destroys = damage >= defender.health && !survivesLethal;
      const retaliation = destroys ? 0 : damageAgainst(attacker, defender.attack);
      const attackerSurvives = retaliation < attacker.health;
      const score = (destroys ? 36 : 0) + defender.attack * 3 + defender.cost * 1.5 + (attackerSurvives ? 4 : -8) - Math.max(0, retaliation - 1);
      return { defender, score, destroys };
    })
    .sort((left, right) => right.score - left.score);
  if (!candidates.length) return valid.hero ? { hero: true } : null;
  if (difficulty === "skilled" && valid.hero && !candidates[0].destroys) return { hero: true };
  if (!valid.hero || candidates[0].destroys || candidates[0].score >= (difficulty === "master" ? 14 : 20)) return { hero: false, uid: candidates[0].defender.uid };
  return { hero: true };
}

function chooseAiAttackWithLookahead(state: BattleState, attacker: BattleUnit): { hero: boolean; uid?: number } | null {
  const valid = getValidTargets(state, "enemy", attacker.uid);
  const candidates: { hero: boolean; uid?: number }[] = [
    ...valid.units.map((uid) => ({ hero: false, uid })),
    ...(valid.hero ? [{ hero: true }] : []),
  ];
  if (!candidates.length) return null;
  const base = evaluateState(state, "enemy");
  let best: { hero: boolean; uid?: number } | null = null;
  let bestScore = base;
  for (const candidate of candidates) {
    const draft: BattleState = cloneBattleState(state);
    attackTarget(draft, "enemy", attacker.uid, candidate);
    if (draft.winner) {
      if (draft.winner === "enemy") return candidate;
      continue;
    }
    const score = evaluateState(draft, "enemy");
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function tryAiPlayCard(state: BattleState, handIndex: number): boolean {
  const unit = state.enemy.hand[handIndex];
  if (!unit) return false;
  if (unit.defKind === "spell") {
    const options = getSpellPlayOptions(state, "enemy", handIndex);
    if (!options.playable) return false;
    const target = options.needsTarget ? chooseSpellTarget(state, "enemy", unit) : undefined;
    if (options.needsTarget && !target) return false;
    playSpell(state, "enemy", handIndex, target);
    return true;
  }
  playCard(state, "enemy", handIndex);
  return true;
}

export function endTurn(state: BattleState): BattleState {
  if (state.winner) return state;
  if (state.pendingChoice) return state;
  runTurnEnd(state, state.turn);
  const next = getOtherSide(state.turn);
  const nextSide = getSide(state, next);
  state.turn = next;
  if (next === "player") {
    state.turnNumber += 1;
    const manaCap = Math.min(MAX_MANA, state.turnNumber);
    state.player.maxMana = manaCap;
    state.enemy.maxMana = manaCap;
  }
  nextSide.mana = nextSide.maxMana;
  nextSide.heroPowerUsed = false;
  nextSide.heroAttacked = false;
  for (const unit of nextSide.board) {
    if (unit.flags.frozen === 1) {
      unit.canAttack = false;
      unit.flags.frozen = 0;
    } else {
      unit.canAttack = true;
    }
  }
  // 起手先 3 后 4，第二回合起每轮摸 1 张。
  if (state.turnNumber > 1) drawCardInner(state, next);
  runTurnStart(state, next);
  pushLog(state, `第 ${state.turnNumber} 回合：${next === "player" ? "我方行动" : "敌方行动"}。`);
  checkWinner(state);
  return state;
}

export function getHeroPowerState(state: BattleState, side: Side): { def: HeroPowerDef; ready: boolean } {
  const target = getSide(state, side);
  const def = HERO_POWERS[target.faction] ?? HERO_POWERS["天衡"];
  return { def, ready: !state.winner && state.turn === side && !target.heroPowerUsed && target.mana >= def.cost };
}

export function useHeroPower(state: BattleState, side: Side, target?: { uid?: number }): BattleState {
  if (state.winner || state.turn !== side || state.pendingChoice) return state;
  const targetSide = getSide(state, side);
  const def = HERO_POWERS[targetSide.faction] ?? HERO_POWERS["天衡"];
  if (targetSide.heroPowerUsed || targetSide.mana < def.cost) return state;
  if (def.target) {
    const pool = def.target === "ally-unit" ? targetSide.board : getOpponent(state, side).board;
    const chosen = pool.find((unit) => unit.uid === target?.uid);
    if (!chosen) return state;
  }
  targetSide.mana -= def.cost;
  targetSide.heroPowerUsed = true;
  targetSide.nextCheaper = 0;
  targetSide.nextSpellCheaper = 0;
  pushFx(state, { type: "skill", side, label: def.name });
  pushLog(state, `${side === "player" ? "我方" : "敌方"}发动英雄技能「${def.name}」。`);
  if (def.effect === "hero-power-heal-hero") {
    healHero(state, side, def.value, undefined, def.name);
  } else if (def.effect === "hero-power-buff") {
    const ally = targetSide.board.find((unit) => unit.uid === target?.uid);
    if (ally) {
      boostUnit(state, side, ally, 0, def.value);
      pushLog(state, `「${ally.name}」获得 +0/+${def.value}。`);
    }
  } else if (def.effect === "hero-power-damage-hero") {
    dealHeroDamage(state, getOtherSide(side), def.value, undefined, def.name);
  } else if (def.effect === "hero-power-draw") {
    for (let index = 0; index < def.value; index += 1) drawCardInner(state, side);
  } else if (def.effect === "hero-power-heal-unit") {
    const ally = targetSide.board.find((unit) => unit.uid === target?.uid);
    if (ally) healUnit(state, side, ally, def.value);
  }
  checkWinner(state);
  return state;
}

function chooseHeroPowerTarget(state: BattleState, side: Side, def: HeroPowerDef): { uid?: number } | undefined {
  const target = getSide(state, side);
  if (def.effect === "hero-power-heal-unit") {
    const wounded = [...target.board].sort((a, b) => (a.health - a.maxHealth) - (b.health - b.maxHealth))[0];
    return wounded && wounded.health < wounded.maxHealth ? { uid: wounded.uid } : undefined;
  }
  if (def.effect === "hero-power-buff") {
    const top = [...target.board].sort((a, b) => b.attack * 3 + b.health - (a.attack * 3 + a.health))[0];
    return top ? { uid: top.uid } : undefined;
  }
  return undefined;
}

function resolvePendingDiscover(state: BattleState) {
  const pending = state.pendingChoice;
  if (pending && pending.kind === "discover") resolveDiscover(state, chooseDiscoverOption(state, pending.options));
}

export function aiTurn(state: BattleState, difficulty: AiDifficulty = "skilled"): BattleState {
  if (state.winner || state.turn !== "enemy") return state;
  if (!state.mulligan.enemy) aiMulliganInternal(state, difficulty);
  const enemy = state.enemy;
  resolvePendingDiscover(state);
  let playsRemaining = difficulty === "novice" ? 1 : difficulty === "skilled" ? 2 : MAX_HAND;
  if (difficulty === "novice") {
    const playable = enemy.hand
      .map((unit, index) => ({ unit, index, cost: getCardCost(state, "enemy", unit), priority: unit.defKind === "spell" ? (getCard(unit.defId).skill.effect.startsWith("secret-") ? playPriority(state, "enemy", unit) : spellValue(state, "enemy", unit)) : playPriority(state, "enemy", unit) }))
      .filter((entry) => entry.cost <= enemy.mana && (unit => unit.defKind === "spell" || unit.defKind === "weapon" || enemy.board.length < MAX_BOARD)(entry.unit))
      .sort((a, b) => a.index - b.index);
    if (playable.length) {
      tryAiPlayCard(state, playable[0].index);
      resolvePendingDiscover(state);
    }
  } else {
    const useLookahead = difficulty === "expert" || difficulty === "master";
    const baseScore = evaluateState(state, "enemy");
    while (playsRemaining > 0) {
      const candidates = enemy.hand
        .map((unit, index) => ({ unit, index, cost: getCardCost(state, "enemy", unit) }))
        .filter((entry) => entry.cost <= enemy.mana && (entry.unit.defKind === "spell" || entry.unit.defKind === "weapon" || enemy.board.length < MAX_BOARD));
      if (!candidates.length) break;
      let bestIndex = -1;
      // 前瞻模式与局面评估分比较；启发式模式的候选分是另一量纲（个位数），
      // 必须从 -Infinity 起评，否则领先时 AI 会一张牌都不打。
      let bestScore = useLookahead ? baseScore : -Infinity;
      for (const candidate of candidates) {
        const draft: BattleState = cloneBattleState(state);
        if (candidate.unit.defKind === "spell") {
          const options = getSpellPlayOptions(draft, "enemy", candidate.index);
          const target = options.needsTarget ? chooseSpellTarget(draft, "enemy", candidate.unit) : undefined;
          if (options.needsTarget && !target) continue;
          playSpell(draft, "enemy", candidate.index, target);
        } else {
          playCard(draft, "enemy", candidate.index);
        }
        const score = useLookahead ? evaluateState(draft, "enemy") : spellValue(state, "enemy", candidate.unit) + playPriority(state, "enemy", candidate.unit);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = candidate.index;
        }
      }
      if (bestIndex < 0) break;
      tryAiPlayCard(state, bestIndex);
      resolvePendingDiscover(state);
      playsRemaining -= 1;
    }
  }
  const heroPower = HERO_POWERS[state.enemy.faction] ?? HERO_POWERS["天衡"];
  if (!state.enemy.heroPowerUsed && state.enemy.mana >= heroPower.cost && !state.winner) {
    const heroTarget = heroPower.target ? chooseHeroPowerTarget(state, "enemy", heroPower) : undefined;
    if (!heroPower.target || heroTarget) useHeroPower(state, "enemy", heroTarget);
  }
  for (const attacker of [...enemy.board]) {
    let target = useLookaheadForAttack(difficulty) ? chooseAiAttackWithLookahead(state, attacker) : chooseAiTarget(state, attacker, difficulty);
    let attacksRemaining = MAX_BOARD + 1;
    while (target && attacksRemaining > 0 && getSide(state, "enemy").board.find((unit) => unit.uid === attacker.uid)?.canAttack && !state.winner) {
      attackTarget(state, "enemy", attacker.uid, target);
      attacksRemaining -= 1;
      target = useLookaheadForAttack(difficulty) ? chooseAiAttackWithLookahead(state, attacker) : chooseAiTarget(state, attacker, difficulty);
    }
    if (state.winner) break;
  }
  if (state.enemy.weapon && !state.enemy.heroAttacked && !state.winner) {
    const validTargets = getValidWeaponTargets(state, "enemy");
    if (validTargets.hero || validTargets.units.length) {
      const weaponTarget: { hero: boolean; uid?: number } = validTargets.units.length ? { hero: false, uid: validTargets.units[0] } : { hero: true };
      attackWithWeapon(state, "enemy", weaponTarget);
    }
  }
  return endTurn(state);
}

function useLookaheadForAttack(difficulty: AiDifficulty) {
  return difficulty === "expert" || difficulty === "master";
}
