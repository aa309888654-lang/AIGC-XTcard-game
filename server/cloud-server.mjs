import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import "dotenv/config";
import { Pool } from "pg";

const port = Number(process.env.CLOUD_PORT ?? 3210);
const databaseUrl = process.env.DATABASE_URL ?? "postgres://xianxia:xianxia@127.0.0.1:5432/xianxia";
const signingSecret = process.env.CLOUD_SIGNING_SECRET ?? "development-only-change-before-production";
if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL || !process.env.CLOUD_SIGNING_SECRET || signingSecret.length < 32)) {
  throw new Error("Production requires DATABASE_URL and a CLOUD_SIGNING_SECRET of at least 32 characters");
}
const pool = new Pool({ connectionString: databaseUrl, max: 10 });
const rateWindows = new Map();
const refreshWindows = new Map();
const RATE_LIMIT = Number(process.env.INSTALLATION_RATE_LIMIT ?? 10);
const RATE_WINDOW_MS = Number(process.env.INSTALLATION_RATE_WINDOW_MS ?? 3_600_000);
const REFRESH_RATE_LIMIT = Number(process.env.SESSION_REFRESH_RATE_LIMIT ?? 30);
const lastSeenAt = new Map();
// nginx 以追加模式写入 X-Forwarded-For（客户端可伪造首段），因此优先信任 X-Real-IP，
// XFF 只取最后一段（即最外层反代看到的真实地址）。
const clientIp = (request) => {
  const realIp = String(request.headers["x-real-ip"] ?? "").trim();
  if (realIp) return realIp;
  const parts = String(request.headers["x-forwarded-for"] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (parts.length) return parts[parts.length - 1];
  return request.socket.remoteAddress || "unknown";
};
const localOnlyMetaFields = new Set(["starDust", "guildMarks", "ownedShopItems", "arcaneDust", "collection", "passTier"]);
// 仅向客户端透传白名单内的业务错误码，其余一律返回 SERVER_ERROR，避免泄露内部细节。
const KNOWN_ERROR_CODES = new Set([
  "PAYLOAD_TOO_LARGE", "SYNC_REQUEST_INVALID", "SYNC_OPERATIONS_TOO_MANY", "SYNC_OPERATION_INVALID",
  "IDEMPOTENCY_KEY_REUSED", "INSTALLATION_SECRET_INVALID", "INSTALLATION_RATE_LIMITED",
  "SESSION_REFRESH_INVALID", "SESSION_REFRESH_RATE_LIMITED",
  "GUILD_MEMBERSHIP_EXISTS", "GUILD_INPUT_INVALID", "GUILD_INVITE_INVALID", "GUILD_INVITE_NOT_FOUND",
  "GUILD_MEMBER_LIMIT_REACHED", "GUILD_APPLICATION_NOT_FOUND", "GUILD_APPLICATION_EXISTS",
  "GUILD_MEMBERSHIP_REQUIRED", "GUILD_PERMISSION_DENIED", "GUILD_NAME_OR_TAG_TAKEN",
  "GUILD_LEADER_TRANSFER_REQUIRED", "ROUTE_NOT_FOUND",
]);

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};
const digest = (value) => createHash("sha256").update(value).digest("hex");
const sanitizeDocumentPayload = (documentKey, payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  if (documentKey !== "meta") return payload;
  return Object.fromEntries(Object.entries(payload).filter(([field]) => !localOnlyMetaFields.has(field)));
};
const parseJson = async (request) => {
  let raw = "";
  for await (const part of request) {
    raw += part;
    if (raw.length > 1_000_000) throw new Error("PAYLOAD_TOO_LARGE");
  }
  return raw ? JSON.parse(raw) : {};
};
const sign = (payload) => createHmac("sha256", signingSecret).update(payload).digest("base64url");
const issueToken = (claims) => {
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
};
const verifyToken = (token) => {
  const [payload, signature] = String(token ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.exp > Date.now() ? claims : null;
  } catch { return null; }
};
const auth = (request) => verifyToken(request.headers.authorization?.replace(/^Bearer\s+/i, ""));

async function migrate() {
  for (const migration of ["001_cloud_core.sql", "002_guilds.sql", "003_authoritative_platform.sql", "004_social_liveops.sql"]) {
    await pool.query(await readFile(resolve("server/migrations", migration), "utf8"));
  }
}

async function requirePlayer(request, response) {
  const claims = auth(request);
  if (!claims?.playerId || !claims?.installationId) {
    json(response, 401, { errorCode: "INSTALLATION_TOKEN_REQUIRED" });
    return null;
  }
  const result = await pool.query(
    "SELECT player_id FROM cloud_installations WHERE id=$1 AND player_id=$2 AND revoked_at IS NULL AND token_version=$3",
    [claims.installationId, claims.playerId, claims.tokenVersion],
  );
  if (!result.rowCount) {
    json(response, 401, { errorCode: "INSTALLATION_TOKEN_REVOKED" });
    return null;
  }
  if (request.method === "POST") {
    const now = Date.now();
    const last = lastSeenAt.get(claims.installationId) ?? 0;
    if (now - last > 60_000) {
      lastSeenAt.set(claims.installationId, now);
      await pool.query("UPDATE cloud_installations SET last_seen_at=NOW() WHERE id=$1", [claims.installationId]).catch(() => undefined);
    }
  }
  return claims;
}

async function bootstrap(playerId) {
  const { rows } = await pool.query("SELECT document_key, revision, payload, updated_at FROM cloud_documents WHERE player_id=$1", [playerId]);
  return {
    serverTimestamp: new Date().toISOString(),
    documents: Object.fromEntries(rows.map((row) => [row.document_key, { revision: row.revision, payload: row.payload, updatedAt: row.updated_at }])),
  };
}

async function createInstallation(body) {
  const installationId = randomUUID();
  const playerId = randomUUID();
  const installationSecret = String(body.installationSecret ?? "");
  if (installationSecret.length < 24) throw new Error("INSTALLATION_SECRET_INVALID");
  const publicCode = `XF-${randomBytes(4).toString("hex").toUpperCase()}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO cloud_players(id, public_code) VALUES($1,$2)", [playerId, publicCode]);
    await client.query("INSERT INTO cloud_installations(id, player_id, secret_hash) VALUES($1,$2,$3)", [installationId, playerId, digest(installationSecret)]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
  return { playerId, publicCode, installationId, accessToken: issueToken({ playerId, installationId, tokenVersion: 1 }) };
}

// token 过期后玩家可用本地保管的 installationSecret 换发新 token，
// 避免匿名账号在 12 小时后被静默重建、钱包/赛季/公会数据孤儿化。
async function refreshSession(body) {
  const installationId = String(body.installationId ?? "");
  const installationSecret = String(body.installationSecret ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(installationId) || installationSecret.length < 24) throw new Error("SESSION_REFRESH_INVALID");
  const result = await pool.query(
    "SELECT id, player_id, token_version FROM cloud_installations WHERE id=$1 AND secret_hash=$2 AND revoked_at IS NULL",
    [installationId, digest(installationSecret)],
  );
  if (!result.rowCount) throw new Error("SESSION_REFRESH_INVALID");
  const installation = result.rows[0];
  return {
    playerId: installation.player_id,
    installationId: installation.id,
    accessToken: issueToken({ playerId: installation.player_id, installationId: installation.id, tokenVersion: installation.token_version }),
  };
}

async function pushDocuments(playerId, body) {
  const idempotencyKey = String(body.idempotencyKey ?? "");
  const operations = Array.isArray(body.operations) ? body.operations : [];
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey) || !operations.length) throw new Error("SYNC_REQUEST_INVALID");
  if (operations.length > 20) throw new Error("SYNC_OPERATIONS_TOO_MANY");
  const requestHash = digest(JSON.stringify({ idempotencyKey, operations }));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT request_hash, response FROM cloud_sync_operations WHERE player_id=$1 AND idempotency_key=$2", [playerId, idempotencyKey]);
    if (existing.rowCount) {
      if (existing.rows[0].request_hash !== requestHash) throw new Error("IDEMPOTENCY_KEY_REUSED");
      await client.query("COMMIT");
      return { ...existing.rows[0].response, status: "already-applied" };
    }
    const results = [];
    for (const operation of operations) {
      const key = String(operation.documentKey ?? "");
      const baseRevision = Number(operation.baseRevision ?? 0);
      if (!/^(meta|settings|decks|battle-session)$/.test(key) || !Number.isInteger(baseRevision)) throw new Error("SYNC_OPERATION_INVALID");
      const payload = sanitizeDocumentPayload(key, operation.payload);
      const current = await client.query("SELECT revision, payload, updated_at FROM cloud_documents WHERE player_id=$1 AND document_key=$2 FOR UPDATE", [playerId, key]);
      if (!current.rowCount) {
        if (baseRevision !== 0) {
          results.push({ documentKey: key, status: "conflict", revision: 0, payload: null });
          continue;
        }
        const inserted = await client.query("INSERT INTO cloud_documents(player_id, document_key, revision, payload) VALUES($1,$2,1,$3) RETURNING revision, payload, updated_at", [playerId, key, payload]);
        results.push({ documentKey: key, status: "applied", revision: inserted.rows[0].revision, payload: inserted.rows[0].payload, updatedAt: inserted.rows[0].updated_at });
        continue;
      }
      const remote = current.rows[0];
      if (remote.revision !== baseRevision) {
        results.push({ documentKey: key, status: "conflict", revision: remote.revision, payload: remote.payload, updatedAt: remote.updated_at });
        continue;
      }
      const updated = await client.query("UPDATE cloud_documents SET revision=revision+1, payload=$3, updated_at=NOW() WHERE player_id=$1 AND document_key=$2 RETURNING revision, payload, updated_at", [playerId, key, payload]);
      results.push({ documentKey: key, status: "applied", revision: updated.rows[0].revision, payload: updated.rows[0].payload, updatedAt: updated.rows[0].updated_at });
    }
    const response = { status: "applied", results, serverTimestamp: new Date().toISOString() };
    await client.query("INSERT INTO cloud_sync_operations(player_id, idempotency_key, request_hash, response) VALUES($1,$2,$3,$4)", [playerId, idempotencyKey, requestHash, response]);
    await client.query("COMMIT");
    return response;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

const GUILD_ROLE_LABELS = { leader: "连队长", officer: "副连队长", member: "成员" };
const GUILD_NAME = /^[\p{L}\p{N} _-]{2,24}$/u;
const GUILD_TAG = /^[A-Z0-9]{2,6}$/;
const isGuildManager = (role) => role === "leader" || role === "officer";
const normalizeGuildName = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const inviteCode = () => randomBytes(4).toString("hex").toUpperCase();

async function getMembership(playerId) {
  const result = await pool.query(
    `SELECT m.guild_id, m.role, m.weekly_contribution, m.joined_at
       FROM cloud_guild_members m WHERE m.player_id=$1`,
    [playerId],
  );
  return result.rows[0] ?? null;
}

async function guildSnapshot(playerId) {
  const membership = await getMembership(playerId);
  if (!membership) return { guild: null, me: null, members: [], applications: [] };
  const guildResult = await pool.query(
    `SELECT id, name, tag, description, notice, invite_code, owner_player_id, member_limit, created_at, updated_at
       FROM cloud_guilds WHERE id=$1`,
    [membership.guild_id],
  );
  const guild = guildResult.rows[0];
  if (!guild) return { guild: null, me: null, members: [], applications: [] };
  const membersResult = await pool.query(
    `SELECT m.player_id, m.role, m.weekly_contribution, m.joined_at, p.public_code
       FROM cloud_guild_members m JOIN cloud_players p ON p.id=m.player_id
       WHERE m.guild_id=$1
       ORDER BY CASE m.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, m.weekly_contribution DESC, m.joined_at ASC`,
    [guild.id],
  );
  const applications = isGuildManager(membership.role)
    ? (await pool.query(
      `SELECT a.id, a.player_id, a.message, a.created_at, p.public_code
         FROM cloud_guild_applications a JOIN cloud_players p ON p.id=a.player_id
         WHERE a.guild_id=$1 ORDER BY a.created_at ASC`,
      [guild.id],
    )).rows
    : [];
  return {
    guild: { id: guild.id, name: guild.name, tag: guild.tag, description: guild.description, notice: guild.notice, inviteCode: guild.invite_code, memberLimit: guild.member_limit, createdAt: guild.created_at, updatedAt: guild.updated_at },
    me: { role: membership.role, roleLabel: GUILD_ROLE_LABELS[membership.role], contribution: membership.weekly_contribution, joinedAt: membership.joined_at },
    members: membersResult.rows.map((row) => ({ playerId: row.player_id, publicCode: row.public_code, role: row.role, roleLabel: GUILD_ROLE_LABELS[row.role], contribution: row.weekly_contribution, joinedAt: row.joined_at, isSelf: row.player_id === playerId })),
    applications: applications.map((row) => ({ id: row.id, playerId: row.player_id, publicCode: row.public_code, message: row.message, createdAt: row.created_at })),
  };
}

async function createGuild(playerId, body) {
  if (await getMembership(playerId)) throw new Error("GUILD_MEMBERSHIP_EXISTS");
  const name = normalizeGuildName(body.name);
  const tag = String(body.tag ?? "").trim().toUpperCase();
  const description = String(body.description ?? "").trim().slice(0, 180);
  if (!GUILD_NAME.test(name) || !GUILD_TAG.test(tag)) throw new Error("GUILD_INPUT_INVALID");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const guildId = randomUUID();
    const code = inviteCode();
    await client.query(
      "INSERT INTO cloud_guilds(id, name, name_key, tag, description, invite_code, owner_player_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [guildId, name, name.toLocaleLowerCase(), tag, description, code, playerId],
    );
    await client.query("INSERT INTO cloud_guild_members(guild_id, player_id, role) VALUES($1,$2,'leader')", [guildId, playerId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") throw new Error("GUILD_NAME_OR_TAG_TAKEN");
    throw error;
  } finally { client.release(); }
  return guildSnapshot(playerId);
}

async function joinGuild(playerId, body) {
  if (await getMembership(playerId)) throw new Error("GUILD_MEMBERSHIP_EXISTS");
  const code = String(body.inviteCode ?? "").trim().toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(code)) throw new Error("GUILD_INVITE_INVALID");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const guild = await client.query("SELECT id, member_limit FROM cloud_guilds WHERE invite_code=$1 FOR UPDATE", [code]);
    if (!guild.rowCount) throw new Error("GUILD_INVITE_NOT_FOUND");
    const count = await client.query("SELECT COUNT(*)::int AS count FROM cloud_guild_members WHERE guild_id=$1", [guild.rows[0].id]);
    if (count.rows[0].count >= guild.rows[0].member_limit) throw new Error("GUILD_MEMBER_LIMIT_REACHED");
    await client.query("INSERT INTO cloud_guild_members(guild_id, player_id, role) VALUES($1,$2,'member')", [guild.rows[0].id, playerId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") throw new Error("GUILD_MEMBERSHIP_EXISTS");
    throw error;
  } finally { client.release(); }
  return guildSnapshot(playerId);
}

async function discoverGuilds(query) {
  const filter = String(query ?? "").trim().slice(0, 24);
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.tag, g.description, g.member_limit, g.created_at, COUNT(m.player_id)::int AS member_count
       FROM cloud_guilds g LEFT JOIN cloud_guild_members m ON m.guild_id=g.id
       WHERE ($1='' OR g.name ILIKE '%' || $1 || '%' OR g.tag ILIKE '%' || upper($1) || '%')
       GROUP BY g.id ORDER BY member_count DESC, g.created_at DESC LIMIT 20`,
    [filter],
  );
  return { guilds: rows.map((row) => ({ id: row.id, name: row.name, tag: row.tag, description: row.description, memberLimit: row.member_limit, memberCount: row.member_count })) };
}

async function applyToGuild(playerId, guildId, body) {
  if (await getMembership(playerId)) throw new Error("GUILD_MEMBERSHIP_EXISTS");
  if (!/^[0-9a-f-]{36}$/i.test(guildId)) throw new Error("GUILD_APPLICATION_NOT_FOUND");
  const message = String(body.message ?? "").trim().slice(0, 120);
  try {
    const guild = await pool.query("SELECT id FROM cloud_guilds WHERE id=$1", [guildId]);
    if (!guild.rowCount) throw new Error("GUILD_APPLICATION_NOT_FOUND");
    await pool.query("INSERT INTO cloud_guild_applications(id, guild_id, player_id, message) VALUES($1,$2,$3,$4)", [randomUUID(), guildId, playerId, message]);
  } catch (error) {
    if (error?.code === "23505") throw new Error("GUILD_APPLICATION_EXISTS");
    throw error;
  }
  return { status: "submitted" };
}

async function updateGuildNotice(playerId, body) {
  const membership = await getMembership(playerId);
  if (!membership) throw new Error("GUILD_MEMBERSHIP_REQUIRED");
  if (!isGuildManager(membership.role)) throw new Error("GUILD_PERMISSION_DENIED");
  const notice = String(body.notice ?? "").trim().slice(0, 240);
  await pool.query("UPDATE cloud_guilds SET notice=$2, updated_at=NOW() WHERE id=$1", [membership.guild_id, notice]);
  return guildSnapshot(playerId);
}

async function decideApplication(playerId, applicationId, approved) {
  const membership = await getMembership(playerId);
  if (!membership || !isGuildManager(membership.role)) throw new Error("GUILD_PERMISSION_DENIED");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const application = await client.query("SELECT player_id FROM cloud_guild_applications WHERE id=$1 AND guild_id=$2 FOR UPDATE", [applicationId, membership.guild_id]);
    if (!application.rowCount) throw new Error("GUILD_APPLICATION_NOT_FOUND");
    if (approved) {
      const guild = await client.query("SELECT member_limit FROM cloud_guilds WHERE id=$1 FOR UPDATE", [membership.guild_id]);
      const count = await client.query("SELECT COUNT(*)::int AS count FROM cloud_guild_members WHERE guild_id=$1", [membership.guild_id]);
      if (count.rows[0].count >= guild.rows[0].member_limit) throw new Error("GUILD_MEMBER_LIMIT_REACHED");
      await client.query("INSERT INTO cloud_guild_members(guild_id, player_id, role) VALUES($1,$2,'member')", [membership.guild_id, application.rows[0].player_id]);
    }
    await client.query("DELETE FROM cloud_guild_applications WHERE id=$1", [applicationId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") throw new Error("GUILD_MEMBERSHIP_EXISTS");
    throw error;
  } finally { client.release(); }
  return guildSnapshot(playerId);
}

async function leaveGuild(playerId) {
  const membership = await getMembership(playerId);
  if (!membership) throw new Error("GUILD_MEMBERSHIP_REQUIRED");
  if (membership.role === "leader") {
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM cloud_guild_members WHERE guild_id=$1", [membership.guild_id]);
    if (count.rows[0].count > 1) throw new Error("GUILD_LEADER_TRANSFER_REQUIRED");
    await pool.query("DELETE FROM cloud_guilds WHERE id=$1", [membership.guild_id]);
  } else {
    await pool.query("DELETE FROM cloud_guild_members WHERE guild_id=$1 AND player_id=$2", [membership.guild_id, playerId]);
  }
  return { guild: null, me: null, members: [], applications: [] };
}

const server = createServer(async (request, response) => {
  try {
    const urlPath = (request.url ?? "").split("?")[0];
    if (request.method === "GET" && urlPath === "/health") return json(response, 200, { status: "ok" });
    if (request.method === "GET" && urlPath === "/health/ready") {
      await pool.query("SELECT 1");
      return json(response, 200, { status: "ready" });
    }
    const consumeRateWindow = (store, limit) => {
      const ip = clientIp(request);
      const now = Date.now();
      const recent = (store.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
      if (recent.length >= limit) return null;
      recent.push(now);
      store.set(ip, recent);
      return ip;
    };
    if (request.method === "POST" && urlPath === "/v1/installations") {
      if (!consumeRateWindow(rateWindows, RATE_LIMIT)) {
        json(response, 429, { errorCode: "INSTALLATION_RATE_LIMITED" });
        return;
      }
      return json(response, 201, await createInstallation(await parseJson(request)));
    }
    if (request.method === "POST" && urlPath === "/v1/sessions/refresh") {
      if (!consumeRateWindow(refreshWindows, REFRESH_RATE_LIMIT)) {
        json(response, 429, { errorCode: "SESSION_REFRESH_RATE_LIMITED" });
        return;
      }
      return json(response, 200, await refreshSession(await parseJson(request)));
    }
    const player = await requirePlayer(request, response);
    if (!player) return;
    if (request.method === "GET" && urlPath === "/v1/bootstrap") return json(response, 200, await bootstrap(player.playerId));
    if (request.method === "POST" && urlPath === "/v1/sync/push") return json(response, 200, await pushDocuments(player.playerId, await parseJson(request)));
    if (request.method === "GET" && urlPath === "/v1/guilds/mine") return json(response, 200, await guildSnapshot(player.playerId));
    if (request.method === "GET" && urlPath === "/v1/guilds/discover") return json(response, 200, await discoverGuilds(new URL(request.url, "http://local").searchParams.get("query")));
    if (request.method === "POST" && urlPath === "/v1/guilds") return json(response, 201, await createGuild(player.playerId, await parseJson(request)));
    if (request.method === "POST" && urlPath === "/v1/guilds/join") return json(response, 200, await joinGuild(player.playerId, await parseJson(request)));
    if (request.method === "PATCH" && urlPath === "/v1/guilds/mine/notice") return json(response, 200, await updateGuildNotice(player.playerId, await parseJson(request)));
    if (request.method === "DELETE" && urlPath === "/v1/guilds/mine") return json(response, 200, await leaveGuild(player.playerId));
    const joinRequestMatch = urlPath.match(/^\/v1\/guilds\/([0-9a-f-]{36})\/applications$/i);
    if (request.method === "POST" && joinRequestMatch) return json(response, 201, await applyToGuild(player.playerId, joinRequestMatch[1], await parseJson(request)));
    const applicationMatch = urlPath.match(/^\/v1\/guilds\/mine\/applications\/([0-9a-f-]{36})\/(approve|reject)$/i);
    if (request.method === "POST" && applicationMatch) return json(response, 200, await decideApplication(player.playerId, applicationMatch[1], applicationMatch[2] === "approve"));
    return json(response, 404, { errorCode: "ROUTE_NOT_FOUND" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const known = KNOWN_ERROR_CODES.has(message);
    const status = known && /INVALID|TOO_LARGE|REUSED|NOT_FOUND|LIMIT|EXISTS|REQUIRED|DENIED|TRANSFER/i.test(message) ? 400 : 500;
    console.error("cloud-api", { message, path: request.url, stack: error instanceof Error ? error.stack : undefined });
    return json(response, status, { errorCode: known ? message : "SERVER_ERROR" });
  }
});

// 防止限流与活跃度 Map 无上限增长（长期运行的内存泄漏）。
setInterval(() => {
  const now = Date.now();
  for (const [ip, stamps] of rateWindows) {
    const recent = stamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length) rateWindows.set(ip, recent);
    else rateWindows.delete(ip);
  }
  for (const [ip, stamps] of refreshWindows) {
    const recent = stamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length) refreshWindows.set(ip, recent);
    else refreshWindows.delete(ip);
  }
  const lastSeenCutoff = now - 24 * 3_600_000;
  for (const [id, seen] of lastSeenAt) {
    if (seen < lastSeenCutoff) lastSeenAt.delete(id);
  }
}, 5 * 60_000).unref();

// 请求头/请求体超时，避免慢速攻击长期占用连接。
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
process.on("unhandledRejection", (reason) => console.error("cloud-api unhandledRejection", { reason: String(reason) }));

const shutdown = (signal) => {
  console.log("cloud-api graceful shutdown", { signal });
  server.close();
  void pool.end().catch(() => undefined).finally(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

await migrate();
server.listen(port, process.env.SERVICE_HOST ?? "0.0.0.0", () => console.log(`Cloud API listening at http://${process.env.SERVICE_HOST ?? "0.0.0.0"}:${port}`));
