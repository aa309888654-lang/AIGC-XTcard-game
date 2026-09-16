import { CLOUD_API_BASE, ensureCloudInstallation } from "../cloud/CloudSync";

export type GuildRole = "leader" | "officer" | "member";

export interface GuildMember {
  playerId: string;
  publicCode: string;
  role: GuildRole;
  roleLabel: string;
  contribution: number;
  joinedAt: string;
  isSelf: boolean;
}

export interface GuildApplication {
  id: string;
  playerId: string;
  publicCode: string;
  message: string;
  createdAt: string;
}

export interface GuildState {
  guild: null | { id: string; name: string; tag: string; description: string; notice: string; inviteCode: string; memberLimit: number; createdAt: string; updatedAt: string };
  me: null | { role: GuildRole; roleLabel: string; contribution: number; joinedAt: string };
  members: GuildMember[];
  applications: GuildApplication[];
}

export interface GuildListing {
  id: string;
  name: string;
  tag: string;
  description: string;
  memberLimit: number;
  memberCount: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!CLOUD_API_BASE) throw new Error("CLOUD_SERVICE_NOT_CONFIGURED");
  const installation = await ensureCloudInstallation();
  const response = await fetch(`${CLOUD_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${installation.accessToken}`, ...init.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.errorCode ?? `HTTP_${response.status}`);
  return payload as T;
}

export const guildApi = {
  mine: () => request<GuildState>("/v1/guilds/mine"),
  discover: (query = "") => request<{ guilds: GuildListing[] }>(`/v1/guilds/discover?query=${encodeURIComponent(query)}`),
  create: (input: { name: string; tag: string; description: string }) => request<GuildState>("/v1/guilds", { method: "POST", body: JSON.stringify(input) }),
  join: (inviteCode: string) => request<GuildState>("/v1/guilds/join", { method: "POST", body: JSON.stringify({ inviteCode }) }),
  apply: (guildId: string, message = "") => request<{ status: string }>(`/v1/guilds/${guildId}/applications`, { method: "POST", body: JSON.stringify({ message }) }),
  updateNotice: (notice: string) => request<GuildState>("/v1/guilds/mine/notice", { method: "PATCH", body: JSON.stringify({ notice }) }),
  leave: () => request<GuildState>("/v1/guilds/mine", { method: "DELETE" }),
  decideApplication: (applicationId: string, approved: boolean) => request<GuildState>(`/v1/guilds/mine/applications/${applicationId}/${approved ? "approve" : "reject"}`, { method: "POST" }),
};
