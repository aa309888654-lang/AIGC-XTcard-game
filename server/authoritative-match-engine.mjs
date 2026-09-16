import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import "dotenv/config";
import { build } from "esbuild";
import { Pool } from "pg";

const port = Number(process.env.MATCH_ENGINE_PORT ?? 3212);
const host = process.env.SERVICE_HOST ?? "0.0.0.0";
const databaseUrl = process.env.DATABASE_URL ?? "postgres://xianxia:xianxia@127.0.0.1:5432/xianxia";
const signingSecret = process.env.CLOUD_SIGNING_SECRET ?? "development-only-change-before-production";
if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL || !process.env.CLOUD_SIGNING_SECRET || signingSecret.length < 32)) {
  throw new Error("Production requires DATABASE_URL and a CLOUD_SIGNING_SECRET of at least 32 characters");
}
const pool = new Pool({ connectionString: databaseUrl, max: 12 });
const TURN_MS = 75_000;
// 仅向客户端透传白名单内的业务错误码，其余一律返回 SERVER_ERROR。
const KNOWN_ERROR_CODES = new Set([
  "PAYLOAD_TOO_LARGE", "MATCH_NOT_FOUND", "MATCH_TIMEOUT_NOT_REACHED", "MATCH_NOT_ACTIVE", "MATCH_NOT_WAITING",
  "MATCH_READY_ALREADY_CONFIRMED", "MULLIGAN_ALREADY_DONE", "MULLIGAN_PENDING", "MATCH_TURN_DENIED",
  "MATCH_COMMAND_INVALID", "ACTIVE_SEASON_NOT_FOUND", "ROUTE_NOT_FOUND",
]);
let enginePromise;

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};
const parseJson = async (request) => {
  let raw = "";
  for await (const part of request) {
    raw += part;
    if (raw.length > 1_000_000) throw new Error("PAYLOAD_TOO_LARGE");
  }
  return raw ? JSON.parse(raw) : {};
};
const verifyToken = (token) => {
  const [payload, signature] = String(token ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.exp > Date.now() ? claims : null;
  } catch {
    return null;
  }
};

async function migrate() {
  for (const name of ["001_cloud_core.sql", "002_guilds.sql", "003_authoritative_platform.sql"]) {
    await pool.query(await readFile(resolve("server/migrations", name), "utf8"));
  }
}
async function engine() {
  if (!enginePromise) {
    // 构建失败时清空缓存，允许下一次请求重试，而不是让 rejected promise 卡死所有对局。
    enginePromise = build({ entryPoints: [resolve("src/game/engine.ts")], bundle: true, format: "esm", platform: "node", target: "node20", write: false })
      .then((result) => import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`))
      .catch((error) => { enginePromise = undefined; throw error; });
  }
  return enginePromise;
}
async function requirePlayer(request, response) {
  const claims = verifyToken(request.headers.authorization?.replace(/^Bearer\s+/i, ""));
  if (!claims?.playerId || !claims?.installationId) {
    json(response, 401, { errorCode: "INSTALLATION_TOKEN_REQUIRED" });
    return null;
  }
  const installed = await pool.query(
    "SELECT 1 FROM cloud_installations WHERE id=$1 AND player_id=$2 AND revoked_at IS NULL AND token_version=$3",
    [claims.installationId, claims.playerId, claims.tokenVersion],
  );
  if (!installed.rowCount) {
    json(response, 401, { errorCode: "INSTALLATION_TOKEN_REVOKED" });
    return null;
  }
  return claims;
}
async function appendEvent(client, matchId, actorId, type, payload) {
  const sequence = (await client.query("SELECT COALESCE(MAX(sequence),0)+1 AS next FROM cloud_match_events WHERE match_id=$1", [matchId])).rows[0].next;
  await client.query("INSERT INTO cloud_match_events(match_id,sequence,actor_player_id,event_type,payload) VALUES($1,$2,$3,$4,$5)", [matchId, sequence, actorId, type, payload]);
}
function sideFor(match, playerId) {
  if (match.player_one_id === playerId) return "player";
  if (match.player_two_id === playerId) return "enemy";
  throw new Error("MATCH_NOT_FOUND");
}
function redactSide(side, own) {
  const { deck, hand, ...publicSide } = side;
  return own ? { ...publicSide, deck, hand } : { ...publicSide, deckCount: deck.length, handCount: hand.length, hand: [] };
}
function redactBattle(battle, ownSide) {
  if (!battle) return null;
  const own = ownSide === "player" ? battle.player : battle.enemy;
  const opponent = ownSide === "player" ? battle.enemy : battle.player;
  const otherSide = ownSide === "player" ? "enemy" : "player";
  // 输出「观察者视角」的完整 BattleState：己方固定是 player，对手是 enemy，
  // 客户端 (PvpView) 无需再做形状映射即可直接渲染。
  const remapSide = (side) => (side === ownSide ? "player" : "enemy");
  return {
    turn: remapSide(battle.turn),
    turnNumber: battle.turnNumber,
    winner: battle.winner === ownSide ? "player" : battle.winner ? "enemy" : null,
    uidCounter: battle.uidCounter ?? 0,
    fx: Array.isArray(battle.fx) ? battle.fx.slice(-24).map((event) => ({ ...event, side: remapSide(event.side) })) : [],
    fxCounter: battle.fxCounter ?? 0,
    mulligan: {
      player: Boolean(battle.mulligan?.[ownSide]),
      enemy: Boolean(battle.mulligan?.[otherSide]),
    },
    pendingChoice: battle.pendingChoice?.side === ownSide ? { ...battle.pendingChoice, side: "player" } : null,
    randomSeed: battle.randomSeed ?? 0,
    player: redactSide(own, true),
    enemy: redactSide(opponent, false),
    log: Array.isArray(battle.log) ? battle.log.slice(-40) : [],
  };
}
async function activeSeason(client) {
  const result = await client.query("SELECT id FROM cloud_seasons WHERE is_active=TRUE AND starts_at<=NOW() AND ends_at>NOW() LIMIT 1");
  if (!result.rowCount) throw new Error("ACTIVE_SEASON_NOT_FOUND");
  return result.rows[0];
}
async function ensureWallet(client, playerId) {
  for (const [currency, balance] of Object.entries({ starDust: 840, guildMarks: 36, arcaneDust: 120 })) {
    await client.query("INSERT INTO cloud_wallets(player_id,currency_code,balance) VALUES($1,$2,$3) ON CONFLICT(player_id,currency_code) DO NOTHING", [playerId, currency, balance]);
  }
}
async function finishMatch(client, match, winnerId, reason) {
  if (match.status === "finished") return;
  if (match.mode === "ranked") {
    const season = await activeSeason(client);
    const loserId = match.player_one_id === winnerId ? match.player_two_id : match.player_one_id;
    for (const [playerId, won] of [[winnerId, true], [loserId, false]]) {
      await ensureWallet(client, playerId);
      await client.query("INSERT INTO cloud_season_players(season_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [season.id, playerId]);
      await client.query("UPDATE cloud_season_players SET rating=GREATEST(0,rating+$3),season_xp=season_xp+$4,wins=wins+$5,losses=losses+$6,streak=CASE WHEN $5=1 THEN streak+1 ELSE 0 END,best_streak=GREATEST(best_streak,CASE WHEN $5=1 THEN streak+1 ELSE 0 END),updated_at=NOW() WHERE season_id=$1 AND player_id=$2", [season.id, playerId, won ? 25 : -20, won ? 100 : 35, won ? 1 : 0, won ? 0 : 1]);
      const delta = won ? 100 : 30;
      await client.query("UPDATE cloud_wallets SET balance=balance+$3,updated_at=NOW() WHERE player_id=$1 AND currency_code=$2::varchar", [playerId, "starDust", delta]);
      await client.query("INSERT INTO cloud_asset_ledger(id,player_id,event_type,currency_code,delta,idempotency_key) VALUES($1,$2,'pvp_match_reward','starDust',$3,$4) ON CONFLICT(player_id,idempotency_key) DO NOTHING", [randomUUID(), playerId, delta, `engine:${match.id}:${won ? "win" : "loss"}`]);
    }
  }
  await client.query("UPDATE cloud_matches SET status='finished',winner_player_id=$2,finish_reason=$3,finished_at=NOW(),state_version=state_version+1 WHERE id=$1", [match.id, winnerId, reason]);
  await appendEvent(client, match.id, null, "battle_finished", { winnerId, reason });
  match.status = "finished";
  match.winner_player_id = winnerId;
  match.finish_reason = reason;
}
async function loadMatch(client, playerId, matchId) {
  const match = (await client.query("SELECT * FROM cloud_matches WHERE id=$1 AND (player_one_id=$2 OR player_two_id=$2) FOR UPDATE", [matchId, playerId])).rows[0];
  if (!match) throw new Error("MATCH_NOT_FOUND");
  return match;
}
async function ensureBattle(client, match) {
  if (match.state?.battle) return match.state.battle;
  const rules = await engine();
  const battle = rules.createBattle(match.player_one_deck, match.player_two_deck, Number(match.seed));
  match.state = { ...(match.state ?? {}), phase: "mulligan", battle };
  await client.query("UPDATE cloud_matches SET state=$2,state_version=state_version+1 WHERE id=$1", [match.id, match.state]);
  await appendEvent(client, match.id, null, "battle_initialized", {});
  return battle;
}
async function snapshot(playerId, matchId, after = 0) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const match = await loadMatch(client, playerId, matchId);
    const side = sideFor(match, playerId);
    if (match.status === "active" && new Date(match.turn_deadline_at).getTime() < Date.now()) {
      const winner = match.turn_player_id === match.player_one_id ? match.player_two_id : match.player_one_id;
      await finishMatch(client, match, winner, "timeout");
    }
    const events = (await client.query("SELECT sequence,actor_player_id,event_type,payload,created_at FROM cloud_match_events WHERE match_id=$1 AND sequence>$2 ORDER BY sequence ASC", [matchId, after])).rows;
    await client.query("COMMIT");
    return {
      match: {
        id: match.id,
        mode: match.mode,
        status: match.status,
        version: match.state_version,
        turn: match.turn_player_id === playerId ? "self" : "opponent",
        turnDeadlineAt: match.turn_deadline_at,
        winner: match.winner_player_id === playerId ? "self" : match.winner_player_id ? "opponent" : null,
        finishReason: match.finish_reason,
        state: { phase: match.state?.phase ?? "waiting", battle: redactBattle(match.state?.battle, side) },
      },
      events: events.map((event) => ({ sequence: event.sequence, actor: event.actor_player_id === playerId ? "self" : "opponent", type: event.event_type, payload: event.payload, createdAt: event.created_at })),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function command(playerId, matchId, body) {
  const type = String(body.type ?? "");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const match = await loadMatch(client, playerId, matchId);
    const side = sideFor(match, playerId);
    const state = match.state ?? { phase: "waiting_for_ready", playerOneReady: false, playerTwoReady: false };

    if (type === "ready") {
      if (match.status !== "waiting") throw new Error("MATCH_NOT_WAITING");
      const readyKey = side === "player" ? "playerOneReady" : "playerTwoReady";
      if (state[readyKey]) throw new Error("MATCH_READY_ALREADY_CONFIRMED");
      state[readyKey] = true;
      await appendEvent(client, match.id, playerId, "player_ready", {});
      if (state.playerOneReady && state.playerTwoReady) {
        match.state = state;
        await ensureBattle(client, match);
        match.state.phase = "mulligan";
        await client.query("UPDATE cloud_matches SET status='active',state=$2,state_version=state_version+1,turn_player_id=player_one_id,turn_deadline_at=NOW()+INTERVAL '75 seconds' WHERE id=$1", [match.id, match.state]);
        await appendEvent(client, match.id, playerId, "match_started", { first: "player_one" });
      } else {
        match.state = state;
        await client.query("UPDATE cloud_matches SET state=$2,state_version=state_version+1 WHERE id=$1", [match.id, match.state]);
      }
      await client.query("COMMIT");
      return { status: "accepted" };
    }

    if (type === "concede") {
      if (match.status === "finished") {
        await client.query("COMMIT");
        return { status: "finished" };
      }
      await finishMatch(client, match, match.player_one_id === playerId ? match.player_two_id : match.player_one_id, "concede");
      await client.query("COMMIT");
      return { status: "finished" };
    }
    if (match.status !== "active") throw new Error("MATCH_NOT_ACTIVE");
    if (new Date(match.turn_deadline_at).getTime() < Date.now()) {
      const winner = match.turn_player_id === match.player_one_id ? match.player_two_id : match.player_one_id;
      await finishMatch(client, match, winner, "timeout");
      await client.query("COMMIT");
      return { status: "finished" };
    }
    if (type === "timeout") throw new Error("MATCH_TIMEOUT_NOT_REACHED");

    const battle = await ensureBattle(client, match);
    const rules = await engine();
    if (type === "mulligan") {
      if (battle.mulligan[side]) throw new Error("MULLIGAN_ALREADY_DONE");
      rules.mulliganHand(battle, side, Array.isArray(body.keepUids) ? body.keepUids.filter(Number.isInteger) : []);
      battle.mulligan[side] = true;
    } else {
      if (!battle.mulligan.player || !battle.mulligan.enemy) throw new Error("MULLIGAN_PENDING");
      if (battle.turn !== side) throw new Error("MATCH_TURN_DENIED");
      if (type === "play_card") rules.playCard(battle, side, Number(body.handIndex));
      else if (type === "play_spell") rules.playSpell(battle, side, Number(body.handIndex), body.target ?? undefined);
      else if (type === "equip_weapon") rules.equipWeapon(battle, side, Number(body.handIndex));
      else if (type === "attack") rules.attackTarget(battle, side, Number(body.attackerUid), body.target ?? {});
      else if (type === "weapon_attack") rules.attackWithWeapon(battle, side, body.target ?? {});
      else if (type === "hero_power") rules.useHeroPower(battle, side, body.target ?? undefined);
      else if (type === "discover") rules.resolveDiscover(battle, String(body.cardId ?? ""));
      else if (type === "end_turn") rules.endTurn(battle);
      else throw new Error("MATCH_COMMAND_INVALID");
    }
    await appendEvent(client, match.id, playerId, type, {});
    match.state = { ...match.state, battle };
    const turnPlayer = battle.turn === "player" ? match.player_one_id : match.player_two_id;
    await client.query("UPDATE cloud_matches SET state=$2,turn_player_id=$3,turn_deadline_at=$4,state_version=state_version+1 WHERE id=$1", [match.id, match.state, turnPlayer, new Date(Date.now() + TURN_MS)]);
    if (battle.winner) {
      await finishMatch(client, match, battle.winner === "player" ? match.player_one_id : match.player_two_id, "hero_defeated");
    }
    await client.query("COMMIT");
    return { status: battle.winner ? "finished" : "accepted", battle: redactBattle(battle, side) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const server = createServer(async (request, response) => {
  try {
    const urlPath = (request.url ?? "").split("?")[0];
    if (request.method === "GET" && urlPath === "/health") return json(response, 200, { status: "ok", service: "authoritative-match-engine" });
    if (request.method === "GET" && urlPath === "/health/ready") {
      await pool.query("SELECT 1");
      return json(response, 200, { status: "ready" });
    }
    const player = await requirePlayer(request, response);
    if (!player) return;
    const match = urlPath.match(/^\/v1\/pvp-authoritative\/matches\/([0-9a-f-]{36})$/i);
    if (request.method === "GET" && match) return json(response, 200, await snapshot(player.playerId, match[1], Number(new URL(request.url, "http://local").searchParams.get("after") ?? 0)));
    const commandPath = urlPath.match(/^\/v1\/pvp-authoritative\/matches\/([0-9a-f-]{36})\/commands$/i);
    if (request.method === "POST" && commandPath) return json(response, 200, await command(player.playerId, commandPath[1], await parseJson(request)));
    return json(response, 404, { errorCode: "ROUTE_NOT_FOUND" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const known = KNOWN_ERROR_CODES.has(message);
    const status = known && /INVALID|NOT_FOUND|DENIED|LOCKED|ALREADY|INSUFFICIENT|REUSED|TIMEOUT|TURN|PENDING|MULLIGAN|NOT_ACTIVE|NOT_WAITING/i.test(message) ? 400 : 500;
    console.error("match-engine", { message, path: request.url, stack: error instanceof Error ? error.stack : undefined });
    return json(response, status, { errorCode: known ? message : "SERVER_ERROR" });
  }
});

// 孤儿对局清扫器：双方都掉线时回合超时不会被惰性结算，这里定期兜底，
// 避免 active 比赛永久滞留（waiting 超时的对局标记为 abandoned）。
const sweepStaleMatches = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const stale = await client.query("SELECT * FROM cloud_matches WHERE status='active' AND turn_deadline_at < NOW() - INTERVAL '10 minutes' LIMIT 20 FOR UPDATE SKIP LOCKED");
    for (const match of stale.rows) {
      const winner = match.turn_player_id === match.player_one_id ? match.player_two_id : match.player_one_id;
      await finishMatch(client, match, winner, "timeout");
    }
    const abandoned = await client.query("UPDATE cloud_matches SET status='finished',finish_reason='abandoned',finished_at=NOW(),state_version=state_version+1 WHERE status='waiting' AND created_at < NOW() - INTERVAL '30 minutes' RETURNING id");
    await client.query("COMMIT");
    if (stale.rowCount || abandoned.rowCount) console.log("match-sweep", { settled: stale.rowCount, abandoned: abandoned.rowCount });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("match-sweep", { message: error instanceof Error ? error.message : "SWEEP_FAILED" });
  } finally {
    client.release();
  }
};
setInterval(() => { void sweepStaleMatches(); }, 60_000).unref();

server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
process.on("unhandledRejection", (reason) => console.error("match-engine unhandledRejection", { reason: String(reason) }));
const shutdown = (signal) => { console.log("match-engine graceful shutdown", { signal }); server.close(); void pool.end().catch(() => undefined).finally(() => process.exit(0)); setTimeout(() => process.exit(0), 10_000).unref(); };
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

await migrate();
server.listen(port, host, () => console.log(`Authoritative match engine listening at http://${host}:${port}`));
