import type { CSSProperties } from "react";
import { useGameAudio } from "../audio/AudioProvider";
import { ACCENT_OPTIONS, useTheme } from "../theme/Theme";
import { useState, type KeyboardEvent } from "react";
import type { AiDifficulty, GameShortcuts } from "../types";
import { seasonRank, xpToNextLevel, type MetaSave } from "../game/meta";

interface Props {
  meta: MetaSave;
  aiDifficulty: AiDifficulty;
  setAiDifficulty: (difficulty: AiDifficulty) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
  highIntensityEffects: boolean;
  setHighIntensityEffects: (value: boolean) => void;
  shortcuts: GameShortcuts;
  setShortcuts: (shortcuts: GameShortcuts) => void;
}

const AI_LEVELS: Array<{ id: AiDifficulty; name: string; detail: string }> = [
  { id: "novice", name: "新手", detail: "熟悉卡牌与基础操作" },
  { id: "skilled", name: "高手", detail: "稳定施压核心" },
  { id: "expert", name: "专家", detail: "分析场面交换" },
  { id: "master", name: "大师", detail: "执行高强度战术" },
];

const RANKS = [
  { name: "星门旅者", score: "0", mark: "I" },
  { name: "星门先锋", score: "400", mark: "II" },
  { name: "裂隙功勋", score: "1000", mark: "III" },
  { name: "日蚀冠冕", score: "1500", mark: "IV" },
];

const DEFAULT_SHORTCUTS: GameShortcuts = { endTurn: " ", cancelSelection: "Escape" };

function shortcutLabel(key: string) {
  return key === " " ? "Space" : key === "Escape" ? "Esc" : key;
}

export default function SettingsView({ meta, aiDifficulty, setAiDifficulty, reduceMotion, setReduceMotion, highIntensityEffects, setHighIntensityEffects, shortcuts, setShortcuts }: Props) {
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { muted, musicVolume, sfxVolume, voiceVolume, setMuted, setMusicVolume, setSfxVolume, setVoiceVolume } = useGameAudio();
  const [capturing, setCapturing] = useState<keyof GameShortcuts | null>(null);
  const rankInfo = seasonRank(meta.seasonPoints);
  const rankIndex = RANKS.findIndex((entry) => entry.name === rankInfo.title);
  const pointsToNext = Math.max(0, rankInfo.to - meta.seasonPoints);
  const winRate = meta.wins + meta.losses ? Math.round(meta.wins / (meta.wins + meta.losses) * 100) : 0;
  const level = meta.commanderLevel;
  const levelXp = xpToNextLevel(level);
  const levelProgress = level >= 100 ? 100 : Math.min(100, meta.commanderXp / levelXp * 100);
  const setShortcut = (id: keyof GameShortcuts) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!capturing || event.key === "Tab") return;
    event.preventDefault();
    if (event.key === "Escape") setCapturing(null);
    else { setShortcuts({ ...shortcuts, [id]: event.key }); setCapturing(null); }
  };

  return <section className="command-view settings-view">
    <header className="command-heading settings-heading"><p className="eyebrow">COMMANDER PROFILE · SYSTEM SETTINGS</p><h1>游戏设置</h1><span>管理你的指挥官档案、赛季段位与本地对战偏好。</span></header>

    <section className="rank-overview" aria-labelledby="rank-title">
      <div className="rank-current"><span className="rank-insignia">{RANKS[rankIndex]?.mark ?? "I"}</span><div><p className="panel-kicker">CURRENT SEASON RANK</p><h2 id="rank-title">{rankInfo.title}</h2><span>第 01 赛季 · 日蚀协议</span></div></div>
      <div className="rank-score"><b>{meta.seasonPoints.toLocaleString()}</b><span>赛季积分</span><small>{pointsToNext > 0 ? `距「${rankInfo.next}」还需 ${pointsToNext} 分` : "已达当前赛季最高段位"}</small></div>
      <div className="rank-record"><span><b>{meta.wins}</b><small>胜场</small></span><span><b>{meta.losses}</b><small>负场</small></span><span><b>{winRate}%</b><small>胜率</small></span></div>
      <div className="rank-meter"><span style={{ width: `${Math.min(100, rankInfo.progress)}%` }} /><small>{rankInfo.from.toLocaleString()}</small><small>{rankInfo.to.toLocaleString()}</small></div>
    </section>

    <section className="settings-section rank-system"><div className="settings-section-heading"><div><p className="panel-kicker">RANK PROGRESSION</p><h2>赛季段位体系</h2></div><span>胜利获得积分，失败扣除积分；达到门槛后晋升。</span></div><div className="rank-track">{RANKS.map((rank, index) => <article className={index === rankIndex ? "is-current" : index < rankIndex ? "is-unlocked" : ""} key={rank.name}><i>{rank.mark}</i><b>{rank.name}</b><small>{rank.score} 分</small></article>)}</div></section>

    <div className="settings-grid">
      <section className="settings-section match-settings"><div className="settings-section-heading"><div><p className="panel-kicker">MATCH PREFERENCES</p><h2>对战设置</h2></div><span>快速交战的默认 AI 难度</span></div><div className="difficulty-setting" role="radiogroup" aria-label="默认 AI 难度">{AI_LEVELS.map((level) => <button key={level.id} role="radio" aria-checked={aiDifficulty === level.id} className={aiDifficulty === level.id ? "is-selected" : ""} onClick={() => setAiDifficulty(level.id)}><b>{level.name}</b><small>{level.detail}</small></button>)}</div><label className="setting-toggle"><span><b>减少动态效果</b><small>降低界面位移与卡牌动画强度。</small></span><input type="checkbox" checked={reduceMotion} onChange={(event) => setReduceMotion(event.target.checked)} /><i aria-hidden="true" /></label><label className="setting-toggle"><span><b>高强度特效</b><small>关闭后保留目标、伤害与规则反馈，压缩 Bloom、粒子和屏幕效果。</small></span><input type="checkbox" checked={highIntensityEffects} onChange={(event) => setHighIntensityEffects(event.target.checked)} /><i aria-hidden="true" /></label></section>

      <section className="settings-section appearance-settings"><div className="settings-section-heading"><div><p className="panel-kicker">INTERFACE APPEARANCE</p><h2>界面外观</h2></div><span>主题与强调色会自动保存</span></div><div className="setting-row"><div><b>界面模式</b><small>调整战场与控制台的明暗对比。</small></div><div className="setting-segmented" role="radiogroup" aria-label="界面模式"><button role="radio" aria-checked={theme === "dark"} className={theme === "dark" ? "is-active" : ""} onClick={() => setTheme("dark")}>深色</button><button role="radio" aria-checked={theme === "light"} className={theme === "light" ? "is-active" : ""} onClick={() => setTheme("light")}>明亮</button></div></div><div className="setting-row accent-row"><div><b>强调色</b><small>用于按钮、可操作单位与进度提示。</small></div><div className="settings-swatches" aria-label="强调色">{ACCENT_OPTIONS.map((option) => <button key={option.name} className={accent === option.name ? "is-active" : ""} style={{ "--setting-swatch": option.color } as CSSProperties} onClick={() => setAccent(option.name)} aria-label={`使用${option.label}色调`} aria-pressed={accent === option.name}><i /></button>)}</div></div></section>

      <section className="settings-section audio-settings"><div className="settings-section-heading"><div><p className="panel-kicker">AUDIO CALIBRATION</p><h2>声音设置</h2></div><button className="settings-mute" onClick={() => setMuted(!muted)} aria-pressed={muted}>{muted ? "声音已静音" : "声音已启用"}</button></div><label className="volume-setting"><span><b>背景音乐</b><output>{Math.round(musicVolume * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} aria-label="背景音乐音量" /></label><label className="volume-setting"><span><b>战斗音效</b><output>{Math.round(sfxVolume * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value={sfxVolume} onChange={(event) => setSfxVolume(Number(event.target.value))} aria-label="战斗音效音量" /></label><label className="volume-setting"><span><b>角色与故事语音</b><output>{Math.round(voiceVolume * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value={voiceVolume} onChange={(event) => setVoiceVolume(Number(event.target.value))} aria-label="角色与故事语音音量" /></label></section>

      <section className="settings-section shortcut-settings"><div className="settings-section-heading"><div><p className="panel-kicker">KEYBOARD & CONTROLS</p><h2>快捷键与操作</h2></div><button className="settings-reset" onClick={() => { setShortcuts(DEFAULT_SHORTCUTS); setCapturing(null); }}>恢复默认</button></div><div className="shortcut-list"><div className="shortcut-row"><span><b>结束回合</b><small>在己方回合内结束当前行动。</small></span><button className={capturing === "endTurn" ? "is-capturing" : ""} onClick={() => setCapturing("endTurn")} onKeyDown={setShortcut("endTurn")} aria-label="设置结束回合快捷键">{capturing === "endTurn" ? "按下按键" : shortcutLabel(shortcuts.endTurn)}</button></div><div className="shortcut-row"><span><b>取消选择</b><small>取消已选择的单位或目标。</small></span><button className={capturing === "cancelSelection" ? "is-capturing" : ""} onClick={() => setCapturing("cancelSelection")} onKeyDown={setShortcut("cancelSelection")} aria-label="设置取消选择快捷键">{capturing === "cancelSelection" ? "按下按键" : shortcutLabel(shortcuts.cancelSelection)}</button></div><div className="shortcut-row is-reference"><span><b>战术操作</b><small>切换可攻击单位 / 确认目标 / 使用手牌。</small></span><div className="shortcut-reference"><kbd>Tab</kbd><kbd>Enter</kbd><kbd>1 - 0</kbd></div></div></div></section>

      <section className="settings-section level-settings"><div className="settings-section-heading"><div><p className="panel-kicker">COMMANDER LEVEL</p><h2>指挥官等级</h2></div><span>Lv. {level}</span></div><div className="commander-level"><span className="level-number">{level}</span><div><b>{meta.commander?.faction ?? rankInfo.title} · 指挥官档案</b><small>{level >= 100 ? "已达到百级。荣誉经验系统将在后续更新开放。" : "战役、每日指令与勋章节点均会积累指挥官经验。"}</small><div><i style={{ width: `${levelProgress}%` }} /><span>{level >= 100 ? "等级上限" : `${meta.commanderXp} / ${levelXp} XP`}</span></div></div></div></section>
    </div>
  </section>;
}
