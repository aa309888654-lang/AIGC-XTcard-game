import { useEffect, useRef, useState, type CSSProperties } from "react";
import { authoritativeApi, type PvpMatchSnapshot } from "../platform/AuthoritativeClient";
import type { BattleState, CombatInteractionState, CombatTargetRef, FxEvent } from "../types";
import { CARD_MAP } from "../data/cards";
import { RULES } from "../game/rules";
import { HERO_POWERS } from "../data/heroPowers";
import { getAttackProfile, getSkillPresentation } from "../data/presentation";
import CardView from "./CardView";

interface Props {
  deck: string[];
  mode: "ranked" | "casual";
  onExit: () => void;
  onResult: (won: boolean) => void;
}

const POLL_MS = 1500;

function isBattleState(value: unknown): value is BattleState {
  const state = value as { battle?: { player?: unknown; enemy?: unknown; turn?: unknown } };
  return Boolean(state?.battle && state.battle.player && state.battle.enemy);
}

function snapshotToLocal(snapshot: PvpMatchSnapshot): BattleState | null {
  const raw = snapshot.match.state as { battle?: unknown } | null;
  if (!raw || !isBattleState(raw)) return null;
  // 服务端 redactBattle 已输出观察者视角的 BattleState（己方=player，对手=enemy）。
  const battle = raw.battle as BattleState;
  return {
    ...battle,
    mulligan: { player: Boolean(battle.mulligan?.player), enemy: Boolean(battle.mulligan?.enemy) },
    log: battle.log ?? [],
  };
}

export default function PvpView({ deck, mode, onExit, onResult }: Props) {
  const [queueState, setQueueState] = useState<"idle" | "queuing" | "matched" | "playing" | "finished">("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [state, setState] = useState<BattleState | null>(null);
  const [interaction, setInteraction] = useState<CombatInteractionState>({ mode: "idle" });
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [mulliganSelected, setMulliganSelected] = useState<number[]>([]);
  const [activeFx, setActiveFx] = useState<FxEvent[]>([]);
  const lastFxId = useRef(0);
  const lastSeq = useRef(0);
  const resultReported = useRef(false);

  const startQueue = async () => {
    setQueueState("queuing");
    setError("");
    try {
      const result = await authoritativeApi.pvpQueue(mode, deck);
      if (result.status === "matched" && result.matchId) {
        setMatchId(result.matchId);
        setQueueState("matched");
      } else {
        setQueueState("queuing");
      }
    } catch (e) {
      setQueueState("idle");
      setError(e instanceof Error ? e.message : "MATCH_QUEUE_FAILED");
    }
  };

  useEffect(() => {
    if (queueState !== "queuing" || matchId) return;
    const timer = window.setInterval(async () => {
      try {
        const result = await authoritativeApi.pvpQueue(mode, deck);
        if (result.status === "matched" && result.matchId) {
          setMatchId(result.matchId);
          setQueueState("matched");
        }
      } catch {
        // 轮询队列状态，失败则继续等待
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [deck, matchId, mode, queueState]);

  const sendReady = async () => {
    if (!matchId) return;
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "ready" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "READY_FAILED");
    }
  };

  const confirmMulligan = async () => {
    if (!matchId || !state) return;
    const keepUids = state.player.hand.filter((unit) => !mulliganSelected.includes(unit.uid)).map((unit) => unit.uid);
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "mulligan", keepUids });
      setMulliganSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "MULLIGAN_FAILED");
    }
  };

  const keepAll = async () => {
    if (!matchId || !state) return;
    const keepUids = state.player.hand.map((unit) => unit.uid);
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "mulligan", keepUids });
      setMulliganSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "MULLIGAN_FAILED");
    }
  };

  const playCard = async (index: number) => {
    if (!matchId || !state || state.turn !== "player") return;
    const unit = state.player.hand[index];
    if (!unit) return;
    try {
      if (unit.defKind === "spell") {
        const targetMode = CARD_MAP[unit.defId].skill.target ?? "none";
        if (targetMode !== "none") {
          setInteraction({ mode: "spellSelected", spellIndex: index, targetMode });
          return;
        }
        await authoritativeApi.pvpCommand(matchId, { type: "play_spell", handIndex: index });
      } else if (unit.defKind === "weapon") {
        await authoritativeApi.pvpCommand(matchId, { type: "equip_weapon", handIndex: index });
      } else {
        await authoritativeApi.pvpCommand(matchId, { type: "play_card", handIndex: index });
      }
      setInteraction({ mode: "idle" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "PLAY_FAILED");
    }
  };

  const handleSpellTarget = async (uid?: number) => {
    if (!matchId || interaction.mode !== "spellSelected") return;
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "play_spell", handIndex: interaction.spellIndex, target: { uid } });
      setInteraction({ mode: "idle" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "SPELL_FAILED");
    }
  };

  const selectUnit = (uid: number) => {
    if (!state || state.turn !== "player") return;
    setSelectedUid((current) => current === uid ? null : uid);
  };

  const attack = async (target: CombatTargetRef) => {
    if (!matchId || !state || selectedUid === null) return;
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "attack", attackerUid: selectedUid, target });
      setSelectedUid(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ATTACK_FAILED");
    }
  };

  const weaponAttack = async (target: CombatTargetRef) => {
    if (!matchId || !state || state.turn !== "player") return;
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "weapon_attack", target });
      setInteraction({ mode: "idle" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "WEAPON_ATTACK_FAILED");
    }
  };

  const endTurn = async () => {
    if (!matchId || !state || state.turn !== "player") return;
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "end_turn" });
      setInteraction({ mode: "locked", reason: "enemyTurn" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "END_TURN_FAILED");
    }
  };

  const useHeroPower = async (target?: { uid?: number }) => {
    if (!matchId || !state || state.turn !== "player") return;
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "hero_power", target });
      setInteraction({ mode: "idle" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "HERO_POWER_FAILED");
    }
  };

  const resolveDiscover = async (cardId: string) => {
    if (!matchId || !state) return;
    try {
      await authoritativeApi.pvpCommand(matchId, { type: "discover", cardId });
      setInteraction({ mode: "idle" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "DISCOVER_FAILED");
    }
  };

  // 轮询快照
  useEffect(() => {
    if (!matchId || queueState === "idle") return;
    const poll = async () => {
      try {
        const snapshot = await authoritativeApi.pvpSnapshot(matchId, lastSeq.current);
        if (snapshot.events?.length) {
          lastSeq.current = snapshot.events[snapshot.events.length - 1].sequence;
        }
        const next = snapshotToLocal(snapshot);
        if (next) {
          setState((current) => {
            if (current) {
              const fresh = next.fx.filter((event) => event.id > lastFxId.current);
              if (fresh.length) {
                lastFxId.current = fresh[fresh.length - 1].id;
                setActiveFx(fresh);
              }
              return { ...next, fx: current.fx };
            }
            lastFxId.current = 0;
            return next;
          });
          if (snapshot.match.status === "active") {
            setQueueState("playing");
            // 回到自己回合时解除 endTurn 设置的锁定，避免交互一直停在 enemyTurn。
            if (next.turn === "player") setInteraction((current) => current.mode === "locked" ? { mode: "idle" } : current);
          }
          if (snapshot.match.status === "finished" && !resultReported.current) {
            resultReported.current = true;
            setQueueState("finished");
            onResult(snapshot.match.winner === "self");
          }
        }
      } catch {
        // 轮询失败继续重试
      }
    };
    void poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(timer);
  }, [matchId, onResult, queueState]);

  if (queueState === "idle" || queueState === "queuing") {
    return <section className="command-view pvp-view">
      <header className="command-heading"><p className="eyebrow">AUTHORITATIVE MATCH</p><h1>天梯对决</h1><span>{mode === "ranked" ? "排位赛 · 胜负计入赛季积分" : "休闲赛 · 不计分"}</span></header>
      {error ? <p className="pvp-error" role="alert">{error}</p> : null}
      <div className="pvp-queue">
        <div className="pvp-queue-emblem" aria-hidden="true"><span>⚔</span></div>
        <h2>{queueState === "queuing" ? "正在匹配对手…" : "准备就绪"}</h2>
        <p>{queueState === "queuing" ? "天梯会优先匹配与你段位相近的对手，匹配成功后自动进入换牌阶段。" : "你的卡组已整装，点击出征开始匹配。"}</p>
        <div className="pvp-queue-actions">
          {queueState === "queuing"
            ? <button className="btn btn-secondary" onClick={() => { void authoritativeApi.pvpCancelQueue().catch(() => undefined); setQueueState("idle"); }}>取消匹配</button>
            : <button className="btn btn-primary" onClick={() => void startQueue()}>开始匹配 <span>→</span></button>}
          <button className="btn btn-secondary" onClick={onExit}>返回</button>
        </div>
      </div>
    </section>;
  }

  if (!state) {
    return <section className="command-view pvp-view"><header className="command-heading"><p className="eyebrow">MATCH FOUND</p><h1>对手已就位</h1><span>正在交换起手情报…</span></header>
      <div className="pvp-queue"><div className="pvp-queue-emblem" aria-hidden="true"><span>⚔</span></div>
        <h2>等待双方确认</h2>
        <p>双方就绪后将自动进入起手换牌阶段。</p>
        <div className="pvp-queue-actions"><button className="btn btn-primary" onClick={() => void sendReady()}>我已就绪</button><button className="btn btn-secondary" onClick={onExit}>退出</button></div>
      </div>
    </section>;
  }

  const player = state.player;
  const enemy = state.enemy;
  const spellSelected = interaction.mode === "spellSelected" ? interaction : null;
  const heroPowerSelected = interaction.mode === "heroPowerSelected";
  const weaponSelected = interaction.mode === "weaponSelected";
  const heroPowerDef = HERO_POWERS[player.faction] ?? HERO_POWERS["天衡"];
  const weapon = player.weapon;
  const attackerUnit = selectedUid === null ? null : player.board.find((unit) => unit.uid === selectedUid) ?? null;
  const unitAttacking = state.turn === "player" && Boolean(attackerUnit?.canAttack && attackerUnit.attack > 0);
  const weaponReady = state.turn === "player" && Boolean(weapon && !player.heroAttacked && weapon.attack > 0);
  // 单位攻击（selectedUid）与武器攻击共用嘲讽/穿透目标规则。
  const validTargets = (() => {
    if (state.turn !== "player" || (!unitAttacking && !weaponSelected)) return { hero: false, units: [] as number[] };
    const taunts = enemy.board.filter((unit) => CARD_MAP[unit.defId].skill.effect === "taunt" || CARD_MAP[unit.defId].skill.effect === "last-stand");
    if (taunts.length && !(attackerUnit && CARD_MAP[attackerUnit.defId].skill.effect === "pierce")) return { hero: false, units: taunts.map((unit) => unit.uid) };
    return { hero: true, units: enemy.board.map((unit) => unit.uid) };
  })();
  const heroPowerTargetable = heroPowerSelected && heroPowerDef.target === "ally-unit";

  return <section className={`battle-shell pvp-battle ${state.winner ? "has-winner" : ""}`}>
    <header className="battle-header">
      <button className="back-link" onClick={onExit}>退出对局</button>
      <div className="turn-monitor"><span>PvP · {mode === "ranked" ? "排位" : "休闲"} · ROUND {state.turnNumber}</span>
        <b>{state.winner ? (state.winner === "player" ? "你赢了" : "你输了") : state.turn === "player" ? "你的回合" : "对手回合"}</b>
        <small>{state.turn === "player" ? "请做出决策" : "等待对手…"}</small>
      </div>
    </header>
    {error ? <div className="pvp-error">{error}</div> : null}
    <div className="pvp-heroes">
      <div className="pvp-hero enemy"><span className="pvp-hero-name">对手</span><b>{enemy.heroHealth}<small>/{enemy.maxHeroHealth}</small></b><i style={{ width: `${Math.max(0, enemy.heroHealth / enemy.maxHeroHealth * 100)}%` }} /></div>
      <div className="pvp-hero player"><span className="pvp-hero-name">你</span><b>{player.heroHealth}<small>/{player.maxHeroHealth}</small></b><i style={{ width: `${Math.max(0, player.heroHealth / player.maxHeroHealth * 100)}%` }} /></div>
    </div>
    <div className="pvp-board">
      <div className="pvp-row enemy">{enemy.board.map((unit) => {
        const isUnitTarget = unitAttacking && validTargets.units.includes(unit.uid);
        const isWeaponTarget = weaponSelected && weaponReady && validTargets.units.includes(unit.uid);
        const isSpellTarget = spellSelected?.targetMode === "enemy-unit";
        return <div className={`pvp-unit-wrap ${isUnitTarget || isWeaponTarget || isSpellTarget ? "is-targetable" : ""}`} key={unit.uid}>
          <CardView def={CARD_MAP[unit.defId]} unit={unit} compact />
          <div className="pvp-unit-actions">
            {isUnitTarget ? <button className="is-attack" onClick={() => void attack({ hero: false, uid: unit.uid })}>攻击</button> : null}
            {isWeaponTarget ? <button className="is-attack" onClick={() => void weaponAttack({ hero: false, uid: unit.uid })}>斩击</button> : null}
            {isSpellTarget ? <button className="is-spell" onClick={() => void handleSpellTarget(unit.uid)}>施法</button> : null}
          </div>
        </div>;
      })}</div>
      <div className="pvp-divider"><span>◇</span></div>
      <div className="pvp-row player">{player.board.map((unit) => {
        const isHeroPowerTarget = heroPowerTargetable;
        const isSpellTarget = spellSelected?.targetMode === "ally-unit";
        const attackProfile = getAttackProfile(unit.defId);
        return <div className={`pvp-unit-wrap ${isHeroPowerTarget || isSpellTarget ? "is-targetable" : ""} ${selectedUid === unit.uid ? "is-selected" : ""}`} style={{ "--unit-index": unit.uid } as CSSProperties} key={unit.uid}>
          <CardView def={CARD_MAP[unit.defId]} unit={unit} compact selected={selectedUid === unit.uid} />
          <div className="pvp-unit-actions">
            {unit.canAttack && unit.attack > 0 && state.turn === "player" ? <button onClick={() => selectUnit(unit.uid)}>{selectedUid === unit.uid ? "取消" : `进攻 (${attackProfile.family})`}</button> : null}
            {isHeroPowerTarget ? <button className="is-spell" onClick={() => void useHeroPower({ uid: unit.uid })}>技能目标</button> : null}
            {isSpellTarget ? <button className="is-spell" onClick={() => void handleSpellTarget(unit.uid)}>施法</button> : null}
          </div>
        </div>;
      })}</div>
    </div>
    {unitAttacking && validTargets.hero ? <button className="pvp-attack-hero" onClick={() => void attack({ hero: true })}>攻击核心 ({enemy.heroHealth} HP)</button> : null}
    {weaponSelected && weaponReady && validTargets.hero ? <button className="pvp-attack-hero" onClick={() => void weaponAttack({ hero: true })}>武器斩击核心 ({enemy.heroHealth} HP)</button> : null}
    {spellSelected ? <div className="pvp-hint">{spellSelected.targetMode === "enemy-unit" ? "选择一个敌方单位施放法术" : "选择一个友方单位施放法术"}，或 <button onClick={() => setInteraction({ mode: "idle" })}>取消</button></div> : null}
    {weaponSelected ? <div className="pvp-hint">选择武器目标：点击敌方单位或核心，或 <button onClick={() => setInteraction({ mode: "idle" })}>取消</button></div> : null}
    {heroPowerSelected ? <div className="pvp-hint">选择一个友方单位作为「{heroPowerDef.name}」的目标，或 <button onClick={() => setInteraction({ mode: "idle" })}>取消</button></div> : null}
    <div className="pvp-hand">
      {player.hand.map((unit, index) => {
        const card = CARD_MAP[unit.defId];
        const isSpell = unit.defKind === "spell";
        const cost = unit.cost - (isSpell ? player.nextSpellCheaper : player.nextCheaper);
        const playable = state.turn === "player" && cost <= player.mana && (isSpell || unit.defKind === "weapon" || player.board.length < RULES.MAX_BOARD);
        return <button key={unit.uid} className={`pvp-hand-slot ${playable ? "is-playable" : ""}`} disabled={!playable} onClick={() => void playCard(index)}><CardView def={card} unit={unit} compact costOverride={Math.max(0, cost)} /><small>{Math.max(0, cost)} 费</small></button>;
      })}
    </div>
    <footer className="battle-footer">
      <div className="battle-log">{state.log.slice(-3).map((entry, index) => <p key={`${entry}-${index}`}><span>›</span>{entry}</p>)}</div>
      <div className="pvp-actions">
        {state.turn === "player" && !state.winner ? <>
          {weapon ? <button className="btn btn-secondary" disabled={!weaponReady} onClick={() => setInteraction(weaponSelected ? { mode: "idle" } : { mode: "weaponSelected" })}>{weaponReady ? (weaponSelected ? "收起武器" : `挥动 ${weapon.name}（${weapon.attack} 攻/${weapon.durability} 耐久）`) : `${weapon.name} · 本回合已攻击`}</button> : null}
          <button className="btn btn-secondary" disabled={player.heroPowerUsed || player.mana < heroPowerDef.cost || (heroPowerDef.target === "ally-unit" && !player.board.length)} onClick={() => { if (heroPowerDef.target) setInteraction(heroPowerSelected ? { mode: "idle" } : { mode: "heroPowerSelected" }); else void useHeroPower(); }} title={heroPowerDef.desc}>{heroPowerDef.icon} {heroPowerDef.name} · {heroPowerDef.cost} 费{player.heroPowerUsed ? " · 已用" : ""}</button>
        </> : null}
        <button className="btn btn-primary end-turn" disabled={state.turn !== "player" || Boolean(state.winner)} onClick={() => void endTurn()}>回合结束</button>
      </div>
    </footer>
    {state.pendingChoice?.kind === "discover" && state.pendingChoice.side === "player" ? <div className="battle-discover-backdrop"><section className="battle-discover"><h2>发现</h2><div className="discover-row">{state.pendingChoice.options.map((defId) => <button key={defId} className="discover-slot" onClick={() => void resolveDiscover(defId)}><CardView def={CARD_MAP[defId]} /><em>{CARD_MAP[defId].cost} 费 · {CARD_MAP[defId].type}</em></button>)}</div></section></div> : null}
    {!state.mulligan.player && !state.winner ? <div className="battle-mulligan-backdrop"><section className="battle-mulligan"><header><h2>重整起手</h2><span>勾选想换掉的卡牌，星辉令不可更换。</span></header>
      <div className="mulligan-hand">{player.hand.map((unit, index) => {
        const isCoin = unit.defId === "astral-coin";
        const selected = mulliganSelected.includes(unit.uid);
        if (isCoin) return <article className="mulligan-coin-token" key={unit.uid}><div className="mulligan-coin-art"><span>令</span><i>0</i></div><div><b>星辉令</b><small>后手补给 · 不可更换</small></div><em>不可换</em></article>;
        return <button key={unit.uid} className={`mulligan-slot ${selected ? "is-selected" : ""}`} onClick={() => setMulliganSelected((current) => selected ? current.filter((uid) => uid !== unit.uid) : [...current, unit.uid])}><CardView def={CARD_MAP[unit.defId]} unit={unit} /><em>{selected ? "换掉" : "保留"}</em></button>;
      })}</div>
      <div className="mulligan-actions"><button className="btn btn-secondary" onClick={() => void keepAll()}>全部保留</button><button className="btn btn-primary" onClick={() => void confirmMulligan()}>确认换牌（{mulliganSelected.length}）</button></div>
      <button className="btn btn-secondary" onClick={() => void sendReady()}>尚未就绪？点击确认</button>
    </section></div> : null}
    {state.winner ? <div className="battle-result"><div className="result-panel"><span className="result-crest">{state.winner === "player" ? "A" : "V"}</span><h2>{state.winner === "player" ? "你赢了" : "你输了"}</h2><p>{mode === "ranked" ? "胜负已计入赛季积分。" : "休闲对局不计分。"}</p><div><button className="btn btn-primary" onClick={onExit}>返回</button></div></div></div> : null}
  </section>;
}
