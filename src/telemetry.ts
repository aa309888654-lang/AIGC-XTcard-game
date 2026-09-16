const TELEMETRY_KEY = "astra-frontline-telemetry-v1";
const MAX_EVENTS = 100;

export interface GameTelemetryEvent {
  name: "battle_started" | "battle_finished" | "campaign_finished" | "asset_preload_failed";
  at: number;
  detail?: Record<string, string | number | boolean>;
}

export function trackGameEvent(name: GameTelemetryEvent["name"], detail?: GameTelemetryEvent["detail"]) {
  try {
    const events = JSON.parse(localStorage.getItem(TELEMETRY_KEY) ?? "[]") as GameTelemetryEvent[];
    events.push({ name, at: Date.now(), detail });
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Diagnostics must not block gameplay when browser storage is unavailable.
  }
}
