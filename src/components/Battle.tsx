import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { AiDifficulty, BattleState, CombatInteractionState, CombatTargetRef, FxEvent, GameShortcuts } from "../types";
import { aiTurn, aiMulligan, attackTarget, attackWithWeapon, cloneBattleState, createBattle, endTurn, equipWeapon, getAttackPreview, getHeroPowerState, getSpellPlayOptions, getValidTargets, getValidWeaponTargets, getWeaponState, mulliganHand, playCard, playSpell, resolveDiscover, useHeroPower } from "../game/engine";
import { CARD_MAP, CARD_POOL, TOKEN_POOL } from "../data/cards";
import { cardArtFile } from "../data/cardArt";
import { getAttackProfile, getSkillPresentation } from "../data/presentation";
import { GENERATED_ASSETS, skillVfxFrame, statusFrame, summonFrame } from "../data/generatedAssets";
import { RULES } from "../game/rules";
import { useGameAudio, type SfxName } from "../audio/AudioProvider";
import { getSkillSound } from "../audio/cardSounds";
import { assetUrl } from "../assetUrl";
import CardView from "./CardView";
import { EMOTE_DEFS, saveReplay } from "../community/Friends";

const BattleVfx = lazy(() => import("./BattleVfx"));

// 场景参数：无尽爬塔/每日挑战/回放等模式注入的定制敌阵、种子与开局改写钩子。
export interface BattleScenario {
  enemyDeck?: string[];
  seed?: number;
  setup?: (state: BattleState) => void;
}

// 结算摘要：爬塔等模式需要跨局继承的玩家核心状态。
export interface BattleResultSummary {
  playerHealth: number;
  playerMaxHealth: number;
}

interface Props { deck: string[]; difficulty: AiDifficulty; shortcuts: GameShortcuts; highIntensityEffects: boolean; resumeFromSave: boolean; tutorialDone: boolean; campaign?: { commander: string; commanderTitle: string; enemyDeck: string[] } | null; scenario?: BattleScenario | null; onResult: (won: boolean, summary?: BattleResultSummary) => void; onExit: () => void; onReplay: () => void; onSaveAndExit: () => void; onTutorialDone: () => void; }

const BATTLE_SAVE_KEY = "astra-frontline-battle-save-v1";

function preloadBattleImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    const finish = () => resolve();
    const timer = window.setTimeout(finish, 5000);
    image.onload = () => {
      window.clearTimeout(timer);
      finish();
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      finish();
    };
    image.src = url;
    if (image.complete) {
      window.clearTimeout(timer);
      finish();
    }
  });
}

function createInitialBattle(deck: string[], resumeFromSave: boolean, campaign: Props["campaign"], scenario: Props["scenario"]): { state: BattleState; enemyDeck: string[] } {
  if (resumeFromSave && !campaign) {
    try {
      const saved = JSON.parse(localStorage.getItem(BATTLE_SAVE_KEY) ?? "null");
      if (saved?.version === 1 && saved.state?.player && saved.state?.enemy) {
        return { state: { ...saved.state, fx: [], mulligan: saved.state.mulligan ?? { player: true, enemy: true }, randomSeed: saved.state.randomSeed ?? Date.now() >>> 0 } as BattleState, enemyDeck: [] };
      }
    } catch {
      // A malformed local save should never block a fresh battle.
    }
  }
  // 保留原始敌阵用于回放记录：战斗中 enemy.deck 只减不增，事后无法还原。
  const enemyDeck = scenario?.enemyDeck ?? campaign?.enemyDeck ?? makeEnemyDeck();
  const state = createBattle(deck, enemyDeck, scenario?.seed);
  scenario?.setup?.(state);
  return { state, enemyDeck };
}

const AI_LEVELS: Record<AiDifficulty, { name: string; code: string }> = {
  novice: { name: "新手", code: "AI / NOVICE" },
  skilled: { name: "高手", code: "AI / SKILLED" },
  expert: { name: "专家", code: "AI / EXPERT" },
  master: { name: "大神", code: "AI / MASTER" },
};

const CARD_ID_BY_NAME = Object.fromEntries(CARD_POOL.map((card) => [card.name, card.id]));
const FACTION_BATTLEFIELD_CLASS: Record<string, string> = {
  天衡: "jade-celestial",
  幽冥: "void-abyss",
  天机: "windwood",
  铁律: "imperial-bronze",
  山海: "ember-forge",
};
type BattleVoice = { cardId: string; cue: "summon" | "attack" | "skill" | "death" | "victory"; priority: number };
type AttackGuide = { id: string; path: string };
type AttackGuideLayout = { width: number; height: number; guides: AttackGuide[] };
type AmbientParticle = { x: number; y: number; size: number; opacity: number; duration: number; delay: number; driftX: number; driftY: number };

const AMBIENT_PARTICLES: AmbientParticle[] = [
  { x: 18, y: 22, size: 2, opacity: .36, duration: 14, delay: -6, driftX: 18, driftY: 56 },
  { x: 23, y: 48, size: 3, opacity: .24, duration: 19, delay: -12, driftX: -14, driftY: 82 },
  { x: 28, y: 14, size: 2, opacity: .38, duration: 16, delay: -9, driftX: 13, driftY: 64 },
  { x: 32, y: 61, size: 2, opacity: .24, duration: 18, delay: -3, driftX: 19, driftY: 74 },
  { x: 36, y: 29, size: 4, opacity: .16, duration: 22, delay: -17, driftX: -23, driftY: 94 },
  { x: 41, y: 73, size: 2, opacity: .32, duration: 15, delay: -7, driftX: 11, driftY: 65 },
  { x: 45, y: 18, size: 2, opacity: .28, duration: 20, delay: -15, driftX: -16, driftY: 88 },
  { x: 48, y: 54, size: 3, opacity: .23, duration: 17, delay: -10, driftX: 15, driftY: 71 },
  { x: 52, y: 31, size: 2, opacity: .35, duration: 13, delay: -4, driftX: 20, driftY: 48 },
  { x: 56, y: 66, size: 3, opacity: .21, duration: 21, delay: -18, driftX: -18, driftY: 92 },
  { x: 61, y: 13, size: 2, opacity: .34, duration: 15, delay: -11, driftX: 12, driftY: 58 },
  { x: 64, y: 43, size: 4, opacity: .16, duration: 23, delay: -5, driftX: -26, driftY: 102 },
  { x: 68, y: 76, size: 2, opacity: .29, duration: 16, delay: -14, driftX: 16, driftY: 68 },
  { x: 72, y: 26, size: 2, opacity: .38, duration: 14, delay: -8, driftX: -13, driftY: 54 },
  { x: 77, y: 57, size: 3, opacity: .21, duration: 20, delay: -16, driftX: 20, driftY: 88 },
  { x: 82, y: 35, size: 2, opacity: .34, duration: 17, delay: -2, driftX: -17, driftY: 72 },
  { x: 21, y: 68, size: 4, opacity: .54, duration: 16, delay: -8, driftX: 28, driftY: 96 },
  { x: 26, y: 37, size: 3, opacity: .62, duration: 13, delay: -4, driftX: -22, driftY: 78 },
  { x: 31, y: 81, size: 5, opacity: .43, duration: 21, delay: -15, driftX: 31, driftY: 118 },
  { x: 38, y: 46, size: 3, opacity: .58, duration: 15, delay: -11, driftX: -27, driftY: 89 },
  { x: 44, y: 88, size: 4, opacity: .48, duration: 18, delay: -6, driftX: 24, driftY: 108 },
  { x: 49, y: 25, size: 3, opacity: .64, duration: 12, delay: -9, driftX: -18, driftY: 72 },
  { x: 55, y: 79, size: 5, opacity: .42, duration: 20, delay: -13, driftX: 34, driftY: 124 },
  { x: 60, y: 52, size: 3, opacity: .61, duration: 14, delay: -2, driftX: -29, driftY: 84 },
  { x: 66, y: 87, size: 4, opacity: .47, duration: 19, delay: -17, driftX: 23, driftY: 112 },
  { x: 71, y: 41, size: 3, opacity: .59, duration: 13, delay: -7, driftX: -25, driftY: 80 },
  { x: 76, y: 71, size: 5, opacity: .44, duration: 22, delay: -19, driftX: 35, driftY: 126 },
  { x: 80, y: 19, size: 3, opacity: .63, duration: 15, delay: -5, driftX: -21, driftY: 91 },
];

const ARENA_CANDLES = [
  { x: 19.7, y: 8.3, size: 14, duration: 1.85, delay: -.7 },
  { x: 27.3, y: 5.6, size: 17, duration: 1.55, delay: -1.4 },
  { x: 30.7, y: 9.9, size: 14, duration: 2.1, delay: -2.1 },
  { x: 71.3, y: 6.2, size: 16, duration: 1.7, delay: -1.8 },
  { x: 82.3, y: 17.8, size: 18, duration: 1.95, delay: -.3 },
  { x: 84.7, y: 16.1, size: 14, duration: 1.45, delay: -1.1 },
];

function preferVoice(current: BattleVoice | null, cardId: string | undefined, cue: BattleVoice["cue"], priority: number): BattleVoice | null {
  return cardId && (!current || priority > current.priority) ? { cardId, cue, priority } : current;
}

function makeEnemyDeck() {
  const pool = CARD_POOL.flatMap((card) => [card.id, card.id]);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }
  return pool.slice(0, RULES.MAX_DECK);
}

function formatEvent(event: FxEvent) {
  const labels: Record<string, string> = { attack: "攻击指令", summon: "单位部署", damage: "核心受创", skill: "技能触发", buff: "战术增幅" };
  return event.label ? `${labels[event.type] ?? "战况更新"} · ${event.label}` : labels[event.type] ?? "战况更新";
}

function AttackGuides({ layout }: { layout: AttackGuideLayout | null }) {
  if (!layout?.guides.length) return null;
  return <svg className="attack-guides" aria-hidden="true" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none">
    <defs>
      <marker id="attack-guide-arrowhead" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0cf7d" />
      </marker>
    </defs>
    {layout.guides.map((guide) => <g key={guide.id}>
      <path className="attack-guide-glow" d={guide.path} />
      <path className="attack-guide-line" d={guide.path} markerEnd="url(#attack-guide-arrowhead)" />
    </g>)}
  </svg>;
}

export default function Battle({ deck, difficulty, shortcuts, highIntensityEffects, resumeFromSave, tutorialDone, campaign, scenario, onResult, onExit, onReplay, onSaveAndExit, onTutorialDone }: Props) {
  const [initialBattle] = useState(() => createInitialBattle(deck, resumeFromSave, campaign, scenario));
  const [state, setState] = useState<BattleState>(initialBattle.state);
  const [isArenaReady, setIsArenaReady] = useState(false);
  const [interaction, setInteraction] = useState<CombatInteractionState>({ mode: "idle" });
  const [isPaused, setIsPaused] = useState(false);
  const [inspectedCardId, setInspectedCardId] = useState("void-emperor");
  const [activeFx, setActiveFx] = useState<FxEvent[]>([]);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const lastFxId = useRef(0);
  const lastDrawTurn = useRef(0);
  const criticalAlerted = useRef({ player: false, enemy: false });
  const knownUnitCards = useRef(new Map<number, string>());
  const arenaContentRef = useRef<HTMLDivElement>(null);
  const resolveTimerRef = useRef<number | null>(null);
  const resultReportedRef = useRef(false);
  useEffect(() => {
    const handCards = state.player.hand.slice(0, 6).map((unit) => assetUrl(`/assets/cards/${cardArtFile(unit.defId)}.png`));
    let active = true;
    void Promise.all([
      preloadBattleImage(assetUrl("/assets/backgrounds/battle-background.png")),
      preloadBattleImage(assetUrl("/assets/backgrounds/battle-board-25d-v2.png")),
      ...handCards.map(preloadBattleImage),
    ]).then(() => {
      if (active) setIsArenaReady(true);
    });
    // 战场就绪 4 秒后低优先级预载卡组余下卡面（逐张加载，不阻塞进场交互）。
    const deckTimer = window.setTimeout(() => {
      const handIds = new Set(state.player.hand.slice(0, 6).map((unit) => unit.defId));
      for (const id of deck) {
        if (handIds.has(id)) continue;
        void preloadBattleImage(assetUrl(`/assets/cards/${cardArtFile(id)}.png`));
      }
    }, 4000);
    return () => {
      active = false;
      window.clearTimeout(deckTimer);
    };
    // 仅进场执行一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!state.winner || resultReportedRef.current) return;
    resultReportedRef.current = true;
    if (!campaign) {
      saveReplay({
        label: "模拟战场",
        mode: `AI / ${AI_LEVELS[difficulty].name}`,
        turnCount: state.turnNumber,
        winner: state.winner,
        playerDeck: deck,
        enemyDeck: initialBattle.enemyDeck.length ? initialBattle.enemyDeck : (state.enemy.deck.length ? [...state.enemy.deck, ...state.enemy.hand.map((unit) => unit.defId)] : []),
        seed: state.randomSeed,
      });
    }
    onResult(state.winner === "player", { playerHealth: Math.max(0, state.player.heroHealth), playerMaxHealth: state.player.maxHeroHealth });
  }, [state.winner, onResult]);
  const [attackGuideLayout, setAttackGuideLayout] = useState<AttackGuideLayout | null>(null);
  const [mulliganSelected, setMulliganSelected] = useState<number[]>([]);
  const [battleNotice, setBattleNotice] = useState("");
  const [tutorialStep, setTutorialStep] = useState(() => (resumeFromSave || tutorialDone ? 0 : 1));
  useEffect(() => {
    if (!battleNotice) return;
    const timer = window.setTimeout(() => setBattleNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [battleNotice]);
  const TUTORIAL_STEPS = [
    { anchor: "hand-section", title: "部署单位", copy: "点击手牌中发光的卡牌，将其部署到战场。法力会随回合自动增长，高费用单位需要更长的等待。" },
    { anchor: "player-zone", title: "发起攻击", copy: "选中我方单位后，点击敌方单位或核心发起攻击。守卫单位会优先拦截指向核心的攻击。" },
    { anchor: "end-turn", title: "结束回合", copy: "安排完成后，点击「回合结束」将行动权交给对手。击败敌方 30 点核心即获胜。" },
  ];
  // 单位→卡牌映射在提交后同步（不在渲染期写 ref，保证渲染纯度）。
  useEffect(() => {
    for (const unit of [...state.player.hand, ...state.player.board, ...state.enemy.hand, ...state.enemy.board]) knownUnitCards.current.set(unit.uid, unit.defId);
  }, [state]);
  const { playSfx, playCardSelection, playCharacterVoice, playMusicCue, setBattleCritical } = useGameAudio();
  const updateBattle = (transition: (draft: BattleState) => BattleState) => {
    setState((current) => transition(cloneBattleState(current)));
  };

  useEffect(() => {
    if (isPaused || state.turn !== "enemy" || state.winner) return;
    const timer = window.setTimeout(() => updateBattle((current) => aiTurn(current, difficulty)), difficulty === "master" ? 620 : 820);
    return () => window.clearTimeout(timer);
  }, [difficulty, isPaused, state.turn, state.winner]);

  useEffect(() => {
    if (state.winner) {
      setInteraction({ mode: "locked", reason: "gameOver" });
      return;
    }
    if (state.turn === "enemy") {
      setInteraction({ mode: "locked", reason: "enemyTurn" });
      return;
    }
    setInteraction((current) => current.mode === "locked" ? { mode: "idle" } : current);
  }, [state.turn, state.winner]);

  useEffect(() => () => {
    if (resolveTimerRef.current !== null) window.clearTimeout(resolveTimerRef.current);
  }, []);
  useEffect(() => {
    const fresh = state.fx.filter((event) => event.id > lastFxId.current);
    if (!fresh.length) return;
    lastFxId.current = fresh[fresh.length - 1].id;
    setActiveFx((current) => [...current, ...fresh]);
    const sounds = new Set<SfxName>();
    for (const event of fresh) {
      if (event.type === "summon") sounds.add("cardDeploy");
      if (event.type === "summon" && event.label === "石俑") sounds.add("summonConstruct");
      else if (event.type === "attack" && (event.label === "星辉匕" || event.label === "熔炉残锤")) {
        sounds.add("weaponSwing");
        sounds.add("weaponHitMetal");
      } else if (event.type === "attack") sounds.add("attackReady");
      else if (event.type === "spell") {
        if (event.label === "发现") sounds.add("discoverOpen");
        else if (["开运", "点睛", "针脚", "封尘"].includes(event.label ?? "")) {
          sounds.add("spellCastArcane");
          if (event.label === "针脚") sounds.add("statusFreeze");
          if (event.label === "封尘") sounds.add("statusSilence");
        } else if (["揭页", "穿心"].includes(event.label ?? "")) sounds.add("spellImpactVoid");
        else sounds.add("skill");
      }
      else if (event.type === "damage") sounds.add("attackHit");
      else if (event.type === "skill" && event.label?.startsWith("奥秘部署：")) sounds.add("secretArm");
      else if (event.type === "skill" && event.label?.startsWith("奥秘触发：")) sounds.add("secretTrigger");
      else if (event.type === "skill" && (event.label === "折光装甲" || event.label === "静滞力场")) sounds.add("shield");
      else if (event.type === "skill" && event.label === "不可退让") sounds.add("guard");
      else if (event.type === "skill" && (event.label === "再生孢子" || event.label === "无尽复苏" || event.label === "回风")) sounds.add("heal");
      else if (event.type === "skill" && event.label === "永夜归来") sounds.add("revive");
      else if (event.type === "skill") {
        const sourceCardId = event.uid === undefined ? undefined : knownUnitCards.current.get(event.uid);
        if (sourceCardId) {
          const cardSound = getSkillSound(sourceCardId, CARD_MAP[sourceCardId].type);
          sounds.add(cardSound.sfx);
          if (cardSound.tail) sounds.add(cardSound.tail);
        } else {
          sounds.add("skill");
        }
      }
      else if (event.type === "buff") sounds.add("buff");
      else if (event.type === "heroHit") sounds.add("heroHit");
      else if (event.type === "win") playMusicCue(event.side === "player" ? "victory" : "defeat");
    }
    const livingUnits = new Set([...state.player.board, ...state.enemy.board].map((unit) => unit.uid));
    if (fresh.some((event) => event.type === "damage" && event.targetUid !== undefined && !livingUnits.has(event.targetUid))) sounds.add("unitDeath");
    let voice: BattleVoice | null = null;
    for (const event of fresh) {
      const sourceCardId = event.uid === undefined ? undefined : knownUnitCards.current.get(event.uid);
      if (event.type === "summon") voice = preferVoice(voice, sourceCardId ?? (event.label ? CARD_ID_BY_NAME[event.label] : undefined), "summon", 30);
      else if (event.type === "skill") voice = preferVoice(voice, sourceCardId, "skill", 20);
      else if (event.type === "attack") voice = preferVoice(voice, sourceCardId, "attack", 10);
      else if (event.type === "damage" && event.targetUid !== undefined && !livingUnits.has(event.targetUid)) voice = preferVoice(voice, knownUnitCards.current.get(event.targetUid), "death", 40);
      else if (event.type === "win") voice = preferVoice(voice, event.side === "player" ? "astral-queen" : "void-emperor", "victory", 50);
    }
    for (const side of ["player", "enemy"] as const) {
      if (!criticalAlerted.current[side] && state[side].heroHealth > 0 && state[side].heroHealth <= 10) {
        criticalAlerted.current[side] = true;
        sounds.add("coreCritical");
      }
    }
    sounds.forEach(playSfx);
    if (voice) {
      const priority = voice.priority >= 50 ? "terminal" : voice.priority >= 40 ? "major" : voice.priority >= 20 ? "important" : "normal";
      playCharacterVoice(voice.cardId, voice.cue, priority);
    }
    const timer = window.setTimeout(() => setActiveFx([]), 1300);
    return () => window.clearTimeout(timer);
  }, [playCharacterVoice, playMusicCue, playSfx, state.fx]);

  useEffect(() => {
    setBattleCritical(!state.winner && (state.player.heroHealth <= 10 || state.enemy.heroHealth <= 10));
  }, [setBattleCritical, state.enemy.heroHealth, state.player.heroHealth, state.winner]);

  useEffect(() => () => setBattleCritical(false), [setBattleCritical]);

  useEffect(() => {
    if (state.turn !== "player" || state.turnNumber <= lastDrawTurn.current) return;
    lastDrawTurn.current = state.turnNumber;
    playSfx("turnStart");
    playSfx("manaGain");
    playSfx("cardDraw");
  }, [playSfx, state.turn, state.turnNumber]);

  const selectedUid = interaction.mode === "unitSelected" || interaction.mode === "targetPreview" ? interaction.attackerUid : null;
  const previewTarget = interaction.mode === "targetPreview" ? interaction.target : null;
  const isResolving = interaction.mode === "resolving" || interaction.mode === "locked";
  const selectedAttacker = selectedUid === null ? undefined : state.player.board.find((unit) => unit.uid === selectedUid);
  const spellSelected = interaction.mode === "spellSelected" ? interaction : null;
  const heroPowerSelected = interaction.mode === "heroPowerSelected";
  const weaponSelected = interaction.mode === "weaponSelected";
  const heroPower = state.turn === "player" ? getHeroPowerState(state, "player") : null;
  const weapon = state.turn === "player" ? getWeaponState(state, "player") : null;
  const weaponTargets = useMemo(() => state.turn === "player" && !isResolving ? getValidWeaponTargets(state, "player") : { hero: false, units: [] as number[] }, [isResolving, state]);
  const spellOptions = useMemo(() => spellSelected ? getSpellPlayOptions(state, "player", spellSelected.spellIndex) : null, [spellSelected, state]);
  useEffect(() => {
    if (spellSelected && !spellOptions?.playable) setInteraction({ mode: "idle" });
  }, [spellOptions, spellSelected]);
  const validTargets = useMemo(() => selectedUid === null || state.turn !== "player" || isResolving ? { hero: false, units: [] as number[] } : getValidTargets(state, "player", selectedUid), [isResolving, selectedUid, state]);
  const preview = useMemo(() => selectedUid === null || !previewTarget ? null : getAttackPreview(state, "player", selectedUid, previewTarget), [previewTarget, selectedUid, state]);
  const guardUnitIds = useMemo(() => {
    if (!selectedAttacker || CARD_MAP[selectedAttacker.defId].skill.effect === "pierce") return [] as number[];
    return state.enemy.board.filter((unit) => ["taunt", "last-stand"].includes(CARD_MAP[unit.defId].skill.effect)).map((unit) => unit.uid);
  }, [selectedAttacker, state.enemy.board]);
  const targetGuideKey = `${validTargets.hero ? "hero" : ""}:${validTargets.units.join(",")}`;
  const selectedAttackProfile = selectedAttacker ? getAttackProfile(selectedAttacker.defId) : null;
  const isScreenShaking = activeFx.some((event) => event.type === "heroHit");
  const latestSkill = [...activeFx].reverse().find((event) => event.type === "skill");
  const latestGeneratedFx = [...activeFx].reverse().find((event) => ["attack", "damage", "skill", "summon", "win"].includes(event.type));
  const latestGeneratedCardId = latestGeneratedFx?.uid === undefined ? undefined : knownUnitCards.current.get(latestGeneratedFx.uid);
  const latestGeneratedCard = latestGeneratedCardId ? CARD_MAP[latestGeneratedCardId] : undefined;
  const isEliteGeneratedFx = latestGeneratedCard?.rarity === "SSR" || latestGeneratedCard?.rarity === "UR";
  const battlefieldFaction = FACTION_BATTLEFIELD_CLASS[state.player.faction] ?? "jade-celestial";
  const battlefieldState = state.winner ? "result" : activeFx.some((event) => event.type === "skill" || event.type === "spell") ? "arcane" : activeFx.some((event) => event.type === "heroHit" || event.type === "damage") ? "hazard" : state.turn === "enemy" ? "storm" : "calm";
  const inspectedCard = CARD_MAP[inspectedCardId] ?? CARD_MAP["void-emperor"];
  const TOKEN_IDS = new Set(TOKEN_POOL.map((token) => token.id));
  const discardCount = Math.max(0, deck.length - state.player.deck.length - state.player.hand.length - state.player.board.filter((unit) => !TOKEN_IDS.has(unit.defId)).length);
  const isTargeted = (uid: number) => validTargets.units.includes(uid);
  const isGuardedTarget = (uid: number) => selectedUid !== null && guardUnitIds.length > 0 && !isTargeted(uid);
  const hasFx = (type: FxEvent["type"], uid: number, field: "uid" | "targetUid" = "uid") => activeFx.some((event) => event.type === type && event[field] === uid);
  const activeComboType = state.player.lastPlayedType ? `${state.player.lastPlayedType} 可进行连携` : "等待第一张部署";

  useLayoutEffect(() => {
    const root = arenaContentRef.current;
    if (!root || selectedUid === null || (!validTargets.hero && validTargets.units.length === 0)) {
      setAttackGuideLayout(null);
      return;
    }

    const updateAttackGuides = () => {
      const rootRect = root.getBoundingClientRect();
      const source = root.querySelector<HTMLElement>(`.player-zone [data-unit-uid="${selectedUid}"]`);
      if (!source || !rootRect.width || !rootRect.height) {
        setAttackGuideLayout(null);
        return;
      }

      const targets = validTargets.units
        .map((uid) => root.querySelector<HTMLElement>(`.enemy-zone [data-unit-uid="${uid}"]`))
        .filter((target): target is HTMLElement => target !== null);
      if (validTargets.hero) {
        const heroTarget = root.querySelector<HTMLElement>('[data-hero-side="enemy"]');
        if (heroTarget) targets.push(heroTarget);
      }

      if (!targets.length) {
        setAttackGuideLayout(null);
        return;
      }

      const sourceRect = source.getBoundingClientRect();
      const startX = sourceRect.left + sourceRect.width / 2 - rootRect.left;
      const startY = sourceRect.top - rootRect.top + 10;
      const guides = targets.map((target, index) => {
        const targetRect = target.getBoundingClientRect();
        const endX = targetRect.left + targetRect.width / 2 - rootRect.left;
        const endY = targetRect.bottom - rootRect.top + 8;
        const bend = Math.max(62, Math.abs(startY - endY) * .3);
        return { id: `${target.dataset.unitUid ?? "hero"}-${index}`, path: `M ${startX} ${startY} C ${startX} ${startY - bend} ${endX} ${endY + bend} ${endX} ${endY}` };
      });
      setAttackGuideLayout({ width: rootRect.width, height: rootRect.height, guides });
    };

    const frame = window.requestAnimationFrame(updateAttackGuides);
    const observer = new ResizeObserver(updateAttackGuides);
    observer.observe(root);
    window.addEventListener("resize", updateAttackGuides);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateAttackGuides);
    };
  }, [selectedUid, targetGuideKey]);

  const beginResolve = (actionId: string, duration: number) => {
    if (resolveTimerRef.current !== null) window.clearTimeout(resolveTimerRef.current);
    setInteraction({ mode: "resolving", actionId });
    resolveTimerRef.current = window.setTimeout(() => {
      resolveTimerRef.current = null;
      setInteraction((current) => current.mode === "resolving" && current.actionId === actionId ? { mode: "idle" } : current);
    }, duration);
  };
  const cancelSelection = () => {
    if (selectedUid === null && !spellSelected && !heroPowerSelected && !weaponSelected) return;
    playSfx("cardReturn");
    setInteraction({ mode: "idle" });
  };
  const handlePlayCard = (index: number) => {
    if (isPaused || state.turn !== "player" || state.winner || isResolving) return;
    const unit = state.player.hand[index];
    if (!unit) return;
    if (unit.defKind === "spell") {
      const options = getSpellPlayOptions(state, "player", index);
      if (!options.playable) {
        playSfx("uiError");
        return;
      }
      playSfx("manaSpend");
      if (options.needsTarget) {
        setInteraction({ mode: "spellSelected", spellIndex: index, targetMode: options.targetMode });
        return;
      }
      beginResolve(`spell-${unit.uid}-${performance.now()}`, 620);
      updateBattle((current) => playSpell(current, "player", index));
      return;
    }
    if (Math.max(0, unit.cost - state.player.nextCheaper) > state.player.mana || (unit.defKind !== "weapon" && state.player.board.length >= RULES.MAX_BOARD)) return;
    playSfx("manaSpend");
    beginResolve(`summon-${unit.uid}-${performance.now()}`, 620);
    updateBattle((current) => playCard(current, "player", index));
  };
  const handleSpellTarget = (uid?: number) => {
    if (isPaused || state.turn !== "player" || isResolving) return;
    if (heroPowerSelected) {
      if (!heroPower?.ready) {
        playSfx("uiError");
        return;
      }
      playSfx("targetLock");
      beginResolve(`hero-power-${performance.now()}`, 620);
      updateBattle((current) => useHeroPower(current, "player", { uid }));
      return;
    }
    if (!spellSelected || !spellOptions?.playable || (spellOptions.needsTarget && uid === undefined)) {
      playSfx("uiError");
      return;
    }
    playSfx("targetLock");
    beginResolve(`spell-${spellSelected.spellIndex}-${performance.now()}`, 620);
    updateBattle((current) => playSpell(current, "player", spellSelected.spellIndex, { uid }));
  };
  const handlePlayHeroPower = () => {
    if (isPaused || state.turn !== "player" || state.winner || isResolving || !heroPower?.ready) {
      playSfx("uiError");
      return;
    }
    if (heroPower.def.target) {
      setInteraction({ mode: "heroPowerSelected" });
      return;
    }
    playSfx("manaSpend");
    beginResolve(`hero-power-${performance.now()}`, 620);
    updateBattle((current) => useHeroPower(current, "player"));
  };
  const handlePlayWeapon = () => {
    if (isPaused || state.turn !== "player" || state.winner || isResolving || !weapon?.ready) {
      playSfx("uiError");
      return;
    }
    setInteraction({ mode: "weaponSelected" });
  };
  const handleWeaponTarget = (target: CombatTargetRef) => {
    if (isPaused || state.turn !== "player" || isResolving || !weaponSelected) {
      playSfx("uiError");
      return;
    }
    const valid = getValidWeaponTargets(state, "player");
    if ((target.hero && !valid.hero) || (!target.hero && (!target.uid || !valid.units.includes(target.uid)))) {
      playSfx("uiError");
      return;
    }
    playSfx("targetLock");
    beginResolve(`weapon-${performance.now()}`, 620);
    updateBattle((current) => attackWithWeapon(current, "player", target));
  };
  const handleDiscoverPick = (defId: string) => {
    if (isPaused || state.winner || !state.pendingChoice || state.pendingChoice.side !== "player") return;
    playSfx("discoverConfirm");
    beginResolve(`discover-${performance.now()}`, 620);
    updateBattle((current) => resolveDiscover(current, defId));
  };
  const handleConfirmMulligan = () => {
    const keepUids = state.player.hand.filter((unit) => !mulliganSelected.includes(unit.uid)).map((unit) => unit.uid);
    const swapped = mulliganSelected.length;
    playSfx("cardDraw");
    setMulliganSelected([]);
    updateBattle((current) => {
      mulliganHand(current, "player", keepUids);
      current.mulligan.player = true;
      aiMulligan(current, difficulty);
      return current;
    });
    if (swapped > 0) setBattleNotice(`已更换 ${swapped} 张起手，重新抽牌完成。`);
  };
  const keepAllHand = () => {
    playSfx("cardReturn");
    setMulliganSelected([]);
    updateBattle((current) => { current.mulligan.player = true; aiMulligan(current, difficulty); return current; });
  };
  const handleSelectUnit = (uid: number) => {
    if (isPaused || state.turn !== "player" || state.winner || isResolving) return;
    const unit = state.player.board.find((candidate) => candidate.uid === uid);
    if (!unit) return;
    setInspectedCardId(unit.defId);
    if (!unit.canAttack || unit.attack <= 0) {
      playSfx("uiError");
      return;
    }
    if (selectedUid === uid) {
      cancelSelection();
      return;
    }
    playCardSelection(unit.defId);
    setInteraction({ mode: "unitSelected", attackerUid: uid });
  };
  const handleTargetPreview = (target: CombatTargetRef) => {
    if (isPaused || selectedUid === null || isResolving || !getAttackPreview(state, "player", selectedUid, target)) return;
    setInteraction({ mode: "targetPreview", attackerUid: selectedUid, target });
  };
  const clearTargetPreview = () => {
    if (interaction.mode === "targetPreview") setInteraction({ mode: "unitSelected", attackerUid: interaction.attackerUid });
  };
  const handleAttack = (target: CombatTargetRef) => {
    if (isPaused || selectedUid === null || isResolving) return;
    const previewed = getAttackPreview(state, "player", selectedUid, target);
    if (!previewed) {
      playSfx("uiError");
      return;
    }
    const profile = selectedAttacker ? getAttackProfile(selectedAttacker.defId) : getAttackProfile("dawn-scout");
    playSfx("targetLock");
    beginResolve(`attack-${selectedUid}-${performance.now()}`, profile.windupMs + profile.travelMs + profile.hitMs + 280);
    updateBattle((current) => attackTarget(current, "player", selectedUid, target));
  };
  const handleEndTurn = () => {
    if (isPaused || state.turn !== "player" || state.winner || isResolving || !state.mulligan.player) return;
    playSfx("turnEnd");
    setInteraction({ mode: "locked", reason: "enemyTurn" });
    updateBattle((current) => endTurn(current));
  };

  // 键盘作用域经 latest-ref 提供给全局监听器：监听器整个战斗只挂载一次，
  // 避免此前因依赖数组里含未 memo 的处理函数而每次渲染都重挂 window keydown。
  const keyboardScopeRef = useRef({ cancelSelection, handleEndTurn, handleAttack, handlePlayCard, handleSelectUnit, interaction, isPaused, isResolving, selectedUid, state, shortcuts });
  useEffect(() => {
    keyboardScopeRef.current = { cancelSelection, handleEndTurn, handleAttack, handlePlayCard, handleSelectUnit, interaction, isPaused, isResolving, selectedUid, state, shortcuts };
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const scope = keyboardScopeRef.current;
      const { interaction, isPaused, isResolving, selectedUid, state, shortcuts } = scope;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (isPaused) {
        if (event.key === "Escape") setIsPaused(false);
        return;
      }
      if (event.key === shortcuts.cancelSelection) {
        scope.cancelSelection();
        return;
      }
      if (!state.mulligan.player && state.turn === "player" && !state.winner) return;
      if (event.key === shortcuts.endTurn) {
        event.preventDefault();
        scope.handleEndTurn();
        return;
      }
      if (event.key === "Tab" && state.turn === "player" && !state.winner && !isResolving) {
        const candidates = state.player.board.filter((unit) => unit.canAttack && unit.attack > 0);
        if (!candidates.length) return;
        event.preventDefault();
        const currentIndex = candidates.findIndex((unit) => unit.uid === selectedUid);
        const delta = event.shiftKey ? -1 : 1;
        const next = candidates[(currentIndex + delta + candidates.length) % candidates.length];
        scope.handleSelectUnit(next.uid);
        return;
      }
      if (event.key === "Enter" && interaction.mode === "targetPreview") {
        event.preventDefault();
        scope.handleAttack(interaction.target);
        return;
      }
      if (/^[0-9]$/.test(event.key) && state.turn === "player" && !state.winner && !isResolving) {
        const index = event.key === "0" ? 9 : Number(event.key) - 1;
        scope.handlePlayCard(index);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const saveAndExit = () => {
    if (!campaign) localStorage.setItem(BATTLE_SAVE_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), state, deck, difficulty }));
    onSaveAndExit();
  };
  const replay = () => {
    localStorage.removeItem(BATTLE_SAVE_KEY);
    onReplay();
  };
  const renderSecrets = (side: "player" | "enemy") => {
    const secrets = state[side].secrets;
    if (secrets.length === 0) return null;
    return <span className="battle-secrets" aria-label={`挂起的奥秘 ${secrets.length} 个`}>{secrets.map((defId) => { const card = CARD_MAP[defId]; return <button key={defId} className="battle-secret" type="button" disabled title={`奥秘：${card.skill.name} · ${card.skill.desc}`} aria-label={`奥秘：${card.skill.name}`}><span>{card.icon}</span><em>{card.skill.name}</em></button>; })}</span>;
  };
  const renderHero = (side: "player" | "enemy") => {
    const hero = state[side];
    const isEnemy = side === "enemy";
    const canTargetHero = isEnemy && (validTargets.hero || (weaponSelected && weaponTargets.hero));
    const isGuardedCore = isEnemy && selectedUid !== null && !canTargetHero && guardUnitIds.length > 0;
    const isPreviewed = previewTarget?.hero === true;
    const isHit = activeFx.some((event) => event.type === "heroHit" && event.side === side);
    const healthRatio = hero.maxHeroHealth > 0 ? hero.heroHealth / hero.maxHeroHealth : 0;
    const coreOverlay = state.winner ? (state.winner === side ? "/assets/battlefields/overlays/core-victory-stabilized-overlay-alpha.png" : "/assets/battlefields/overlays/core-defeat-collapse-overlay-alpha.png") : healthRatio <= 0.25 ? "/assets/battlefields/overlays/core-critical-overlay-alpha.png" : healthRatio <= 0.6 ? "/assets/battlefields/overlays/core-damaged-overlay-alpha.png" : null;
    const generatedCoreState = state.winner ? state.winner === side ? "victory" : "collapse" : isHit ? "hit" : healthRatio <= 0.25 ? "critical" : healthRatio >= .92 ? "recovery" : null;
    const heroStation = <button className={`hero-console ${isEnemy ? "is-enemy" : ""} ${canTargetHero ? "is-targetable" : ""} ${isGuardedCore ? "is-guarded" : ""} ${isPreviewed ? "is-previewed" : ""} ${isHit ? "is-hit" : ""}`} data-hero-side={side} onMouseEnter={() => canTargetHero && handleTargetPreview({ hero: true })} onMouseLeave={clearTargetPreview} onClick={() => canTargetHero && (weaponSelected ? handleWeaponTarget({ hero: true }) : handleAttack({ hero: true }))} disabled={!canTargetHero} title={isGuardedCore ? "守卫单位正在拦截核心攻击" : canTargetHero ? "确认攻击敌方核心" : undefined} aria-label={isEnemy ? isGuardedCore ? "敌方核心被守卫拦截" : "攻击敌方核心" : "我方核心"}>
      {coreOverlay ? <img className="battle-core-overlay" src={coreOverlay} alt="" aria-hidden="true" /> : null}
      {generatedCoreState ? <span className={`generated-core-state generated-core-${generatedCoreState}`} aria-hidden="true" /> : null}
      <span className="hero-sigil">{isEnemy ? "V" : "仙"}</span><span className="hero-identity"><b>{isEnemy ? campaign ? campaign.commander : `冥府判官·卡戎 · ${AI_LEVELS[difficulty].name}` : "天衡领主·伊莱恩"}</b><small>{isEnemy ? campaign ? campaign.commanderTitle : AI_LEVELS[difficulty].code : "XIANXIA COMMAND / 01"}</small></span>
      <span className="hero-health"><i style={{ width: `${Math.max(0, hero.heroHealth / hero.maxHeroHealth * 100)}%` }} /><b>{hero.heroHealth}</b><small> / {hero.maxHeroHealth}</small></span>
      <span className="mana-chip">◈ {hero.mana}<small>/{hero.maxMana}</small></span>
      {isGuardedCore ? <span className="hero-intercept" aria-label="守卫拦截">⌖</span> : null}
      {isPreviewed && preview ? <span className="hero-preview">{preview.targetHealth} → {preview.targetAfter}</span> : null}
      {isHit ? <span className="hero-damage">-{activeFx.find((event) => event.type === "heroHit" && event.side === side)?.value}</span> : null}
    </button>;
    if (isEnemy) return <div className="hero-station">{heroStation}{renderSecrets(side)}</div>;
    return <div className="hero-station">
      {heroStation}
      {renderSecrets(side)}
      {weapon ? <button className={`battle-weapon ${weapon.ready && !isPaused && !isResolving && !state.winner ? "is-ready" : ""} ${weaponSelected ? "is-selected" : ""}`} onClick={() => weaponSelected ? cancelSelection() : handlePlayWeapon()} disabled={!weapon?.ready || isPaused || isResolving || Boolean(state.winner)} aria-label={`武器：${weapon.name}（${weapon.attack} 攻 / ${weapon.durability} 耐）`} title={`${weapon.name} · ${weapon.attack} 攻击 / ${weapon.durability} 耐久${weapon.heroAttacked ? " · 本回合已攻击" : ""}${weapon.ready ? " · 点击后选择目标" : ""}`}>
        <span className="battle-weapon-icon" aria-hidden="true">{weapon.icon}</span>
        <span className="battle-weapon-meta"><b>{weapon.name}</b><small>{weapon.attack} 攻 <i className="battle-weapon-durability">{weapon.durability} 耐</i></small></span>
        <i className="battle-weapon-wear"><i style={{ width: `${Math.max(0, weapon.durability / weapon.maxDurability * 100)}%` }} /></i>
      </button> : null}
      <button className={`hero-power ${heroPower?.ready && !isPaused && !isResolving && !state.winner ? "is-ready" : ""} ${heroPowerSelected ? "is-selected" : ""}`} onClick={() => heroPowerSelected ? cancelSelection() : handlePlayHeroPower()} disabled={!heroPower?.ready || isPaused || isResolving || Boolean(state.winner)} aria-label={`英雄技能：${heroPower?.def.name}（${heroPower?.def.cost} 费）`} title={heroPower ? `${heroPower.def.name} · ${heroPower.def.desc}（${heroPower.def.cost} 费${heroPower.def.target ? " · 点击后选择我方单位" : ""}）` : undefined}>
        <span className="hero-power-icon" aria-hidden="true">{heroPower?.def.icon}</span>
        <span className="hero-power-meta"><b>{heroPower?.def.name}</b><small>{heroPower?.def.cost} 费{heroPower?.def.target ? " · 选目标" : ""}</small></span>
      </button>
    </div>;
  };

  const renderBoard = (side: "player" | "enemy") => {
    const isEnemy = side === "enemy";
    const units = state[side].board;
    return <div className={`board-zone ${isEnemy ? "enemy-zone" : "player-zone"}`}>
      <div className="lane-marker"><span>{isEnemy ? "ENEMY VANGUARD" : "YOUR VANGUARD"}</span><i /></div>
      <div className="board-row">
        {units.length === 0 ? <div className="empty-board">{isEnemy ? "敌方尚未部署单位" : "从手牌部署你的第一单位"}</div> : units.map((unit, index) => {
          const card = CARD_MAP[unit.defId];
          const isSelected = side === "player" && selectedUid === unit.uid;
          const attackTargetable = isEnemy && (isTargeted(unit.uid) || (weaponSelected && weaponTargets.units.includes(unit.uid)));
          const spellTargetable = heroPowerSelected ? !isEnemy && state.player.board.some((ally) => ally.uid === unit.uid) : spellOptions?.targetMode === "enemy-unit" ? isEnemy && spellOptions.enemyUnits.includes(unit.uid) : !isEnemy && spellOptions?.targetMode === "ally-unit" ? spellOptions.allyUnits.includes(unit.uid) : false;
          const targetable = attackTargetable || spellTargetable;
          const guarded = isEnemy && isGuardedTarget(unit.uid);
          const previewed = isEnemy && previewTarget?.uid === unit.uid;
          const isAttacking = hasFx("attack", unit.uid);
          const isDamaged = hasFx("damage", unit.uid, "targetUid");
          const isSummoned = hasFx("summon", unit.uid);
          const isSkillActive = hasFx("skill", unit.uid);
          const isBuffed = hasFx("buff", unit.uid);
          const attackFamily = getAttackProfile(card.id).family;
          const skillTier = getSkillPresentation(card.skill.effect).tier.toLowerCase();
          const status = statusFrame(card.skill.effect);
          const unitLabel = attackTargetable ? `确认攻击${card.name}` : spellTargetable ? `选择法术目标：${card.name}` : guarded ? `${card.name}受到守卫拦截保护，无法成为目标` : !isEnemy && unit.canAttack && unit.attack > 0 ? `选择${card.name}进行攻击` : `查看${card.name}`;          return <div className={`unit-wrap attack-${attackFamily} skill-${skillTier} ${isSelected ? "is-selected" : ""} ${targetable ? "is-targetable" : ""} ${guarded ? "is-guarded" : ""} ${previewed ? "is-previewed" : ""} ${isAttacking ? "fx-attacking" : ""} ${isDamaged ? "fx-damaged" : ""} ${isSummoned ? "fx-summoned" : ""} ${isSkillActive ? "fx-skill" : ""} ${isBuffed ? "fx-buffed" : ""}`} data-unit-uid={unit.uid} style={{ "--unit-index": index, "--unit-total": units.length } as CSSProperties} key={unit.uid} onMouseEnter={() => { setInspectedCardId(unit.defId); if (attackTargetable) handleTargetPreview({ hero: false, uid: unit.uid }); }} onMouseLeave={() => attackTargetable && clearTargetPreview()} onFocus={() => setInspectedCardId(unit.defId)} onClick={() => targetable ? (attackTargetable ? (weaponSelected ? handleWeaponTarget({ hero: false, uid: unit.uid }) : handleAttack({ hero: false, uid: unit.uid })) : handleSpellTarget(unit.uid)) : !isEnemy ? handleSelectUnit(unit.uid) : undefined} onKeyDown={(event) => { if (event.key === "Enter" || event.key === shortcuts.endTurn) { event.preventDefault(); if (attackTargetable) (weaponSelected ? handleWeaponTarget({ hero: false, uid: unit.uid }) : handleAttack({ hero: false, uid: unit.uid })); else if (spellTargetable) handleSpellTarget(unit.uid); else if (!isEnemy) handleSelectUnit(unit.uid); } }} role={!isEnemy || targetable ? "button" : undefined} tabIndex={!isEnemy || targetable ? 0 : undefined} aria-label={unitLabel} title={guarded ? "守卫单位正在拦截攻击" : targetable ? "点击确认目标" : undefined}>
            <CardView def={card} unit={unit} compact selected={isSelected} onClick={undefined} />
            {isDamaged ? <span className="damage-floater">-{activeFx.find((event) => event.type === "damage" && event.targetUid === unit.uid)?.value}</span> : null}
            {targetable ? <span className="target-ring">⌖</span> : null}
            {guarded ? <span className="target-blocked" aria-label="守卫拦截">◈</span> : null}
            {previewed && preview ? <span className="target-prediction"><b>{preview.targetHealth} → {preview.targetAfter}</b>{preview.notes.length ? <small>{preview.notes[0]}</small> : null}</span> : null}
            <span className={`unit-state ${status ? "has-generated-status" : ""}`}>
              {status ? <i className={`generated-status-icon generated-status-${status.frame}`} role="img" aria-label={status.label} title={status.label} /> : null}
              {!isEnemy && unit.canAttack && unit.attack > 0 ? "可攻击" : status?.label ?? ""}
            </span>
            {isSummoned ? <span className={`generated-summon-effect generated-summon-${summonFrame(activeFx.find((event) => event.type === "summon" && event.uid === unit.uid) ?? { id: 0, type: "summon", side, uid: unit.uid })} ${card.rarity === "SSR" || card.rarity === "UR" ? "generated-summon-elite" : ""}`} aria-hidden="true" /> : null}
          </div>;
        })}
      </div>
    </div>;
  };
  return <section className={`battle-shell battlefield-${battlefieldFaction} battlefield-${battlefieldState} ${isScreenShaking ? "is-shaking" : ""} ${isResolving ? "is-resolving" : ""} ${isPaused ? "is-paused" : ""} ${tutorialStep > 0 ? `tutorial-step-${tutorialStep}` : ""}`} aria-busy={!isArenaReady} onContextMenu={(event) => { if (selectedUid !== null) { event.preventDefault(); cancelSelection(); } }}>
    {!isArenaReady ? <div className="battle-entry-loading" role="status" aria-live="polite"><span>仙</span><b>战场绘制中</b><small>正在校验背景与起手编队</small><i /></div> : null}
    <div className="battle-brand" aria-label="仙侠战线"><span>仙</span><div><b>仙侠战线</b><small>XIANXIA FRONTLINE</small></div></div>
    <div className="battle-toolrail" aria-label="战场工具"><button className="combat-tool combat-tool-report" onClick={() => setIsLogExpanded((current) => !current)} aria-label="展开战报" title="战报" /><button className="combat-tool combat-tool-deck" onClick={() => setBattleNotice(`牌库剩余 ${state.player.deck.length} 张`)} aria-label="查看牌库" title="牌库" /><button className="combat-tool combat-tool-graveyard" onClick={() => setBattleNotice(`弃牌堆 ${discardCount} 张`)} aria-label="查看墓地" title="墓地" /><button className="combat-tool combat-tool-target" onClick={() => setBattleNotice("已开启目标锁定预演")} aria-label="目标锁定" title="目标锁定" /></div>
    <header className="battle-header"><button className="back-link combat-icon-label combat-tool-pause" onClick={() => setIsPaused(true)}><i aria-hidden="true" />暂停作战</button><div className="turn-monitor"><span>ROUND {String(state.turnNumber).padStart(2, "0")} · {AI_LEVELS[difficulty].name} AI</span><b>{state.winner ? state.winner === "player" ? "战线胜利" : "核心失守" : isPaused ? "战术暂停中" : state.turn === "player" ? "我方行动窗口" : "敌方行动推演中"}</b><small>{isPaused ? "战局已冻结" : interaction.mode === "resolving" ? "结算演出中" : interaction.mode === "targetPreview" ? "目标预演" : selectedUid !== null ? "攻击单位已选择" : "等待指令"}</small></div><button className="battle-pause-trigger combat-tool-pause" onClick={() => setIsPaused(true)} aria-label="暂停战斗" title="暂停战斗"><i aria-hidden="true" /></button><button className="icon-command combat-tool-restart" onClick={replay} aria-label="重新开始战斗" title="重新开始"><i aria-hidden="true" /></button></header>
    <div className="arena-frame">
      <img className="generated-battlefield-foreground" src={GENERATED_ASSETS.battlefieldForeground} alt="" aria-hidden="true" />
      <div className="generated-battlefield-layers" aria-hidden="true"><i className="generated-battlefield-weather" /><i className="generated-battlefield-hazard" /><i className="generated-battlefield-faction" /><i className="generated-battlefield-widget" /></div>
      <div className="arena-scenery" aria-hidden="true"><span className="scenery-moon" /><span className="scenery-orbit orbit-one" /><span className="scenery-orbit orbit-two" /><span className="scenery-pillar pillar-left" /><span className="scenery-pillar pillar-right" /></div>
      <div className="arena-candle-layer" aria-hidden="true">
        {ARENA_CANDLES.map((candle, index) => <span className="arena-candle-source" key={index} style={{ "--flame-x": `${candle.x}%`, "--flame-y": `${candle.y}%`, "--flame-size": `${candle.size}px`, "--flame-duration": `${candle.duration}s`, "--flame-delay": `${candle.delay}s` } as CSSProperties}><i className="arena-candle-aura" /><i className="arena-candle-flame" /><i className="arena-candle-ember ember-one" /><i className="arena-candle-ember ember-two" /></span>)}
      </div>
      <div className="arena-floor" aria-hidden="true"><span className="floor-grid" /><span className="floor-sigil" /></div>
      <div className="enemy-rack" aria-label={`敌方手牌 ${state.enemy.hand.length} 张`}>{state.enemy.hand.map((unit) => <span className="enemy-card-back generated-enemy-card-back" key={unit.uid}><i /></span>)}</div>
      <aside className="battle-card-dossier" aria-live="polite">
        <div className="dossier-card"><CardView def={inspectedCard} /></div>
        <h2>{inspectedCard.name}</h2><p className="dossier-meta">{inspectedCard.rarity} · {inspectedCard.type}{inspectedCard.kind === "spell" ? "法术" : inspectedCard.kind === "weapon" ? "装备" : "单位"}</p>
        <h3>{inspectedCard.skill.name}</h3><p>{inspectedCard.skill.desc}</p>
        <div className="dossier-keywords"><b>关键词</b><span>{inspectedCard.skill.effect === "taunt" || inspectedCard.skill.effect === "last-stand" ? "守卫：敌方必须优先攻击此单位。" : "战术技能：部署或交战时触发专属效果。"}</span><span>阵营连携：本回合相邻部署的指定阵营组合，每种效果最多触发一次。</span><span>稀有度：{inspectedCard.rarity} / 星图记录 {inspectedCard.stars}</span></div>
      </aside>
      <aside className="battle-resource-console">
        <div className="mana-crystal"><strong>{state.player.mana}</strong><small>/{state.player.maxMana}</small><b>法力水晶</b><em>MANA CRYSTAL</em></div>
        <div className="crystal-slots" aria-label={`法力槽，${state.player.mana}/${state.player.maxMana}`}>
          <span className="crystal-slots-label"><b>法力槽</b><small>MANA SLOTS</small></span>
          <span className="crystal-slot-grid" aria-hidden="true">{Array.from({ length: Math.max(1, state.player.maxMana) }).map((_, index) => <i className={index < state.player.mana ? "is-filled" : ""} key={index} />)}</span>
        </div>
        <button className="deck-counter generated-pile-counter" onClick={() => setBattleNotice(`牌库剩余 ${state.player.deck.length} 张`)}><span className="counter-sigil"><img src={GENERATED_ASSETS.deckGraveyard} alt="" /></span><strong>{state.player.deck.length}</strong><b>牌库</b><small>DECK</small></button>
        <button className="discard-counter generated-pile-counter" onClick={() => setBattleNotice(`弃牌堆 ${discardCount} 张`)}><span className="counter-sigil"><img src={GENERATED_ASSETS.deckGraveyard} alt="" /></span><strong>{discardCount}</strong><b>弃牌堆</b><small>DISCARD</small></button>
      </aside>
      <div className="enemy-mana-orb"><b>{state.enemy.mana}</b><small>/{state.enemy.maxMana}</small></div>
      <div className="arena-content" ref={arenaContentRef}>
        <div className="arena-ambient-layer" aria-hidden="true">
          {AMBIENT_PARTICLES.map((particle, index) => <i className="arena-ambient-particle" key={index} style={{ "--ambient-x": `${particle.x}%`, "--ambient-y": `${particle.y}%`, "--ambient-size": `${particle.size}px`, "--ambient-opacity": particle.opacity, "--ambient-duration": `${particle.duration}s`, "--ambient-delay": `${particle.delay}s`, "--ambient-drift-x": `${particle.driftX}px`, "--ambient-drift-y": `${particle.driftY}px` } as CSSProperties} />)}
        </div>
        <AttackGuides layout={attackGuideLayout} />
        {selectedAttacker ? <div className="combat-interaction-readout" role="status"><span>{interaction.mode === "targetPreview" ? "TARGET PREVIEW" : "ATTACK VECTOR"}</span><b>{selectedAttacker.name} · {selectedAttackProfile?.family}</b><small>{interaction.mode === "targetPreview" ? "按 Enter 或点击确认目标 · Esc / 右键取消" : "选择高亮目标，悬停查看结算 · Tab 切换单位"}</small></div> : null}
        {spellSelected && spellOptions ? <div className="combat-interaction-readout" role="status"><span>SPELL TARGETING</span><b>{CARD_MAP[state.player.hand[spellSelected.spellIndex]?.defId ?? ""]?.name ?? "法术"} · {spellSelected.targetMode === "enemy-unit" ? "敌方单位" : "我方单位"}</b><small>点击高亮单位确认目标 · Esc / 右键取消</small></div> : null}
        {heroPowerSelected && heroPower ? <div className="combat-interaction-readout" role="status"><span>HERO POWER</span><b>{heroPower.def.name} · 我方单位</b><small>{heroPower.def.desc} · Esc / 右键取消</small></div> : null}
        {weaponSelected && weapon ? <div className="combat-interaction-readout" role="status"><span>WEAPON STRIKE</span><b>{weapon.name} · {weapon.attack} 点伤害</b><small>点击高亮目标挥出武器 · 消耗 1 点耐久 · Esc / 右键取消</small></div> : null}
        {preview ? <div className="combat-preview" role="status"><span>攻击预演</span><div><b>{preview.targetName}</b><strong>{preview.targetHealth} → {preview.targetAfter}</strong><small>伤害 {preview.damage}{preview.retaliation ? ` · 反击 ${preview.retaliation}` : ""}</small></div>{preview.notes.length ? <em>{preview.notes.join(" · ")}</em> : null}</div> : null}
        {latestGeneratedFx ? <span className={`battle-generated-vfx battle-generated-vfx-${skillVfxFrame(latestGeneratedFx)} ${isEliteGeneratedFx ? "battle-generated-vfx-elite" : ""}`} aria-hidden="true" /> : null}
        {renderHero("enemy")}
        {renderBoard("enemy")}
        <div className="arena-divider"><span>◇</span><i /></div>
        {renderBoard("player")}
        {renderHero("player")}
        <Suspense fallback={null}><BattleVfx events={activeFx} unitCards={knownUnitCards.current} highIntensityEffects={highIntensityEffects} /></Suspense>
      </div>
      {latestSkill ? <div className="event-toast"><span>✦</span>{formatEvent(latestSkill)}</div> : null}
      {state.winner ? <div className={`generated-match-result generated-match-result-${state.winner}`} aria-live="polite"><span>{state.winner === "player" ? "战线胜利" : "核心失守"}</span><small>{state.winner === "player" ? "奖励已写入战报" : "重整编队后可再次出征"}</small></div> : null}
    </div>
      <div className="hand-section"><div className="hand-label"><span>COMMAND HAND</span><small>随机牌库 · {state.player.hand.length} 张可用手牌 · 本回合连携 {state.player.comboCount} 次：{activeComboType}{state.player.nextCheaper ? ` · 下一张 -${state.player.nextCheaper}` : ""}</small></div><div className="hand-area">{state.player.hand.map((unit, index) => { const card = CARD_MAP[unit.defId]; const isSpell = unit.defKind === "spell"; const cost = Math.max(0, unit.cost - (isSpell ? state.player.nextSpellCheaper : state.player.nextCheaper)); const playable = !isPaused && state.turn === "player" && state.mulligan.player && cost <= state.player.mana && (isSpell || unit.defKind === "weapon" || state.player.board.length < RULES.MAX_BOARD) && !state.winner; const handSelected = spellSelected?.spellIndex === index; const handOffset = index - (state.player.hand.length - 1) / 2; return <button className={`hand-slot ${playable ? "is-playable" : ""} ${handSelected ? "is-selected" : ""}`} style={{ "--hand-index": index, "--hand-count": state.player.hand.length, "--hand-offset": handOffset } as CSSProperties} key={unit.uid} onMouseEnter={() => setInspectedCardId(unit.defId)} onFocus={() => setInspectedCardId(unit.defId)} onClick={() => playable && handlePlayCard(index)} aria-disabled={!playable} aria-label={`${isSpell ? "施展" : unit.defKind === "weapon" ? "装备" : "部署"}${card.name}`}><CardView def={card} unit={unit} costOverride={cost} playable={playable} /></button>; })}</div></div>
    <footer className="battle-footer"><div className={`battle-log ${isLogExpanded ? "is-expanded" : ""}`}>{state.log.slice(isLogExpanded ? -12 : -3).map((entry, index) => <p key={`${entry}-${index}`}><span>›</span>{entry}</p>)}<button className="battle-log-toggle" onClick={() => setIsLogExpanded((current) => !current)} aria-expanded={isLogExpanded}>{isLogExpanded ? "收起结算详情" : "展开结算详情"}</button></div><div className="battle-emote-bar" aria-label="快捷表情">{EMOTE_DEFS.map((emote) => <button key={emote.id} className="battle-emote" type="button" onClick={() => { setBattleNotice(`${emote.icon} ${emote.label}`); playSfx("cardSelect"); }} title={`发送：${emote.label}`} aria-label={`发送表情：${emote.label}`}><span>{emote.icon}</span></button>)}</div><button className="btn btn-primary end-turn" disabled={isPaused || state.turn !== "player" || !state.mulligan.player || Boolean(state.winner) || isResolving} onClick={handleEndTurn}><span className="end-turn-emblem" aria-hidden="true" /><span className="end-turn-label">回合结束</span></button></footer>
    {battleNotice ? <div className="battle-notice" role="status">{battleNotice}</div> : null}
    {!state.mulligan.player && !state.winner ? <div className="battle-mulligan-backdrop" role="presentation"><section className="battle-mulligan" role="dialog" aria-modal="true" aria-labelledby="mulligan-title"><header><p className="eyebrow">OPENING REDRAW</p><h2 id="mulligan-title">重整起手</h2><span>勾选想要换掉的卡牌。换掉的卡会洗回牌库，并从牌库等量补抽新牌（不会抽回同一张）。</span></header><div className="mulligan-hand">{state.player.hand.map((unit, index) => { const card = CARD_MAP[unit.defId]; const isCoin = unit.defId === "astral-coin"; const selected = mulliganSelected.includes(unit.uid); if (isCoin) return <article className="mulligan-coin-token" key={unit.uid} aria-label="星辉令不可更换"><div className="mulligan-coin-art"><span>令</span><i>0</i></div><div><b>星辉令</b><small>后手补给 · 不可更换</small><p>本回合额外获得 1 点法力</p></div><em>不可换</em></article>; return <button key={unit.uid} className={`mulligan-slot ${selected ? "is-selected" : ""}`} style={{ "--hand-index": index, "--hand-count": state.player.hand.length } as CSSProperties} onClick={() => setMulliganSelected((current) => selected ? current.filter((uid) => uid !== unit.uid) : [...current, unit.uid])} aria-pressed={selected} aria-label={`${selected ? "保留" : "换掉"}${card.name}`}><CardView def={card} unit={unit} /><em>{selected ? "换掉" : "保留"}</em></button>; })}</div><div className="mulligan-actions"><button className="btn btn-secondary" onClick={keepAllHand}>全部保留</button><button className="btn btn-primary" onClick={handleConfirmMulligan}>更换所选（{mulliganSelected.length} 张）</button></div></section></div> : null}
    {state.pendingChoice?.kind === "discover" && state.pendingChoice.side === "player" && !state.winner ? <div className="battle-discover-backdrop" role="presentation"><section className="battle-discover" role="dialog" aria-modal="true" aria-labelledby="discover-title"><header><p className="eyebrow">STARGAZING</p><h2 id="discover-title">发现</h2><span>星图只给你三条路——选一张加入手牌。</span></header><div className="discover-row">{state.pendingChoice.options.map((defId) => { const card = CARD_MAP[defId]; return <button key={defId} className="discover-slot" onClick={() => handleDiscoverPick(defId)} aria-label={`选择${card.name}`} title={`${card.name} · ${card.type} · ${card.cost} 费`}><CardView def={card} /><em>{card.cost} 费 · {card.type}</em></button>; })}</div><div className="discover-actions"><button className="btn btn-secondary" onClick={() => { const options = state.pendingChoice!.options; handleDiscoverPick(options[Math.floor(Math.random() * options.length)]); }}>星图自决（随机）</button></div></section></div> : null}
    {tutorialStep > 0 && state.mulligan.player ? <div className="battle-tutorial" role="dialog" aria-modal="true" aria-label={`战斗教学 ${tutorialStep} / ${TUTORIAL_STEPS.length}`}><div className="tutorial-step-badge"><b>{tutorialStep}</b><small>/ {TUTORIAL_STEPS.length}</small></div><h3>{TUTORIAL_STEPS[tutorialStep - 1].title}</h3><p>{TUTORIAL_STEPS[tutorialStep - 1].copy}</p><div className="tutorial-actions"><button className="btn btn-secondary" onClick={() => { onTutorialDone(); setTutorialStep(0); }}>跳过教学</button><button className="btn btn-primary" onClick={() => { if (tutorialStep >= TUTORIAL_STEPS.length) { onTutorialDone(); setTutorialStep(0); } else setTutorialStep((step) => step + 1); }}>{tutorialStep >= TUTORIAL_STEPS.length ? "开始作战" : "下一步"}</button></div></div> : null}
    {isPaused ? <div className="battle-pause-backdrop" role="presentation" onMouseDown={() => setIsPaused(false)}><section className="battle-pause-panel" role="dialog" aria-modal="true" aria-labelledby="battle-pause-title" onMouseDown={(event) => event.stopPropagation()}><span className="pause-crest" aria-hidden="true"><i>Ⅱ</i></span><p className="eyebrow">COMBAT SUSPENDED</p><h2 id="battle-pause-title">战术暂停</h2><p>{campaign ? "战役推演已冻结。退出后需重新发起挑战。" : "战局已冻结。保存后可在指挥室继续此场交战。"}</p><dl><div><dt>当前回合</dt><dd>{String(state.turnNumber).padStart(2, "0")}</dd></div><div><dt>行动方</dt><dd>{state.turn === "player" ? "我方" : "敌方"}</dd></div><div><dt>核心完整度</dt><dd>{state.player.heroHealth} / {state.player.maxHeroHealth}</dd></div></dl><div className="battle-pause-actions"><button className="btn btn-primary" onClick={() => setIsPaused(false)}>继续作战</button><button className="btn btn-secondary" onClick={saveAndExit}>{campaign ? "退出战役" : "保存并返回首页"}</button></div></section></div> : null}
    {state.winner ? <div className="battle-result"><div className="result-panel"><span className="result-crest">{state.winner === "player" ? "A" : "V"}</span><p className="eyebrow">ENGAGEMENT COMPLETE</p><h2>{state.winner === "player" ? "星门已守住" : "幽冥吞没战线"}</h2><p>{state.winner === "player" ? campaign ? "此篇章的证词已收入编年史。" : "你的战术编队摧毁了虚空核心。" : "重新校准卡组节奏，再次发起交战。"}</p><div><button className="btn btn-primary" onClick={replay}>再次交战</button><button className="btn btn-secondary" onClick={onExit}>{campaign ? "返回编年史" : "返回首页"}</button></div></div></div> : null}
  </section>;
}
