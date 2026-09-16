import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { AiDifficulty, GameShortcuts, Phase, Rarity } from "./types";
import { CARD_POOL } from "./data/cards";
import { WELCOME_LINES } from "./data/world";
import CardView from "./components/CardView";
import ThemeControls from "./components/ThemeControls";
import AiMatchSetup from "./components/AiMatchSetup";
import CommanderOnboarding from "./components/CommanderOnboarding";
import CommanderProfile from "./components/CommanderProfile";
import { AudioProvider, useGameAudio, type MusicTrack } from "./audio/AudioProvider";
import { ThemeProvider } from "./theme/Theme";
import { getAssetPreloadState, retryAssetPreload, subscribeToAssetPreload, type PreloadState } from "./preloadAssets";
import { applyBattleResult, buildRanking, claimMission, isMissionClaimed, loadMeta, MISSION_DEFS, openPack, recordCampaignWin, saveMeta, seasonRank, spendCurrency, addCurrency, disenchantCard, craftCard, markTutorialDone, DEFAULT_DECK, type MetaSave, type PackResult } from "./game/meta";
import type { CampaignStage } from "./data/campaign";
import { trackGameEvent } from "./telemetry";
import { CloudSync, type CloudSyncStatus } from "./cloud/CloudSync";
import CloudSyncIndicator from "./components/CloudSyncIndicator";
import { authoritativeApi, type SeasonStatus } from "./platform/AuthoritativeClient";
import { activeTitle, hasCosmetic } from "./data/cosmetics";
import { COMPLIANCE_NOTICE_LIST, COMPLIANCE_NOTICES } from "./data/complianceNotices";

const DeckBuilder = lazy(() => import("./components/DeckBuilder"));
const Battle = lazy(() => import("./components/Battle"));
import type { BattleScenario } from "./components/Battle";
const PvpView = lazy(() => import("./components/PvpView"));
const EndlessModesView = lazy(() => import("./components/EndlessModesView"));
const FriendsView = lazy(() => import("./components/FriendsView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const MessageCenter = lazy(() => import("./components/MessageCenter"));
const ChronicleView = lazy(() => import("./components/CommandViews").then((module) => ({ default: module.ChronicleView })));
const CollectionView = lazy(() => import("./components/CommandViews").then((module) => ({ default: module.CollectionView })));
const LeaderboardView = lazy(() => import("./components/CommandViews").then((module) => ({ default: module.LeaderboardView })));
const MissionsView = lazy(() => import("./components/CommandViews").then((module) => ({ default: module.MissionsView })));
const PracticeView = lazy(() => import("./components/CommandViews").then((module) => ({ default: module.PracticeView })));
const GuildView = lazy(() => import("./components/CommunityViews").then((module) => ({ default: module.GuildView })));
const ShopView = lazy(() => import("./components/CommunityViews").then((module) => ({ default: module.ShopView })));

const BATTLE_SAVE_KEY = "astra-frontline-battle-save-v1";
const PRELOAD_READY_KEY = "astra-frontline-preload-ready-v2";

const TOP_NAVIGATION = [
  { label: "指挥室", icon: "/assets/ui/generated/navigation/command-room.png" },
  { label: "整备库", icon: "/assets/ui/generated/navigation/deck-library.png" },
  { label: "模拟战场", icon: "/assets/ui/generated/navigation/training-field.png" },
  { label: "任务挑战", icon: "/assets/ui/generated/navigation/mission-scroll.png" },
  { label: "__crest", icon: undefined },
  { label: "排行榜", icon: "/assets/ui/generated/navigation/rank-crown.png" },
  { label: "图鉴收藏", icon: "/assets/ui/generated/navigation/collection-archive.png" },
  { label: "编年史", icon: "/assets/ui/generated/navigation/chronicle-book.png" },
  { label: "商城", icon: "/assets/ui/generated/navigation/treasure-chest.png" },
  { label: "作战连队", icon: "/assets/ui/generated/navigation/sect-hall.png" },
] as const;
const RARITY_GALLERY: ReadonlyArray<{ rarity: Rarity; label: string; seal: string }> = [
  { rarity: "R", label: "基础战术", seal: "◇" },
  { rarity: "SR", label: "精锐单位", seal: "✦" },
  { rarity: "SSR", label: "战略核心", seal: "✧" },
  { rarity: "UR", label: "传奇指挥官", seal: "♜" },
];
const SIDE_NAVIGATION = [
  ["♜", "指挥室", "menu"], ["▱", "整备库", "builder"], ["⚔", "模拟战场", "practice"],
  ["✦", "任务挑战", "missions"], ["✪", "成就徽章", "leaderboard"], ["✉", "消息中心", "messages"], ["☯", "往来客栈", "friends"], ["⚙", "设置", "settings"],
] as const;
const SIDEBAR_ICON_ASSETS: Record<string, string> = {
  menu: "/assets/ui/command-room-crest.png",
  builder: "/assets/ui/deck-management-crest.png",
  practice: "/assets/ui/training-field-crest.png",
  missions: "/assets/ui/mission-challenge-crest.png",
  leaderboard: "/assets/ui/achievement-badge-crest.png",
  messages: "/assets/ui/message-center-crest.png",
};

const HOME_SIGNATURE_TITLES: Record<string, string> = {
  "astral-queen": "恒星的意志",
  "void-emperor": "永夜的主宰",
  "prism-dragon": "时光破坏者",
};
const DESKTOP_VIEWPORT_QUERY = "(min-width: 768px)";
const DEFAULT_SHORTCUTS: GameShortcuts = { endTurn: " ", cancelSelection: "Escape" };

function useDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_VIEWPORT_QUERY);
    const updateViewport = () => setIsDesktop(query.matches);
    updateViewport();
    query.addEventListener("change", updateViewport);
    return () => query.removeEventListener("change", updateViewport);
  }, []);

  return isDesktop;
}

function DesktopOnlyNotice() {
  return <main className="desktop-only-screen">
    <div className="desktop-only-backdrop" aria-hidden="true" />
    <section className="desktop-only-panel" role="status" aria-live="polite">
      <BrandEmblem className="desktop-only-emblem" alt="仙侠战线" />
      <p>XIANXIA FRONTLINE · MOBILE COMMAND</p>
      <h1>请横屏或使用更大屏幕</h1>
      <div className="desktop-only-monitor" aria-hidden="true"><i /></div>
      <span>当前设备宽度不足 768px，建议横屏或使用平板/电脑体验完整战线。</span>
    </section>
  </main>;
}

function BrandEmblem({ className, alt = "" }: { className: string; alt?: string }) {
  return <span className={`${className} brand-emblem-text`} role={alt ? "img" : undefined} aria-label={alt || undefined}>仙</span>;
}

function SeasonPassModal({ meta, onClose }: { meta: MetaSave; onClose: () => void }) {
  const [season, setSeason] = useState<SeasonStatus | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [onlineState, setOnlineState] = useState<"loading" | "online" | "offline">("loading");
  useEffect(() => {
    let active = true;
    void authoritativeApi.season().then((next) => { if (active) { setSeason(next); setOnlineState("online"); } }).catch(() => { if (active) setOnlineState("offline"); });
    return () => { active = false; };
  }, []);
  const level = season?.level ?? 0;
  const seasonXp = season?.progress.season_xp ?? 0;
  const xpIntoLevel = seasonXp % 100;
  const rewards = season?.rewards ?? [];
  const passRank = seasonRank(meta.seasonPoints);
  const playerPlace = buildRanking(meta).player.rank;
  const passOwned = meta.passTier === "premium";
  return <div className="season-pass-backdrop" role="presentation" onMouseDown={onClose}><section className="season-pass-modal" role="dialog" aria-modal="true" aria-labelledby="season-pass-title" onMouseDown={(event) => event.stopPropagation()}><button className="season-pass-close" onClick={onClose} aria-label="关闭赛季通行证" title="关闭">×</button><header><div><p className="eyebrow">{season?.season.code ?? "SEASON"} · ECLIPSE PROTOCOL</p><h2 id="season-pass-title">日蚀通行证</h2><span>{onlineState === "online" ? "赛季经验、免费奖励与领取记录由服务端结算。高级轨道已写入购买状态，支付通道接入前不收费。" : onlineState === "loading" ? "正在同步权威赛季档案…" : "在线赛季服务不可用，当前不展示或发放通行证奖励。"}</span></div><BrandEmblem className="season-pass-modal-emblem" /></header><section className="season-pass-status"><div><small>当前等级</small><b>{onlineState === "online" ? level : "--"}</b><span>{onlineState === "online" ? "服务端赛季档案" : "等待在线服务"}</span></div><div><small>通行证经验</small><b>{onlineState === "online" ? `${xpIntoLevel}` : "--"} <i>/ 100</i></b><span>{onlineState === "online" ? `距离下一等级还需 ${Math.max(0, 100 - xpIntoLevel)} 经验` : "奖励不在本地结算"}</span></div><div><small>赛季段位</small><b>{onlineState === "online" ? season?.progress.rating : passRank.title}</b><span>{onlineState === "online" ? `${season?.progress.wins ?? 0} 胜 ${season?.progress.losses ?? 0} 负` : `离线参考 · 第 ${String(playerPlace).padStart(2, "0")} 名`}</span></div></section><section className="season-pass-attributes"><div><p className="panel-kicker">REWARD TRACKS</p><h3>免费 / 高级轨道</h3></div><dl><div><dt>免费轨道</dt><dd>{rewards.filter((reward) => reward.track === "free").length}</dd><small>由服务端校验领取资格</small></div><div><dt>高级轨道</dt><dd>{passOwned ? "已持有" : "待开通"}</dd><small>{passOwned ? "购买状态已写入，支付接入后生效。" : "支付通道接入前不收费。"}</small></div><div><dt>赛季经验</dt><dd>{onlineState === "online" ? seasonXp : "--"}</dd><small>PvP 与活动结算后同步</small></div><div><dt>结算状态</dt><dd>{onlineState === "online" ? "在线" : "离线"}</dd><small>客户端不参与最终发奖</small></div></dl></section><section className="season-pass-rewards"><div><p className="panel-kicker">SERVER REWARDS</p><h3>奖励轨道</h3></div><div>{rewards.length ? rewards.map((reward) => { const canClaim = onlineState === "online" && reward.track === "free" && reward.level <= level && !reward.claimed; return <article className={canClaim ? "is-next" : ""} key={`${reward.track}-${reward.level}`}><i>{reward.level}</i><div><b>{reward.amount} {reward.currency === "guildMarks" ? "连队印记" : reward.currency === "arcaneDust" ? "尘晶" : "星辉"}</b><small>{reward.track === "free" ? "免费轨道" : "高级轨道"}</small></div><button disabled={!canClaim || claiming === reward.level} onClick={() => { setClaiming(reward.level); void authoritativeApi.claimSeasonReward(reward.level).then(() => authoritativeApi.season()).then(setSeason).finally(() => setClaiming(null)); }}>{reward.claimed ? "已领取" : canClaim ? "领取" : reward.track === "premium" && !passOwned ? "高级专属" : "未达标"}</button></article>; }) : <article><i>--</i><div><b>等待服务端奖励</b><small>上线后由权威服务发放轨道奖励</small></div><span>未开放</span></article>}</div></section><section className="season-pass-compliance"><p className="panel-kicker">DISCLOSURE · {COMPLIANCE_NOTICES.version}</p>{COMPLIANCE_NOTICE_LIST.map((notice) => <details key={notice.title}><summary>{notice.title} <small>{notice.effective}</small></summary>{notice.content.map((line) => <p key={line}>{line}</p>)}</details>)}</section></section></div>;
}

function Intro({ onDone }: { onDone: () => void }) {
  const [preload, setPreload] = useState<PreloadState>(getAssetPreloadState);
  const isReady = preload.total > 0 && preload.completed === preload.total;
  const progress = preload.total ? Math.min(100, Math.round(preload.completed / preload.total * 100)) : 0;

  useEffect(() => subscribeToAssetPreload(setPreload), []);
  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(onDone, 520);
    return () => window.clearTimeout(timer);
  }, [isReady, onDone]);

  return <div className={`intro ${isReady ? "is-ready" : ""}`} role="status" aria-live="polite" aria-label={`仙侠战线载入中，${progress}%`}><div className="intro-art" aria-hidden="true" /><div className="intro-vignette" aria-hidden="true" /><BrandEmblem className="intro-crest" /><p className="eyebrow">XIANXIA FRONTLINE</p><h1 className="intro-title">仙侠战线</h1><div className="intro-progress"><span>星门素材同步</span><b>{progress}%</b></div><div className="intro-bar" aria-hidden="true"><span style={{ "--load-progress": progress / 100 } as CSSProperties} /></div><small className="intro-status">{progress}% · {preload.completed} / {preload.total} 素材已加载{preload.failed ? ` · ${preload.failed} 项素材稍后重试` : ""}</small>{preload.failed > 0 && !isReady ? <button className="intro-retry" type="button" onClick={retryAssetPreload}>重新加载</button> : null}</div>;
}
function AppInner() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [deck, setDeck] = useState<string[]>(DEFAULT_DECK);
  const [battleKey, setBattleKey] = useState(0);
  const [hasSavedBattle, setHasSavedBattle] = useState(() => Boolean(localStorage.getItem(BATTLE_SAVE_KEY)));
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>(() => {
    const saved = localStorage.getItem("astra-frontline-ai-difficulty");
    return saved === "novice" || saved === "skilled" || saved === "expert" || saved === "master" ? saved : "novice";
  });
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("astra-frontline-reduce-motion") === "true");
  const [highIntensityEffects, setHighIntensityEffects] = useState(() => localStorage.getItem("astra-frontline-high-intensity-effects") !== "false");
  const [shortcuts, setShortcuts] = useState<GameShortcuts>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("astra-frontline-shortcuts") ?? "{}");
      return { ...DEFAULT_SHORTCUTS, ...saved };
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });
  const [isAiSetupOpen, setIsAiSetupOpen] = useState(false);
  const [pvpMode, setPvpMode] = useState<"ranked" | "casual">("casual");
  const [isPvpSetupOpen, setIsPvpSetupOpen] = useState(false);
  const [endlessBattle, setEndlessBattle] = useState<null | { deck: string[]; difficulty: AiDifficulty; label: string; scenario?: BattleScenario | null; onResult: (won: boolean) => void }>(null);
  const [campaignStage, setCampaignStage] = useState<CampaignStage | null>(null);
  const [isIntroVisible, setIsIntroVisible] = useState(() => localStorage.getItem(PRELOAD_READY_KEY) !== "1");
  const [isSeasonPassOpen, setIsSeasonPassOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef<number | null>(null);
  useEffect(() => () => { if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current); }, []);
  const [meta, setMeta] = useState<MetaSave>(loadMeta);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>("idle");
  const [cloudDetail, setCloudDetail] = useState("");
  const cloudRef = useRef<CloudSync | null>(null);
  if (!cloudRef.current) cloudRef.current = new CloudSync((status, detail) => { setCloudStatus(status); setCloudDetail(detail ?? ""); });
  useEffect(() => () => { cloudRef.current?.dispose(); }, []);
  const [selectedRarity, setSelectedRarity] = useState<Rarity | null>(null);
  const [welcomeLine] = useState(() => WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)]);
  const { setMusic } = useGameAudio();
  const starDust = meta.starDust;
  const guildMarks = meta.guildMarks;
  const ownedShopItems = meta.ownedShopItems;
  const handleStartBattle = () => setIsAiSetupOpen(true);
  const confirmAiMatch = () => { localStorage.removeItem(BATTLE_SAVE_KEY); setHasSavedBattle(false); trackGameEvent("battle_started", { difficulty: aiDifficulty }); setBattleKey((current) => current + 1); setIsAiSetupOpen(false); setPhase("battle"); };
  const resumeSavedBattle = () => {
    if (!hasSavedBattle) return;
    try {
      const savedDifficulty = JSON.parse(localStorage.getItem(BATTLE_SAVE_KEY) ?? "null")?.difficulty;
      if (savedDifficulty === "novice" || savedDifficulty === "skilled" || savedDifficulty === "expert" || savedDifficulty === "master") setAiDifficulty(savedDifficulty);
    } catch {
      // Battle mounts with a fresh state when a stale local save cannot be read.
    }
    setBattleKey((current) => current + 1); setPhase("battle");
  };
  const returnToMenu = () => { localStorage.removeItem(BATTLE_SAVE_KEY); setHasSavedBattle(false); setPhase("menu"); };
  const rarityCount = (rarity: string) => CARD_POOL.filter((card) => card.rarity === rarity).length;
  const rarityCards = selectedRarity ? CARD_POOL.filter((card) => card.rarity === selectedRarity) : [];
  const rarityDetail = selectedRarity ? RARITY_GALLERY.find((entry) => entry.rarity === selectedRarity) : null;
  const showNotice = (label: string) => { setNotice(`${label}模块正在筹备中`); if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current); noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2600); };
  const handleBattleResult = (won: boolean) => {
    trackGameEvent("battle_finished", { won, difficulty: aiDifficulty });
    const result = applyBattleResult(meta, won);
    setMeta(result.meta);
    const achievementText = result.newAchievements.length ? ` · 成就解锁：${result.newAchievements.length} 项` : "";
    setNotice(won ? `交战胜利 · +${result.reward} 星辉${achievementText}` : `交战结束 · +30 星辉（再接再厉）`);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 3200);
  };
  const handleCampaignResult = (won: boolean) => {
    const stage = campaignStage;
    if (!stage) return;
    trackGameEvent("campaign_finished", { won, stage: stage.arcId, difficulty: stage.difficulty });
    if (won) {
      setMeta((current) => recordCampaignWin({ ...current, starDust: current.starDust + stage.rewardStarDust, arcaneDust: current.arcaneDust + stage.rewardDust }, stage.arcId));
      setNotice(`篇章收复 · 获得 ${stage.rewardStarDust} 星辉 + ${stage.rewardDust} 尘晶`);
    } else {
      setMeta((current) => addCurrency(current, "starDust", 30, "campaign"));
      setNotice("战役受挫 · 获得 30 星辉（再接再厉）");
    }
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 3200);
  };
  const handleOpenPack = (): PackResult | null => {
    const result = openPack(meta);
    if (!result.results.length) return null;
    setMeta(result.meta);
    return result.results[0];
  };
  const handleNavigation = (label: string) => {
    if (label === "指挥室") setPhase("menu");
    else if (label === "整备库") setPhase("builder");
    else if (label === "模拟战场") setPhase("practice");
    else if (label === "任务挑战") setPhase("missions");
    else if (label === "排行榜") setPhase("leaderboard");
    else if (label === "图鉴收藏") setPhase("collection");
    else if (label === "编年史") setPhase("chronicle");
    else if (label === "消息中心") setPhase("messages");
    else if (label === "设置") setPhase("settings");
    else if (label === "商城") setPhase("shop");
    else if (label === "作战连队") setPhase("guild");
    else showNotice(label);
  };

  useEffect(() => {
    const nextTrack: MusicTrack = isSeasonPassOpen ? "shop"
      : phase === "battle" || phase === "campaign" ? "battle"
        : phase === "pvp" ? "battle"
          : phase === "chronicle" || phase === "collection" ? "archive"
            : phase === "builder" ? "builder"
              : phase === "practice" ? "practice"
                : phase === "missions" ? "missions"
                  : phase === "shop" ? "shop"
                    : phase === "guild" ? "guild"
                      : "lobby";
    setMusic(nextTrack);
  }, [isSeasonPassOpen, phase, setMusic]);

  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [phase]);

  useEffect(() => {
    if (phase === "assets") setPhase("collection");
  }, [phase]);

  useEffect(() => {
    localStorage.setItem("astra-frontline-ai-difficulty", aiDifficulty);
  }, [aiDifficulty]);

  useEffect(() => {
    localStorage.setItem("astra-frontline-reduce-motion", String(reduceMotion));
    document.documentElement.toggleAttribute("data-reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    localStorage.setItem("astra-frontline-high-intensity-effects", String(highIntensityEffects));
  }, [highIntensityEffects]);

  useEffect(() => {
    localStorage.setItem("astra-frontline-shortcuts", JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    if (!meta.commander) return;
    saveMeta(meta);
    const timer = window.setTimeout(() => { void cloudRef.current?.queueAndSync(meta); }, 700);
    return () => window.clearTimeout(timer);
  }, [meta]);

  useEffect(() => {
    if (!meta.commander) return;
    let active = true;
    void cloudRef.current?.start(meta).then((remote) => {
      if (active && remote) setMeta(remote);
    });
    return () => { active = false; };
  }, [meta.commander?.id]);

  return <main className="app-shell lobby-app">
    <div className="nebula" aria-hidden="true" /><div className="bg-stars" aria-hidden="true">{Array.from({ length: 24 }).map((_, index) => <i key={index} className="star" style={{ left: `${(index * 37 + 11) % 100}%`, top: `${(index * 71 + 23) % 100}%`, animationDelay: `${(index % 9) * 0.42}s` }} />)}</div>
    <header className="game-topbar">
      <button className="lobby-brand" onClick={() => setPhase("menu")} aria-label="返回仙侠战线主页"><BrandEmblem className="brand-mark" /><span><b>仙侠战线</b><small>XIANXIA FRONTLINE</small></span></button>
      <nav className="top-navigation" aria-label="主导航">{TOP_NAVIGATION.map(({ label, icon }) => label === "__crest" ? <span className="topbar-crest" aria-hidden="true" key={label}><img className="topbar-crest-mark" src="/assets/ui/topbar-navigation-crest.png?v=4" alt="" /></span> : <button key={label} className={(phase === "menu" && label === "指挥室") || (phase === "builder" && label === "整备库") || ((phase === "battle" || phase === "practice") && label === "模拟战场") || (phase === "missions" && label === "任务挑战") || (phase === "leaderboard" && label === "排行榜") || (phase === "collection" && label === "图鉴收藏") || (phase === "chronicle" && label === "编年史") || (phase === "shop" && label === "商城") || (phase === "guild" && label === "作战连队") ? "is-active" : ""} onClick={() => handleNavigation(label)}>{icon ? <img className="top-navigation-icon" src={icon} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}<span>{label}</span></button>)}</nav>
      <div className="account-cluster"><div className="account-resources"><div className="resource-chip" title="星辉"><i>✦</i><span><small>星辉</small><b>{starDust}</b></span></div><div className="resource-chip guild-mark" title="连队印记"><i>◈</i><span><small>同盟印记</small><b>{guildMarks}</b></span></div></div>{meta.commander ? <CloudSyncIndicator status={cloudStatus} detail={cloudDetail} onSync={() => { void cloudRef.current?.queueAndSync(meta); }} /> : null}<button className="account-profile" onClick={() => setPhase("profile")} aria-label="打开指挥官档案"><div className="account-avatar" aria-hidden="true" style={hasCosmetic(ownedShopItems, "astral-frame") ? { boxShadow: "0 0 0 2px #f0cf7d, 0 0 14px rgba(240, 207, 125, .55)" } : undefined} /><span className="account-meta"><b>{meta.commander ? `${activeTitle(ownedShopItems) ? `「${activeTitle(ownedShopItems)}」` : ""}${meta.commander.name}` : "档案登记"}</b><small>{meta.commander ? `${meta.commander.faction} · Lv. ${meta.commanderLevel}` : "创建你的指挥官"}</small></span></button><ThemeControls /></div>
    </header>
    {isIntroVisible && <Intro onDone={() => { localStorage.setItem(PRELOAD_READY_KEY, "1"); setIsIntroVisible(false); }} />}
    {!isIntroVisible && !meta.commander ? <CommanderOnboarding meta={meta} onComplete={(next) => { setMeta(next); setNotice("星门档案已建立 · 前往首场引导战"); setBattleKey((current) => current + 1); setPhase("battle"); }} /> : null}
    {notice ? <div className="lobby-notice" role="status">{notice}</div> : null}
    {isSeasonPassOpen ? <SeasonPassModal meta={meta} onClose={() => setIsSeasonPassOpen(false)} /> : null}

    {phase === "menu" && <section className="lobby-shell command-home">
      <aside className="lobby-sidebar"><div className="sidebar-rail" aria-hidden="true" /><div className="side-navigation">{SIDE_NAVIGATION.map(([icon, label, target]) => { const asset = SIDEBAR_ICON_ASSETS[target]; return <button key={label} className={target === phase ? "is-active" : ""} onClick={() => target === "menu" ? setPhase("menu") : target === "builder" ? setPhase("builder") : target === "practice" ? setPhase("practice") : target === "missions" ? setPhase("missions") : target === "leaderboard" ? setPhase("leaderboard") : target === "settings" ? setPhase("settings") : target === "messages" ? setPhase("messages") : target === "friends" ? setPhase("friends") : showNotice(label)}><span className={asset ? "has-art" : ""}>{asset ? <img src={asset} alt="" /> : icon}</span><b>{label}</b></button>; })}</div><button className="season-pass" onClick={() => setIsSeasonPassOpen(true)} aria-haspopup="dialog"><span><p>赛季通行证</p><b>Lv. {meta.commanderLevel}</b><div><i style={{ width: `${Math.min(100, Math.round(meta.seasonPoints / 10))}%` }} /><small>{Math.min(9999, meta.seasonPoints)} / 1000</small></div></span><strong><BrandEmblem className="season-pass-emblem" /></strong><em>查看详情</em></button></aside>
      <div className="lobby-content"><div className="content-frame" aria-hidden="true" />
        <section className="lobby-hero"><video className="lobby-hero-video" autoPlay loop muted playsInline poster="/assets/backgrounds/lobby-background.png" aria-hidden="true"><source src="/assets/backgrounds/lobby-video.mp4" type="video/mp4" /></video><div className="celestial-chart" aria-hidden="true"><i /><i /><i /><span>✦</span></div><div className="citadel-scene" aria-hidden="true"><i /><i /><i /><span /></div><div className="hero-copy"><p className="eyebrow">SEASON 01 · ECLIPSE PROTOCOL</p><div className="hero-title-row"><h1>仙侠战线</h1></div><p>第七天门即将重启。集结你的阵营，赢下第一场战役。</p><p className="hero-welcome">{welcomeLine.text}{welcomeLine.ref ? <small className="welcome-ref">——{welcomeLine.ref}</small> : null}</p><div className="hero-commands"><button className="parchment-button" onClick={() => setPhase("builder")}>构筑战线 <span>→</span></button>{hasSavedBattle ? <button className="outline-command resume-command" onClick={resumeSavedBattle}>继续交战 <span className="resume-command-icon"><img src="/assets/ui/resume-battle-swords-gpt2-localcut.png?v=1" alt="" /></span></button> : <button className="outline-command" onClick={handleStartBattle}>快速交战 <span>⚔</span></button>}</div></div></section>
        <section className="rarity-gallery" aria-label="按稀有度查看卡牌">{RARITY_GALLERY.map(({ rarity, label, seal }) => <button type="button" className={`rarity-meter rarity-${rarity}${selectedRarity === rarity ? " is-active" : ""}`} key={rarity} onClick={() => setSelectedRarity((current) => current === rarity ? null : rarity)} aria-pressed={selectedRarity === rarity} aria-label={`查看 ${rarity} ${label}，共 ${rarityCount(rarity)} 张`}><i className="rarity-seal">{seal}</i><strong>{rarity}</strong><span>{rarityCount(rarity)} 张</span><small>{label}</small><em aria-hidden="true">查看档案</em></button>)}</section>
        {rarityDetail ? <section className={`rarity-card-drawer rarity-drawer-${selectedRarity}`} key={selectedRarity} aria-labelledby="rarity-drawer-title"><header><div><p className="panel-kicker">RARITY ARCHIVE <i>·</i> {selectedRarity} 等级卡组</p><h2 id="rarity-drawer-title">{rarityDetail.label}<small>{rarityCards.length} 张已收录</small></h2></div><button type="button" onClick={() => setSelectedRarity(null)} aria-label="关闭稀有度卡组档案" title="关闭">×</button></header><div className="rarity-card-grid">{rarityCards.map((card, index) => <article className="rarity-card-preview" style={{ "--rarity-card-index": index } as CSSProperties} key={card.id}><CardView def={card} compact /><div><b>{card.name}</b><span>{card.type} · {card.skill.name}</span></div></article>)}</div></section> : null}
        <section className="lobby-panels">
          <article className="command-brief">
            <div className="panel-glow-lines" aria-hidden="true" />
            <p className="panel-kicker">COMMAND BRIEF <i>·</i> 指挥官指令</p>
            <h2>每一次部署，都是一份不能被删掉的证词。</h2>
            <p>用 30 张卡牌组织你的供述：先守住场面，再让阵营技能彼此作证，最后决定谁有资格替第七天门写下结论。</p>
            <div className="tactical-rules">
              <span><b>01</b><i>✥</i><em>每回合星辉增长，给下一份证词留下余地。</em></span>
              <span><b>02</b><i>♜</i><em>守卫会拦下所有指控，必须优先突破。</em></span>
              <span><b>03</b><i>◈</i><em>击穿 30 点核心，才能让证言站得住。</em></span>
            </div>
          </article>
          <aside className="signature-panel">
            <div className="panel-glow-lines" aria-hidden="true" />
            <p className="panel-kicker">SIGNATURE UNITS <i>·</i> 王牌单位</p>
            {CARD_POOL.filter((card) => ["astral-queen", "void-emperor", "prism-dragon"].includes(card.id)).map((card) => <div className="signature-row" key={card.id}><span style={{ color: card.color }}>{card.icon}</span><div><b>{card.name}</b><small>{HOME_SIGNATURE_TITLES[card.id] ?? card.title}</small></div><em>{card.cost}</em></div>)}
          </aside>
          <button className="deploy-button" onClick={handleStartBattle}><b>出征</b><small>DEPLOY · 前往第七天门</small><span>✦</span></button>
        </section>
      </div>
    </section>}
    <Suspense fallback={null}>
    {phase === "builder" && <DeckBuilder deck={deck} setDeck={setDeck} onStart={handleStartBattle} onExit={() => setPhase("menu")} />}
    {phase === "battle" && !endlessBattle && <Battle key={battleKey} deck={deck} difficulty={aiDifficulty} shortcuts={shortcuts} highIntensityEffects={highIntensityEffects} resumeFromSave={hasSavedBattle} tutorialDone={meta.tutorialDone} onResult={handleBattleResult} onTutorialDone={() => setMeta((current) => markTutorialDone(current))} onExit={returnToMenu} onReplay={() => { localStorage.removeItem(BATTLE_SAVE_KEY); setHasSavedBattle(false); setBattleKey((current) => current + 1); }} onSaveAndExit={() => { setHasSavedBattle(true); setPhase("menu"); }} />}
    {phase === "campaign" && campaignStage ? <Battle key={`${battleKey}-${campaignStage.arcId}`} deck={deck} difficulty={campaignStage.difficulty} shortcuts={shortcuts} highIntensityEffects={highIntensityEffects} resumeFromSave={false} tutorialDone={meta.tutorialDone} campaign={{ commander: campaignStage.commander, commanderTitle: campaignStage.commanderTitle, enemyDeck: campaignStage.enemyDeck }} onResult={handleCampaignResult} onTutorialDone={() => setMeta((current) => markTutorialDone(current))} onExit={() => { localStorage.removeItem(BATTLE_SAVE_KEY); setHasSavedBattle(false); setPhase("chronicle"); }} onReplay={() => setBattleKey((current) => current + 1)} onSaveAndExit={() => setPhase("chronicle")} /> : null}
    {phase === "practice" && <PracticeView onStart={handleStartBattle} onBuild={() => setPhase("builder")} onPvp={() => setIsPvpSetupOpen(true)} onEndless={() => setPhase("endless")} />}
    {phase === "pvp" && <PvpView deck={deck} mode={pvpMode} onExit={() => setPhase("menu")} onResult={() => { /* 服务器结算，本地仅提示 */ }} />}
    {phase === "endless" && <EndlessModesView meta={meta} deck={deck} onReward={(reward) => setMeta((current) => addCurrency(current, "starDust", reward, "endless"))} onBattle={(battleDeck, difficulty, onResult, onExit, label, scenario) => {
      setEndlessBattle({ deck: battleDeck, difficulty, label, scenario: scenario ?? null, onResult });
      setBattleKey((current) => current + 1);
      setPhase("battle");
      void onExit;
    }} />}
    {endlessBattle && phase === "battle" ? <Battle key={`endless-${battleKey}`} deck={endlessBattle.deck} difficulty={endlessBattle.difficulty} shortcuts={shortcuts} highIntensityEffects={highIntensityEffects} resumeFromSave={false} tutorialDone={meta.tutorialDone} scenario={endlessBattle.scenario} onResult={(won) => { endlessBattle.onResult(won); }} onTutorialDone={() => undefined} onExit={() => { setEndlessBattle(null); setPhase("endless"); }} onReplay={() => setBattleKey((current) => current + 1)} onSaveAndExit={() => { setEndlessBattle(null); setPhase("endless"); }} /> : null}
    {phase === "missions" && <MissionsView missions={MISSION_DEFS.map((def) => ({ ...def, progress: Math.min(def.total, def.progress(meta)), claimed: isMissionClaimed(meta, def.id) }))} meta={meta} onClaim={(missionId) => setMeta((current) => claimMission(current, missionId))} onStartBattle={handleStartBattle} />}
    {phase === "leaderboard" && <LeaderboardView meta={meta} />}
    {phase === "collection" && <CollectionView collection={meta.collection} arcaneDust={meta.arcaneDust} onDisenchant={(cardId) => setMeta((current) => disenchantCard(current, cardId))} onCraft={(cardId) => setMeta((current) => craftCard(current, cardId))} />}
    {phase === "chronicle" && <ChronicleView cleared={meta.campaignCleared} onBattle={(stage) => { setCampaignStage(stage); setBattleKey((current) => current + 1); setPhase("campaign"); }} />}
    {phase === "messages" && <MessageCenter onClaimAttachment={(currency, amount) => setMeta((current) => addCurrency(current, currency, amount, "attachment"))} />}
    {phase === "friends" && <FriendsView commander={meta.commander ? { name: meta.commander.name, faction: meta.commander.faction } : null} onReplay={(replay) => {
      setBattleKey((current) => current + 1);
      setEndlessBattle({ deck: replay.playerDeck, difficulty: "skilled", label: "重演 · 同卡组同种子", scenario: { enemyDeck: replay.enemyDeck, seed: replay.seed }, onResult: () => undefined });
      setPhase("battle");
    }} />}
    {phase === "settings" && <SettingsView meta={meta} aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty} reduceMotion={reduceMotion} setReduceMotion={setReduceMotion} highIntensityEffects={highIntensityEffects} setHighIntensityEffects={setHighIntensityEffects} shortcuts={shortcuts} setShortcuts={setShortcuts} />}
    {phase === "profile" && meta.commander ? <CommanderProfile meta={meta} onBack={() => setPhase("menu")} /> : null}
    {phase === "shop" && <ShopView starDust={starDust} guildMarks={guildMarks} ownedItems={ownedShopItems} arcaneDust={meta.arcaneDust} onOpenPack={handleOpenPack} onPurchase={(itemId, currency, cost) => {
      const next = spendCurrency(meta, currency, cost, itemId);
      if (next === meta) return false;
      setMeta(next);
      return true;
    }} />}
    {phase === "guild" && <GuildView />}
    </Suspense>
    {isAiSetupOpen ? <AiMatchSetup difficulty={aiDifficulty} onDifficultyChange={setAiDifficulty} onConfirm={confirmAiMatch} onClose={() => setIsAiSetupOpen(false)} /> : null}
    {isPvpSetupOpen ? <div className="pvp-setup-backdrop" role="presentation" onMouseDown={() => setIsPvpSetupOpen(false)}><section className="pvp-setup" role="dialog" aria-modal="true" aria-labelledby="pvp-setup-title" onMouseDown={(event) => event.stopPropagation()}><header><p className="eyebrow">AUTHORITATIVE MATCH</p><h2 id="pvp-setup-title">天梯对决</h2><span>与真实玩家实时匹配。排位赛胜负由权威赛季服务结算，计入天梯段位与实时排行榜。</span></header><div className="pvp-mode-grid">{[["ranked", "排位赛", "胜负计入赛季积分、段位与排行榜"], ["casual", "休闲赛", "不计分，适合练牌与熟悉真人节奏"]].map(([mode, label, desc]) => <button key={mode} className={pvpMode === mode ? "is-selected" : ""} onClick={() => setPvpMode(mode as "ranked" | "casual")}><b>{label}</b><small>{desc}</small></button>)}</div><footer><button className="btn btn-secondary" onClick={() => setIsPvpSetupOpen(false)}>返回</button><button className="btn btn-primary" onClick={() => { setIsPvpSetupOpen(false); setPhase("pvp"); }}>出征 <span>→</span></button></footer></section></div> : null}
  </main>;
}

export default function App() {
  const isDesktop = useDesktopViewport();
  if (!isDesktop) return <DesktopOnlyNotice />;
  return <ThemeProvider><AudioProvider><AppInner /></AudioProvider></ThemeProvider>;
}
