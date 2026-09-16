import { assetUrl } from "./assetUrl";
import { trackGameEvent } from "./telemetry";

export interface PreloadState {
  completed: number;
  failed: number;
  total: number;
}

// 入口队列：首屏绘制必需的最小集合（启动屏背景、大厅背景、字体、指挥室纹章）。
const ENTRY_ASSET_URLS = [
  "/assets/backgrounds/startup-background.png",
  "/assets/backgrounds/lobby-background.png",
  "/assets/fonts/ZCOOLXiaoWei-Regular.woff2",
  "/assets/ui/command-room-crest.png",
];

// 后台空闲队列：只包含界面基础小图（导航徽记 / 卡框 / 战斗底图 / VFX 纹理），
// 总量控制在几 MB 内，并在浏览器空闲时才下载。
//
// 以下资源【不再】做全量预载，一律按需加载：
// - 卡面：由 <img loading="lazy"> 与战斗进场时的整副卡组预载负责；
// - 语音 / 音乐 / SFX：由 AudioProvider 按场景懒取（浏览器 HTTP 缓存兜底）；
// - Pixi 特效纹理：由 BattleVfx 通过 Assets.load 按需载入；
// - 章节插画 / 战场全景 / 4K 图集：进入对应界面时由 CSS/组件触发。
// （历史实现会在进大厅后静默拉取 1300+ 语音与全部 4K 图集，超过 1GB，
//  直接打爆玩家带宽与服务器流量，严禁回退。）
const BACKGROUND_ASSET_URLS = [
  "/assets/backgrounds/battle-background.png",
  "/assets/backgrounds/battle-board-25d-v2.png",
  "/assets/backgrounds/command-brief-panel.png",

  "/assets/badges/eclipse-crown.png",
  "/assets/badges/rift-vanguard.png",
  "/assets/badges/stargate-pioneer.png",

  "/assets/ui/achievement-badge-crest.png",
  "/assets/ui/build-frontline-button-plate.png",
  "/assets/ui/card-attack.png",
  "/assets/ui/card-cost.png",
  "/assets/ui/card-faction.png",
  "/assets/ui/card-frame.png",
  "/assets/ui/card-health.png",
  "/assets/ui/card-rarity.png",
  "/assets/ui/command-room-crest.png",
  "/assets/ui/deck-management-crest.png",
  "/assets/ui/deck-totem-green.png",
  "/assets/ui/deploy-command-plate.png",
  "/assets/ui/message-center-crest.png",
  "/assets/ui/mission-challenge-crest.png",
  "/assets/ui/quick-battle-button-plate.png",
  "/assets/ui/round-end-button-bg.png",
  "/assets/ui/settings-crest.png",
  "/assets/ui/stellar-commander-rank-badge.png",
  "/assets/ui/topbar-navigation-crest.png",
  "/assets/ui/training-field-crest.png",
  "/assets/ui/void-emblem.png",

  "/assets/vfx/fire.png",
  "/assets/vfx/flame.png",
  "/assets/vfx/flare.png",
  "/assets/vfx/glow.png",
  "/assets/vfx/lightning.png",
  "/assets/vfx/magic-ring.png",
  "/assets/vfx/slash.png",
  "/assets/vfx/smoke.png",
  "/assets/vfx/spark-burst.png",
  "/assets/vfx/star.png",
  "/assets/vfx/trace.png",
  "/assets/vfx/twirl.png",
].filter((url) => !ENTRY_ASSET_URLS.includes(url));

let state: PreloadState = { completed: 0, failed: 0, total: ENTRY_ASSET_URLS.length };
let preloadTask: Promise<void> | null = null;
const listeners = new Set<(next: PreloadState) => void>();

function publish() {
  for (const listener of listeners) listener(state);
}

function recordResult(success: boolean, url: string) {
  state = { ...state, completed: state.completed + 1, failed: state.failed + (success ? 0 : 1) };
  if (!success) trackGameEvent("asset_preload_failed", { url });
  publish();
}

async function loadAsset(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(assetUrl(url), { cache: "force-cache", signal: controller.signal });
    if (!response.ok) throw new Error(`Unable to load ${url}`);
    await response.arrayBuffer();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadQueue(urls: string[], trackProgress = true) {
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
    while (queue.length) {
      const url = queue.shift();
      if (!url) return;
      try {
        await loadAsset(url);
        if (trackProgress) recordResult(true, url);
      } catch {
        if (trackProgress) recordResult(false, url);
      }
    }
  });
  await Promise.all(workers);
}

const scheduleIdle = (callback: () => void) => {
  const scope = window as Window & { requestIdleCallback?: (handler: () => void, options?: { timeout: number }) => number };
  if (typeof scope.requestIdleCallback === "function") {
    scope.requestIdleCallback(callback, { timeout: 4000 });
    return;
  }
  window.setTimeout(callback, 1500);
};

function startPreload() {
  if (preloadTask) return preloadTask;

  preloadTask = loadQueue(ENTRY_ASSET_URLS).then(() => {
    scheduleIdle(() => { void loadQueue(BACKGROUND_ASSET_URLS, false); });
  });
  return preloadTask;
}

export function getAssetPreloadState() {
  return state;
}

export function retryAssetPreload() {
  preloadTask = null;
  state = { completed: 0, failed: 0, total: ENTRY_ASSET_URLS.length };
  publish();
  void startPreload();
}

export function subscribeToAssetPreload(listener: (next: PreloadState) => void) {
  listeners.add(listener);
  listener(state);
  void startPreload();
  return () => { listeners.delete(listener); };
}
