import type { MetaSave } from "../game/meta";
import { xpToNextLevel } from "../game/meta";
import { COSMETIC_ITEMS, ownedCosmetics } from "../data/cosmetics";

interface Props { meta: MetaSave; onBack: () => void; }

const BADGE_DETAILS = {
  "stargate-pioneer": { name: "星门初行者", target: 3, asset: "/assets/badges/stargate-pioneer.png", detail: "完成教学与前线首胜，留下第一道航迹。" },
  "rift-vanguard": { name: "裂隙先锋", target: 75, asset: "/assets/badges/rift-vanguard.png", detail: "指挥官等级达到 25、50、75 时进阶。" },
  "eclipse-crown": { name: "日蚀冠冕", target: 2600, asset: "/assets/badges/eclipse-crown.png", detail: "赛季积分达到 800、1600、2600 时进阶。" },
} as const;

export default function CommanderProfile({ meta, onBack }: Props) {
  const commander = meta.commander;
  if (!commander) return <section className="command-view commander-profile-view"><header className="commander-profile-header"><button className="profile-back" onClick={onBack} aria-label="返回指挥室">←</button><div><p className="eyebrow">COMMANDER ARCHIVE</p><h1>档案未建立</h1><span>请先完成指挥官登记。</span></div></header></section>;
  const level = meta.commanderLevel;
  const levelCap = level >= 100;
  const requiredXp = xpToNextLevel(level);
  const progress = levelCap ? 100 : Math.min(100, Math.round(meta.commanderXp / requiredXp * 100));
  const badges = Object.entries(BADGE_DETAILS).map(([id, detail]) => ({ id: id as keyof typeof BADGE_DETAILS, detail, state: meta.badges.find((badge) => badge.id === id) }));
  const owned = ownedCosmetics(meta.ownedShopItems);
  const ownedIds = new Set(owned.map((item) => item.id));
  return <section className="command-view commander-profile-view">
    <header className="commander-profile-header"><button className="profile-back" onClick={onBack} aria-label="返回指挥室">←</button><div><p className="eyebrow">COMMANDER ARCHIVE · CLOUD SYNC</p><h1>{commander.name}<small>{commander.id}</small></h1><span>{commander.faction}起源档案 · 联网时自动同步 · 离线进度将于网络恢复后上传</span></div><div className="profile-rank"><small>指挥官等级</small><b>LV. {level}</b></div></header>
    <section className="commander-level-panel"><div className="level-glyph">{level}</div><div className="level-progress"><div><span>{levelCap ? "已达到等级上限" : `距 Lv. ${level + 1}`}</span><b>{levelCap ? "荣誉经验即将开放" : `${meta.commanderXp} / ${requiredXp} XP`}</b></div><i><em style={{ width: `${progress}%` }} /></i><small>{levelCap ? "百级冠冕已取得。后续版本将开放荣誉经验与陈列奖励。" : "完成战役、每日指令与勋章节点均可获得指挥官经验。"}</small></div><aside><p>下一等级奖励</p><b>{level < 5 ? "星辉补给" : level % 10 === 9 ? "等级节点补给匣" : "尘晶与星辉"}</b><span>{level < 100 ? `Lv. ${level + 1}` : "百级完成"}</span></aside></section>
    <section className="profile-unlocks"><header><p className="panel-kicker">COMMAND PROGRESSION</p><h2>成长节点</h2></header><div>{[1, 5, 10, 15, 20, 30, 50, 75, 100].map((entry) => <article className={level >= entry ? "is-unlocked" : ""} key={entry}><i>{entry}</i><b>{entry === 1 ? "初临星门" : entry === 5 ? "构筑开放" : entry === 15 ? "勋章陈列" : entry === 30 ? "竞技席位" : entry === 50 ? "裂隙先锋" : entry === 100 ? "百级巡天" : "星门补给"}</b><small>{level >= entry ? "已解锁" : "尚未抵达"}</small></article>)}</div></section>
    <section className="badge-archive"><header><div><p className="panel-kicker">BADGE ARCHIVE</p><h2>勋章陈列</h2></div><span>{meta.badges.filter((badge) => badge.level > 0).length} / {badges.length} 已启封</span></header><div className="badge-grid">{badges.map(({ id, detail, state }) => { const levelLabel = state?.level ?? 0; const progressValue = Math.min(100, Math.round((state?.progress ?? 0) / detail.target * 100)); return <article className={levelLabel > 0 ? "is-unlocked" : ""} key={id}><img src={detail.asset} alt="" /><div><p><b>{detail.name}</b><span>{levelLabel > 0 ? `第 ${levelLabel} 阶` : "未启封"}</span></p><small>{detail.detail}</small><i><em style={{ width: `${progressValue}%` }} /></i></div></article>; })}</div></section>
    <section className="badge-archive cosmetic-archive"><header><div><p className="panel-kicker">COSMETIC ARCHIVE</p><h2>外观陈列</h2></div><span>{owned.length} / {COSMETIC_ITEMS.length} 已拥有</span></header><div className="badge-grid">{COSMETIC_ITEMS.map((item) => <article className={ownedIds.has(item.id) ? "is-unlocked" : ""} key={item.id}><i aria-hidden="true" style={{ fontSize: 28, color: ownedIds.has(item.id) ? "#f0cf7d" : undefined }}>{item.icon}</i><div><p><b>{item.label}</b><span>{ownedIds.has(item.id) ? "已拥有" : "未拥有"}</span></p><small>{item.desc}</small></div></article>)}</div><small className="cosmetic-note">已拥有的称号与星环会展示在顶部名牌；称号同时显示在本地排行榜。</small></section>
  </section>;
}
