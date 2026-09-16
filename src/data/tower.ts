import type { AiDifficulty, BattleState } from "../types";
import { CARD_POOL } from "./cards";
import { RULES } from "../game/rules";
import { aiMulligan, createBattle } from "../game/engine";

// ── 无尽爬塔 · 数据与规则 ──────────────────────────────

export type TowerBuffId =
  | "vitality"        // 生命 +8
  | "swiftness"       // 开局多摸 2 张
  | "insight"         // 敌方核心 -5 初始生命
  | "discount"        // 首回合所有牌费用 -1
  | "fortitude"       // 敌方初始攻击 -1（所有单位）
  | "fortune"         // 每层胜利额外 +40 星辉
  | "overflow"        // 法力上限 +1（整局）
  | "healing"         // 每层战后核心恢复 4 点
  | "veteran"         // 开局获得一张「铁壁司命」临时加入手牌
  | "shadow"          // 敌方无法在首回合使用英雄技能
  | "draft"           // 每层胜利后奖励选择改为 4 选 1
  | "resolve"         // 战败时保留 1 点核心生命（每层一次）;

export interface TowerBuff {
  id: TowerBuffId;
  name: string;
  desc: string;
  icon: string;
  rarity: "common" | "rare" | "epic";
  apply: (state: BattleState, floor: number) => void;
}

const RANDOM_POOL = CARD_POOL.filter((card) => card.rarity === "R" || card.rarity === "SR");

function buildEnemyDeck(floor: number): string[] {
  const depth = Math.min(floor, 12);
  let seed = (floor * 7919 + depth * 104729) >>> 0;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const pool = [...RANDOM_POOL];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const deck: string[] = [];
  const primary = pool.slice(0, Math.min(8 + depth, 15));
  for (const card of primary) deck.push(card.id, card.id);
  while (deck.length < RULES.MAX_DECK) {
    const card = primary[Math.floor(rand() * primary.length)];
    deck.push(card.id);
  }
  return deck.slice(0, RULES.MAX_DECK);
}

export function enemyDifficulty(floor: number): AiDifficulty {
  if (floor <= 3) return "novice";
  if (floor <= 6) return "skilled";
  if (floor <= 10) return "expert";
  return "master";
}

export function buildTowerFloor(floor: number): { enemyDeck: string[]; difficulty: AiDifficulty; boss: boolean } {
  const boss = floor % 5 === 0;
  const difficulty = boss ? "master" : enemyDifficulty(floor);
  return { enemyDeck: buildEnemyDeck(floor), difficulty, boss };
}

export const TOWER_BUFFS: Record<TowerBuffId, TowerBuff> = {
  vitality: { id: "vitality", name: "生机", desc: "核心生命上限 +8，当前生命同步提升。", icon: "生", rarity: "common", apply: (state) => { state.player.maxHeroHealth += 8; state.player.heroHealth += 8; } },
  swiftness: { id: "swiftness", name: "疾行", desc: "开局额外摸 2 张牌。", icon: "疾", rarity: "common", apply: (state) => { for (let i = 0; i < 2; i += 1) { if (state.player.deck.length) { const card = state.player.deck.shift()!; state.player.hand.push({ uid: ++state.uidCounter, defId: card, defKind: CARD_POOL.find((c) => c.id === card)?.kind ?? "unit", name: CARD_POOL.find((c) => c.id === card)?.name ?? "?", icon: CARD_POOL.find((c) => c.id === card)?.icon ?? "?", color: CARD_POOL.find((c) => c.id === card)?.color ?? "#888", cost: CARD_POOL.find((c) => c.id === card)?.cost ?? 0, attack: CARD_POOL.find((c) => c.id === card)?.attack ?? 0, health: CARD_POOL.find((c) => c.id === card)?.health ?? 0, maxHealth: CARD_POOL.find((c) => c.id === card)?.health ?? 0, canAttack: false, summoned: false, buffAttack: 0, buffHealth: 0, flags: {} }); } } } },
  insight: { id: "insight", name: "洞察", desc: "敌方核心初始生命 -5。", icon: "察", rarity: "rare", apply: (state) => { state.enemy.heroHealth = Math.max(1, state.enemy.heroHealth - 5); state.enemy.maxHeroHealth = state.enemy.heroHealth; } },
  discount: { id: "discount", name: "先机", desc: "本局第一回合我方所有牌费用 -1。", icon: "先", rarity: "rare", apply: (state) => { state.player.nextCheaper = 1; state.player.nextSpellCheaper = 1; } },
  fortitude: { id: "fortitude", name: "坚壁", desc: "敌方所有单位初始攻击 -1（最低 0）。", icon: "壁", rarity: "epic", apply: (state) => { for (const unit of state.enemy.board) { unit.attack = Math.max(0, unit.attack - 1); } for (const unit of state.enemy.hand) { if (unit.attack > 0) unit.attack = Math.max(0, unit.attack - 1); } } },
  fortune: { id: "fortune", name: "福星", desc: "每层胜利额外获得 40 星辉。", icon: "福", rarity: "common", apply: () => { /* 由结算层处理 */ } },
  overflow: { id: "overflow", name: "溢灵", desc: "法力上限 +1（本局所有回合）。", icon: "溢", rarity: "epic", apply: (state) => { state.player.maxMana += 1; state.player.mana += 1; } },
  healing: { id: "healing", name: "回春", desc: "每层战斗胜利后核心恢复 4 点生命。", icon: "春", rarity: "common", apply: () => { /* 由结算层处理 */ } },
  veteran: { id: "veteran", name: "老兵", desc: "开局获得一张「铁壁司命」加入手牌。", icon: "兵", rarity: "rare", apply: (state) => { if (state.player.hand.length < 10) state.player.hand.push({ uid: ++state.uidCounter, defId: "bastion-warden", defKind: "unit", name: "铁壁司命", icon: "垒", color: "#B7C6D7", cost: 6, attack: 3, health: 8, maxHealth: 8, canAttack: false, summoned: false, buffAttack: 0, buffHealth: 0, flags: {} }); } },
  shadow: { id: "shadow", name: "蔽影", desc: "敌方首回合无法使用英雄技能。", icon: "影", rarity: "common", apply: (state) => { state.enemy.heroPowerUsed = true; } },
  draft: { id: "draft", name: "擢选", desc: "战斗胜利后的奖励改为 4 选 1。", icon: "选", rarity: "rare", apply: () => { /* 由结算层处理 */ } },
  resolve: { id: "resolve", name: "不屈", desc: "战败时保留 1 点核心生命（每层一次）。", icon: "毅", rarity: "epic", apply: () => { /* 由结算层处理 */ } },
};

export function createTowerBattle(playerDeck: string[], floor: number, buffs: TowerBuffId[]): BattleState {
  const { enemyDeck, difficulty } = buildTowerFloor(floor);
  const state = createBattle(playerDeck, enemyDeck, towerSeedForFloor(floor));
  aiMulligan(state, difficulty);
  for (const buffId of buffs) {
    const buff = TOWER_BUFFS[buffId];
    if (buff) buff.apply(state, floor);
  }
  state.mulligan.player = true;
  state.mulligan.enemy = true;
  return state;
}

export function towerSeedForFloor(floor: number): number {
  return (floor * 2654435761) % 4294967296;
}

// 应用一局爬塔增益 + 跨层核心生命继承（Roguelike 语义：血量在层与层之间延续）。
export function setupTowerState(state: BattleState, floor: number, buffs: TowerBuffId[], hp: number): void {
  for (const buffId of buffs) {
    const buff = TOWER_BUFFS[buffId];
    if (buff) buff.apply(state, floor);
  }
  state.player.heroHealth = Math.min(hp > 0 ? hp : RULES.HERO_HEALTH, state.player.maxHeroHealth);
  if (buffs.includes("resolve")) state.modifiers = { ...state.modifiers, surviveFatalOnce: true };
}

export const TOWER_MAX_FLOORS = 15;
export const TOWER_FLOOR_REWARD = 60;
export const TOWER_BOSS_REWARD = 150;
export const TOWER_SAVE_KEY = "astra-frontline-tower-run-v1";

export interface TowerRun {
  floor: number;
  buffs: TowerBuffId[];
  rewards: number;
  bestFloor: number;
  /** 跨层继承的核心生命；<=0 视为尚未开战（旧存档兼容），按满血处理。 */
  hp: number;
}

export function towerRewardForFloor(floor: number, boss: boolean): number {
  return (boss ? TOWER_BOSS_REWARD : TOWER_FLOOR_REWARD) + Math.floor(floor * 10);
}

// ── 每日挑战 ──────────────────────────────────────────
export interface DailyChallenge {
  dateKey: string;
  enemyDeck: string[];
  difficulty: AiDifficulty;
  reward: number;
}

export function todayKey(): string {
  const now = new Date();
  const utc = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return utc.toISOString().slice(0, 10);
}

/** 每日挑战种子：由日期决定，全服同一道题（敌阵与战斗种子共用）。 */
export function dailyChallengeSeed(dateKey: string): number {
  let hash = 0;
  for (const ch of dateKey) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash || 1;
}

export function buildDailyChallenge(): DailyChallenge {
  const key = todayKey();
  let seed = dailyChallengeSeed(key);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const pool = [...RANDOM_POOL];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const deck: string[] = [];
  const primary = pool.slice(0, 10);
  for (const card of primary) deck.push(card.id, card.id);
  while (deck.length < RULES.MAX_DECK) deck.push(primary[Math.floor(rand() * primary.length)].id);
  return { dateKey: key, enemyDeck: deck.slice(0, RULES.MAX_DECK), difficulty: "expert", reward: 200 };
}

export const DAILY_SAVE_KEY = "astra-frontline-daily-challenge-v1";

// ── 竞技场轮抽 ────────────────────────────────────────
export const DRAFT_PICKS = 12;
export const DRAFT_MAX_WINS = 12;
export const DRAFT_SAVE_KEY = "astra-frontline-draft-run-v1";

export interface DraftRun {
  picks: string[];
  rewards: number;
  wins: number;
  losses: number;
}

export function rollDraftOptions(count = 3): string[] {
  const pool = [...RANDOM_POOL].sort(() => Math.random() - 0.5);
  return pool.slice(0, count).map((card) => card.id);
}

export function draftReward(wins: number): number {
  return 40 + wins * 40;
}
