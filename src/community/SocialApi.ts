import { ensureCloudInstallation } from "../cloud/CloudSync";

const socialEnv = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
const SOCIAL_API_BASE = socialEnv.VITE_SOCIAL_API_BASE ?? "/api/social";

export interface GuildChatMessage {
  id: string;
  sender: string;
  role: "leader" | "officer" | "member";
  body: string;
  createdAt: string;
}

export interface GuildContribution {
  publicCode: string;
  role: "leader" | "officer" | "member";
  contribution: number;
  rank: number;
}

export interface GuildTask {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: Array<{ currency: "starDust" | "guildMarks" | "arcaneDust"; amount: number }>;
  claimed: boolean;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const installation = await ensureCloudInstallation();
  const response = await fetch(`${SOCIAL_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${installation.accessToken}`, ...init.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.errorCode ?? `HTTP_${response.status}`);
  return payload as T;
}

export const socialApi = {
  guildChat: (after?: string) => request<{ messages: GuildChatMessage[] }>(`/v1/guilds/mine/chat${after ? `?after=${encodeURIComponent(after)}` : ""}`),
  sendGuildChat: (message: string) => request<{ id: string; status: string }>("/v1/guilds/mine/chat", { method: "POST", body: JSON.stringify({ message }) }),
  guildContributions: () => request<{ rows: GuildContribution[] }>("/v1/guilds/mine/contributions"),
  guildTasks: () => request<{ tasks: GuildTask[] }>("/v1/guilds/mine/tasks"),
  claimGuildTask: (taskId: string) => request<{ status: string; reward: GuildTask["reward"] }>(`/v1/guilds/mine/tasks/${taskId}/claim`, { method: "POST" }),
  announcements: () => request<{ announcements: Array<{ id: string; title: string; body: string; pinned: boolean }> }>("/v1/liveops/announcements"),
  redeem: (code: string) => request<{ status: string; reward: GuildTask["reward"] }>("/v1/liveops/redeem", { method: "POST", body: JSON.stringify({ code }) }),
};
