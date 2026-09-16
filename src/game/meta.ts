import { CARD_POOL } from "../data/cards";
import type { CardType, Rarity } from "../types";

export interface CommanderProfile {
  id: string;
  name: string;
  faction: CardType;
  createdAt: string;
}

export interface BadgeState {
  id: "stargate-pioneer" | "rift-vanguard" | "eclipse-crown";
  level: number;
  progress: number;
  unlockedAt?: string;
}

export interface MissionCycleState {
  dailyKey: string;
  weeklyKey: string;
  daily: { wins: number; games: number };
  weekly: { wins: number; games: number; bestStreak: number };
}

export interface MetaSave {
  commander: CommanderProfile | null;
  commanderXp: number;
  commanderLevel: number;
  badges: BadgeState[];
  lastSyncedAt: string;
  starDust: number;
  guildMarks: number;
  ownedShopItems: string[];
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  seasonPoints: number;
  claimedMissions: string[];
  achieved: string[];
  dailyClaimedDate: string;
  guildProgress: number;
  tutorialDone: boolean;
  arcaneDust: number;
  collection: Record<string, number>;
  campaignCleared: string[];
  passTier: "free" | "premium" | null;
  missionCycle: MissionCycleState;
}

export const MAX_CARD_COPIES = 2;
export const PACK_COST = 120;
export const PACK_SIZE = 5;

export const DUST_TABLE: Record<Rarity, { craft: number; disenchant: number }> = {
  R: { craft: 40, disenchant: 10 },
  SR: { craft: 120, disenchant: 25 },
  SSR: { craft: 400, disenchant: 100 },
  UR: { craft: 1600, disenchant: 400 },
};

export const DEFAULT_DECK = [
  "dawn-scout", "dawn-horn", "iron-guard", "wall-smith", "void-pickpocket",
  "seed-guardian", "rune-seeker", "ember-adept", "night-tide", "wild-bloom",
  "sky-lantern", "sunblade", "mirror-smith", "night-conductor", "aether-weaver",
  "dust-rider", "solar-judge", "star-archivist", "hollow-beast", "grave-watcher",
  "siege-engine", "forge-singer", "comet-ranger", "time-echo", "wild-mother",
  "rift-oracle", "bastion-warden", "thunder-herd", "titan-keeper", "astral-queen",
];

function buildStarterCollection(): Record<string, number> {
  const collection: Record<string, number> = {};
  for (const id of DEFAULT_DECK) collection[id] = Math.max(collection[id] ?? 0, MAX_CARD_COPIES);
  return collection;
}

export interface MissionDef {
  id: string;
  cycle: "daily" | "weekly";
  title: string;
  reward: string;
  total: number;
  progress: (meta: MetaSave) => number;
}

function cycleKey(cycle: "daily" | "weekly"): string {
  const now = new Date();
  if (cycle === "daily") {
    const boundary = new Date(now);
    boundary.setHours(5, 0, 0, 0);
    const effective = now.getTime() < boundary.getTime() ? new Date(now.getTime() - 86_400_000) : now;
    return `D:${effective.toISOString().slice(0, 10)}`;
  }
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  sunday.setHours(5, 0, 0, 0);
  if (sunday.getTime() < now.getTime()) sunday.setDate(sunday.getDate() + 7);
  return `W:${sunday.toISOString().slice(0, 10)}`;
}

export function isMissionClaimed(meta: MetaSave, missionId: string): boolean {
  const def = MISSION_DEFS.find((entry) => entry.id === missionId);
  if (!def) return false;
  return meta.claimedMissions.includes(`${missionId}:${cycleKey(def.cycle)}`);
}

const EMPTY_MISSION_CYCLE: MissionCycleState = {
  dailyKey: "",
  weeklyKey: "",
  daily: { wins: 0, games: 0 },
  weekly: { wins: 0, games: 0, bestStreak: 0 },
};

// 周期滚动：日/周键变化时对应计数归零。任务进度只看周期内增量，
// 防止「终身累计达标 → 每个周期重复领取」的刷奖励漏洞。
function rollMissionCycle(meta: MetaSave): MissionCycleState {
  const current = meta.missionCycle ?? EMPTY_MISSION_CYCLE;
  const dailyKey = cycleKey("daily");
  const weeklyKey = cycleKey("weekly");
  if (current.dailyKey === dailyKey && current.weeklyKey === weeklyKey) return current;
  return {
    dailyKey,
    weeklyKey,
    daily: current.dailyKey === dailyKey ? { ...current.daily } : { wins: 0, games: 0 },
    weekly: current.weeklyKey === weeklyKey ? { ...current.weekly } : { wins: 0, games: 0, bestStreak: 0 },
  };
}

const META_KEY = "astra-frontline-meta-v1";

export const DEFAULT_META: MetaSave = {
  commander: null,
  commanderXp: 0,
  commanderLevel: 0,
  badges: [],
  lastSyncedAt: "",
  starDust: 840,
  guildMarks: 36,
  ownedShopItems: [],
  wins: 0,
  losses: 0,
  streak: 0,
  bestStreak: 0,
  seasonPoints: 200,
  claimedMissions: [],
  achieved: [],
  dailyClaimedDate: "",
  guildProgress: 72,
  tutorialDone: false,
  arcaneDust: 120,
  collection: buildStarterCollection(),
  campaignCleared: [],
  passTier: null,
  missionCycle: EMPTY_MISSION_CYCLE,
};

export function xpToNextLevel(level: number): number {
  if (level <= 0) return 120;
  if (level < 10) return 220 + level * 35;
  if (level < 30) return 550 + (level - 10) * 55;
  if (level < 60) return 1650 + (level - 30) * 75;
  return 3900 + (level - 60) * 100;
}

export function normalizeProgression(meta: MetaSave): MetaSave {
  const badges = Array.isArray(meta.badges) ? meta.badges : [];
  return { ...meta, commanderLevel: Math.min(100, Math.max(0, meta.commanderLevel ?? 0)), commanderXp: Math.max(0, meta.commanderXp ?? 0), badges, missionCycle: rollMissionCycle(meta) };
}

export function createCommander(meta: MetaSave, name: string, faction: CardType): MetaSave {
  const id = `XF-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const next: MetaSave = {
    ...meta,
    commander: { id, name, faction, createdAt: new Date().toISOString() },
    commanderLevel: 0,
    commanderXp: 0,
    badges: [],
    lastSyncedAt: new Date().toISOString(),
  };
  saveMeta(next);
  return next;
}

export function gainCommanderXp(meta: MetaSave, amount: number): { meta: MetaSave; levelsGained: number } {
  let level = meta.commanderLevel;
  let xp = meta.commanderXp + Math.max(0, amount);
  const startLevel = level;
  while (level < 100 && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
  }
  const next = normalizeProgression({ ...meta, commanderLevel: level, commanderXp: xp });
  saveMeta(next);
  return { meta: next, levelsGained: level - startLevel };
}

export function syncBadgeProgress(meta: MetaSave): MetaSave {
  const now = new Date().toISOString();
  const definitions: BadgeState[] = [
    { id: "stargate-pioneer", level: meta.tutorialDone ? Math.min(3, 1 + Math.floor(meta.wins / 3)) : 0, progress: Math.min(3, (meta.tutorialDone ? 1 : 0) + Math.floor(meta.wins / 3)) },
    { id: "rift-vanguard", level: meta.commanderLevel >= 75 ? 3 : meta.commanderLevel >= 50 ? 2 : meta.commanderLevel >= 25 ? 1 : 0, progress: Math.min(75, meta.commanderLevel) },
    { id: "eclipse-crown", level: meta.seasonPoints >= 2600 ? 3 : meta.seasonPoints >= 1600 ? 2 : meta.seasonPoints >= 800 ? 1 : 0, progress: Math.min(2600, meta.seasonPoints) },
  ];
  const badges = definitions.map((badge) => {
    const existing = meta.badges.find((item) => item.id === badge.id);
    return { ...badge, unlockedAt: badge.level > 0 ? existing?.unlockedAt ?? now : undefined };
  });
  return { ...meta, badges };
}

export function markTutorialDone(meta: MetaSave): MetaSave {
  const next = syncBadgeProgress(gainCommanderXp({ ...meta, tutorialDone: true }, meta.tutorialDone ? 0 : 180).meta);
  saveMeta(next);
  return next;
}

export function loadMeta(): MetaSave {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return DEFAULT_META;
    return normalizeProgression({ ...DEFAULT_META, ...raw });
  } catch {
    return DEFAULT_META;
  }
}

export function saveMeta(meta: MetaSave) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Storage may be unavailable (private mode, sandboxed frame); save is best-effort.
  }
}

export const ACHIEVEMENT_DEFS: Array<{ id: string; name: string; desc: string; check: (meta: MetaSave) => boolean }> = [
  { id: "first-win", name: "初战告捷", desc: "赢得第一场模拟战场胜利", check: (meta) => meta.wins >= 1 },
  { id: "win-5", name: "五连星门", desc: "累计赢得 5 场模拟战场", check: (meta) => meta.wins >= 5 },
  { id: "win-10", name: "十曜战线", desc: "累计赢得 10 场模拟战场", check: (meta) => meta.wins >= 10 },
  { id: "win-30", name: "裂隙功勋", desc: "完成 30 场胜局", check: (meta) => meta.wins >= 30 },
  { id: "streak-3", name: "三日不落", desc: "取得 3 连胜", check: (meta) => meta.bestStreak >= 3 },
  { id: "streak-5", name: "连胜烈焰", desc: "取得 5 连胜", check: (meta) => meta.bestStreak >= 5 },
  { id: "season-1000", name: "星辉段位", desc: "赛季积分抵达 1000", check: (meta) => meta.seasonPoints >= 1000 },
];

export const MISSION_DEFS: MissionDef[] = [
  { id: "daily-win", cycle: "daily", title: "完成 1 次前线交战", reward: "120 星辉", total: 1, progress: (meta) => meta.missionCycle?.daily.wins ?? 0 },
  { id: "daily-fight", cycle: "daily", title: "核验 3 份战场报告", reward: "80 星辉", total: 3, progress: (meta) => meta.missionCycle?.daily.games ?? 0 },
  { id: "weekly-win", cycle: "weekly", title: "赢下 3 场五钥交战", reward: "180 星辉", total: 3, progress: (meta) => meta.missionCycle?.weekly.wins ?? 0 },
  { id: "weekly-streak", cycle: "weekly", title: "连续守住 2 份证词", reward: "史诗秘匣", total: 2, progress: (meta) => meta.missionCycle?.weekly.bestStreak ?? 0 },
];

export function refreshAchievements(meta: MetaSave): string[] {
  const gained = ACHIEVEMENT_DEFS.filter((def) => !meta.achieved.includes(def.id) && def.check(meta)).map((def) => def.id);
  return gained.length ? [...new Set([...meta.achieved, ...gained])] : meta.achieved;
}

export function applyBattleResult(meta: MetaSave, won: boolean): { meta: MetaSave; reward: number; newAchievements: string[] } {
  const next: MetaSave = { ...meta, missionCycle: rollMissionCycle(meta) };
  if (won) {
    next.wins += 1;
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    next.seasonPoints += 40;
    next.starDust += 100 + Math.min(60, (next.streak - 1) * 20);
  } else {
    next.losses += 1;
    next.streak = 0;
    next.seasonPoints = Math.max(0, next.seasonPoints - 10);
    next.starDust += 30;
  }
  next.missionCycle = {
    ...next.missionCycle,
    daily: { wins: next.missionCycle.daily.wins + (won ? 1 : 0), games: next.missionCycle.daily.games + 1 },
    weekly: {
      wins: next.missionCycle.weekly.wins + (won ? 1 : 0),
      games: next.missionCycle.weekly.games + 1,
      bestStreak: Math.max(next.missionCycle.weekly.bestStreak, next.streak),
    },
  };
  const before = next.achieved;
  next.achieved = refreshAchievements(next);
  const progressed = syncBadgeProgress(gainCommanderXp(next, won ? 45 : 20).meta);
  saveMeta(progressed);
  return { meta: progressed, reward: won ? 100 + Math.min(60, (next.streak - 1) * 20) : 30, newAchievements: progressed.achieved.filter((id) => !before.includes(id)) };
}

export function claimMission(meta: MetaSave, missionId: string): MetaSave {
  const base = normalizeProgression(meta);
  const def = MISSION_DEFS.find((entry) => entry.id === missionId);
  if (!def || isMissionClaimed(base, missionId) || def.progress(base) < def.total) return base;
  const reward = def.reward.includes("星辉") ? Number(def.reward.match(/\d+/)?.[0] ?? 0) : 0;
  const claimKey = `${missionId}:${cycleKey(def.cycle)}`;
  const next: MetaSave = { ...base, claimedMissions: [...base.claimedMissions, claimKey] };
  if (reward > 0) next.starDust += reward;
  saveMeta(next);
  return next;
}

export function claimDailyGuildReward(meta: MetaSave): MetaSave {
  const today = new Date().toISOString().slice(0, 10);
  if (meta.dailyClaimedDate === today) return meta;
  const next: MetaSave = { ...meta, dailyClaimedDate: today, starDust: meta.starDust + 80, guildMarks: meta.guildMarks + 5 };
  saveMeta(next);
  return next;
}

export function spendCurrency(meta: MetaSave, currency: "starDust" | "guildMarks" | "arcaneDust", cost: number, itemId?: string): MetaSave {
  if (meta[currency] < cost) return meta;
  const next: MetaSave = { ...meta, [currency]: meta[currency] - cost };
  if (itemId) next.ownedShopItems = [...next.ownedShopItems, itemId];
  saveMeta(next);
  return next;
}

export function addCurrency(meta: MetaSave, currency: "starDust" | "guildMarks", amount: number, source?: string): MetaSave {
  const next: MetaSave = { ...meta, [currency]: meta[currency] + amount };
  saveMeta(next);
  return next;
}

export function seasonRank(points: number): { title: string; next: string; progress: number; from: number; to: number } {
  if (points >= 1500) return { title: "日蚀冠冕", next: "段位已满", progress: 100, from: 1500, to: 1500 };
  if (points >= 1000) return { title: "裂隙功勋", next: "日蚀冠冕", progress: ((points - 1000) / 500) * 100, from: 1000, to: 1500 };
  if (points >= 400) return { title: "星门先锋", next: "裂隙功勋", progress: ((points - 400) / 600) * 100, from: 400, to: 1000 };
  return { title: "星门旅者", next: "星门先锋", progress: (points / 400) * 100, from: 0, to: 400 };
}

const SEASON_BOARD_SEEDS: Array<{ name: string; score: number; faction: string; badge: string }> = [
  { name: "极昼执政官", score: 1482, faction: "天衡", badge: "日蚀冠冕" },
  { name: "蔷薇战争", score: 1439, faction: "幽冥", badge: "裂隙功勋" },
  { name: "零号锻师", score: 1388, faction: "铁律", badge: "星门先锋" },
  { name: "尘风旅团", score: 1219, faction: "山海", badge: "裂隙功勋" },
  { name: "裂隙观测站", score: 1195, faction: "天机", badge: "裂隙功勋" },
  { name: "长夜校准者", score: 1166, faction: "幽冥", badge: "星门先锋" },
  { name: "白曜航标", score: 1141, faction: "天衡", badge: "星门先锋" },
];

export function buildRanking(meta: MetaSave) {
  const rank = seasonRank(meta.seasonPoints);
  const rows = [...SEASON_BOARD_SEEDS, { name: "星门旅者", score: meta.seasonPoints, faction: "你", badge: rank.title }]
    .sort((left, right) => right.score - left.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const player = rows.find((entry) => entry.faction === "你") ?? rows[rows.length - 1];
  return { rows, player, rank };
}

export interface PackedCard {
  defId: string;
  rarity: Rarity;
  isNew: boolean;
  dustGained: number;
}

export interface PackResult {
  cards: PackedCard[];
  totalDust: number;
}

function rollRarity(guaranteed: boolean): Rarity {
  const roll = Math.random() * 100;
  if (guaranteed) return roll < 4 ? "UR" : roll < 16 ? "SSR" : "SR";
  if (roll < 0.5) return "UR";
  if (roll < 3) return "SSR";
  if (roll < 28) return "SR";
  return "R";
}

export function openPack(meta: MetaSave, packs = 1): { meta: MetaSave; results: PackResult[] } {
  const totalCost = PACK_COST * packs;
  if (meta.starDust < totalCost || packs <= 0) return { meta, results: [] };
  const next: MetaSave = { ...meta, starDust: meta.starDust - totalCost, collection: { ...meta.collection } };
  const results: PackResult[] = [];
  for (let packIndex = 0; packIndex < packs; packIndex += 1) {
    const cards: PackedCard[] = [];
    for (let slot = 0; slot < PACK_SIZE; slot += 1) {
      const rarity = rollRarity(slot === PACK_SIZE - 1);
      const pool = CARD_POOL.filter((card) => card.rarity === rarity && !cards.some((drawn) => drawn.defId === card.id));
      if (pool.length === 0) {
        const fallback = CARD_POOL.filter((card) => !cards.some((drawn) => drawn.defId === card.id));
        if (fallback.length === 0) break;
        const def = fallback[Math.floor(Math.random() * fallback.length)];
        const owned = next.collection[def.id] ?? 0;
        let dustGained = 0;
        let isNew = false;
        if (owned >= MAX_CARD_COPIES) {
          dustGained = DUST_TABLE[def.rarity].disenchant;
          next.arcaneDust += dustGained;
        } else {
          next.collection[def.id] = owned + 1;
          isNew = true;
        }
        cards.push({ defId: def.id, rarity: def.rarity, isNew, dustGained });
        continue;
      }
      const defId = pool[Math.floor(Math.random() * pool.length)].id;
      const owned = next.collection[defId] ?? 0;
      let dustGained = 0;
      let isNew = false;
      if (owned >= MAX_CARD_COPIES) {
        dustGained = DUST_TABLE[rarity].disenchant;
        next.arcaneDust += dustGained;
      } else {
        next.collection[defId] = owned + 1;
        isNew = true;
      }
      cards.push({ defId, rarity, isNew, dustGained });
    }
    results.push({ cards, totalDust: cards.reduce((sum, card) => sum + card.dustGained, 0) });
  }
  saveMeta(next);
  return { meta: next, results };
}

export function disenchantCard(meta: MetaSave, defId: string): MetaSave {
  const owned = meta.collection[defId] ?? 0;
  if (owned <= 0) return meta;
  const card = CARD_POOL.find((entry) => entry.id === defId);
  if (!card) return meta;
  const next: MetaSave = { ...meta, collection: { ...meta.collection, [defId]: owned - 1 }, arcaneDust: meta.arcaneDust + DUST_TABLE[card.rarity].disenchant };
  saveMeta(next);
  return next;
}

export function craftCard(meta: MetaSave, defId: string): MetaSave {
  const owned = meta.collection[defId] ?? 0;
  const card = CARD_POOL.find((entry) => entry.id === defId);
  if (!card || owned >= MAX_CARD_COPIES) return meta;
  const cost = DUST_TABLE[card.rarity].craft;
  if (meta.arcaneDust < cost) return meta;
  const next: MetaSave = { ...meta, collection: { ...meta.collection, [defId]: owned + 1 }, arcaneDust: meta.arcaneDust - cost };
  saveMeta(next);
  return next;
}

export function recordCampaignWin(meta: MetaSave, arcId: string): MetaSave {
  if (meta.campaignCleared.includes(arcId)) return meta;
  const next: MetaSave = { ...meta, campaignCleared: [...meta.campaignCleared, arcId] };
  saveMeta(next);
  return next;
}

export function isCampaignUnlocked(campaignCleared: string[], arcIndex: number): boolean {
  return arcIndex === 0 ? true : campaignCleared.length >= arcIndex;
}

export function collectionCount(collection: Record<string, number>): number {
  return Object.values(collection).reduce((sum, count) => sum + count, 0);
}

export function collectionUnique(collection: Record<string, number>): number {
  return Object.keys(collection).length;
}
