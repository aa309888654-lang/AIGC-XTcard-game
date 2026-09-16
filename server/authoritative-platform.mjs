import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import "dotenv/config";
import { Pool } from "pg";

const port = Number(process.env.PLATFORM_PORT ?? 3211);
const host = process.env.SERVICE_HOST ?? "0.0.0.0";
const databaseUrl = process.env.DATABASE_URL ?? "postgres://xianxia:xianxia@127.0.0.1:5432/xianxia";
const signingSecret = process.env.CLOUD_SIGNING_SECRET ?? "development-only-change-before-production";
if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL || !process.env.CLOUD_SIGNING_SECRET || signingSecret.length < 32)) {
  throw new Error("Production requires DATABASE_URL and a CLOUD_SIGNING_SECRET of at least 32 characters");
}
const matchEngineBase = (process.env.MATCH_ENGINE_BASE ?? "http://127.0.0.1:3212").replace(/\/$/, "");
const pool = new Pool({ connectionString: databaseUrl, max: 16 });
const CURRENCIES = ["starDust", "guildMarks", "arcaneDust"];
const INITIAL_WALLET = { starDust: 840, guildMarks: 36, arcaneDust: 120 };
const STORE = {
  "echo-cache": { currency: "starDust", cost: 160 },
  "dusk-banner": { currency: "guildMarks", cost: 90 },
  "astral-frame": { currency: "starDust", cost: 260 },
  "vanguard-order": { currency: "starDust", cost: 120 },
};
const TURN_MS = 75_000;
// 仅向客户端透传白名单内的业务错误码，其余一律返回 SERVER_ERROR。
const KNOWN_ERROR_CODES = new Set([
  "PAYLOAD_TOO_LARGE", "ACTIVE_SEASON_NOT_FOUND", "STORE_PRODUCT_NOT_FOUND", "STORE_PRODUCT_ALREADY_OWNED",
  "IDEMPOTENCY_KEY_INVALID", "IDEMPOTENCY_KEY_REUSED", "ASSET_COMMAND_INVALID", "WALLET_NOT_INITIALIZED",
  "INSUFFICIENT_BALANCE", "SEASON_REWARD_NOT_FOUND", "SEASON_REWARD_LOCKED", "SEASON_REWARD_ALREADY_CLAIMED",
  "MATCH_DECK_INVALID", "MATCH_MODE_INVALID", "MATCH_NOT_FOUND", "REPORT_INVALID", "ROUTE_NOT_FOUND",
  "MATCH_ENGINE_UNAVAILABLE",
]);

const json = (response, status, body) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(body)); };
const digest = (value) => createHash("sha256").update(value).digest("hex");
const parseJson = async (request) => { let raw = ""; for await (const part of request) { raw += part; if (raw.length > 1_000_000) throw new Error("PAYLOAD_TOO_LARGE"); } return raw ? JSON.parse(raw) : {}; };
const verifyToken = (token) => {
  const [payload, signature] = String(token ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return claims.exp > Date.now() ? claims : null; } catch { return null; }
};

async function migrate() { for (const name of ["001_cloud_core.sql", "002_guilds.sql", "003_authoritative_platform.sql"]) await pool.query(await readFile(resolve("server/migrations", name), "utf8")); }
async function requirePlayer(request, response) {
  const claims = verifyToken(request.headers.authorization?.replace(/^Bearer\s+/i, ""));
  if (!claims?.playerId || !claims?.installationId) { json(response, 401, { errorCode: "INSTALLATION_TOKEN_REQUIRED" }); return null; }
  const active = await pool.query("SELECT 1 FROM cloud_installations WHERE id=$1 AND player_id=$2 AND revoked_at IS NULL AND token_version=$3", [claims.installationId, claims.playerId, claims.tokenVersion]);
  if (!active.rowCount) { json(response, 401, { errorCode: "INSTALLATION_TOKEN_REVOKED" }); return null; }
  return claims;
}
async function activeSeason(client = pool) {
  const result = await client.query("SELECT * FROM cloud_seasons WHERE is_active=TRUE AND starts_at<=NOW() AND ends_at>NOW() LIMIT 1");
  if (!result.rowCount) throw new Error("ACTIVE_SEASON_NOT_FOUND");
  return result.rows[0];
}
async function ensureEconomy(client, playerId) {
  for (const currency of CURRENCIES) await client.query("INSERT INTO cloud_wallets(player_id,currency_code,balance) VALUES($1,$2,$3) ON CONFLICT(player_id,currency_code) DO NOTHING", [playerId, currency, INITIAL_WALLET[currency]]);
  for (const [currency, amount] of Object.entries(INITIAL_WALLET)) await client.query("INSERT INTO cloud_asset_ledger(id,player_id,event_type,currency_code,delta,idempotency_key) SELECT $1,$2,'onboarding_grant',$3,$4,$5 WHERE NOT EXISTS (SELECT 1 FROM cloud_asset_ledger WHERE player_id=$2 AND idempotency_key=$5::varchar)", [randomUUID(), playerId, currency, amount, `onboarding:${currency}`]);
}
async function walletSnapshot(client, playerId) {
  const { rows } = await client.query("SELECT currency_code,balance,updated_at FROM cloud_wallets WHERE player_id=$1 ORDER BY currency_code", [playerId]);
  return { balances: Object.fromEntries(rows.map((row) => [row.currency_code, row.balance])), updatedAt: rows.map((row) => row.updated_at).sort().at(-1) ?? null };
}
async function walletDelta(client, playerId, currency, delta, eventType, operationKey) {
  if (!CURRENCIES.includes(currency) || !Number.isInteger(delta) || delta === 0) throw new Error("ASSET_COMMAND_INVALID");
  const wallet = await client.query("SELECT balance FROM cloud_wallets WHERE player_id=$1 AND currency_code=$2::varchar FOR UPDATE", [playerId, currency]);
  const balance = wallet.rows[0]?.balance;
  if (!Number.isInteger(balance)) throw new Error("WALLET_NOT_INITIALIZED");
  if (balance + delta < 0) throw new Error("INSUFFICIENT_BALANCE");
  await client.query("UPDATE cloud_wallets SET balance=balance+$3,updated_at=NOW() WHERE player_id=$1 AND currency_code=$2::varchar", [playerId, currency, delta]);
  await client.query("INSERT INTO cloud_asset_ledger(id,player_id,event_type,currency_code,delta,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), playerId, eventType, currency, delta, operationKey]);
}
async function audit(client, playerId, action, subjectType, subjectId, metadata = {}) { await client.query("INSERT INTO cloud_audit_events(id,player_id,action,subject_type,subject_id,metadata) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), playerId, action, subjectType, subjectId, metadata]); }
async function idempotent(client, playerId, operationKey, request, execute) {
  if (!/^[0-9a-f-]{36}$/i.test(operationKey)) throw new Error("IDEMPOTENCY_KEY_INVALID");
  const requestHash = digest(JSON.stringify(request));
  const previous = await client.query("SELECT request_hash,response FROM cloud_platform_idempotency WHERE player_id=$1 AND operation_key=$2", [playerId, operationKey]);
  if (previous.rowCount) { if (previous.rows[0].request_hash !== requestHash) throw new Error("IDEMPOTENCY_KEY_REUSED"); return previous.rows[0].response; }
  const response = await execute();
  await client.query("INSERT INTO cloud_platform_idempotency(player_id,operation_key,request_hash,response) VALUES($1,$2,$3,$4)", [playerId, operationKey, requestHash, response]);
  return response;
}

async function getPlatformState(playerId) {
  const client = await pool.connect();
  try { await client.query("BEGIN"); await ensureEconomy(client, playerId); const season = await activeSeason(client); await client.query("INSERT INTO cloud_season_players(season_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [season.id, playerId]); const progression = (await client.query("SELECT rating,season_xp,wins,losses,streak,best_streak FROM cloud_season_players WHERE season_id=$1 AND player_id=$2", [season.id, playerId])).rows[0]; const wallet = await walletSnapshot(client, playerId); await client.query("COMMIT"); return { wallet, season: { code: season.code, title: season.title, startsAt: season.starts_at, endsAt: season.ends_at, rewards: season.reward_config, ...progression } }; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function purchase(playerId, body) {
  const productId = String(body.productId ?? ""); const product = STORE[productId]; const operationKey = String(body.idempotencyKey ?? "");
  if (!product) throw new Error("STORE_PRODUCT_NOT_FOUND");
  const client = await pool.connect();
  try { await client.query("BEGIN"); await ensureEconomy(client, playerId); const response = await idempotent(client, playerId, operationKey, { productId }, async () => { const owned = await client.query("SELECT 1 FROM cloud_store_orders WHERE player_id=$1 AND product_id=$2", [playerId, productId]); if (owned.rowCount) throw new Error("STORE_PRODUCT_ALREADY_OWNED"); await walletDelta(client, playerId, product.currency, -product.cost, "store_purchase", `${operationKey}:spend`); await client.query("INSERT INTO cloud_store_orders(id,player_id,product_id,currency_code,cost,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), playerId, productId, product.currency, product.cost, operationKey]); await audit(client, playerId, "store.purchase", "product", productId); return { productId, wallet: await walletSnapshot(client, playerId) }; }); await client.query("COMMIT"); return response; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function seasonStatus(playerId) {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const season = await activeSeason(client); await client.query("INSERT INTO cloud_season_players(season_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [season.id, playerId]); const player = (await client.query("SELECT rating,season_xp,wins,losses,streak,best_streak FROM cloud_season_players WHERE season_id=$1 AND player_id=$2", [season.id, playerId])).rows[0]; const claimed = (await client.query("SELECT reward_level,track FROM cloud_season_reward_claims WHERE season_id=$1 AND player_id=$2", [season.id, playerId])).rows; await client.query("COMMIT"); return { season: { code: season.code, title: season.title, startsAt: season.starts_at, endsAt: season.ends_at }, progress: player, level: Math.min(100, Math.floor(player.season_xp / 100)), rewards: season.reward_config.map((reward) => ({ ...reward, claimed: claimed.some((entry) => entry.reward_level === reward.level && entry.track === reward.track) })) }; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function claimSeasonReward(playerId, level, body) {
  const operationKey = String(body.idempotencyKey ?? "");
  const client = await pool.connect();
  try { await client.query("BEGIN"); await ensureEconomy(client, playerId); const season = await activeSeason(client); await client.query("INSERT INTO cloud_season_players(season_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [season.id, playerId]); const response = await idempotent(client, playerId, operationKey, { level }, async () => { const player = (await client.query("SELECT season_xp FROM cloud_season_players WHERE season_id=$1 AND player_id=$2 FOR UPDATE", [season.id, playerId])).rows[0]; const reward = season.reward_config.find((entry) => entry.level === level && entry.track === "free"); if (!reward) throw new Error("SEASON_REWARD_NOT_FOUND"); if (!player || Math.floor(player.season_xp / 100) < level) throw new Error("SEASON_REWARD_LOCKED"); const claimed = await client.query("INSERT INTO cloud_season_reward_claims(season_id,player_id,reward_level,track) VALUES($1,$2,$3,'free') ON CONFLICT DO NOTHING RETURNING reward_level", [season.id, playerId, level]); if (!claimed.rowCount) throw new Error("SEASON_REWARD_ALREADY_CLAIMED"); await walletDelta(client, playerId, reward.currency, reward.amount, "season_reward", `${operationKey}:reward`); await audit(client, playerId, "season.reward_claim", "season", season.code, { level }); return { level, reward, wallet: await walletSnapshot(client, playerId) }; }); await client.query("COMMIT"); return response; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function leaderboard() { const season = await activeSeason(); const { rows } = await pool.query("SELECT p.public_code,s.rating,s.wins,s.losses,s.season_xp,RANK() OVER (ORDER BY s.rating DESC,s.updated_at ASC) AS rank FROM cloud_season_players s JOIN cloud_players p ON p.id=s.player_id WHERE s.season_id=$1 ORDER BY s.rating DESC,s.updated_at ASC LIMIT 100", [season.id]); return { season: season.code, rows: rows.map((row) => ({ rank: Number(row.rank), publicCode: row.public_code, rating: row.rating, wins: row.wins, losses: row.losses, seasonXp: row.season_xp })) }; }

async function appendMatchEvent(client, matchId, actorId, eventType, payload) { await client.query("SELECT id FROM cloud_matches WHERE id=$1 FOR UPDATE", [matchId]); const sequence = (await client.query("SELECT COALESCE(MAX(sequence),0)+1 AS next FROM cloud_match_events WHERE match_id=$1", [matchId])).rows[0].next; await client.query("INSERT INTO cloud_match_events(match_id,sequence,actor_player_id,event_type,payload) VALUES($1,$2,$3,$4,$5)", [matchId, sequence, actorId, eventType, payload]); return sequence; }
async function forwardMatchRequest(request, response, path) {
  const headers = { Authorization: request.headers.authorization ?? "" };
  const init = { method: request.method, headers };
  if (request.method === "POST") {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(await parseJson(request));
  }
  // 网关转发必须带超时，避免引擎卡死时请求句柄永久挂起。
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const upstream = await fetch(`${matchEngineBase}${path}`, { ...init, signal: controller.signal });
    const body = await upstream.text();
    response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(body);
  } catch (error) {
    console.error("platform-match-gateway", { message: error instanceof Error ? error.message : "MATCH_ENGINE_UNAVAILABLE" });
    json(response, 503, { errorCode: "MATCH_ENGINE_UNAVAILABLE" });
  } finally {
    clearTimeout(timeout);
  }
}
function validateDeck(deck) { if (!Array.isArray(deck) || deck.length !== 30 || deck.some((id) => typeof id !== "string" || !/^[a-z0-9-]{3,64}$/.test(id))) throw new Error("MATCH_DECK_INVALID"); const copies = new Map(); for (const id of deck) { copies.set(id, (copies.get(id) ?? 0) + 1); if (copies.get(id) > 2) throw new Error("MATCH_DECK_INVALID"); } return deck; }
async function enqueue(playerId, body) {
  const mode = body.mode === "casual" ? "casual" : body.mode === "ranked" ? "ranked" : null; const deck = validateDeck(body.deck); if (!mode) throw new Error("MATCH_MODE_INVALID");
  const client = await pool.connect();
  try { await client.query("BEGIN");
    // 对手抢先创建对局时本方已被移出队列：先回收未完结对局，否则会永远重新排队。
    const ongoing = await client.query("SELECT id FROM cloud_matches WHERE (player_one_id=$1 OR player_two_id=$1) AND status IN ('waiting','active') ORDER BY started_at DESC LIMIT 1", [playerId]);
    if (ongoing.rowCount) { await client.query("COMMIT"); return { status: "matched", matchId: ongoing.rows[0].id }; }
    const season = await activeSeason(client); await client.query("INSERT INTO cloud_season_players(season_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [season.id, playerId]); const rating = (await client.query("SELECT rating FROM cloud_season_players WHERE season_id=$1 AND player_id=$2", [season.id, playerId])).rows[0].rating; const existing = await client.query("SELECT ticket_id FROM cloud_match_queue WHERE player_id=$1 FOR UPDATE", [playerId]); if (existing.rowCount) { await client.query("COMMIT"); return { status: "queued", ticketId: existing.rows[0].ticket_id }; } const candidate = await client.query("SELECT * FROM cloud_match_queue WHERE mode=$1 AND player_id<>$2 AND expires_at>NOW() AND ABS(rating-$3)<=GREATEST(100,EXTRACT(EPOCH FROM (NOW()-joined_at))::int*2) ORDER BY joined_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED", [mode, playerId, rating]); if (!candidate.rowCount) { const ticketId = randomUUID(); await client.query("INSERT INTO cloud_match_queue(player_id,mode,deck,rating,ticket_id,expires_at) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '5 minutes')", [playerId, mode, JSON.stringify(deck), rating, ticketId]); await client.query("COMMIT"); return { status: "queued", ticketId }; } const opponent = candidate.rows[0]; const matchId = randomUUID(); const first = randomInt(2) === 0 ? playerId : opponent.player_id; const second = first === playerId ? opponent.player_id : playerId; const firstDeck = first === playerId ? deck : opponent.deck; const secondDeck = second === playerId ? deck : opponent.deck; const state = { phase: "waiting_for_ready", playerOneReady: false, playerTwoReady: false }; await client.query("DELETE FROM cloud_match_queue WHERE player_id IN ($1,$2)", [playerId, opponent.player_id]); await client.query("INSERT INTO cloud_matches(id,mode,status,player_one_id,player_two_id,player_one_deck,player_two_deck,state,seed) VALUES($1,$2,'waiting',$3,$4,$5,$6,$7,$8)", [matchId, mode, first, second, JSON.stringify(firstDeck), JSON.stringify(secondDeck), state, randomInt(1, 2_147_483_647)]); await appendMatchEvent(client, matchId, null, "match_created", { mode }); await audit(client, playerId, "pvp.matched", "match", matchId, { opponent: opponent.player_id }); await client.query("COMMIT"); return { status: "matched", matchId }; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function reportMatch(playerId, matchId, body) { const reason = ["abuse", "cheat", "afk", "name", "other"].includes(body.reason) ? body.reason : null; if (!reason) throw new Error("REPORT_INVALID"); const match = (await pool.query("SELECT player_one_id,player_two_id FROM cloud_matches WHERE id=$1 AND (player_one_id=$2 OR player_two_id=$2)", [matchId, playerId])).rows[0]; if (!match) throw new Error("MATCH_NOT_FOUND"); const reported = match.player_one_id === playerId ? match.player_two_id : match.player_one_id; await pool.query("INSERT INTO cloud_match_reports(id,match_id,reporter_player_id,reported_player_id,reason,detail) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(match_id,reporter_player_id) DO NOTHING", [randomUUID(), matchId, playerId, reported, reason, String(body.detail ?? "").slice(0, 500)]); return { status: "submitted" }; }

const server = createServer(async (request, response) => {
  try {
    const urlPath = (request.url ?? "").split("?")[0];
    if (request.method === "GET" && urlPath === "/health") return json(response, 200, { status: "ok", service: "authoritative-platform" });
    if (request.method === "GET" && urlPath === "/health/ready") { await pool.query("SELECT 1"); return json(response, 200, { status: "ready" }); }
    const player = await requirePlayer(request, response); if (!player) return;
    if (request.method === "GET" && urlPath === "/v1/platform/state") return json(response, 200, await getPlatformState(player.playerId));
    if (request.method === "POST" && urlPath === "/v1/store/purchase") return json(response, 200, await purchase(player.playerId, await parseJson(request)));
    if (request.method === "GET" && urlPath === "/v1/seasons/current") return json(response, 200, await seasonStatus(player.playerId));
    const reward = urlPath.match(/^\/v1\/seasons\/current\/rewards\/(\d+)\/claim$/); if (request.method === "POST" && reward) return json(response, 200, await claimSeasonReward(player.playerId, Number(reward[1]), await parseJson(request)));
    if (request.method === "GET" && urlPath === "/v1/rankings/current") return json(response, 200, await leaderboard());
    if (request.method === "POST" && urlPath === "/v1/pvp/queue") return json(response, 200, await enqueue(player.playerId, await parseJson(request)));
    if (request.method === "DELETE" && urlPath === "/v1/pvp/queue") { await pool.query("DELETE FROM cloud_match_queue WHERE player_id=$1", [player.playerId]); return json(response, 200, { status: "cancelled" }); }
    const match = urlPath.match(/^\/v1\/pvp\/matches\/([0-9a-f-]{36})$/i); if (request.method === "GET" && match) return forwardMatchRequest(request, response, `/v1/pvp-authoritative/matches/${match[1]}${new URL(request.url, "http://local").search}`);
    const command = urlPath.match(/^\/v1\/pvp\/matches\/([0-9a-f-]{36})\/commands$/i); if (request.method === "POST" && command) return forwardMatchRequest(request, response, `/v1/pvp-authoritative/matches/${command[1]}/commands`);
    const report = urlPath.match(/^\/v1\/pvp\/matches\/([0-9a-f-]{36})\/report$/i); if (request.method === "POST" && report) return json(response, 201, await reportMatch(player.playerId, report[1], await parseJson(request)));
    return json(response, 404, { errorCode: "ROUTE_NOT_FOUND" });
  } catch (error) { const message = error instanceof Error ? error.message : "INTERNAL_ERROR"; const known = KNOWN_ERROR_CODES.has(message); const status = known && /INVALID|NOT_FOUND|DENIED|LOCKED|ALREADY|INSUFFICIENT|REUSED|TIMEOUT|TURN/i.test(message) ? 400 : 500; console.error("platform-api", { message, path: request.url, stack: error instanceof Error ? error.stack : undefined }); return json(response, status, { errorCode: known ? message : "SERVER_ERROR" }); }
});

server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
process.on("unhandledRejection", (reason) => console.error("platform-api unhandledRejection", { reason: String(reason) }));
const shutdown = (signal) => { console.log("platform-api graceful shutdown", { signal }); server.close(); void pool.end().catch(() => undefined).finally(() => process.exit(0)); setTimeout(() => process.exit(0), 10_000).unref(); };
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

await migrate();
server.listen(port, host, () => console.log(`Authoritative platform listening at http://${host}:${port}`));
const queueSweep = () => { pool.query("DELETE FROM cloud_match_queue WHERE expires_at<NOW()").catch((error) => console.error("queue-sweep", { message: error instanceof Error ? error.message : "SWEEP_FAILED" })); };
queueSweep();
setInterval(queueSweep, 3_600_000).unref();
