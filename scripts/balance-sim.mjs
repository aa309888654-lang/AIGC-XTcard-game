import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const outputDirectory = mkdtempSync(join(tmpdir(), "astra-balance-sim-"));
const viteBin = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");

const MAX_BOARD = 6;
const MAX_HAND = 10;
const GAME_CAP = 60;

const DEFAULT_DECK = [
  "dawn-scout", "iron-guard", "void-pickpocket", "ember-adept", "wild-bloom",
  "sunblade", "mirror-smith", "night-conductor", "aether-weaver", "dust-rider",
  "star-archivist", "hollow-beast", "forge-singer", "comet-ranger", "rift-oracle",
  "dawn-scout", "iron-guard", "void-pickpocket", "ember-adept", "wild-bloom",
  "sunblade", "mirror-smith", "night-conductor", "aether-weaver", "dust-rider",
  "star-archivist", "hollow-beast", "forge-singer", "spark-star", "earth-roots",
];

const MULLIGAN_THRESHOLD = { novice: Infinity, skilled: 4, expert: 3, master: 3 };
const PLAYS_LIMIT = { novice: 1, skilled: 2, expert: MAX_HAND, master: MAX_HAND };

function playableCost(state, side, unit) {
  const target = side === "player" ? state.player : state.enemy;
  const base = Math.max(0, unit.cost - target.nextCheaper);
  return unit.defKind === "spell" ? Math.max(0, base - target.nextSpellCheaper) : base;
}

function chooseSpellTarget(state, side, unit, options) {
  const opponent = side === "player" ? state.enemy : state.player;
  const allies = side === "player" ? state.player : state.enemy;
  if (options.targetMode === "enemy-unit") {
    const pick = options.enemyUnits
      .map((uid) => opponent.board.find((unitEntry) => unitEntry.uid === uid))
      .filter(Boolean)
      .sort((a, b) => b.health - a.health)[0];
    return pick ? { uid: pick.uid } : undefined;
  }
  if (options.targetMode === "ally-unit") {
    const pick = options.allyUnits
      .map((uid) => allies.board.find((unitEntry) => unitEntry.uid === uid))
      .filter(Boolean)
      .sort((a, b) => b.attack - a.attack)[0];
    return pick ? { uid: pick.uid } : undefined;
  }
  return undefined;
}

function botTurn(api, state, difficulty) {
  const { getSpellPlayOptions, playCard, playSpell, getValidTargets, attackTarget, endTurn } = api;
  if (state.winner) return state;
  const side = state.turn;
  const target = side === "player" ? state.player : state.enemy;
  const opponent = side === "player" ? state.enemy : state.player;
  let playsRemaining = PLAYS_LIMIT[difficulty];
  while (playsRemaining > 0) {
    const coinIndex = target.hand.findIndex((unit) => unit.defId === "astral-coin");
    if (coinIndex >= 0) {
      playSpell(state, side, coinIndex, undefined);
      if (state.winner) return state;
      continue;
    }
    let bestIndex = -1;
    let bestCost = -1;
    let bestTarget;
    target.hand.forEach((unit, index) => {
      const cost = playableCost(state, side, unit);
      if (cost > target.mana) return;
      if (unit.defKind === "spell") {
        const options = getSpellPlayOptions(state, side, index);
        if (!options.playable) return;
        const chosen = options.needsTarget ? chooseSpellTarget(state, side, unit, options) : undefined;
        if (options.needsTarget && !chosen) return;
        if (cost > bestCost) {
          bestIndex = index;
          bestCost = cost;
          bestTarget = chosen;
        }
      } else if ((unit.defKind === "weapon" || target.board.length < MAX_BOARD) && cost > bestCost) {
        bestIndex = index;
        bestCost = cost;
        bestTarget = undefined;
      }
    });
    if (bestIndex < 0) break;
    if (target.hand[bestIndex].defKind === "spell") {
      playSpell(state, side, bestIndex, bestTarget);
    } else {
      playCard(state, side, bestIndex);
    }
    playsRemaining -= 1;
    if (state.winner) return state;
  }
  for (const attacker of [...target.board]) {
    if (state.winner) break;
    if (!attacker.canAttack || attacker.attack <= 0) continue;
    const valid = getValidTargets(state, side, attacker.uid);
    if (!valid.hero && !valid.units.length) continue;
    if (valid.units.length) {
      const pick = valid.units
        .map((uid) => opponent.board.find((unit) => unit.uid === uid))
        .filter(Boolean)
        .sort((a, b) => a.health - b.health)[0];
      attackTarget(state, side, attacker.uid, { hero: false, uid: pick.uid });
    } else {
      attackTarget(state, side, attacker.uid, { hero: true });
    }
  }
  return endTurn(state);
}

function simulate(engine, difficulty, games) {
  const { createBattle, mulliganHand } = engine;
  const results = [];
  for (let game = 0; game < games; game += 1) {
    let state = createBattle(DEFAULT_DECK, [...DEFAULT_DECK]);
    for (const side of ["player", "enemy"]) {
      const hand = side === "player" ? state.player.hand : state.enemy.hand;
      const keep = hand.filter((unit) => unit.cost <= MULLIGAN_THRESHOLD[difficulty]).map((unit) => unit.uid);
      state = mulliganHand(state, side, keep);
      state.mulligan[side] = true;
    }
    let rounds = 0;
    while (!state.winner && rounds < GAME_CAP) {
      state = botTurn(engine, state, difficulty);
      rounds += 1;
    }
    results.push({
      winner: state.winner ?? "draw",
      turnNumber: state.turnNumber,
      playerHealth: state.player.heroHealth,
      enemyHealth: state.enemy.heroHealth,
    });
  }
  return results;
}

function report(label, results) {
  const total = results.length;
  const firstWins = results.filter((entry) => entry.winner === "player").length;
  const secondWins = results.filter((entry) => entry.winner === "enemy").length;
  const draws = total - firstWins - secondWins;
  const turns = results.map((entry) => entry.turnNumber).sort((a, b) => a - b);
  const avgTurns = turns.reduce((sum, value) => sum + value, 0) / total;
  const medianTurns = turns[Math.floor(turns.length / 2)];
  const avgPlayerHealth = results.reduce((sum, entry) => sum + entry.playerHealth, 0) / total;
  const avgEnemyHealth = results.reduce((sum, entry) => sum + entry.enemyHealth, 0) / total;
  const fastGames = results.filter((entry) => entry.turnNumber <= 10).length;
  const longGames = results.filter((entry) => entry.turnNumber >= 25).length;
  console.log(`${label}：${total} 场`);
  console.log(`  胜率 —— 先手 ${firstWins} 场 (${(firstWins / total * 100).toFixed(1)}%) · 后手 ${secondWins} 场 (${(secondWins / total * 100).toFixed(1)}%) · 平局 ${draws}`);
  console.log(`  回合数 —— 平均 ${avgTurns.toFixed(1)} · 中位数 ${medianTurns} · ≤10 回合 ${fastGames} 场 · ≥25 回合 ${longGames} 场`);
  console.log(`  终局核心 —— 先手方平均剩余 ${avgPlayerHealth.toFixed(1)} · 后手方平均剩余 ${avgEnemyHealth.toFixed(1)}`);
}

try {
  execFileSync(process.execPath, [viteBin, "build", "--config", "scripts/vite-ssr.config.mjs", "--outDir", outputDirectory, "--emptyOutDir"], { stdio: "pipe" });
  const bundledEngine = join(outputDirectory, "engine.js");
  const moduleEngine = join(outputDirectory, "engine.mjs");
  renameSync(bundledEngine, moduleEngine);
  const engine = await import(pathToFileURL(moduleEngine).href);
  const { createBattle, mulliganHand, getSpellPlayOptions, playCard, playSpell, getValidTargets, attackTarget, endTurn } = engine;
  for (const [label, difficulty, games] of [["贪心 Bot 内战 · 新手", "novice", 120], ["贪心 Bot 内战 · 专家", "expert", 120], ["贪心 Bot 内战 · 大师", "master", 120]]) {
    report(label, simulate(engine, difficulty, games));
  }
  console.log("平衡模拟完成：以上数据来自 360 场 AI 对局，可用于评估先后手优势、对局时长与卡组强度。");
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
