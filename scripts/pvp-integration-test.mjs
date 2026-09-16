// 仙侠战线 · Xianxia Frontline - 在线 PvP 双客户端集成测试
// 验证: 四服务健康检查 + 双安装主体入队配对 + ready/mulligan/出牌/回合/结算全流程。
// 用法: node scripts/pvp-integration-test.mjs
//   env:  CLOUD_BASE (默认 http://127.0.0.1:3210) PLATFORM_BASE (默认 http://127.0.0.1:3211)
// 退出码: 0 = 通过; 1 = 失败
import { readFileSync } from "node:fs";

const cloudBase = process.env.CLOUD_BASE ?? "http://127.0.0.1:3210";
const platformBase = process.env.PLATFORM_BASE ?? "http://127.0.0.1:3211";

const SERVICES = [
  { name: "cloud", url: `${cloudBase}/health` },
  { name: "platform", url: `${platformBase}/health/ready` },
  { name: "social", url: "http://127.0.0.1:3213/health" },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(base, path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, ok: response.ok, data };
}

function cardDeckFromSource() {
  const src = readFileSync(new URL("../src/data/cards.ts", import.meta.url), "utf8");
  const ids = [...src.matchAll(/unit\(\{ id:\s*["']([a-z0-9-]+)/g)].map((m) => m[1]);
  if (!ids.length) throw new Error("无法从 src/data/cards.ts 提取单位卡 ID");
  return Array.from({ length: 30 }, (_, i) => ids[i % ids.length]);
}

function cardEffectsFromSource() {
  const src = readFileSync(new URL("../src/data/cards.ts", import.meta.url), "utf8");
  const effects = new Map();
  for (const match of src.matchAll(/(?:unit|spell|weapon)\(\{ id:\s*["']([a-z0-9-]+)["'][\s\S]*?skill:\s*\{[\s\S]*?effect:\s*["']([a-z0-9-]+)["']/g)) {
    effects.set(match[1], match[2]);
  }
  return effects;
}

const EFFECTS = cardEffectsFromSource();
function isTaunt(defId) {
  const effect = EFFECTS.get(defId);
  return effect === "taunt" || effect === "last-stand";
}

async function createPlayer() {
  const { ok, data, status } = await request(cloudBase, "/v1/installations", {
    method: "POST",
    body: { installationSecret: `integration-secret-${Math.random().toString(36).slice(2, 12)}` },
  });
  assert(ok && data?.accessToken, `创建安装主体失败 (${status}): ${JSON.stringify(data)}`);
  return data;
}

// 双客户端交替推送命令直至对局结束
async function playOutMatch(params) {
  const { tokens, names, matchId } = params;
  const log = [];
  let queue = 0; // 0 -> A, 1 -> B 交替(与回合顺序无关,仅为串行)
  let lastStatus = null;
  const mulliganSent = new Set();
  const debugPrinted = new Set();
  const lastCmd = new Map(); // name -> 上次命令类型
  const lastHandLen = new Map(); // name -> 上次快照手牌数
  for (let pass = 0; pass < 500; pass++) {
    const idx = queue % 2;
    const token = tokens[idx]?.accessToken;
    const name = names[idx] ?? `p${idx}`;
    const { ok, data, status } = await request(platformBase, `/v1/pvp/matches/${matchId}`, { token });
    if (!ok) { log.push(`snapshot ${name} ${status}: ${JSON.stringify(data)}`); queue++; continue; }
    lastStatus = { match: data.match, events: data.events };
    if (data.match.status === "finished") { break; }
    const phase = data.match.state?.phase;
    const battle = data.match.state?.battle;

    let command = null;
    if (phase === "waiting_for_ready") {
      if (!battle) command = { type: "ready" };
    } else if (phase === "mulligan" && !mulliganSent.has(name)) {
      command = { type: "mulligan", keepUids: [] };
    } else if (data.match.turn === "self" && battle) {
      if (process.env.PVP_DEBUG && !debugPrinted.has(name)) {
        debugPrinted.add(name);
        console.log(`  [debug] ${name} hand=${JSON.stringify(battle.player?.hand?.map((c) => ({ id: c.defId, kind: c.defKind, cost: c.cost })))} pendingChoice=${JSON.stringify(battle.pendingChoice)}`);
      }
      const self = battle.player;
      const enemy = battle.enemy;
      const handLen = self?.hand?.length ?? 0;
      const playFailed = lastCmd.get(name) === "play_card" && lastHandLen.get(name) === handLen;
      const attackers = self?.board?.filter((u) => u.canAttack && u.attack > 0) ?? [];
      if (attackers.length) {
        const taunt = enemy?.board?.find((u) => isTaunt(u.defId));
        command = taunt
          ? { type: "attack", attackerUid: attackers[0].uid, target: { hero: false, uid: taunt.uid } }
          : { type: "attack", attackerUid: attackers[0].uid, target: { hero: true } };
      } else if (battle.pendingChoice?.kind === "discover" && battle.pendingChoice.options?.length) {
        command = { type: "discover", cardId: battle.pendingChoice.options[0] };
      } else if (!playFailed && self?.hand?.some((c) => c.defKind !== "spell")) {
        const idx = self.hand.findIndex((c) => c.defKind !== "spell");
        command = { type: "play_card", handIndex: idx };
      } else {
        command = { type: "end_turn" };
      }
    }
    if (!command) { queue++; continue; }

    lastHandLen.set(name, handLenSnapshot(battle));
    const { ok: cOk, data: cData, status: cStatus } = await request(platformBase, `/v1/pvp/matches/${matchId}/commands`, {
      method: "POST", token, body: command,
    });
    if (!cOk) {
      log.push(`command ${name} ${command.type} ${cStatus}: ${JSON.stringify(cData)}`);
      queue++; continue;
    }
    if (command.type === "mulligan") mulliganSent.add(name);
    lastCmd.set(name, command.type);
    log.push(`command ${name} ${command.type} ok`);
    queue++;
  }
  return { lastStatus, log };
}

function handLenSnapshot(battle) {
  return battle?.player?.hand?.length ?? 0;
}

async function main() {
  console.log(`在线 PvP 双客户端集成测试\n  cloud=${cloudBase} platform=${platformBase}`);

  console.log("\n[1] 四服务健康检查 ...");
  for (const svc of SERVICES) {
    const { ok, status } = await fetch(svc.url, { signal: AbortSignal.timeout(8000) }).then((r) => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false, status: 0 }));
    assert(status === 200, `${svc.name} 健康检查失败: ${status}`);
    console.log(`  ✓ ${svc.name} (${svc.url}) ${status}`);
  }

  console.log("\n[2] 创建两个匿名安装主体 ...");
  const [a, b] = await Promise.all([createPlayer(), createPlayer()]);
  console.log(`  playerA=${a.publicCode} playerB=${b.publicCode}`);
  assert(a.playerId !== b.playerId, "两个主体应为不同玩家");

  const deck = cardDeckFromSource();
  console.log(`\n[3] 双端入队匹配 (deck ${deck.length} 张) ...`);
  const qa = await request(platformBase, "/v1/pvp/queue", { method: "POST", token: a.accessToken, body: { mode: "casual", deck } });
  console.log(`  playerA 入队: ${qa.status} ${JSON.stringify(qa.data)}`);
  assert(qa.ok && qa.data?.status === "queued", `playerA 应排队: ${JSON.stringify(qa.data)}`);

  await new Promise((r) => setTimeout(r, 150));
  const qb = await request(platformBase, "/v1/pvp/queue", { method: "POST", token: b.accessToken, body: { mode: "casual", deck } });
  console.log(`  playerB 入队: ${qb.status} ${JSON.stringify(qb.data)}`);
  assert(qb.ok && (qb.data?.status === "matched" || qb.data?.matchId), `playerB 应配对: ${JSON.stringify(qb.data)}`);

  const matchId = qb.data?.matchId ?? qa.data?.matchId;
  assert(matchId, "未获得 matchId");

  console.log("\n[3.5] 匹配孤儿回归：先入队一端重复 POST queue 应回收对局 ...");
  const qaRequeue = await request(platformBase, "/v1/pvp/queue", { method: "POST", token: a.accessToken, body: { mode: "casual", deck } });
  console.log(`  playerA 重复入队: ${qaRequeue.status} ${JSON.stringify(qaRequeue.data)}`);
  assert(qaRequeue.ok && qaRequeue.data?.status === "matched" && qaRequeue.data?.matchId === matchId, `重复入队应返回同一对局: ${JSON.stringify(qaRequeue.data)}`);

  console.log("\n[4] 双客户端执行 ready → mulligan → 出牌/回合,直至结算 ...");
  console.log(`  debug: matchId=${matchId}`);
  console.log(`  debug: tokenA head=${a.accessToken?.slice(0, 16)} len=${a.accessToken?.length}`);
  const firstSnap = await request(platformBase, `/v1/pvp/matches/${matchId}`, { token: a.accessToken });
  console.log(`  debug: 首快照 via platform: ${firstSnap.status} ${JSON.stringify(firstSnap.data)}`);
  const { lastStatus, log } = await playOutMatch({ tokens: [a, b], names: ["playerA", "playerB"], matchId });
  console.log(`  命令日志 (${log.length} 条):`);
  for (const line of log.slice(0, 80)) console.log(`    ${line}`);
  if (log.length > 80) console.log(`    ... 共 ${log.length} 条`);

  console.log("\n[5] 最终快照验证 ...");
  assert(lastStatus, "未获得任何快照");
  const final = lastStatus.match;
  console.log(`  最终: status=${final.status} winner=${final.winner} reason=${final.finishReason || "n/a"} turn=${final.turn} phase=${final.state?.phase} heroHP=${final.state?.battle?.player?.heroHealth ?? "?"} enemyHP=${final.state?.battle?.enemy?.heroHealth ?? "?"}`);
  assert(final.status === "finished", `对局应为 finished,实际 ${final.status}`);
  assert(final.winner === "self" || final.winner === "opponent", `应有胜者,实际 ${final.winner}`);
  // 快照结构契约：观察者视角 BattleState（player=己方完整/enemy=对手脱敏），客户端 PvpView 依赖此形状。
  assert(final.state?.battle?.player?.hand, "快照应包含己方手牌 (battle.player.hand)");
  assert(Array.isArray(final.state?.battle?.enemy?.board), "快照应包含对手场面 (battle.enemy.board)");
  assert(final.state?.battle?.enemy?.hand?.length === 0, "对手手牌必须脱敏为空数组");
  assert(final.state?.battle?.mulligan && typeof final.state?.battle?.mulligan.player === "boolean", "快照应包含 mulligan 标记");
  const eventTypes = new Set((lastStatus.events ?? []).map((e) => e.type));
  console.log(`  事件类型: ${[...eventTypes].join(", ")}`);
  assert(eventTypes.has("player_ready"), "应包含 player_ready 事件");
  assert(eventTypes.has("match_started"), "应包含 match_started 事件");

  console.log("\n✅ 在线 PvP 双客户端集成测试通过\n");
  console.log(`  对局: ${matchId}`);
}

main().catch((error) => {
  console.error("❌ PvP 集成测试失败:", error instanceof Error ? error.message : error);
  process.exit(1);
});
