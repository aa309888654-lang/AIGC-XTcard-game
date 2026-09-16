import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import "dotenv/config";
import { Pool } from "pg";

const port = Number(process.env.SOCIAL_PORT ?? 3213);
const databaseUrl = process.env.DATABASE_URL ?? "postgres://xianxia:xianxia@127.0.0.1:5432/xianxia";
const signingSecret = process.env.CLOUD_SIGNING_SECRET ?? "development-only-change-before-production";
const internalServiceKey = process.env.INTERNAL_SERVICE_KEY ?? "";
if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL || !process.env.CLOUD_SIGNING_SECRET || signingSecret.length < 32 || internalServiceKey.length < 32)) {
  throw new Error("Production requires DATABASE_URL, a CLOUD_SIGNING_SECRET, and an INTERNAL_SERVICE_KEY of at least 32 characters");
}
const pool = new Pool({ connectionString: databaseUrl, max: 12 });
// 内部服务密钥用常量时间比较，避免逐字节比较的时序侧信道。
const internalKeyMatches = (provided) => {
  if (!internalServiceKey || typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(internalServiceKey);
  return a.length === b.length && timingSafeEqual(a, b);
};
// 仅向客户端透传白名单内的业务错误码，其余一律返回 SERVER_ERROR。
const KNOWN_ERROR_CODES = new Set([
  "PAYLOAD_TOO_LARGE", "AFTER_PARAM_INVALID", "CHAT_MESSAGE_INVALID", "CHAT_RATE_LIMITED",
  "GUILD_MEMBERSHIP_REQUIRED", "GUILD_PERMISSION_DENIED", "GUILD_TASK_NOT_FOUND", "GUILD_TASK_LOCKED",
  "GUILD_TASK_ALREADY_CLAIMED", "INTERNAL_ENDPOINT_DISABLED", "CONTRIBUTION_COMMAND_INVALID",
  "SOCIAL_TARGET_NOT_FOUND", "SOCIAL_BLOCKED", "SOCIAL_ACTION_INVALID", "FRIEND_REQUEST_NOT_FOUND",
  "DIRECT_MESSAGE_FRIEND_REQUIRED", "PARTY_MEMBERSHIP_EXISTS", "PARTY_LEADER_REQUIRED", "PARTY_FULL",
  "PARTY_INVITE_NOT_FOUND", "PARTY_NOT_FOUND", "PARTY_FRIEND_REQUIRED", "MAIL_NOT_FOUND",
  "MAIL_ALREADY_CLAIMED", "REDEEM_CODE_INVALID", "REDEEM_CODE_NOT_FOUND", "REDEEM_CODE_EXHAUSTED",
  "REDEEM_CODE_ALREADY_CLAIMED", "SUPPORT_TICKET_INVALID", "ROUTE_NOT_FOUND",
]);

const json = (response, status, body) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(body)); };
const parseJson = async (request) => { let raw = ""; for await (const part of request) { raw += part; if (raw.length > 1000000) throw new Error("PAYLOAD_TOO_LARGE"); } return raw ? JSON.parse(raw) : {}; };
const digest = (value) => createHash("sha256").update(value).digest("hex");
const verifyToken = (token) => {
  const [payload, signature] = String(token ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return claims.exp > Date.now() ? claims : null; } catch { return null; }
};
async function migrate() { for (const name of ["001_cloud_core.sql", "002_guilds.sql", "003_authoritative_platform.sql", "004_social_liveops.sql"]) await pool.query(await readFile(resolve("server/migrations", name), "utf8")); }
async function requirePlayer(request, response) {
  const claims = verifyToken(request.headers.authorization?.replace(/^Bearer\s+/i, ""));
  if (!claims?.playerId || !claims?.installationId) { json(response, 401, { errorCode: "INSTALLATION_TOKEN_REQUIRED" }); return null; }
  const active = await pool.query("SELECT 1 FROM cloud_installations WHERE id=$1 AND player_id=$2 AND revoked_at IS NULL AND token_version=$3", [claims.installationId, claims.playerId, claims.tokenVersion]);
  if (!active.rowCount) { json(response, 401, { errorCode: "INSTALLATION_TOKEN_REVOKED" }); return null; }
  return claims;
}
async function membership(client, playerId) {
  const result = await client.query("SELECT guild_id,role FROM cloud_guild_members WHERE player_id=$1", [playerId]);
  if (!result.rowCount) throw new Error("GUILD_MEMBERSHIP_REQUIRED");
  return result.rows[0];
}
function roleCanManage(actor, target) { return actor === "leader" || (actor === "officer" && target === "member"); }
async function audit(client, playerId, action, subjectType, subjectId, metadata = {}) { await client.query("INSERT INTO cloud_audit_events(id,player_id,action,subject_type,subject_id,metadata) VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), playerId, action, subjectType, subjectId, metadata]); }

async function guildChat(playerId, after) {
  const afterValue = after ? String(after) : null;
  if (afterValue && !Number.isFinite(Date.parse(afterValue))) throw new Error("AFTER_PARAM_INVALID");
  const client = await pool.connect();
  try {
    const mine = await membership(client, playerId);
    const { rows } = await client.query("SELECT c.id,c.body,c.created_at,p.public_code,m.role FROM cloud_guild_chat_messages c JOIN cloud_players p ON p.id=c.player_id JOIN cloud_guild_members m ON m.guild_id=c.guild_id AND m.player_id=c.player_id WHERE c.guild_id=$1 AND c.deleted_at IS NULL AND c.created_at>$2 ORDER BY c.created_at ASC LIMIT 100", [mine.guild_id, afterValue ?? "1970-01-01T00:00:00.000Z"]);
    return { messages: rows.map((row) => ({ id: row.id, body: row.body, createdAt: row.created_at, sender: row.public_code, role: row.role })) };
  } finally { client.release(); }
}
async function sendGuildChat(playerId, body) {
  const message = String(body.message ?? "").trim();
  if (!message || message.length > 500) throw new Error("CHAT_MESSAGE_INVALID");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const mine = await membership(client, playerId);
    const recent = await client.query("SELECT COUNT(*)::int AS count FROM cloud_guild_chat_messages WHERE player_id=$1 AND created_at>NOW()-INTERVAL '10 seconds'", [playerId]);
    if (recent.rows[0].count >= 5) throw new Error("CHAT_RATE_LIMITED");
    const id = randomUUID();
    await client.query("INSERT INTO cloud_guild_chat_messages(id,guild_id,player_id,body) VALUES($1,$2,$3,$4)", [id, mine.guild_id, playerId, message]);
    await audit(client, playerId, "guild.chat.send", "guild", mine.guild_id, { messageHash: digest(message) });
    await client.query("COMMIT");
    return { id, status: "sent" };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function manageGuildMember(playerId, targetId, body, remove = false) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const mine = await membership(client, playerId);
    const target = (await client.query("SELECT role FROM cloud_guild_members WHERE guild_id=$1 AND player_id=$2 FOR UPDATE", [mine.guild_id, targetId])).rows[0];
    if (!target || targetId === playerId || !roleCanManage(mine.role, target.role)) throw new Error("GUILD_PERMISSION_DENIED");
    if (remove) await client.query("DELETE FROM cloud_guild_members WHERE guild_id=$1 AND player_id=$2", [mine.guild_id, targetId]);
    else {
      const role = body.role === "officer" ? "officer" : "member";
      if (mine.role !== "leader") throw new Error("GUILD_PERMISSION_DENIED");
      await client.query("UPDATE cloud_guild_members SET role=$3 WHERE guild_id=$1 AND player_id=$2", [mine.guild_id, targetId, role]);
    }
    await audit(client, playerId, remove ? "guild.member.remove" : "guild.member.role", "player", targetId, { guildId: mine.guild_id, role: body.role });
    await client.query("COMMIT");
    return { status: remove ? "removed" : "updated" };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function guildRanking(playerId) {
  const client = await pool.connect();
  try {
    const mine = await membership(client, playerId);
    const { rows } = await client.query("SELECT p.public_code,m.role,m.weekly_contribution,RANK() OVER(ORDER BY m.weekly_contribution DESC,m.joined_at ASC) AS rank FROM cloud_guild_members m JOIN cloud_players p ON p.id=m.player_id WHERE m.guild_id=$1 ORDER BY m.weekly_contribution DESC,m.joined_at ASC", [mine.guild_id]);
    return { rows: rows.map((row) => ({ publicCode: row.public_code, role: row.role, contribution: row.weekly_contribution, rank: Number(row.rank) })) };
  } finally { client.release(); }
}
async function guildTasks(playerId) {
  const client = await pool.connect();
  try {
    const mine = await membership(client, playerId);
    const { rows } = await client.query("SELECT t.id,t.title,t.target,t.reward,COALESCE(p.progress,0) AS progress,EXISTS(SELECT 1 FROM cloud_guild_reward_claims c WHERE c.guild_id=$1 AND c.task_id=t.id AND c.player_id=$2) AS claimed FROM cloud_guild_season_tasks t LEFT JOIN cloud_guild_task_progress p ON p.guild_id=$1 AND p.task_id=t.id WHERE t.is_active=TRUE AND t.starts_at<=NOW() AND t.ends_at>NOW() ORDER BY t.ends_at ASC", [mine.guild_id, playerId]);
    return { tasks: rows.map((row) => ({ id: row.id, title: row.title, target: row.target, progress: row.progress, reward: row.reward, claimed: row.claimed })) };
  } finally { client.release(); }
}
async function addReward(client, playerId, rewards, prefix, eventType) {
  const amounts = new Map();
  for (const item of Array.isArray(rewards) ? rewards : []) {
    if (!["starDust", "guildMarks", "arcaneDust"].includes(item.currency) || !Number.isInteger(item.amount) || item.amount <= 0) continue;
    amounts.set(item.currency, (amounts.get(item.currency) ?? 0) + item.amount);
  }
  for (const [currency, amount] of amounts) {
    await client.query("INSERT INTO cloud_wallets(player_id,currency_code,balance) VALUES($1,$2,0) ON CONFLICT DO NOTHING", [playerId, currency]);
    await client.query("UPDATE cloud_wallets SET balance=balance+$3,updated_at=NOW() WHERE player_id=$1 AND currency_code=$2::varchar", [playerId, currency, amount]);
    await client.query("INSERT INTO cloud_asset_ledger(id,player_id,event_type,currency_code,delta,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(player_id,idempotency_key) DO NOTHING", [randomUUID(), playerId, eventType, currency, amount, `${prefix}:${currency}`]);
  }
}
async function claimGuildTask(playerId, taskId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const mine = await membership(client, playerId);
    const task = (await client.query("SELECT t.id,t.target,t.reward,COALESCE(p.progress,0) AS progress FROM cloud_guild_season_tasks t LEFT JOIN cloud_guild_task_progress p ON p.guild_id=$1 AND p.task_id=t.id WHERE t.id=$2 AND t.is_active=TRUE AND t.starts_at<=NOW() AND t.ends_at>NOW() FOR UPDATE OF t", [mine.guild_id, taskId])).rows[0];
    if (!task) throw new Error("GUILD_TASK_NOT_FOUND");
    const contribution = (await client.query("SELECT COALESCE(SUM(amount),0)::int AS total FROM cloud_guild_contribution_ledger WHERE guild_id=$1 AND player_id=$2", [mine.guild_id, playerId])).rows[0].total;
    if (task.progress < task.target || contribution < 10) throw new Error("GUILD_TASK_LOCKED");
    const claim = await client.query("INSERT INTO cloud_guild_reward_claims(guild_id,task_id,player_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING task_id", [mine.guild_id, taskId, playerId]);
    if (!claim.rowCount) throw new Error("GUILD_TASK_ALREADY_CLAIMED");
    await addReward(client, playerId, task.reward, `guild-task:${taskId}`, "guild_task_reward");
    await audit(client, playerId, "guild.task.claim", "guild_task", taskId, { guildId: mine.guild_id });
    await client.query("COMMIT"); return { status: "claimed", reward: task.reward };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function addContribution(request, playerId, body) {
  if (!internalServiceKey || !internalKeyMatches(request.headers["x-internal-key"])) throw new Error("INTERNAL_ENDPOINT_DISABLED");
  const amount = typeof body.amount === "number" && Number.isInteger(body.amount) ? body.amount : Number.isInteger(Number(body.amount)) && typeof body.amount === "string" && /^\d+$/.test(String(body.amount)) ? Number(body.amount) : NaN;
  const source = String(body.source ?? "").slice(0, 32); const key = String(body.idempotencyKey ?? "").slice(0, 128);
  if (!body.guildId || !Number.isInteger(amount) || amount <= 0 || !source || !key) throw new Error("CONTRIBUTION_COMMAND_INVALID");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const member = (await client.query("SELECT 1 FROM cloud_guild_members WHERE guild_id=$1 AND player_id=$2", [body.guildId, playerId])).rowCount;
    if (!member) throw new Error("GUILD_MEMBERSHIP_REQUIRED");
    const inserted = await client.query("INSERT INTO cloud_guild_contribution_ledger(id,guild_id,player_id,source,amount,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(guild_id,idempotency_key) DO NOTHING RETURNING amount", [randomUUID(), body.guildId, playerId, source, amount, key]);
    if (inserted.rowCount) {
      await client.query("UPDATE cloud_guild_members SET weekly_contribution=weekly_contribution+$3 WHERE guild_id=$1 AND player_id=$2", [body.guildId, playerId, amount]);
      await client.query("INSERT INTO cloud_guild_task_progress(guild_id,task_id,progress) SELECT $1,id,$2 FROM cloud_guild_season_tasks WHERE is_active=TRUE AND starts_at<=NOW() AND ends_at>NOW() ON CONFLICT(guild_id,task_id) DO UPDATE SET progress=cloud_guild_task_progress.progress+EXCLUDED.progress,updated_at=NOW()", [body.guildId, amount]);
    }
    await client.query("COMMIT"); return { status: inserted.rowCount ? "applied" : "duplicate" };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function partySnapshot(playerId) {
  const party = (await pool.query("SELECT p.* FROM cloud_parties p JOIN cloud_party_members m ON m.party_id=p.id WHERE m.player_id=$1 AND p.status='open'", [playerId])).rows[0];
  if (!party) return { party: null, invites: [] };
  const members = (await pool.query("SELECT p.id,p.public_code FROM cloud_party_members m JOIN cloud_players p ON p.id=m.player_id WHERE m.party_id=$1 ORDER BY m.joined_at", [party.id])).rows;
  const invites = (await pool.query("SELECT i.id,p.public_code,i.expires_at FROM cloud_party_invites i JOIN cloud_players p ON p.id=i.invitee_player_id WHERE i.party_id=$1 AND i.expires_at>NOW() AND i.accepted_at IS NULL", [party.id])).rows;
  return { party: { id: party.id, mode: party.mode, maxMembers: party.max_members, leaderPlayerId: party.leader_player_id, members: members.map((row) => ({ playerId: row.id, publicCode: row.public_code, isSelf: row.id === playerId })) }, invites: invites.map((row) => ({ id: row.id, publicCode: row.public_code, expiresAt: row.expires_at })) };
}
async function createParty(playerId, body) {
  const mode = ["ranked", "casual", "pve"].includes(body.mode) ? body.mode : "casual"; const maxMembers = Number(body.maxMembers) === 4 ? 4 : 2;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT 1 FROM cloud_party_members WHERE player_id=$1 FOR UPDATE", [playerId]); if (existing.rowCount) throw new Error("PARTY_MEMBERSHIP_EXISTS");
    const id = randomUUID(); await client.query("INSERT INTO cloud_parties(id,leader_player_id,mode,max_members) VALUES($1,$2,$3,$4)", [id, playerId, mode, maxMembers]); await client.query("INSERT INTO cloud_party_members(party_id,player_id) VALUES($1,$2)", [id, playerId]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  return partySnapshot(playerId);
}
async function inviteToParty(playerId, body) {
  const code = String(body.publicCode ?? "").trim().toUpperCase(); const target = (await pool.query("SELECT id FROM cloud_players WHERE public_code=$1", [code])).rows[0]; if (!target) throw new Error("SOCIAL_TARGET_NOT_FOUND");
  const party = (await pool.query("SELECT p.* FROM cloud_parties p JOIN cloud_party_members m ON m.party_id=p.id WHERE m.player_id=$1 AND p.leader_player_id=$1 AND p.status='open' FOR UPDATE", [playerId])).rows[0]; if (!party) throw new Error("PARTY_LEADER_REQUIRED");
  const relation = await pool.query("SELECT 1 FROM cloud_friendships WHERE ((requester_player_id=$1 AND addressee_player_id=$2) OR (requester_player_id=$2 AND addressee_player_id=$1)) AND status='accepted'", [playerId, target.id]); if (!relation.rowCount) throw new Error("PARTY_FRIEND_REQUIRED");
  const count = await pool.query("SELECT COUNT(*)::int AS count FROM cloud_party_members WHERE party_id=$1", [party.id]); if (count.rows[0].count >= party.max_members) throw new Error("PARTY_FULL");
  await pool.query("INSERT INTO cloud_party_invites(id,party_id,inviter_player_id,invitee_player_id,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '5 minutes') ON CONFLICT(party_id,invitee_player_id) DO UPDATE SET expires_at=EXCLUDED.expires_at,accepted_at=NULL", [randomUUID(), party.id, playerId, target.id]); return { status: "invited" };
}
async function acceptPartyInvite(playerId, inviteId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); const invite = (await client.query("SELECT p.max_members,i.party_id FROM cloud_party_invites i JOIN cloud_parties p ON p.id=i.party_id WHERE i.id=$1 AND i.invitee_player_id=$2 AND i.expires_at>NOW() AND i.accepted_at IS NULL FOR UPDATE", [inviteId, playerId])).rows[0]; if (!invite) throw new Error("PARTY_INVITE_NOT_FOUND");
    const existing = await client.query("SELECT 1 FROM cloud_party_members WHERE player_id=$1", [playerId]); if (existing.rowCount) throw new Error("PARTY_MEMBERSHIP_EXISTS"); const count = await client.query("SELECT COUNT(*)::int AS count FROM cloud_party_members WHERE party_id=$1", [invite.party_id]); if (count.rows[0].count >= invite.max_members) throw new Error("PARTY_FULL");
    await client.query("INSERT INTO cloud_party_members(party_id,player_id) VALUES($1,$2)", [invite.party_id, playerId]); await client.query("UPDATE cloud_party_invites SET accepted_at=NOW() WHERE id=$1", [inviteId]); await client.query("COMMIT"); return partySnapshot(playerId);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function leaveParty(playerId) {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const party = (await client.query("SELECT p.* FROM cloud_parties p JOIN cloud_party_members m ON m.party_id=p.id WHERE m.player_id=$1 FOR UPDATE", [playerId])).rows[0]; if (!party) throw new Error("PARTY_NOT_FOUND"); await client.query("DELETE FROM cloud_party_members WHERE party_id=$1 AND player_id=$2", [party.id, playerId]); const remaining = await client.query("SELECT player_id FROM cloud_party_members WHERE party_id=$1 ORDER BY joined_at LIMIT 1", [party.id]); if (!remaining.rowCount) await client.query("UPDATE cloud_parties SET status='closed',updated_at=NOW() WHERE id=$1", [party.id]); else if (party.leader_player_id === playerId) await client.query("UPDATE cloud_parties SET leader_player_id=$2,updated_at=NOW() WHERE id=$1", [party.id, remaining.rows[0].player_id]); await client.query("COMMIT"); return { status: "left" }; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function friendship(playerId, publicCode, action) {
  const code = String(publicCode ?? "").trim().toUpperCase();
  const target = (await pool.query("SELECT id FROM cloud_players WHERE public_code=$1", [code])).rows[0];
  if (!target || target.id === playerId) throw new Error("SOCIAL_TARGET_NOT_FOUND");
  const blocked = await pool.query("SELECT 1 FROM cloud_friendships WHERE ((requester_player_id=$1 AND addressee_player_id=$2) OR (requester_player_id=$2 AND addressee_player_id=$1)) AND status='blocked'", [playerId, target.id]);
  if (blocked.rowCount && action !== "block") throw new Error("SOCIAL_BLOCKED");
  if (action === "request") { await pool.query("INSERT INTO cloud_friendships(requester_player_id,addressee_player_id,status) VALUES($1,$2,'pending') ON CONFLICT(requester_player_id,addressee_player_id) DO NOTHING", [playerId, target.id]); return { status: "requested" }; }
  if (action === "accept") { const result = await pool.query("UPDATE cloud_friendships SET status='accepted',updated_at=NOW() WHERE requester_player_id=$1 AND addressee_player_id=$2 AND status='pending'", [target.id, playerId]); if (!result.rowCount) throw new Error("FRIEND_REQUEST_NOT_FOUND"); return { status: "accepted" }; }
  if (action === "block") { await pool.query("DELETE FROM cloud_friendships WHERE (requester_player_id=$1 AND addressee_player_id=$2) OR (requester_player_id=$2 AND addressee_player_id=$1)", [playerId, target.id]); await pool.query("INSERT INTO cloud_friendships(requester_player_id,addressee_player_id,status) VALUES($1,$2,'blocked')", [playerId, target.id]); return { status: "blocked" }; }
  throw new Error("SOCIAL_ACTION_INVALID");
}
async function sendDirectMessage(playerId, body) {
  const recipientCode = String(body.recipientCode ?? "").trim().toUpperCase(); const message = String(body.message ?? "").trim();
  if (!message || message.length > 500) throw new Error("CHAT_MESSAGE_INVALID");
  const recipient = (await pool.query("SELECT id FROM cloud_players WHERE public_code=$1", [recipientCode])).rows[0];
  if (!recipient) throw new Error("SOCIAL_TARGET_NOT_FOUND");
  const relation = await pool.query("SELECT status FROM cloud_friendships WHERE (requester_player_id=$1 AND addressee_player_id=$2) OR (requester_player_id=$2 AND addressee_player_id=$1)", [playerId, recipient.id]);
  if (!relation.rows.some((row) => row.status === "accepted")) throw new Error("DIRECT_MESSAGE_FRIEND_REQUIRED");
  if (relation.rows.some((row) => row.status === "blocked")) throw new Error("SOCIAL_BLOCKED");
  await pool.query("INSERT INTO cloud_direct_messages(id,sender_player_id,recipient_player_id,body) VALUES($1,$2,$3,$4)", [randomUUID(), playerId, recipient.id, message]);
  return { status: "sent" };
}
async function inbox(playerId) {
  const { rows } = await pool.query("SELECT id,title,body,attachment,starts_at,ends_at FROM cloud_liveops_mail WHERE starts_at<=NOW() AND (ends_at IS NULL OR ends_at>NOW()) AND (audience='all' OR player_id=$1) ORDER BY starts_at DESC LIMIT 100", [playerId]);
  return { mails: rows };
}
async function claimMail(playerId, mailId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const mail = (await client.query("SELECT attachment FROM cloud_liveops_mail WHERE id=$1 AND starts_at<=NOW() AND (ends_at IS NULL OR ends_at>NOW()) AND (audience='all' OR player_id=$2) FOR UPDATE", [mailId, playerId])).rows[0];
    if (!mail) throw new Error("MAIL_NOT_FOUND");
    const claimed = await client.query("INSERT INTO cloud_liveops_mail_claims(mail_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING mail_id", [mailId, playerId]);
    if (!claimed.rowCount) throw new Error("MAIL_ALREADY_CLAIMED");
    await addReward(client, playerId, mail.attachment, `mail:${mailId}`, "mail_attachment");
    await audit(client, playerId, "mail.claim", "mail", mailId);
    await client.query("COMMIT"); return { status: "claimed" };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function recordClientEvent(playerId, body) {
  const category = body.category === "crash" ? "crash" : "telemetry";
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
  await pool.query("INSERT INTO cloud_security_events(id,player_id,category,severity,fingerprint,payload) VALUES($1,$2,$3,1,$4,$5)", [randomUUID(), playerId, category, digest(JSON.stringify(payload)).slice(0, 64), payload]);
  return { status: "accepted" };
}
async function announcements() {
  const { rows } = await pool.query("SELECT id,title,body,is_pinned,starts_at,ends_at FROM cloud_announcements WHERE starts_at<=NOW() AND (ends_at IS NULL OR ends_at>NOW()) ORDER BY is_pinned DESC,starts_at DESC LIMIT 30");
  return { announcements: rows.map((row) => ({ id: row.id, title: row.title, body: row.body, pinned: row.is_pinned, startsAt: row.starts_at, endsAt: row.ends_at })) };
}
async function liveEvents() {
  const { rows } = await pool.query("SELECT code,title,config,starts_at,ends_at FROM cloud_liveops_events WHERE is_active=TRUE AND starts_at<=NOW() AND ends_at>NOW() ORDER BY starts_at DESC");
  return { events: rows.map((row) => ({ code: row.code, title: row.title, config: row.config, startsAt: row.starts_at, endsAt: row.ends_at })) };
}
async function redeemCode(playerId, body) {
  const code = String(body.code ?? "").trim().toUpperCase(); if (!/^[A-Z0-9-]{6,32}$/.test(code)) throw new Error("REDEEM_CODE_INVALID");
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); const entry = (await client.query("SELECT * FROM cloud_redeem_codes WHERE code_hash=$1 AND starts_at<=NOW() AND (ends_at IS NULL OR ends_at>NOW()) FOR UPDATE", [digest(code)])).rows[0]; if (!entry) throw new Error("REDEEM_CODE_NOT_FOUND"); if (entry.claim_count >= entry.max_claims) throw new Error("REDEEM_CODE_EXHAUSTED");
    const claim = await client.query("INSERT INTO cloud_redeem_code_claims(code_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING code_id", [entry.id, playerId]); if (!claim.rowCount) throw new Error("REDEEM_CODE_ALREADY_CLAIMED");
    await client.query("UPDATE cloud_redeem_codes SET claim_count=claim_count+1 WHERE id=$1", [entry.id]); await addReward(client, playerId, entry.reward, `redeem:${entry.id}`, "redeem_code"); await audit(client, playerId, "redeem.claim", "redeem_code", entry.id); await client.query("COMMIT"); return { status: "claimed", reward: entry.reward };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
async function createSupportTicket(playerId, body) {
  const category = String(body.category ?? "other").slice(0, 32); const subject = String(body.subject ?? "").trim(); const detail = String(body.detail ?? "").trim();
  if (!subject || !detail || subject.length > 120 || detail.length > 2000) throw new Error("SUPPORT_TICKET_INVALID");
  const id = randomUUID(); await pool.query("INSERT INTO cloud_support_tickets(id,player_id,category,subject,detail) VALUES($1,$2,$3,$4,$5)", [id, playerId, category, subject, detail]);
  return { id, status: "open" };
}

const server = createServer(async (request, response) => {
  try {
    const urlPath = (request.url ?? "").split("?")[0];
    if (request.method === "GET" && urlPath === "/health") return json(response, 200, { status: "ok", service: "social-liveops" });
    if (request.method === "GET" && urlPath === "/health/ready") { await pool.query("SELECT 1"); return json(response, 200, { status: "ready" }); }
    if (request.method === "GET" && urlPath === "/v1/liveops/announcements") return json(response, 200, await announcements());
    if (request.method === "GET" && urlPath === "/v1/liveops/events") return json(response, 200, await liveEvents());
    const player = await requirePlayer(request, response); if (!player) return;
    if (request.method === "GET" && urlPath === "/v1/guilds/mine/chat") return json(response, 200, await guildChat(player.playerId, new URL(request.url, "http://local").searchParams.get("after")));
    if (request.method === "POST" && urlPath === "/v1/guilds/mine/chat") return json(response, 201, await sendGuildChat(player.playerId, await parseJson(request)));
    if (request.method === "GET" && urlPath === "/v1/guilds/mine/contributions") return json(response, 200, await guildRanking(player.playerId));
    if (request.method === "GET" && urlPath === "/v1/guilds/mine/tasks") return json(response, 200, await guildTasks(player.playerId));
    const guildTask = urlPath.match(/^\/v1\/guilds\/mine\/tasks\/([0-9a-f-]{36})\/claim$/i);
    if (guildTask && request.method === "POST") return json(response, 200, await claimGuildTask(player.playerId, guildTask[1]));
    if (request.method === "POST" && urlPath === "/internal/guild-contributions") return json(response, 200, await addContribution(request, player.playerId, await parseJson(request)));
    const member = urlPath.match(/^\/v1\/guilds\/mine\/members\/([0-9a-f-]{36})$/i);
    if (member && request.method === "PATCH") return json(response, 200, await manageGuildMember(player.playerId, member[1], await parseJson(request)));
    if (member && request.method === "DELETE") return json(response, 200, await manageGuildMember(player.playerId, member[1], {}, true));
    if (request.method === "POST" && urlPath === "/v1/social/friends/request") return json(response, 201, await friendship(player.playerId, (await parseJson(request)).publicCode, "request"));
    if (request.method === "POST" && urlPath === "/v1/social/friends/accept") return json(response, 200, await friendship(player.playerId, (await parseJson(request)).publicCode, "accept"));
    if (request.method === "POST" && urlPath === "/v1/social/blocks") return json(response, 200, await friendship(player.playerId, (await parseJson(request)).publicCode, "block"));
    if (request.method === "POST" && urlPath === "/v1/social/messages") return json(response, 201, await sendDirectMessage(player.playerId, await parseJson(request)));
    if (request.method === "GET" && urlPath === "/v1/social/party") return json(response, 200, await partySnapshot(player.playerId));
    if (request.method === "POST" && urlPath === "/v1/social/party") return json(response, 201, await createParty(player.playerId, await parseJson(request)));
    if (request.method === "DELETE" && urlPath === "/v1/social/party") return json(response, 200, await leaveParty(player.playerId));
    if (request.method === "POST" && urlPath === "/v1/social/party/invites") return json(response, 201, await inviteToParty(player.playerId, await parseJson(request)));
    const partyInvite = urlPath.match(/^\/v1\/social\/party\/invites\/([0-9a-f-]{36})\/accept$/i);
    if (partyInvite && request.method === "POST") return json(response, 200, await acceptPartyInvite(player.playerId, partyInvite[1]));
    if (request.method === "GET" && urlPath === "/v1/liveops/mail") return json(response, 200, await inbox(player.playerId));
    const mail = urlPath.match(/^\/v1\/liveops\/mail\/([0-9a-f-]{36})\/claim$/i);
    if (mail && request.method === "POST") return json(response, 200, await claimMail(player.playerId, mail[1]));
    if (request.method === "POST" && urlPath === "/v1/liveops/redeem") return json(response, 200, await redeemCode(player.playerId, await parseJson(request)));
    if (request.method === "POST" && urlPath === "/v1/observability/client-events") return json(response, 202, await recordClientEvent(player.playerId, await parseJson(request)));
    if (request.method === "POST" && urlPath === "/v1/support/tickets") return json(response, 201, await createSupportTicket(player.playerId, await parseJson(request)));
    return json(response, 404, { errorCode: "ROUTE_NOT_FOUND" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const known = KNOWN_ERROR_CODES.has(message);
    const status = known && /INVALID|NOT_FOUND|DENIED|REQUIRED|LIMITED|BLOCKED|ALREADY|EXHAUSTED|FULL|PENDING/i.test(message) ? 400 : 500;
    console.error("social-liveops", { message, path: request.url, stack: error instanceof Error ? error.stack : undefined }); return json(response, status, { errorCode: known ? message : "SERVER_ERROR" });
  }
});

server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
process.on("unhandledRejection", (reason) => console.error("social-liveops unhandledRejection", { reason: String(reason) }));
const shutdown = (signal) => { console.log("social-liveops graceful shutdown", { signal }); server.close(); void pool.end().catch(() => undefined).finally(() => process.exit(0)); setTimeout(() => process.exit(0), 10_000).unref(); };
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

await migrate();
server.listen(port, process.env.SERVICE_HOST ?? "0.0.0.0", () => console.log(`Social and LiveOps service listening at http://${process.env.SERVICE_HOST ?? "0.0.0.0"}:${port}`));
