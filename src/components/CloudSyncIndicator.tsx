import type { CloudSyncStatus } from "../cloud/CloudSync";

interface Props { status: CloudSyncStatus; detail?: string; onSync: () => void; }

const LABELS: Record<CloudSyncStatus, string> = {
  idle: "云端待命",
  syncing: "正在同步",
  synced: "云端已保存",
  offline: "离线保存中",
  conflict: "需要处理差异",
  error: "同步需要重试",
};

export default function CloudSyncIndicator({ status, detail, onSync }: Props) {
  return <button className={`cloud-sync-indicator is-${status}`} onClick={onSync} title={detail ?? "立即同步云端档案"} aria-label={`${LABELS[status]}，点击立即同步`}><i aria-hidden="true">{status === "synced" ? "✓" : status === "syncing" ? "◌" : status === "offline" ? "·" : "!"}</i><span>{LABELS[status]}</span></button>;
}
