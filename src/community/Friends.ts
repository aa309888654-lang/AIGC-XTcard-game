// ── 好友系统（P4 · 本地数据层，预留服务器接入点）──
import { CARD_MAP } from "../data/cards";

export interface FriendEntry {
  id: string;
  name: string;
  code: string;
  faction: string;
  status: "online" | "away" | "offline";
  addedAt: string;
}

const FRIENDS_KEY = "astra-frontline-friends-v1";
const PENDING_KEY = "astra-frontline-friend-pending-v1";

export function loadFriends(): FriendEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FRIENDS_KEY) ?? "[]");
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

export function saveFriends(friends: FriendEntry[]) {
  try { localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends)); } catch { /* ignore */ }
}

export function addFriend(name: string, code: string, faction: string): FriendEntry[] {
  const friends = loadFriends();
  if (friends.some((f) => f.code === code)) return friends;
  const entry: FriendEntry = {
    id: `F-${crypto.randomUUID().slice(0, 8)}`,
    name, code, faction,
    status: "offline",
    addedAt: new Date().toISOString(),
  };
  const next = [...friends, entry];
  saveFriends(next);
  return next;
}

export function removeFriend(code: string): FriendEntry[] {
  const next = loadFriends().filter((f) => f.code !== code);
  saveFriends(next);
  return next;
}

export function loadPendingInvites(): Array<{ id: string; name: string; code: string; faction: string; at: string }> {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

export function addPendingInvite(name: string, code: string, faction: string) {
  const pending = loadPendingInvites();
  if (pending.some((p) => p.code === code)) return pending;
  const next = [...pending, { id: `P-${crypto.randomUUID().slice(0, 8)}`, name, code, faction, at: new Date().toISOString() }];
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function acceptPendingInvite(code: string): FriendEntry[] {
  // 接受 = 真正把对方写进好友名录，再清掉待处理邀请。
  const invite = loadPendingInvites().find((p) => p.code === code);
  const pending = loadPendingInvites().filter((p) => p.code !== code);
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* ignore */ }
  return invite ? addFriend(invite.name, invite.code, invite.faction) : loadFriends();
}

// ── 表情（P4 · 战斗内快捷表情）──
export const EMOTE_DEFS: Array<{ id: string; icon: string; label: string }> = [
  { id: "greet", icon: "🙏", label: "行礼" },
  { id: "taunt", icon: "😏", label: "挑衅" },
  { id: "praise", icon: "👍", label: "称赞" },
  { id: "oops", icon: "😅", label: "失误" },
  { id: "gg", icon: "🤝", label: "承让" },
  { id: "rage", icon: "😤", label: "不服" },
];

// ── 回放分享（P4 · 对局记录序列化）──
export interface ReplayRecord {
  id: string;
  label: string;
  mode: string;
  createdAt: string;
  turnCount: number;
  winner: "player" | "enemy";
  playerDeck: string[];
  enemyDeck: string[];
  seed: number;
}

const REPLAY_KEY = "astra-frontline-replays-v1";

export function loadReplays(): ReplayRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(REPLAY_KEY) ?? "[]");
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

export function saveReplay(record: Omit<ReplayRecord, "id" | "createdAt">): ReplayRecord {
  const entry: ReplayRecord = { ...record, id: `R-${crypto.randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString() };
  const replays = [entry, ...loadReplays()].slice(0, 50);
  try { localStorage.setItem(REPLAY_KEY, JSON.stringify(replays)); } catch { /* ignore */ }
  return entry;
}

export function replayShareCode(record: ReplayRecord): string {
  const payload = `${record.mode}|${record.turnCount}|${record.winner}|${record.seed}|${record.playerDeck.join(",")}|${record.enemyDeck.join(",")}`;
  return btoa(unescape(encodeURIComponent(payload))).replace(/=+$/, "");
}

export function decodeShareCode(code: string): ReplayRecord | null {
  try {
    const decoded = decodeURIComponent(escape(atob(code)));
    const [mode, turnCount, winner, seed, playerDeck, enemyDeck] = decoded.split("|");
    if (!mode || !playerDeck || !enemyDeck) return null;
    const ids = [...playerDeck.split(","), ...enemyDeck.split(",")];
    // 分享码可能被篡改或来自旧版本：未知卡牌 ID 一律拒绝，避免进战斗后 UI 查 CARD_MAP 崩溃。
    if (ids.some((id) => !CARD_MAP[id])) return null;
    return {
      id: `S-${crypto.randomUUID().slice(0, 8)}`,
      label: "分享回放",
      mode,
      createdAt: new Date().toISOString(),
      turnCount: Number(turnCount) || 0,
      winner: winner === "player" ? "player" : "enemy",
      seed: Number(seed) || 0,
      playerDeck: playerDeck.split(","),
      enemyDeck: enemyDeck.split(","),
    };
  } catch {
    return null;
  }
}
