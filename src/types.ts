export type Rarity = "R" | "SR" | "SSR" | "UR";

export type AiDifficulty = "novice" | "skilled" | "expert" | "master";

export type CardKind = "unit" | "spell" | "weapon";

export interface GameShortcuts {
  endTurn: string;
  cancelSelection: string;
}

export type CardType = "天衡" | "幽冥" | "天机" | "铁律" | "山海";

export type SpellTargetMode = "none" | "enemy-unit" | "ally-unit";

export interface SkillDef {
  name: string;
  desc: string;
  effect: string;
  value?: number;
  target?: SpellTargetMode;
  pool?: CardType[];
}

export interface CardDef {
  id: string;
  kind: CardKind;
  name: string;
  title: string;
  type: CardType;
  rarity: Rarity;
  cost: number;
  attack: number;
  health: number;
  durability: number;
  color: string;
  icon: string;
  skill: SkillDef;
  lore: string;
  repo: string;
  stars: number;
}

export interface BattleWeapon {
  defId: string;
  name: string;
  icon: string;
  color: string;
  attack: number;
  durability: number;
  maxDurability: number;
}

export interface BattleUnit {
  uid: number;
  defId: string;
  defKind: CardKind;
  name: string;
  icon: string;
  color: string;
  cost: number;
  attack: number;
  health: number;
  maxHealth: number;
  canAttack: boolean;
  summoned: boolean;
  buffAttack: number;
  buffHealth: number;
  flags: Record<string, number>;
}

export interface SideState {
  heroHealth: number;
  maxHeroHealth: number;
  mana: number;
  maxMana: number;
  hand: BattleUnit[];
  board: BattleUnit[];
  deck: string[];
  nextCheaper: number;
  nextSpellCheaper: number;
  fatigue: number;
  lastPlayedType: CardType | null;
  comboCount: number;
  triggeredCombos: string[];
  faction: CardType;
  heroPowerUsed: boolean;
  weapon: BattleWeapon | null;
  heroAttacked: boolean;
  secrets: string[];
}

export interface SpellPlayOptions {
  playable: boolean;
  cost: number;
  needsTarget: boolean;
  targetMode: SpellTargetMode;
  enemyUnits: number[];
  allyUnits: number[];
}

export interface BattleResult {
  winner: "player" | "enemy";
  turns: number;
  combosTriggered: number;
  unitsSummoned: number;
  skillsTriggered: number;
  playerHeroRemaining: number;
}

export interface PendingChoice {
  kind: "discover";
  side: "player" | "enemy";
  options: string[];
}

// 场景级修饰器（无尽爬塔等模式注入，普通对局不携带）。
export interface BattleModifiers {
  /** 「不屈」：本局我方首次致命伤害改为保留 1 点核心生命（每层一次）。 */
  surviveFatalOnce?: boolean;
}

export interface BattleState {
  player: SideState;
  enemy: SideState;
  turn: "player" | "enemy";
  turnNumber: number;
  winner: "player" | "enemy" | null;
  log: string[];
  uidCounter: number;
  fx: FxEvent[];
  fxCounter: number;
  mulligan: { player: boolean; enemy: boolean };
  pendingChoice: PendingChoice | null;
  randomSeed: number;
  modifiers?: BattleModifiers;
}

export type FxType = "attack" | "summon" | "damage" | "skill" | "buff" | "heroHit" | "win" | "spell";

export type CombatTargetRef = { hero: boolean; uid?: number };

export type CombatInteractionState =
  | { mode: "idle" }
  | { mode: "unitSelected"; attackerUid: number }
  | { mode: "targetPreview"; attackerUid: number; target: CombatTargetRef }
  | { mode: "spellSelected"; spellIndex: number; targetMode: SpellTargetMode }
  | { mode: "heroPowerSelected" }
  | { mode: "weaponSelected" }
  | { mode: "resolving"; actionId: string }
  | { mode: "locked"; reason: "enemyTurn" | "gameOver" | "animation" };

export interface FxEvent {
  id: number;
  type: FxType;
  side: "player" | "enemy";
  uid?: number;
  targetUid?: number;
  value?: number;
  label?: string;
}

export type Phase = "menu" | "builder" | "battle" | "practice" | "pvp" | "endless" | "friends" | "missions" | "leaderboard" | "collection" | "chronicle" | "campaign" | "messages" | "settings" | "profile" | "shop" | "guild" | "assets";
