import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CARD_POOL } from "../data/cards";
import { ARCHIVE_ARTICLES, ARCHIVE_PEOPLE } from "../data/chronicleArchive";
import { CHARACTER_STORIES, CHRONICLE, FACTIONS, PLAYER_MANDATE, STORY_ARCS, WORLD_PREMISE, getFaction } from "../data/world";
import { CAMPAIGN_STAGES, type CampaignStage } from "../data/campaign";
import { useGameAudio } from "../audio/AudioProvider";
import { buildRanking, DUST_TABLE, isCampaignUnlocked, MAX_CARD_COPIES, type MetaSave } from "../game/meta";
import { activeTitle } from "../data/cosmetics";
import type { CardDef, CardType } from "../types";
import CardView from "./CardView";

interface PracticeProps { onStart: () => void; onBuild: () => void; onPvp: () => void; onEndless: () => void; }

const FACTION_VOICE_KEYS: Record<CardType, string> = {
  "天衡": "faction/dawn-intro",
  "幽冥": "faction/shadow-intro",
  "天机": "faction/arcane-intro",
  "铁律": "faction/iron-intro",
  "山海": "faction/wild-intro",
};
const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARD_POOL.map((card) => [card.id, card]));
const CHARACTER_ART: Record<string, string> = {
  "sunblade": "/assets/characters/sunblade/portrait-v2-4k.png",
  "void-emperor": "/assets/characters/void-emperor/portrait-v2-4k.png",
  "iron-colossus": "/assets/characters/iron-colossus/portrait-v2-4k.png",
  "wild-mother": "/assets/characters/wild-mother/portrait-v2-4k.png",
  "prism-dragon": "/assets/characters/prism-dragon/portrait-v2-4k.png",
  "yinluo": "/assets/characters/archive/yinluo.png",
  "xuanji": "/assets/characters/archive/xuanji.png",
  "suhe": "/assets/characters/archive/suhe.png",
  "qingyao": "/assets/characters/archive/qingyao.png",
  "linzhu": "/assets/characters/archive/linzhu.png",
  "wanqing": "/assets/characters/archive/wanqing.png",
  "luyin": "/assets/characters/archive/luyin.png",
  "zhuiyue": "/assets/characters/archive/zhuiyue.png",
  "huanling": "/assets/characters/archive/huanling.png",
  "luojin": "/assets/characters/archive/luojin.png",
  "wenbai": "/assets/characters/archive/wenbai.png",
  "shenzhu": "/assets/characters/archive/shenzhu.png",
};

export function PracticeView({ onStart, onBuild, onPvp, onEndless }: PracticeProps) {
  const drills = [
    ["云阶书库", "从典籍司丞手里夺回被拆散的誓文，熟悉部署、攻击与结束回合。", "01", "初阶"],
    ["忘川渡口", "守卫拦下每一句供词。规划攻击顺序，让无名者先过河。", "02", "进阶"],
    ["命盘断线", "抓住高费用单位的终局窗口，阻止唯一结局再次合拢。", "03", "专家"],
  ];
  return <section className="command-view practice-view"><header className="command-heading"><p className="eyebrow">TACTICAL SIMULATION</p><h1>模拟战场</h1><span>在未被记入编年史的交战中，检验阵营协同与出牌节奏；每一场胜负都是前线留下的旁证。</span></header><div className="drill-grid">{drills.map(([title, desc, sequence, level]) => <article className="drill-card" key={title}><span className="drill-sequence">{sequence}</span><p>{level}</p><h2>{title}</h2><span>{desc}</span><div><button className="outline-command" onClick={onStart}>开始模拟 <b>→</b></button></div></article>)}<article className="drill-card is-pvp"><span className="drill-sequence">⚔</span><p>真人对抗</p><h2>天梯对决</h2><span>与真实玩家匹配对战，胜负计入赛季积分与实时排行榜。先手由服务器裁定。</span><div><button className="outline-command" onClick={onPvp}>进入天梯 <b>→</b></button></div></article><article className="drill-card is-endless"><span className="drill-sequence">塔</span><p>无尽试炼</p><h2>试炼之地</h2><span>无尽爬塔、每日挑战与竞技场轮抽——三种活法，三种证词。</span><div><button className="outline-command" onClick={onEndless}>前往试炼 <b>→</b></button></div></article></div><section className="practice-brief"><div><p className="panel-kicker">CURRENT LOADOUT</p><h2>第七门临时编队</h2><span>当前编队已整装待命。通过整备库调整阵容后，下一份前线报告会自动采用最新配置。</span></div><button className="parchment-button" onClick={onBuild}>前往整备库 →</button></section></section>;
}

interface MissionRow { id: string; title: string; reward: string; cycle: "daily" | "weekly"; progress: number; total: number; claimed: boolean; }

function nextResetCountdown(cycle: "daily" | "weekly"): string {
  const now = new Date();
  const target = new Date(now);
  if (cycle === "daily") {
    target.setHours(5, 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  } else {
    const day = now.getDay();
    const daysToSunday = (7 - day) % 7;
    target.setDate(now.getDate() + daysToSunday);
    target.setHours(5, 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 7);
  }
  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalHours = Math.floor(diff / 3_600_000);
  const minutes = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0");
  const seconds = String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0");
  return cycle === "daily" ? `${String(totalHours).padStart(2, "0")}:${minutes}:${seconds}` : `${totalHours} 小时 ${minutes} 分`;
}

export function MissionsView({ missions, meta, onClaim, onStartBattle }: { missions: MissionRow[]; meta: MetaSave; onClaim: (id: string) => void; onStartBattle: () => void }) {
  const { playSfx } = useGameAudio();
  const [cycle, setCycle] = useState<MissionRow["cycle"]>("daily");
  const [countdown, setCountdown] = useState(() => nextResetCountdown("daily"));
  useEffect(() => {
    setCountdown(nextResetCountdown(cycle));
    const timer = window.setInterval(() => setCountdown(nextResetCountdown(cycle)), 1000);
    return () => window.clearInterval(timer);
  }, [cycle]);
  const visible = missions.filter((entry) => entry.cycle === cycle);
  const readyCount = visible.filter((entry) => entry.progress >= entry.total && !entry.claimed).length;
  const completedCount = visible.filter((entry) => entry.claimed).length;
  const progress = visible.length ? Math.round(visible.reduce((sum, entry) => sum + Math.min(1, entry.progress / entry.total), 0) / visible.length * 100) : 0;
  const seasonGoals = [
    { label: "赛季积分", value: meta.seasonPoints, total: 800, reward: "日蚀冠冕 I 阶" },
    { label: "连胜记录", value: meta.bestStreak, total: 3, reward: "连胜烈焰勋记" },
    { label: "前线胜场", value: meta.wins, total: 10, reward: "星门补给匣" },
  ];
  const cycleLabel = cycle === "daily" ? "今日线索" : "七日委托";
  return <section className="command-view missions-view missions-command-center"><header className="command-heading mission-heading"><div><p className="eyebrow">FIELD ORDERS · FRONTLINE COMMAND</p><h1>任务挑战</h1><span>把可验证的行动编入指令链。每一份完成报告都会为下一场出征补足资源。</span></div><aside><small>当前行动窗口</small><b>{countdown}</b><em>{cycle === "daily" ? "每日 05:00 重置" : "本周日 05:00 结算"}</em></aside></header><section className="mission-overview"><article className="mission-command-status"><p className="panel-kicker">ORDER STATUS</p><h2>{cycleLabel}</h2><div><b>{progress}<small>%</small></b><span>本周期指令完成度</span></div><i><span style={{ width: `${progress}%` }} /></i><footer><small>已归档 {completedCount} / {visible.length}</small><strong>{readyCount ? `${readyCount} 项待领取` : "暂无待领取奖励"}</strong></footer></article><article className="mission-priority"><p className="panel-kicker">NEXT DEPLOYMENT</p><h2>{readyCount ? "领取补给后整装" : cycle === "daily" ? "完成一场前线交战" : "维持连队推进节奏"}</h2><p>{readyCount ? "已有已完成指令等待核准。领取后，资源会立即记入档案。" : "模拟战场的每一次结算都会推进今日线索、周常委托与赛季目标。"}</p><button className="parchment-button" onClick={onStartBattle}>签发出征令 <span>→</span></button></article><article className="mission-reward-ledger"><p className="panel-kicker">REWARD LEDGER</p><dl><div><dt>本期可领</dt><dd>{readyCount}</dd></div><div><dt>累计胜场</dt><dd>{meta.wins}</dd></div><div><dt>赛季积分</dt><dd>{meta.seasonPoints}</dd></div></dl><small>奖励经任务结算后写入指挥官档案。</small></article></section><div className="mission-tabs" role="tablist" aria-label="任务周期"><button className={cycle === "daily" ? "is-active" : ""} onClick={() => setCycle("daily")} role="tab" aria-selected={cycle === "daily"}>今日线索 <small>{missions.filter((entry) => entry.cycle === "daily").length}</small></button><button className={cycle === "weekly" ? "is-active" : ""} onClick={() => setCycle("weekly")} role="tab" aria-selected={cycle === "weekly"}>七日委托 <small>{missions.filter((entry) => entry.cycle === "weekly").length}</small></button><span>{readyCount ? `有 ${readyCount} 份补给等待核准` : "指令链已同步"}</span></div><div className="mission-workspace"><section className="mission-list" aria-label={cycleLabel}>{visible.map((mission, index) => { const done = mission.progress >= mission.total; const isClaimed = mission.claimed; const percent = Math.min(100, mission.progress / mission.total * 100); return <article className={`mission-row ${done ? "is-ready" : ""} ${isClaimed ? "is-claimed" : ""}`} key={mission.id}><span className="mission-order">{String(index + 1).padStart(2, "0")}</span><span className="mission-symbol">{mission.cycle === "daily" ? "☼" : "✦"}</span><div><b>{mission.title}</b><small>{mission.cycle === "daily" ? "当日行动 · 前线记录" : "七日委托 · 长线推进"}</small></div><div className="mission-progress"><i><span style={{ width: `${percent}%` }} /></i><small>{mission.progress} / {mission.total} · {done ? "条件已满足" : "仍在推进"}</small></div><em>{mission.reward}</em><button disabled={!done || isClaimed} onClick={() => { playSfx("reward"); onClaim(mission.id); }}>{isClaimed ? "已归档" : done ? "核准领取" : "执行中"}</button></article>; })}</section><aside className="season-mandates"><header><p className="panel-kicker">SEASON MANDATES</p><h2>日蚀协议</h2><span>本赛季还剩 18 天</span></header>{seasonGoals.map((goal) => { const percent = Math.min(100, goal.value / goal.total * 100); return <article key={goal.label}><div><b>{goal.label}</b><span>{goal.value} / {goal.total}</span></div><i><em style={{ width: `${percent}%` }} /></i><small>达成奖励：{goal.reward}</small></article>; })}<footer><span>前线状态</span><b>{meta.streak > 0 ? `${meta.streak} 连胜进行中` : "等待下一场胜利"}</b></footer></aside></div></section>;
}

export function LeaderboardView({ meta }: { meta: MetaSave }) {
  const [season, setSeason] = useState("本赛季");
  const [online, setOnline] = useState<null | { season: string; self: { rating: number; wins: number; losses: number; seasonXp: number } | null; rows: Array<{ rank: number; publicCode: string; rating: number; wins: number; losses: number; seasonXp: number }> }>(null);
  const [onlineStatus, setOnlineStatus] = useState<"loading" | "online" | "offline">("loading");
  const isCurrentSeason = season === "本赛季";
  const winRate = meta.wins + meta.losses ? Math.round(meta.wins / (meta.wins + meta.losses) * 100) : 0;
  const { rows: localRows, player: playerRow, rank } = buildRanking(meta);
  useEffect(() => {
    let active = true;
    // 拉取权威赛季榜（Top 100）与自己的赛季状态；任一失败则回退本地模拟榜。
    void Promise.all([
      import("../platform/AuthoritativeClient").then(({ authoritativeApi }) => authoritativeApi.rankings()),
      import("../platform/AuthoritativeClient").then(({ authoritativeApi }) => authoritativeApi.season().catch(() => null)),
    ]).then(([board, seasonStatus]) => {
      if (!active) return;
      setOnline({
        season: board.season,
        rows: board.rows,
        self: seasonStatus ? { rating: seasonStatus.progress.rating, wins: seasonStatus.progress.wins, losses: seasonStatus.progress.losses, seasonXp: seasonStatus.progress.season_xp } : null,
      });
      setOnlineStatus("online");
    }).catch(() => { if (active) setOnlineStatus("offline"); });
    return () => { active = false; };
  }, []);
  const onlineSelfRow = online?.self ? { rank: 0, publicCode: "你", rating: online.self.rating, wins: online.self.wins, losses: online.self.losses, seasonXp: online.self.seasonXp } : null;
  const titleText = activeTitle(meta.ownedShopItems);
  const rows = online ? (onlineSelfRow ? [onlineSelfRow, ...online.rows.filter((row) => row.publicCode !== "你")] : online.rows).map((row) => ({ rank: row.rank, name: row.publicCode === "你" && titleText ? `「${titleText}」你` : row.publicCode, faction: row.publicCode === "你" ? "你" : "指挥官", badge: `rating ${row.rating} · ${row.wins}胜${row.losses}负`, score: row.rating })) : localRows;
  const podium = [rows[1] ?? rows[0], rows[0], rows[2] ?? rows[rows.length - 1]].filter(Boolean).filter((entry, index, list) => list.findIndex((other) => other.rank === entry.rank) === index);
  const pointsToNext = Math.max(0, rank.to - (online ? onlineSelfRow?.rating ?? meta.seasonPoints : meta.seasonPoints));
  const badges = [
    ["/assets/badges/eclipse-crown.png", "日蚀冠冕", "赛季积分抵达 800", meta.seasonPoints >= 800 ? "已解锁" : `${meta.seasonPoints} / 800`],
    ["/assets/badges/rift-vanguard.png", "裂隙功勋", "指挥官等级抵达 25", meta.commanderLevel >= 25 ? "已解锁" : `${meta.commanderLevel} / 25`],
    ["/assets/badges/stargate-pioneer.png", "星门初行者", "完成首场引导战", meta.badges.some((badge) => badge.id === "stargate-pioneer" && badge.level > 0) ? "已解锁" : "未完成首场引导"],
  ];

  return <section className="command-view leaderboard-view">
    <header className="command-heading ranking-heading"><div><p className="eyebrow">SEASONAL RANKING</p><h1>赛季战绩中心</h1><span>{onlineStatus === "online" ? "实时排行榜由权威赛季服务结算。" : "赛季积分决定你在仙侠战线中的位置与结算奖励。"}</span></div><div className="ranking-heading-season"><small>当前赛季</small><b>{online?.season ?? "01"}</b><span>日蚀协议</span></div></header>
    <div className="ranking-toolbar"><div>{["本赛季", "上赛季"].map((option) => <button className={season === option ? "is-active" : ""} onClick={() => setSeason(option)} key={option}>{option}</button>)}</div><span>{isCurrentSeason ? "第 01 赛季 · 剩余 18 天" : "历史赛季 · 结算档案"}</span></div>
    <section className="ranking-season-banner"><div><p className="panel-kicker">{isCurrentSeason ? "ECLIPSE PROTOCOL" : "ARCHIVED SEASON"}</p><h2>{isCurrentSeason ? "日蚀将至，留下名字的人也要为它作证。" : "上一轮日蚀的荣誉档案"}</h2><span>{onlineStatus === "online" ? "榜单由服务端实时结算，PvP 排位胜负直接计入。" : "赛季结算时，排名前 100 的指挥官将获得仙侠补给与赛季勋章。"}</span></div><dl><div><dt>你的排名</dt><dd>#{online ? (online.rows.find((row) => row.publicCode === "你")?.rank ?? "100+") : String(playerRow.rank).padStart(2, "0")}</dd></div><div><dt>赛季积分</dt><dd>{online ? onlineSelfRow?.rating ?? meta.seasonPoints : meta.seasonPoints}</dd></div><div><dt>胜率</dt><dd>{winRate}%</dd></div></dl></section>
    <div className="ranking-layout">
      <div className="ranking-main-column"><section className="ranking-podium">{podium.map((entry, index) => <div className={entry.rank === 1 ? "first-place" : ""} key={entry.rank}><b>{String(entry.rank).padStart(2, "0")}</b><span>{entry.name}</span><em>{entry.score}</em></div>)}</section><section className="ranking-table"><div className="ranking-head"><span>排名</span><span>指挥官</span><span>阵营</span><span>积分</span></div>{rows.map((entry) => <div className={`ranking-row ${entry.faction === "你" ? "is-player" : ""}`} key={entry.rank}><b>{String(entry.rank).padStart(2, "0")}</b><span><strong>{entry.name}</strong><small>{entry.badge}</small></span><small>{entry.faction}</small><em>{entry.score}</em></div>)}</section></div>
      <aside className="ranking-sidebar"><section className="personal-rank-card"><div><p className="panel-kicker">CURRENT STANDING</p><h2>{rank.title}</h2><span>{pointsToNext > 0 ? `距离「${rank.next}」还差 ${pointsToNext} 积分` : "已达当前赛季最高段位"}</span></div><img src="/assets/badges/stargate-pioneer.png" alt="渊门先锋勋章" /><div className="rank-meter"><i><span style={{ width: `${Math.min(100, rank.progress)}%` }} /></i><small>{meta.seasonPoints} / {rank.to}</small></div></section><section className="badge-case"><header><div><p className="panel-kicker">MEDAL CABINET</p><h2>赛季勋章</h2></div><span>{badges.filter(([, , , status]) => status === "已解锁").length}</span></header><div>{badges.map(([src, name, target, status]) => <article key={name}><img src={src} alt={`${name}勋章`} /><div><b>{name}</b><small>{target}</small></div><em>{status}</em></article>)}</div></section><section className="ranking-objectives"><p className="panel-kicker">SEASON OBJECTIVES</p><h2>下一枚勋章</h2><div><span>取得 5 连胜</span><b>{meta.bestStreak} / 5</b></div><i><span style={{ width: `${Math.min(100, meta.bestStreak / 5 * 100)}%` }} /></i><small>{meta.bestStreak >= 5 ? "已达成，保持连胜冲击更高纪录。" : `再赢下 ${5 - meta.bestStreak} 场连续胜利，即可获得「连胜烈焰」勋章。`}</small></section></aside>
    </div>
  </section>;
}

export function CollectionView({ collection, arcaneDust, onDisenchant, onCraft }: { collection: Record<string, number>; arcaneDust: number; onDisenchant: (id: string) => void; onCraft: (id: string) => void }) {
  const [filter, setFilter] = useState<CardType | "全部">("全部");
  const [selected, setSelected] = useState<CardDef>(CARD_POOL[0]);
  const { playCardSelection, playCharacterVoice, playSfx } = useGameAudio();
  const cards = useMemo(() => CARD_POOL.filter((card) => filter === "全部" || card.type === filter), [filter]);
  const types = ["全部", ...new Set(CARD_POOL.map((card) => card.type))] as (CardType | "全部")[];
  const story = CHARACTER_STORIES[selected.id];
  const faction = getFaction(selected.type);
  const owned = collection[selected.id] ?? 0;
  const craftCost = DUST_TABLE[selected.rarity].craft;
  const disenchantValue = DUST_TABLE[selected.rarity].disenchant;
  const ownedTotal = Object.values(collection).reduce((sum, count) => sum + count, 0);
  const uniqueOwned = Object.keys(collection).filter((id) => (collection[id] ?? 0) > 0).length;
  const collectorLevel = Math.min(20, Math.floor(uniqueOwned / 6) + 1);
  const collectorNext = uniqueOwned % 6 === 0 ? 6 : 6 - (uniqueOwned % 6);
  const collectorTitle = collectorLevel >= 15 ? "拾遗宗师" : collectorLevel >= 10 ? "万卷藏家" : collectorLevel >= 5 ? "书阁学士" : "星门学徒";
  return (
    <section className="command-view collection-view">
      <header className="command-heading">
        <p className="eyebrow">XIANXIA ARCHIVE</p>
        <h1>图鉴收藏</h1>
        <span>已收录 {CARD_POOL.length} 张仙侠卡牌。选择一张卡牌查看阵营能力、人物关系与主线档案。</span>
      </header>
      <div className="collector-strip"><div><p className="panel-kicker">COLLECTOR RANK</p><b>{collectorTitle} · {collectorLevel} 阶</b><small>收集 {uniqueOwned} / {CARD_POOL.length} 张独特卡牌，再收 {collectorNext} 张晋升下一阶。</small></div><i><span style={{ width: `${Math.min(100, (uniqueOwned % 6) / 6 * 100)}%` }} /></i><em>{collectorLevel}</em></div>
      <div className="collection-toolbar">
        <div className="collection-tabs">{types.map((type) => <button className={filter === type ? "is-active" : ""} onClick={() => setFilter(type)} key={type}>{type}</button>)}</div>
        <div className="collection-balance"><span><i>◇</i> 尘晶 <b>{arcaneDust}</b></span><span>持有 {ownedTotal} / {CARD_POOL.length * MAX_CARD_COPIES} 张</span></div>
      </div>
      <div className="collection-layout">
        <div className="collection-grid">
          {cards.map((card) => {
            const count = collection[card.id] ?? 0;
            return <button className={selected.id === card.id ? "is-selected" : ""} data-card-selection="true" onClick={() => { playCardSelection(card.id); setSelected(card); }} key={card.id}><CardView def={card} compact /><em className={`collection-count ${count >= MAX_CARD_COPIES ? "is-max" : count > 0 ? "is-owned" : ""}`}>{count > 0 ? `×${count}` : "未拥有"}</em></button>;
          })}
        </div>
        <aside className="archive-inspector">
          <CardView def={selected} />
          <div>
            <p className="panel-kicker">ARCHIVE ENTRY</p>
            <h2>{selected.name}</h2>
            <span>{selected.type} · {selected.title}</span>
            <p>{selected.lore}</p>
            <section className="archive-character-profile" aria-label={`${selected.name}角色档案`}>
              <p className="panel-kicker">PERSONNEL FILE</p>
              <dl>
                <div><dt>性别</dt><dd>{story?.gender ?? "不详"}</dd></div>
                <div><dt>年龄</dt><dd>{story?.age || "无"}</dd></div>
                <div className="is-wide"><dt>性格</dt><dd>{story?.personality ?? "档案待补"}</dd></div>
                <div className="is-wide"><dt>过往经历</dt><dd>{story?.growthExperience ?? "档案待补"}</dd></div>
                <div className="is-wide"><dt>活动轨迹</dt><dd>{story?.trajectory ?? "档案待补"}</dd></div>
              </dl>
            </section>
            <div className="archive-voice-actions"><button onClick={() => playCharacterVoice(selected.id, "summon")}><span aria-hidden="true">▶</span> 登场语音</button><button onClick={() => playCharacterVoice(selected.id, "encounter")}><span aria-hidden="true">▶</span> 人物证词</button></div>
            <div className="archive-crafting"><span className={`craft-count ${owned >= MAX_CARD_COPIES ? "is-max" : ""}`}>持有 {owned} / {MAX_CARD_COPIES}</span><button className="btn btn-secondary" disabled={owned <= 0} onClick={() => { playSfx("cardSelect"); onDisenchant(selected.id); }}>分解 <small>+{disenchantValue} 尘晶</small></button><button className="btn btn-primary" disabled={owned >= MAX_CARD_COPIES || arcaneDust < craftCost} onClick={() => { playSfx("reward"); onCraft(selected.id); }}>合成 <small>{craftCost} 尘晶</small></button></div>
            <dl><dt>阵营口供</dt><dd>{faction.motto}</dd><dt>证词归档</dt><dd>{story?.chapter ?? "边境档案"}</dd><dt>身份</dt><dd>{story?.role ?? "尚待解密"}</dd><dt>供述关联</dt><dd>{story?.connection ?? "尚待解密"}</dd><dt>核心技能</dt><dd>{selected.skill.name}</dd></dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LegacyChronicleView({ cleared, onBattle }: { cleared: string[]; onBattle: (stage: CampaignStage) => void }) {
  const [selectedFaction, setSelectedFaction] = useState(FACTIONS[0].id);
  const { playVoice, playCharacterVoice, playSfx } = useGameAudio();
  const faction = getFaction(selectedFaction);
  const members = CARD_POOL.filter((card) => card.type === selectedFaction);
  return <section className="command-view chronicle-view">
    <header className="command-heading chronicle-heading"><div><p className="eyebrow">WORLD DOSSIER · ECLIPSE PROTOCOL</p><h1>仙侠编年史</h1><span>一场关于记忆、秩序与生存资格的战争。每张牌都是同一场日蚀中的证词。</span></div><div className="chronicle-campaign-progress"><small>战役推进</small><b>{cleared.length} / {CAMPAIGN_STAGES.length}</b><i><span style={{ width: `${cleared.length / CAMPAIGN_STAGES.length * 100}%` }} /></i></div></header>
    <section className="world-premise"><span className="world-mark">A</span><div><p className="panel-kicker">THE WORLD AFTER SILENCEFALL</p><h2>世界并未毁灭。它只是不再记得自己为什么要发光。</h2><p>{WORLD_PREMISE}</p><div className="traveler-mandate"><small>渊门旅者 · 玩家身份</small><p>{PLAYER_MANDATE}</p></div><button className="voice-command" onClick={() => playVoice("story/world-premise")}><span aria-hidden="true">▶</span> 播放世界序章</button></div></section>
    <section className="chronicle-section"><div className="section-label"><p className="panel-kicker">THE FIVE CLAIMS</p><h2>五个阵营，五种拯救世界的方法</h2></div><div className="faction-tabs chronicle-tabs" role="tablist">{FACTIONS.map((entry) => <button role="tab" aria-selected={selectedFaction === entry.id} className={selectedFaction === entry.id ? "is-active" : ""} key={entry.id} onClick={() => setSelectedFaction(entry.id)} style={{ "--faction-color": entry.color } as CSSProperties}><i>{entry.crest}</i>{entry.id}</button>)}</div>
      <article className="faction-dossier" style={{ "--faction-color": faction.color } as CSSProperties}><div className="dossier-emblem"><i>{faction.crest}</i><small>五方档案</small></div><div><p className="panel-kicker">{faction.motto}</p><h3>{faction.id} · {faction.leader}</h3><p>{faction.doctrine}</p><button className="voice-command" onClick={() => playVoice(FACTION_VOICE_KEYS[faction.id])}><span aria-hidden="true">▶</span> 播放阵营宣言</button></div><dl><dt>无法愈合的伤口</dt><dd>{faction.wound}</dd><dt>当前诉求</dt><dd>{faction.ambition}</dd></dl><div className="dossier-cast"><small>已登场人物</small>{members.map((member) => <span key={member.id} title={member.name} style={{ color: member.color }}>{member.icon}</span>)}</div></article>
    </section>
    <section className="chronicle-section story-arcs-section"><div className="section-label"><p className="panel-kicker">THE CAMPAIGN OF FIVE TRUTHS</p><h2>八个篇章，一场由所有卡牌人物共同推进的战争</h2></div><div className="story-arc-list">{STORY_ARCS.map((arc, index) => { const stage = CAMPAIGN_STAGES[index]; const clearedThisStage = cleared.includes(arc.id); const unlocked = stage ? isCampaignUnlocked(cleared, index) : false; return <article key={arc.id}><header><small>{arc.act}</small><button onClick={() => playVoice(`story/chapter-${String(index + 1).padStart(2, "0")}`)} aria-label={`播放${arc.title}篇章旁白`} title="播放篇章旁白">▶</button></header><h3>{arc.title}</h3><em>{arc.theme}</em><p>{arc.synopsis}</p><div className="arc-turn"><b>关键转折</b><span>{arc.turningPoint}</span></div><footer>{arc.cast.map((id) => { const card = CARD_BY_ID[id]; return card ? <span key={id} title={card.name} style={{ color: card.color }}>{card.icon}<small>{card.name}</small></span> : null; })}</footer>{stage ? <div className="arc-campaign"><div><small>{clearedThisStage ? "已收复此篇章" : `守关：${stage.commander} · ${stage.difficulty === "novice" ? "初阶" : stage.difficulty === "skilled" ? "进阶" : stage.difficulty === "expert" ? "专家" : "大师"}`}</small><b>奖励 {stage.rewardStarDust} 渊辉 + {stage.rewardDust} 尘晶</b></div><button disabled={!unlocked} onClick={() => { playSfx("cardSelect"); onBattle(stage); }}>{clearedThisStage ? "再战" : unlocked ? "出征 →" : "🔒 前置篇章未破"}</button></div> : null}</article>; })}</div></section>
    <section className="chronicle-section"><div className="section-label"><p className="panel-kicker">THE ECLIPSE RECORD</p><h2>从七门同盟到日蚀协议</h2></div><ol className="story-timeline">{CHRONICLE.map((entry, index) => <li key={entry.id}><span className="timeline-index">{String(index + 1).padStart(2, "0")}</span><div><small>{entry.era}</small><h3>{entry.title}</h3><p>{entry.summary}</p><details><summary>查看深层记录</summary><p><b>隐藏真相</b>{entry.revelation}</p><p><b>历史后果</b>{entry.consequence}</p></details><aside>{entry.participants.map((name) => <b key={name}>{name}</b>)}</aside></div><button className="timeline-voice" onClick={() => playVoice(`story/chronicle-${String(index + 1).padStart(2, "0")}`)} aria-label={`播放${entry.title}旁白`} title="播放旁白">▶</button></li>)}</ol></section>
    <section className="chronicle-section character-ledger"><div className="section-label"><p className="panel-kicker">LIVING TESTIMONIES</p><h2>人物不是棋子，他们各自持有一段真相</h2></div><div>{CARD_POOL.map((card) => { const story = CHARACTER_STORIES[card.id]; return <article key={card.id} style={{ "--character-color": card.color } as CSSProperties}><span>{card.icon}</span><div><small>{story.chapter}</small><h3>{card.name}</h3><p>{story.role}</p><em>{story.connection}</em></div><button className="testimony-voice" onClick={() => playCharacterVoice(card.id, "encounter")} aria-label={`播放${card.name}证词`} title="播放人物证词">▶</button></article>; })}</div></section>
  </section>;
}

const DIFFICULTY_LABEL = {
  novice: "初阶",
  skilled: "进阶",
  expert: "专家",
  master: "大师",
} as const;

export function ChronicleView({ cleared, onBattle }: { cleared: string[]; onBattle: (stage: CampaignStage) => void }) {
  const [selectedArcId, setSelectedArcId] = useState(STORY_ARCS[0].id);
  const [selectedFaction, setSelectedFaction] = useState(FACTIONS[0].id);
  const [selectedWitnessId, setSelectedWitnessId] = useState<string | null>(null);
  const [selectedArchiveId, setSelectedArchiveId] = useState(ARCHIVE_ARTICLES[0].id);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const { playVoice, playCharacterVoice, playSfx } = useGameAudio();
  const selectedIndex = Math.max(0, STORY_ARCS.findIndex((arc) => arc.id === selectedArcId));
  const arc = STORY_ARCS[selectedIndex];
  const stage = CAMPAIGN_STAGES[selectedIndex];
  const faction = getFaction(selectedFaction);
  const featuredCast = arc.cast.map((id) => CARD_BY_ID[id]).filter((card): card is CardDef => Boolean(card));
  const selectedWitness = featuredCast.find((card) => card.id === selectedWitnessId) ?? featuredCast[0];
  const selectedWitnessStory = selectedWitness ? CHARACTER_STORIES[selectedWitness.id] : undefined;
  const isCleared = cleared.includes(arc.id);
  const isUnlocked = isCampaignUnlocked(cleared, selectedIndex);
  const progress = Math.round(cleared.length / CAMPAIGN_STAGES.length * 100);
  const nextIndex = CAMPAIGN_STAGES.findIndex((entry) => !cleared.includes(entry.arcId));
  const nextStage = CAMPAIGN_STAGES[nextIndex === -1 ? CAMPAIGN_STAGES.length - 1 : nextIndex];
  const selectedArchive = ARCHIVE_ARTICLES.find((entry) => entry.id === selectedArchiveId) ?? ARCHIVE_ARTICLES[0];
  const articlePeople = selectedArchive.people.map((id) => ARCHIVE_PEOPLE.find((person) => person.id === id)).filter((person): person is (typeof ARCHIVE_PEOPLE)[number] => Boolean(person));
  const selectedPerson = ARCHIVE_PEOPLE.find((person) => person.id === selectedPersonId) ?? null;

  return <section className="command-view chronicle-view chronicle-archive">
    <header className="chronicle-archive-header">
      <div>
        <p className="eyebrow">XIANXIA ARCHIVE · CASE 07</p>
        <h1>仙侠编年史</h1>
        <p>第七天门的证词从不完整。把每一页放回它该在的位置，才能决定下一场仗该为谁而打。</p>
      </div>
      <aside className="archive-case-status" aria-label="战役进度">
        <small>已归档篇章</small><b>{String(cleared.length).padStart(2, "0")} <i>/ {String(CAMPAIGN_STAGES.length).padStart(2, "0")}</i></b>
        <div><span style={{ width: `${progress}%` }} /></div><em>{progress}% 已核验</em>
      </aside>
    </header>

    <section className="chronicle-briefing">
      <div className="briefing-seal">VII</div>
      <div><p className="panel-kicker">TRAVELER'S MANDATE</p><h2>你不是被选中的人。你是还没有被谁写进结论的人。</h2><p>{PLAYER_MANDATE}</p></div>
      <div className="briefing-action"><small>下一份待核验档案</small><b>{nextStage.act} · {nextStage.title}</b><button className="voice-command" onClick={() => playVoice("story/world-premise")}><span aria-hidden="true">▶</span> 听取序言</button></div>
    </section>

    <section className="chronicle-casebook" aria-label="主线篇章">
      <header><div><p className="panel-kicker">CASE INDEX</p><h2>主线档案</h2></div><span>选择一份档案，查看交战许可与当事人证词。</span></header>
      <nav className="arc-index" aria-label="篇章目录">
        {STORY_ARCS.map((entry, index) => {
          const complete = cleared.includes(entry.id);
          const available = isCampaignUnlocked(cleared, index);
          return <button key={entry.id} className={`${selectedArcId === entry.id ? "is-active" : ""} ${complete ? "is-cleared" : ""}`} onClick={() => setSelectedArcId(entry.id)} aria-current={selectedArcId === entry.id ? "step" : undefined}>
            <b>{String(index + 1).padStart(2, "0")}</b><span><small>{entry.act}</small><strong>{entry.title}</strong></span><i aria-label={complete ? "已完成" : available ? "可出征" : "尚未解锁"}>{complete ? "✓" : available ? "◆" : "·"}</i>
          </button>;
        })}
      </nav>

      <article className="active-case" style={{ "--case-color": FACTIONS.find((entry) => entry.id === arc.factions[0])?.color ?? "#d7b16b" } as CSSProperties}>
        <div className="active-case-marker"><small>{arc.act}</small><b>{String(selectedIndex + 1).padStart(2, "0")}</b><span>{isCleared ? "已核验" : isUnlocked ? "待出征" : "封存"}</span></div>
        <div className="active-case-story"><p className="panel-kicker">{arc.theme}</p><h2>{arc.title}</h2><p>{arc.synopsis}</p><blockquote><b>关键转折</b>{arc.turningPoint}</blockquote><div className="case-factions">{arc.factions.map((id) => { const entry = getFaction(id); return <button key={id} onClick={() => setSelectedFaction(id)} style={{ "--faction-color": entry.color } as CSSProperties}><i>{entry.crest}</i>{id}</button>; })}</div></div>
        <aside className="engagement-order"><div><small>守关人</small><b>{stage.commander}</b><span>{stage.commanderTitle}</span></div><div><small>交战难度</small><b>{DIFFICULTY_LABEL[stage.difficulty]}</b><span>奖励 {stage.rewardStarDust} 渊辉 · {stage.rewardDust} 尘晶</span></div><div className="engagement-actions"><button className="icon-command" onClick={() => playVoice(`story/chapter-${String(selectedIndex + 1).padStart(2, "0")}`)} aria-label={`播放${arc.title}旁白`} title="播放篇章旁白">▶</button><button disabled={!isUnlocked} onClick={() => { playSfx("cardSelect"); onBattle(stage); }}>{isCleared ? "再次出征" : isUnlocked ? "签发出征令" : "等待前章核验"}</button></div></aside>
      </article>
    </section>

    <section className="chronicle-evidence-grid">
      <article className="faction-evidence" style={{ "--faction-color": faction.color } as CSSProperties}>
        <header><div><i>{faction.crest}</i><span><small>阵营定位</small><b>{faction.id}</b></span></div><button className="icon-command" onClick={() => playVoice(FACTION_VOICE_KEYS[faction.id])} aria-label={`播放${faction.id}阵营宣言`} title="播放阵营宣言">▶</button></header>
        <p className="faction-motto">{faction.motto}</p><p>{faction.doctrine}</p><dl><div><dt>未愈伤口</dt><dd>{faction.wound}</dd></div><div><dt>当前诉求</dt><dd>{faction.ambition}</dd></div></dl>
      </article>
      <article className="case-witnesses"><header><p className="panel-kicker">WITNESS ROSTER</p><h2>本章当事人</h2></header><div>{featuredCast.map((card) => { const story = CHARACTER_STORIES[card.id]; return <button key={card.id} onClick={() => { setSelectedWitnessId(card.id); playCharacterVoice(card.id, "encounter"); }} aria-pressed={selectedWitness?.id === card.id} style={{ "--character-color": card.color } as CSSProperties} title={`查阅${card.name}档案并播放证词`}><i>{card.icon}</i><span><small>{story?.chapter ?? "边境档案"}</small><b>{card.name}</b><em>{story?.role ?? card.title}</em></span><strong>▶</strong></button>; })}</div></article>
    </section>

    {selectedWitness && selectedWitnessStory ? <section className="chronicle-witness-record" style={{ "--character-color": selectedWitness.color } as CSSProperties} aria-label={`${selectedWitness.name}人物档案`}>
      <header><div><i>{selectedWitness.icon}</i><span><p className="panel-kicker">WITNESS DOSSIER</p><h2>{selectedWitness.name}</h2><p>{selectedWitnessStory.role}</p></span></div><button className="icon-command" onClick={() => playCharacterVoice(selectedWitness.id, "encounter")} aria-label={`播放${selectedWitness.name}证词`} title="播放证词">▶</button></header>
      <dl><div><dt>身份</dt><dd>{selectedWitnessStory.role}</dd></div><div><dt>性别</dt><dd>{selectedWitnessStory.gender}</dd></div><div><dt>年龄</dt><dd>{selectedWitnessStory.age}</dd></div><div><dt>性格</dt><dd>{selectedWitnessStory.personality}</dd></div><div><dt>过往经历</dt><dd>{selectedWitnessStory.growthExperience}</dd></div><div><dt>活动轨迹</dt><dd>{selectedWitnessStory.trajectory}</dd></div></dl>
    </section> : null}

    <section className="chronicle-journal" aria-label="扩展编年文章">
      <header><div><p className="panel-kicker">EXPANDED FIELD JOURNAL</p><h2>第七天门文库</h2></div><span>{ARCHIVE_ARTICLES.length} 篇事件文章 · {ARCHIVE_PEOPLE.filter((person) => person.gender === "女").length} 位女性当事人</span></header>
      <div className="journal-layout">
        <nav className="journal-index" aria-label="事件文章目录">{ARCHIVE_ARTICLES.map((entry) => <button key={entry.id} className={entry.id === selectedArchive.id ? "is-active" : ""} onClick={() => setSelectedArchiveId(entry.id)} aria-pressed={entry.id === selectedArchive.id}><b>{entry.sequence}</b><span><small>{entry.classification}</small><strong>{entry.title}</strong></span></button>)}</nav>
        <article className="journal-article">
          <header><div><p className="panel-kicker">{selectedArchive.classification}</p><h3>{selectedArchive.title}</h3><small>{selectedArchive.era}</small></div><b>{selectedArchive.sequence}</b></header>
          <p className="journal-lede">{selectedArchive.summary}</p><p>{selectedArchive.body}</p><blockquote><b>卷末附注</b>{selectedArchive.appendix}</blockquote>
          <footer><span>{selectedArchive.factions.map((id) => <em key={id} style={{ "--faction-color": getFaction(id).color } as CSSProperties}>{getFaction(id).crest} {id}</em>)}</span><div>{articlePeople.map((person) => <button key={person.id} onClick={() => setSelectedPersonId(person.id)} style={{ "--person-color": person.color } as CSSProperties} title={`查看${person.name}人物档案`}><i>{person.monogram}</i><b>{person.name}</b></button>)}</div></footer>
        </article>
      </div>
    </section>

    <section className="chronicle-personnel" aria-label="人物情报册">
      <header><div><p className="panel-kicker">PERSONNEL DOSSIERS</p><h2>人物情报册</h2></div><span>色块肖像为临时占位，后续可替换为人物立绘。</span></header>
      <div className="personnel-grid">{ARCHIVE_PEOPLE.map((person) => <button className="personnel-card" key={person.id} onClick={() => setSelectedPersonId(person.id)} style={{ "--person-color": person.color } as CSSProperties} aria-label={`查看${person.name}的人物档案`}><span className="archive-person-portrait"><i>{person.monogram}</i><small>PERSONNEL</small></span><span><em>{person.faction} · {person.title}</em><b>{person.name}</b><small>{person.gender} · {person.age}</small></span><strong>查看档案</strong></button>)}</div>
    </section>

    <section className="chronicle-records"><header><div><p className="panel-kicker">SEALED HISTORY</p><h2>封存纪录</h2></div><span>所有历史均来自相互矛盾的供述；展开后方可读取原始记录。</span></header><div>{CHRONICLE.map((entry, index) => <details key={entry.id}><summary><span>{String(index + 1).padStart(2, "0")}</span><div><small>{entry.era}</small><b>{entry.title}</b><p>{entry.summary}</p></div><i>⌄</i></summary><article><p>{entry.detail}</p><dl><div><dt>隐藏真相</dt><dd>{entry.revelation}</dd></div><div><dt>历史后果</dt><dd>{entry.consequence}</dd></div></dl><footer><em>{entry.verse}</em><span>{entry.participants.map((name) => <b key={name}>{name}</b>)}</span><button className="icon-command" onClick={() => playVoice(`story/chronicle-${String(index + 1).padStart(2, "0")}`)} aria-label={`播放${entry.title}旁白`} title="播放旁白">▶</button></footer></article></details>)}</div>
    </section>

    {selectedPerson ? <div className="personnel-modal-backdrop" role="presentation" onMouseDown={() => setSelectedPersonId(null)}><section className="personnel-modal" role="dialog" aria-modal="true" aria-labelledby="personnel-modal-title" onMouseDown={(event) => event.stopPropagation()} style={{ "--person-color": selectedPerson.color } as CSSProperties}><button className="personnel-modal-close" onClick={() => setSelectedPersonId(null)} aria-label="关闭人物档案" title="关闭">×</button><header><span className="archive-person-portrait">{CHARACTER_ART[selectedPerson.id] ? <img src={CHARACTER_ART[selectedPerson.id]} alt={`${selectedPerson.name}立绘`} /> : <i>{selectedPerson.monogram}</i>}<small>PERSONNEL</small></span><div><p className="panel-kicker">{selectedPerson.faction} · 人物档案</p><h2 id="personnel-modal-title">{selectedPerson.name}</h2><p>{selectedPerson.title}</p></div></header><p className="personnel-biography">{selectedPerson.biography}</p><dl><div><dt>性别</dt><dd>{selectedPerson.gender}</dd></div><div><dt>年龄</dt><dd>{selectedPerson.age}</dd></div><div className="is-wide"><dt>性格</dt><dd>{selectedPerson.personality}</dd></div>{selectedPerson.attributes.map((attribute) => <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>)}<div className="is-wide"><dt>爱好</dt><dd>{selectedPerson.hobbies.join(" · ")}</dd></div></dl></section></div> : null}
  </section>;
}
