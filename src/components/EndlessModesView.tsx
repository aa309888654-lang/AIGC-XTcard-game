import { useEffect, useMemo, useState } from "react";
import type { AiDifficulty } from "../types";
import { CARD_MAP, CARD_POOL } from "../data/cards";
import {
  TOWER_BUFFS, buildTowerFloor, towerRewardForFloor, towerSeedForFloor, setupTowerState,
  TOWER_MAX_FLOORS, TOWER_SAVE_KEY, type TowerBuffId, type TowerRun,
  buildDailyChallenge, dailyChallengeSeed, DAILY_SAVE_KEY, type DailyChallenge,
  rollDraftOptions, DRAFT_PICKS, DRAFT_MAX_WINS, DRAFT_SAVE_KEY, draftReward, type DraftRun,
} from "../data/tower";
import { useGameAudio } from "../audio/AudioProvider";
import CardView from "./CardView";
import { DEFAULT_DECK, type MetaSave } from "../game/meta";
import { RULES } from "../game/rules";
import type { BattleScenario, BattleResultSummary } from "./Battle";

interface Props {
  meta: MetaSave;
  deck: string[];
  onReward: (reward: number) => void;
  onBattle: (deck: string[], difficulty: AiDifficulty, onResult: (won: boolean, summary?: BattleResultSummary) => void, onExit: () => void, label: string, scenario?: BattleScenario | null) => void;
}

type SubView = "index" | "tower" | "daily" | "draft";

function loadTowerRun(): TowerRun {
  try {
    const raw = JSON.parse(localStorage.getItem(TOWER_SAVE_KEY) ?? "null");
    if (raw && typeof raw.floor === "number") return { floor: raw.floor, buffs: raw.buffs ?? [], rewards: raw.rewards ?? 0, bestFloor: raw.bestFloor ?? 0, hp: typeof raw.hp === "number" ? raw.hp : 0 };
  } catch { /* ignore */ }
  return { floor: 1, buffs: [], rewards: 0, bestFloor: 0, hp: 0 };
}

function loadDaily(): { dateKey: string; cleared: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_SAVE_KEY) ?? "null");
    if (raw && typeof raw.dateKey === "string") return raw;
  } catch { /* ignore */ }
  return { dateKey: "", cleared: false };
}

function loadDraft(): DraftRun {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_SAVE_KEY) ?? "null");
    if (raw && Array.isArray(raw.picks)) return { picks: raw.picks, rewards: raw.rewards ?? 0, wins: raw.wins ?? 0, losses: raw.losses ?? 0 };
  } catch { /* ignore */ }
  return { picks: [], rewards: 0, wins: 0, losses: 0 };
}

export default function EndlessModesView({ meta, deck, onReward, onBattle }: Props) {
  const [view, setView] = useState<SubView>("index");
  const [towerRun, setTowerRun] = useState<TowerRun>(loadTowerRun);
  const [daily, setDaily] = useState<{ dateKey: string; cleared: boolean }>(loadDaily);
  const [draftRun, setDraftRun] = useState<DraftRun>(loadDraft);
  const [showGuide, setShowGuide] = useState(false);
  const { playSfx } = useGameAudio();

  const dailyChallenge = useMemo(() => buildDailyChallenge(), []);
  const dailyFresh = daily.dateKey !== dailyChallenge.dateKey;

  useEffect(() => {
    if (dailyFresh) setDaily({ dateKey: "", cleared: false });
  }, [dailyFresh]);

  if (view === "tower") {
    return <TowerView
      run={towerRun}
      deck={deck}
      onRunChange={setTowerRun}
      onReward={onReward}
      onBack={() => setView("index")}
      onBattle={onBattle}
    />;
  }
  if (view === "daily") {
    return <DailyView
      challenge={dailyChallenge}
      deck={deck}
      cleared={daily.cleared}
      onCleared={() => { setDaily({ dateKey: dailyChallenge.dateKey, cleared: true }); playSfx("reward"); }}
      onReward={onReward}
      onBack={() => setView("index")}
      onBattle={onBattle}
    />;
  }
  if (view === "draft") {
    return <DraftView
      run={draftRun}
      onRunChange={setDraftRun}
      onReward={onReward}
      onBack={() => setView("index")}
      onBattle={onBattle}
    />;
  }

  return <section className="command-view endless-view">
    <header className="command-heading"><p className="eyebrow">ENDLESS & CHALLENGES</p><h1>试炼之地</h1><span>无尽爬塔考验你的构筑极限，每日挑战考验应变，竞技场轮抽考验眼光——三种活法，三种证词。</span></header>
    <div className="endless-grid">
      <button className="endless-card is-tower" onClick={() => setView("tower")}>
        <span className="endless-icon" aria-hidden="true">塔</span>
        <b>无尽爬塔</b>
        <small>用当前卡组逐层深入云霄山脉，核心生命跨层延续，Boss 层守关。胜利获得增益，最多 15 层。</small>
        <em>{towerRun.floor > 1 ? `当前第 ${towerRun.floor} 层 · 最佳 ${towerRun.bestFloor}` : "尚未开始"}</em>
      </button>
      <button className="endless-card is-daily" onClick={() => setView("daily")}>
        <span className="endless-icon" aria-hidden="true">日</span>
        <b>每日挑战</b>
        <small>每天一套固定敌阵，种子由日期决定，全服同一道题。</small>
        <em>{dailyFresh ? "今日未挑战" : daily.cleared ? "今日已通关" : "进行中"}</em>
      </button>
      <button className="endless-card is-draft" onClick={() => setView("draft")}>
        <span className="endless-icon" aria-hidden="true">抽</span>
        <b>竞技场轮抽</b>
        <small>12 轮三选一构筑临时卡组，胜场越多奖励越厚，两败出局。</small>
        <em>{draftRun.picks.length ? `已选 ${draftRun.picks.length}/${DRAFT_PICKS} · ${draftRun.wins} 胜 ${draftRun.losses} 败` : "尚未开始"}</em>
      </button>
    </div>
    <div className="endless-return"><button className="btn btn-secondary" onClick={() => setShowGuide(true)}>试炼说明</button></div>
    {showGuide ? <div className="battle-mulligan-backdrop" role="presentation" onMouseDown={() => setShowGuide(false)}><section className="battle-mulligan" role="dialog" aria-modal="true" aria-labelledby="endless-guide-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><p className="eyebrow">ENDLESS GUIDE</p><h2 id="endless-guide-title">试炼说明</h2><span>三种玩法的规则一览。</span></header>
      <div className="draft-summary endless-guide">
        <div><small>无尽爬塔</small><b>15 层</b></div>
        <div><small>每日挑战</small><b>每日一题</b></div>
        <div><small>竞技场轮抽</small><b>两败出局</b></div>
      </div>
      <div className="mission-list endless-guide-detail">
        <article><b>无尽爬塔</b><p>用你当前构筑的卡组逐层挑战固定敌阵，核心生命跨层延续；每过一层从三项增益中择一（「擢选」改为四选一），第 5/10/15 层为宗师级 Boss。战败可重试该层，核心生命重置。</p></article>
        <article><b>每日挑战</b><p>每天一套由日期决定的固定敌阵与战斗种子，全服同一道题，专家级 AI，每日仅首次胜利计奖，05:00 刷新。</p></article>
        <article><b>竞技场轮抽</b><p>12 轮三选一构筑 30 张临时卡组（自动补足）；每场胜利按当前胜场结算奖励，胜场越多单场奖励越厚；两败或 12 胜结束整轮并重开。</p></article>
      </div>
      <div className="mulligan-actions"><button className="btn btn-primary" onClick={() => setShowGuide(false)}>明白了</button></div>
    </section></div> : null}
  </section>;
}

// ── 无尽爬塔 ──────────────────────────────────────────
function TowerView({ run, deck, onRunChange, onReward, onBack, onBattle }: {
  run: TowerRun; deck: string[]; onRunChange: (run: TowerRun) => void; onReward: (r: number) => void; onBack: () => void;
  onBattle: Props["onBattle"];
}) {
  const { playSfx } = useGameAudio();
  const [pendingReward, setPendingReward] = useState<TowerBuffId[] | null>(null);
  const [battling, setBattling] = useState(false);

  const persist = (next: TowerRun) => {
    onRunChange(next);
    try { localStorage.setItem(TOWER_SAVE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const startFloor = () => {
    const floor = buildTowerFloor(run.floor);
    const runDeck = deck.length === RULES.MAX_DECK ? deck : DEFAULT_DECK;
    setBattling(true);
    onBattle(
      runDeck,
      floor.difficulty,
      (won, summary) => {
        setBattling(false);
        if (won) {
          // 福星：每层胜利额外 +40 星辉；回春：战后核心恢复 4 点（上限约束在下一层开局处理）。
          const reward = towerRewardForFloor(run.floor, floor.boss) + (run.buffs.includes("fortune") ? 40 : 0);
          const options = rollBuffs(run.buffs.includes("draft") ? 4 : 3, run.buffs);
          setPendingReward(options);
          const carried = summary ? summary.playerHealth + (run.buffs.includes("healing") ? 4 : 0) : (run.hp > 0 ? run.hp : RULES.HERO_HEALTH);
          const next = { ...run, rewards: run.rewards + reward, bestFloor: Math.max(run.bestFloor, run.floor), hp: carried };
          persist(next);
          onReward(reward);
          playSfx("reward");
        } else {
          playSfx("uiError");
          // 战败重试：该层从头再打，核心生命重置满值。
          const next = { ...run, bestFloor: Math.max(run.bestFloor, run.floor - 1), hp: 0 };
          persist(next);
        }
      },
      () => setBattling(false),
      `无尽爬塔 · 第 ${run.floor} 层`,
      {
        enemyDeck: floor.enemyDeck,
        seed: towerSeedForFloor(run.floor),
        setup: (state) => setupTowerState(state, run.floor, run.buffs, run.hp),
      },
    );
  };

  const chooseBuff = (buffId: TowerBuffId) => {
    const currentHp = run.hp > 0 ? run.hp : RULES.HERO_HEALTH;
    const next: TowerRun = { ...run, buffs: [...run.buffs, buffId], floor: run.floor + 1, hp: buffId === "vitality" ? currentHp + 8 : run.hp };
    if (next.floor > TOWER_MAX_FLOORS) {
      next.rewards += 300;
      onReward(300);
      next.floor = 1;
      next.buffs = [];
      next.hp = 0;
      playSfx("reward");
    }
    persist(next);
    setPendingReward(null);
    playSfx("cardSelect");
  };

  if (pendingReward) {
    return <section className="command-view endless-view">
      <header className="command-heading"><p className="eyebrow">FLOOR CLEARED</p><h1>第 {run.floor} 层攻破</h1><span>选择一项增益，继续深入。</span></header>
      <div className="buff-choice-grid">
        {pendingReward.map((buffId) => {
          const buff = TOWER_BUFFS[buffId];
          return <button key={buffId} className={`buff-card buff-${buff.rarity}`} onClick={() => chooseBuff(buffId)}>
            <span className="buff-icon" aria-hidden="true">{buff.icon}</span>
            <b>{buff.name}</b>
            <small>{buff.desc}</small>
            <em>{buff.rarity === "common" ? "凡品" : buff.rarity === "rare" ? "灵品" : "仙品"}</em>
          </button>;
        })}
      </div>
      <div className="endless-return"><button className="btn btn-secondary" onClick={onBack}>暂时休整（保存进度）</button></div>
    </section>;
  }

  const floor = buildTowerFloor(run.floor);
  const shownHp = run.hp > 0 ? run.hp : RULES.HERO_HEALTH;
  return <section className="command-view endless-view">
    <header className="command-heading">
      <div><p className="eyebrow">ENDLESS TOWER</p><h1>无尽爬塔</h1><span>第 {run.floor} / {TOWER_MAX_FLOORS} 层 · {floor.boss ? "Boss 层 · 强敌把守" : "普通层"}</span></div>
      <div className="tower-stats"><div><small>已获星辉</small><b>{run.rewards}</b></div><div><small>最佳层数</small><b>{run.bestFloor}</b></div><div><small>核心生命</small><b>{shownHp}</b></div><div><small>增益数</small><b>{run.buffs.length}</b></div></div>
    </header>
    <div className="tower-buffs">{run.buffs.length ? run.buffs.map((id) => { const b = TOWER_BUFFS[id]; return <span key={id} className={`tower-buff-chip buff-${b.rarity}`} title={b.desc}><i>{b.icon}</i>{b.name}</span>; }) : <p className="tower-no-buffs">尚未获得增益——每过一层，从三项增益中择一。</p>}</div>
    <div className="tower-floor-preview">
      <div className="tower-floor-visual" aria-hidden="true"><span>{floor.boss ? "⚔" : "⟡"}</span></div>
      <div><p className="panel-kicker">UP NEXT</p><h2>{floor.boss ? "Boss：心魔执念" : `第 ${run.floor} 层 · ${floor.difficulty === "novice" ? "初阶" : floor.difficulty === "skilled" ? "进阶" : floor.difficulty === "expert" ? "精锐" : "宗师"}敌阵`}</h2><span>{floor.boss ? "Boss 层胜利奖励更厚，但对手是宗师级 AI。" : "击败后从三项增益中择一，奖励随层数递增；核心生命将带入下一层。"}</span></div>
    </div>
    <div className="endless-actions">
      <button className="btn btn-secondary" onClick={onBack}>返回</button>
      <button className="btn btn-primary" disabled={battling} onClick={startFloor}>{battling ? "战斗中…" : run.floor > 1 ? "继续深入 →" : "踏入第一层 →"}</button>
    </div>
  </section>;
}

function rollBuffs(count: number, existing: TowerBuffId[]): TowerBuffId[] {
  const all = Object.keys(TOWER_BUFFS) as TowerBuffId[];
  const available = all.filter((id) => !existing.includes(id));
  const pool = available.length >= count ? available : all;
  const picked: TowerBuffId[] = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const id of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(id)) picked.push(id);
  }
  return picked;
}

// ── 每日挑战 ──────────────────────────────────────────
function DailyView({ challenge, deck, cleared, onCleared, onReward, onBack, onBattle }: {
  challenge: DailyChallenge; deck: string[]; cleared: boolean; onCleared: () => void; onReward: (r: number) => void; onBack: () => void;
  onBattle: Props["onBattle"];
}) {
  const { playSfx } = useGameAudio();
  const [battling, setBattling] = useState(false);
  const start = () => {
    setBattling(true);
    onBattle(
      deck.length === RULES.MAX_DECK ? deck : DEFAULT_DECK,
      challenge.difficulty,
      (won) => {
        setBattling(false);
        if (won && !cleared) {
          onReward(challenge.reward);
          onCleared();
          playSfx("reward");
        } else {
          playSfx("uiError");
        }
      },
      () => setBattling(false),
      `每日挑战 · ${challenge.dateKey}`,
      { enemyDeck: challenge.enemyDeck, seed: dailyChallengeSeed(challenge.dateKey) },
    );
  };
  return <section className="command-view endless-view">
    <header className="command-heading"><p className="eyebrow">DAILY CHALLENGE</p><h1>每日挑战</h1><span>{challenge.dateKey} · 全服同一道题，种子由日期决定。</span></header>
    <div className="daily-card">
      <div className="daily-seal" aria-hidden="true"><span>日</span></div>
      <div><p className="panel-kicker">TODAY'S TRIAL</p><h2>{cleared ? "今日已通关" : "专家级敌阵"}</h2><span>{cleared ? "明日 05:00 刷新新的试炼。" : `击败专家级 AI 与今日固定敌阵，奖励 ${challenge.reward} 星辉。每日仅一次。`}</span></div>
    </div>
    <div className="endless-actions">
      <button className="btn btn-secondary" onClick={onBack}>返回</button>
      <button className="btn btn-primary" disabled={battling || cleared} onClick={start}>{battling ? "战斗中…" : cleared ? "已通关" : "迎战 →"}</button>
    </div>
  </section>;
}

// ── 竞技场轮抽 ────────────────────────────────────────
function DraftView({ run, onRunChange, onReward, onBack, onBattle }: {
  run: DraftRun; onRunChange: (run: DraftRun) => void; onReward: (r: number) => void; onBack: () => void;
  onBattle: Props["onBattle"];
}) {
  const { playSfx } = useGameAudio();
  const [options, setOptions] = useState<string[]>(() => run.picks.length < DRAFT_PICKS ? rollDraftOptions() : []);
  const [battling, setBattling] = useState(false);

  const persist = (next: DraftRun) => {
    onRunChange(next);
    try { localStorage.setItem(DRAFT_SAVE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const pick = (cardId: string) => {
    const nextPicks = [...run.picks, cardId];
    const next = { ...run, picks: nextPicks };
    persist(next);
    playSfx("cardSelect");
    if (nextPicks.length >= DRAFT_PICKS) {
      setOptions([]);
    } else {
      setOptions(rollDraftOptions());
    }
  };

  const battleDeck = useMemo(() => {
    if (run.picks.length < DRAFT_PICKS) return null;
    const deck = [...run.picks];
    const fillers = CARD_POOL.filter((card) => !deck.includes(card.id) && card.rarity === "R");
    while (deck.length < 30 && fillers.length) {
      const card = fillers[Math.floor(Math.random() * fillers.length)];
      if (!deck.includes(card.id)) deck.push(card.id);
    }
    while (deck.length < 30) deck.push("dawn-scout");
    return deck;
  }, [run.picks]);

  const startBattle = () => {
    if (!battleDeck) return;
    setBattling(true);
    onBattle(
      battleDeck,
      "skilled",
      (won) => {
        setBattling(false);
        if (won) {
          // 胜场累积：奖励按「这场是第几胜」结算，胜场越多单场奖励越厚；12 胜圆满结束。
          const wins = run.wins + 1;
          const reward = draftReward(wins);
          const next = { ...run, wins, rewards: run.rewards + reward };
          if (wins >= DRAFT_MAX_WINS) {
            next.picks = [];
            next.wins = 0;
            next.losses = 0;
          }
          persist(next);
          onReward(reward);
          playSfx("reward");
        } else {
          const losses = run.losses + 1;
          const next = { ...run, losses };
          persist(next);
          playSfx("uiError");
          if (losses >= 2) {
            next.picks = [];
            next.wins = 0;
            next.losses = 0;
            persist(next);
          }
        }
      },
      () => setBattling(false),
      "竞技场轮抽",
    );
  };

  const retireRun = () => {
    persist({ ...run, picks: [], wins: 0, losses: 0 });
    setOptions(rollDraftOptions());
    playSfx("cardSelect");
  };

  if (run.picks.length >= DRAFT_PICKS) {
    return <section className="command-view endless-view">
      <header className="command-heading"><p className="eyebrow">DRAFT READY</p><h1>轮抽完成</h1><span>卡组已构筑完毕（{DRAFT_PICKS} 张轮抽牌 + 补足 30 张）。胜场累积，两败出局，{DRAFT_MAX_WINS} 胜圆满。</span></header>
      <div className="draft-summary">
        <div><small>已选卡牌</small><b>{run.picks.length} / {DRAFT_PICKS}</b></div>
        <div><small>当前胜场</small><b>{run.wins} / {DRAFT_MAX_WINS}</b></div>
        <div><small>当前败场</small><b>{run.losses} / 2</b></div>
        <div><small>累计奖励</small><b>{run.rewards} 星辉</b></div>
      </div>
      <div className="draft-card-row">{run.picks.map((id) => { const card = CARD_MAP[id]; return card ? <CardView key={id} def={card} compact /> : null; })}</div>
      <div className="endless-actions">
        <button className="btn btn-secondary" onClick={onBack}>返回</button>
        <button className="btn btn-secondary" onClick={retireRun}>结束本轮（重开轮抽）</button>
        <button className="btn btn-primary" disabled={battling} onClick={startBattle}>{battling ? "战斗中…" : run.wins ? `继续出征（${run.wins} 胜）→` : "开始第一战 →"}</button>
      </div>
    </section>;
  }

  return <section className="command-view endless-view">
    <header className="command-heading"><p className="eyebrow">ARENA DRAFT</p><h1>竞技场轮抽</h1><span>第 {run.picks.length + 1} / {DRAFT_PICKS} 轮 · 三选一。</span></header>
    <div className="draft-progress"><i><span style={{ width: `${run.picks.length / DRAFT_PICKS * 100}%` }} /></i><small>{run.picks.length} / {DRAFT_PICKS} 已选</small></div>
    <div className="draft-choice-row">
      {options.map((cardId) => {
        const card = CARD_MAP[cardId];
        return <button key={cardId} className="draft-choice" onClick={() => pick(cardId)}><CardView def={card} /><em>{card.cost} 费 · {card.type}</em></button>;
      })}
    </div>
    <div className="endless-return"><button className="btn btn-secondary" onClick={onBack}>放弃轮抽（保存已选）</button></div>
  </section>;
}
