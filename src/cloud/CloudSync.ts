import type { MetaSave } from "../game/meta";
import { saveMeta } from "../game/meta";
import { readCloudValue, writeCloudValue } from "./offlineStore";
import { mergeCloudMeta, toCloudMeta } from "./syncPolicy";

const cloudEnv = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
export const CLOUD_API_BASE = cloudEnv.VITE_CLOUD_API_BASE;
const INSTALLATION_KEY = "astra-frontline-cloud-installation-v1";
const QUEUE_KEY = "astra-frontline-cloud-meta-operation";
const REVISION_KEY = "astra-frontline-cloud-meta-revision";

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "offline" | "conflict" | "error";
export type CloudInstallation = { accessToken: string; playerId: string; publicCode: string; installationId?: string; installationSecret?: string };
type QueuedMeta = { idempotencyKey: string; meta: MetaSave; createdAt: string };
type BootstrapResponse = { documents: Record<string, { revision: number; payload: MetaSave; updatedAt: string }>; serverTimestamp: string };
type PushResult = { status: string; results: Array<{ documentKey: string; status: string; revision: number; payload: MetaSave | null; updatedAt?: string }>; serverTimestamp: string };

function operationId() { return crypto.randomUUID(); }
function installationSecretToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function ensureCloudInstallation(): Promise<CloudInstallation> {
  if (!CLOUD_API_BASE) throw new Error("CLOUD_SERVICE_NOT_CONFIGURED");
  const cached = await readCloudValue<CloudInstallation>(INSTALLATION_KEY);
  if (cached?.accessToken) return cached;
  const installation = await createInstallation();
  await writeCloudValue(INSTALLATION_KEY, installation);
  return installation;
}

async function createInstallation(): Promise<CloudInstallation> {
  const installationSecret = installationSecretToken();
  const response = await fetch(`${CLOUD_API_BASE}/v1/installations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installationSecret }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.accessToken) throw new Error(payload.errorCode ?? `HTTP_${response.status}`);
  return { ...(payload as CloudInstallation), installationSecret };
}

// token 过期后用本地保管的 installationSecret 换发新 token，保住玩家身份。
async function refreshInstallationToken(cached: CloudInstallation): Promise<CloudInstallation | null> {
  if (!cached.installationSecret || !cached.installationId) return null;
  try {
    const response = await fetch(`${CLOUD_API_BASE}/v1/sessions/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId: cached.installationId, installationSecret: cached.installationSecret }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.accessToken) return null;
    return { ...cached, accessToken: payload.accessToken as string };
  } catch {
    return null;
  }
}

function pushBody(queued: QueuedMeta, baseRevision: number) {
  return JSON.stringify({
    idempotencyKey: queued.idempotencyKey,
    operations: [{ documentKey: "meta", baseRevision, payload: toCloudMeta(queued.meta) }],
  });
}

export class CloudSync {
  private installation: CloudInstallation | null = null;
  private revision = 0;
  private refreshingInstallation = false;
  private readonly handleOnline = () => { void this.flush(); };

  constructor(private readonly onStatus: (status: CloudSyncStatus, detail?: string) => void) {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
    }
  }

  dispose() {
    if (typeof window !== "undefined") window.removeEventListener("online", this.handleOnline);
  }

  private async request<T>(path: string, init: RequestInit = {}, includeAuth = true): Promise<T> {
    if (!CLOUD_API_BASE) throw new Error("CLOUD_SERVICE_NOT_CONFIGURED");
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (includeAuth && this.installation?.accessToken) headers.set("Authorization", `Bearer ${this.installation.accessToken}`);
    const response = await fetch(`${CLOUD_API_BASE}${path}`, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.errorCode ?? `HTTP_${response.status}`);
    return payload as T;
  }

  private async ensureInstallation() {
    if (this.installation) return;
    this.installation = await ensureCloudInstallation();
  }

  private async refreshInstallationIfRevoked(error: unknown): Promise<boolean> {
    const code = error instanceof Error ? error.message : "";
    if (code !== "INSTALLATION_TOKEN_REQUIRED" && code !== "INSTALLATION_TOKEN_REVOKED" && !code.startsWith("HTTP_401")) return false;
    if (this.refreshingInstallation) return true;
    this.refreshingInstallation = true;
    try {
      const cached = await readCloudValue<CloudInstallation>(INSTALLATION_KEY);
      if (cached) {
        const refreshed = await refreshInstallationToken(cached);
        if (refreshed) {
          this.installation = refreshed;
          await writeCloudValue(INSTALLATION_KEY, refreshed);
          return true;
        }
      }
      await writeCloudValue(INSTALLATION_KEY, null);
      this.installation = null;
      await this.ensureInstallation();
      return true;
    } finally {
      this.refreshingInstallation = false;
    }
  }

  async start(localMeta: MetaSave, isRetry = false): Promise<MetaSave | null> {
    if (!localMeta.commander) return null;
    try {
      this.onStatus("syncing");
      await this.ensureInstallation();
      const snapshot = await this.request<BootstrapResponse>("/v1/bootstrap");
      const remote = snapshot.documents.meta;
      this.revision = remote?.revision ?? 0;
      await writeCloudValue(REVISION_KEY, this.revision);
      if (remote?.payload?.commander && (remote.updatedAt || remote.payload.lastSyncedAt || "") > (localMeta.lastSyncedAt || "")) {
        this.onStatus("synced");
        return mergeCloudMeta(localMeta, remote.payload);
      }
      await this.enqueue(localMeta);
      await this.flush();
      return null;
    } catch (error) {
      // 刷新凭证后仅重试一次：服务端持续拒绝时避免无限递归铸造新安装身份。
      if (!isRetry && await this.refreshInstallationIfRevoked(error)) {
        return this.start(localMeta, true);
      }
      this.onStatus("offline", error instanceof Error ? error.message : "NETWORK_UNAVAILABLE");
      return null;
    }
  }

  async enqueue(meta: MetaSave) {
    await writeCloudValue<QueuedMeta>(QUEUE_KEY, { idempotencyKey: operationId(), meta, createdAt: new Date().toISOString() });
  }

  async flush(isRetry = false): Promise<MetaSave | null> {
    const queued = await readCloudValue<QueuedMeta>(QUEUE_KEY);
    if (!queued || !queued.meta.commander) return null;
    try {
      this.onStatus("syncing");
      await this.ensureInstallation();
      if (!this.revision) this.revision = (await readCloudValue<number>(REVISION_KEY)) ?? 0;
      const result = await this.request<PushResult>("/v1/sync/push", { method: "POST", body: pushBody(queued, this.revision) });
      const metaResult = result.results?.find((entry) => entry.documentKey === "meta");
      if (!metaResult) {
        this.onStatus("error", "SYNC_RESPONSE_INVALID");
        return null;
      }
      if (metaResult.status === "conflict") {
        return this.resolveConflict(queued, metaResult);
      }
      if (metaResult.status !== "applied") {
        this.onStatus("error", `SYNC_STATUS_${metaResult.status}`);
        return null;
      }
      return this.commitSynced(queued, metaResult.revision, metaResult.updatedAt);
    } catch (error) {
      // 刷新凭证后仅重试一次，防止持续 401 时的无限递归。
      if (!isRetry && await this.refreshInstallationIfRevoked(error)) {
        return this.flush(true);
      }
      this.onStatus("offline", error instanceof Error ? error.message : "NETWORK_UNAVAILABLE");
      return null;
    }
  }

  private async resolveConflict(queued: QueuedMeta, conflict: { revision: number; payload: MetaSave | null; updatedAt?: string }): Promise<MetaSave | null> {
    const remoteTime = conflict.updatedAt ?? conflict.payload?.lastSyncedAt ?? "";
    const localTime = queued.meta.lastSyncedAt ?? "";
    if (conflict.payload?.commander && remoteTime > localTime) {
      this.revision = conflict.revision;
      await writeCloudValue(REVISION_KEY, this.revision);
      await writeCloudValue(QUEUE_KEY, null);
      saveMeta(conflict.payload);
      this.onStatus("synced");
      return conflict.payload;
    }
    this.revision = conflict.revision;
    await writeCloudValue(REVISION_KEY, this.revision);
    try {
      const result = await this.request<PushResult>("/v1/sync/push", { method: "POST", body: pushBody(queued, this.revision) });
      const retried = result.results?.find((entry) => entry.documentKey === "meta");
      if (retried?.status === "applied") return this.commitSynced(queued, retried.revision, retried.updatedAt);
      this.onStatus("conflict");
      return null;
    } catch (error) {
      this.onStatus("offline", error instanceof Error ? error.message : "NETWORK_UNAVAILABLE");
      return null;
    }
  }

  private commitSynced(queued: QueuedMeta, revision: number, updatedAt?: string): MetaSave | null {
    this.revision = revision;
    void writeCloudValue(REVISION_KEY, revision);
    void writeCloudValue(QUEUE_KEY, null);
    this.onStatus("synced");
    if (updatedAt) {
      const synced = { ...queued.meta, lastSyncedAt: updatedAt };
      saveMeta(synced);
      return synced;
    }
    return null;
  }

  async queueAndSync(meta: MetaSave) {
    if (!meta.commander) return null;
    await this.enqueue(meta);
    return this.flush();
  }
}
