import type { CSSProperties, KeyboardEvent } from "react";
import type { BattleUnit, CardDef, CardType, Rarity } from "../types";
import { cardArtFile } from "../data/cardArt";
import { NOVEL_FACTION_LABEL } from "../data/novelLore";

export const RARITY_LABEL: Record<Rarity, string> = { R: "制式", SR: "精锐", SSR: "史诗", UR: "传说" };
export const RARITY_COLOR: Record<Rarity, string> = { R: "#9AA9B8", SR: "#66B8FF", SSR: "#D786FF", UR: "#F5CA68" };
export const FACTION_SHAPES: Record<CardType, string> = {
  "天衡": "crest-shape-dawn",
  "幽冥": "crest-shape-shadow",
  "天机": "crest-shape-arcane",
  "铁律": "crest-shape-iron",
  "山海": "crest-shape-wild",
};
export const FACTION_EMBLEMS: Record<CardType, string> = {
  "天衡": "/assets/factions/tianheng-emblem-v1.png",
  "幽冥": "/assets/factions/youming-emblem-v1.png",
  "天机": "/assets/factions/tianji-emblem-v1.png",
  "铁律": "/assets/factions/tielu-emblem-v1.png",
  "山海": "/assets/factions/shanhai-emblem-v1.png",
};

interface Props { def: CardDef; unit?: BattleUnit; costOverride?: number; selected?: boolean; playable?: boolean; onClick?: () => void; compact?: boolean; }

export default function CardView({ def, unit, costOverride, selected, playable, onClick, compact }: Props) {
  const attack = unit?.attack ?? def.attack;
  const health = unit?.health ?? def.health;
  const maxHealth = unit?.maxHealth ?? def.health;
  const cost = costOverride ?? unit?.cost ?? def.cost;
  const isWardSpent = def.skill.effect === "ward" && unit?.flags.wardUsed === 1;
  const isStasisSpent = def.skill.effect === "stasis-field" && unit?.flags.stasisUsed === 1;
  const skillName = isWardSpent ? "折光装甲已碎" : isStasisSpent ? "静滞力场已解除" : def.skill.name;
  const skillDesc = isWardSpent ? "这次战斗中不再减免伤害。" : isStasisSpent ? "这次战斗中不再免疫伤害。" : def.skill.desc;
  const artFile = cardArtFile(def.id);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onClick();
  };
  return <div className={["card", `card-rarity-${def.rarity.toLowerCase()}`, compact ? "card-compact" : "", def.kind === "spell" ? "card-is-spell" : "", selected ? "card-selected" : "", playable ? "card-playable" : "", onClick ? "card-clickable" : ""].filter(Boolean).join(" ")} data-card-id={def.id} style={{ "--card-color": def.color, "--rarity-color": RARITY_COLOR[def.rarity], "--card-image": `url(/assets/cards/${artFile}.png)` } as CSSProperties} onClick={onClick} onKeyDown={handleKeyDown} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} aria-label={onClick ? `选择${def.name}` : undefined}>
    <span className="card-depth" aria-hidden="true" />
    <span className="card-foil" aria-hidden="true" />
    <span className="card-generated-frame" aria-hidden="true" />
    <span className="card-ornament card-ornament-tl" aria-hidden="true" />
    <span className="card-ornament card-ornament-tr" aria-hidden="true" />
    <span className="card-ornament card-ornament-bl" aria-hidden="true" />
    <span className="card-ornament card-ornament-br" aria-hidden="true" />
    <span className="card-crown" aria-hidden="true"><i /></span>
    <span className="card-rail card-rail-left" aria-hidden="true" />
    <span className="card-rail card-rail-right" aria-hidden="true" />
    <div className="card-corner card-cost"><span>{cost}</span></div>
    <div className="card-rarity-mark" aria-label={RARITY_LABEL[def.rarity]}><strong>{def.rarity}</strong></div>
    <div className="card-frame"><div className="card-art"><span>{def.icon}</span><i /></div></div>
    <div className="card-nameplate"><b>{unit?.name ?? def.name}</b><small>{def.title}</small></div>
    <div className="card-copy"><span className="card-type">{NOVEL_FACTION_LABEL[def.type]} · {RARITY_LABEL[def.rarity]}</span><strong>{skillName}</strong>{!compact && <p>{skillDesc}</p>}</div>
    {def.kind === "spell" ? <div className="card-stats card-stats-spell"><span className="stat stat-spell"><b>法</b><i className="stat-glyph stat-glyph-rune" aria-hidden="true" /></span></div> : def.kind === "weapon" ? <div className="card-stats"><span className="stat stat-atk"><b>{attack}</b><i className="stat-glyph stat-glyph-blades" aria-hidden="true" /></span><span className="stat stat-hp"><b>{def.durability}</b><i className="stat-glyph stat-glyph-shield" aria-hidden="true" /></span></div> : <div className="card-stats"><span className="stat stat-atk"><b>{attack}</b><i className="stat-glyph stat-glyph-blades" aria-hidden="true" /></span><span className={`stat stat-hp ${health < maxHealth ? "is-wounded" : ""}`}><b>{health}{health < maxHealth ? <small>/{maxHealth}</small> : null}</b><i className="stat-glyph stat-glyph-shield" aria-hidden="true" /></span></div>}
    <div className={`card-faction-crest ${FACTION_SHAPES[def.type]}`} role="img" aria-label={NOVEL_FACTION_LABEL[def.type]} title={NOVEL_FACTION_LABEL[def.type]}><img src={FACTION_EMBLEMS[def.type]} alt="" /><span>{def.icon}</span></div>
  </div>;
}
