import { ensureCloudInstallation } from "../cloud/CloudSync";

const platformEnv = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
const PLATFORM_API_BASE = platformEnv.VITE_PLATFORM_API_BASE ?? "/api/platform";

export interface SeasonReward {
  level: number;
  track: "free" | "premium";
  kind: "currency";
  currency: "starDust" | "guildMarks" | "arcaneDust";
  amount: number;
  claimed: boolean;
}

export interface SeasonStatus {
  season: { code: string; title: string; startsAt: string; endsAt: string };
  progress: { rating: number; season_xp: number; wins: number; losses: number; streak: number; best_streak: number };
  level: number;
  rewards: SeasonReward[];
}

export interface PvpMatchSnapshot {
  match: {
    id: string;
    mode: "ranked" | "casual";
    status: "waiting" | "active" | "finished" | "abandoned";
    version: number;
    turn: "self" | "opponent";
    turnDeadlineAt: string | null;
    winner: "self" | "opponent" | null;
    finishReason: string | null;
    state: unknown;
  };
  events: Array<{ sequence: number; actor: "self" | "opponent"; type: string; payload: unknown; createdAt: string }>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const installation = await ensureCloudInstallation();
  const response = await fetch(`${PLATFORM_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${installation.accessToken}`, ...init.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.errorCode ?? `HTTP_${response.status}`);
  return payload as T;
}

export interface RankingRow {
  rank: number;
  publicCode: string;
  rating: number;
  wins: number;
  losses: number;
  seasonXp: number;
}

export const authoritativeApi = {
  season: () => request<SeasonStatus>("/v1/seasons/current"),
  rankings: () => request<{ season: string; rows: RankingRow[] }>("/v1/rankings/current"),
  claimSeasonReward: (level: number) => request<{ level: number; reward: SeasonReward }>(`/v1/seasons/current/rewards/${level}/claim`, { method: "POST", body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }) }),
  platformState: () => request<{ wallet: { balances: Record<string, number> }; season: unknown }>("/v1/platform/state"),
  pvpQueue: (mode: "ranked" | "casual", deck: string[]) => request<{ status: "queued" | "matched"; ticketId?: string; matchId?: string }>("/v1/pvp/queue", { method: "POST", body: JSON.stringify({ mode, deck }) }),
  pvpCancelQueue: () => request<{ status: "cancelled" }>("/v1/pvp/queue", { method: "DELETE" }),
  pvpSnapshot: (matchId: string, after = 0) => request<PvpMatchSnapshot>(`/v1/pvp/matches/${matchId}?after=${after}`),
  pvpCommand: (matchId: string, command: Record<string, unknown>) => request<{ status: string; battle?: unknown }>(`/v1/pvp/matches/${matchId}/commands`, { method: "POST", body: JSON.stringify(command) }),
  pvpReport: (matchId: string, reason: "abuse" | "cheat" | "afk" | "name" | "other", detail = "") => request<{ status: "submitted" }>(`/v1/pvp/matches/${matchId}/report`, { method: "POST", body: JSON.stringify({ reason, detail }) }),
};
