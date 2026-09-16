import { useEffect, useMemo, useState } from "react";
import { CARD_POOL } from "../data/cards";
import { CHARACTER_STORIES } from "../data/world";
import { RULES } from "../game/rules";
import { useGameAudio } from "../audio/AudioProvider";
import type { CardDef, Rarity } from "../types";
import CardView, { RARITY_LABEL } from "./CardView";

interface Props { deck: string[]; setDeck: (deck: string[]) => void; onStart: () => void; onExit: () => void; }
const MAX_DECK = RULES.MAX_DECK;
const MAX_DUPLICATES = RULES.MAX_DUPLICATES;
const PAGE_SIZE = 10;
const rarityLevel: Record<Rarity, number> = { R: 1, SR: 2, SSR: 3, UR: 4 };

function getCounts(deck: string[]) { return deck.reduce<Record<string, number>>((counts, id) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 }), {}); }

export default function DeckBuilder({ deck, setDeck, onStart, onExit }: Props) {
  const [filter, setFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const { playCardSelection, playSfx } = useGameAudio();
  const counts = useMemo(() => getCounts(deck), [deck]);
  const factions = useMemo(() => [...new Set(CARD_POOL.map((card) => card.type))], []);
  const visibleCards = useMemo(() => CARD_POOL.filter((card) => (filter === "全部" || card.type === filter) && `${card.name}${card.skill.name}${card.title}`.includes(search.trim())).sort((left, right) => rarityLevel[right.rarity] - rarityLevel[left.rarity] || left.cost - right.cost), [filter, search]);
  const pageCount = Math.max(1, Math.ceil(visibleCards.length / PAGE_SIZE));
  const pagedCards = visibleCards.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const curve = useMemo(() => Array.from({ length: 8 }, (_, index) => deck.filter((id) => Math.min(8, CARD_POOL.find((card) => card.id === id)?.cost ?? 0) === index + 1).length), [deck]);
  const averageCost = deck.length ? (deck.reduce((sum, id) => sum + (CARD_POOL.find((card) => card.id === id)?.cost ?? 0), 0) / deck.length).toFixed(1) : "0.0";
  const isFull = deck.length === MAX_DECK;
  const selectedCard = selectedCardId ? CARD_POOL.find((card) => card.id === selectedCardId) ?? null : null;
  const selectCard = (id: string) => { playCardSelection(id); setSelectedCardId(id); };
  useEffect(() => setPage(0), [filter, search]);
  useEffect(() => { if (page >= pageCount) setPage(pageCount - 1); }, [page, pageCount]);
  useEffect(() => {
    if (!selectedCard) return;
    if (selectedCard.rarity === "SSR" || selectedCard.rarity === "UR") playSfx("rareReveal");
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setSelectedCardId(null); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); };
  }, [playSfx, selectedCard]);
  const adjustDeck = (id: string, delta: 1 | -1) => {
    const current = counts[id] ?? 0;
    if (delta === 1 && (isFull || current >= MAX_DUPLICATES)) return;
    if (delta === -1 && current === 0) return;
    if (delta === -1) playSfx("cardReturn");
    setDeck(delta === 1 ? [...deck, id] : deck.filter((entry, index) => entry !== id || index !== deck.lastIndexOf(id)));
  };
  return <section className="builder-view">
    <div className="builder-header">
      <div><button className="back-link" onClick={onExit}>← 指挥中心</button><p className="eyebrow">DECK OPERATIONS</p><h1>构筑你的战线</h1><span>选择 30 张卡牌（单位与法术），同名卡最多携带 {MAX_DUPLICATES} 张。</span></div>
      <div className="builder-readout"><b>{deck.length}<small> / {MAX_DECK}</small></b><span>战术位已占用</span></div>
    </div>
    <div className="builder-toolbar"><div className="faction-tabs" role="tablist">
      {[...factions, "全部"].map((faction) => <button key={faction} className={filter === faction ? "is-active" : ""} onClick={() => setFilter(faction)} role="tab" aria-selected={filter === faction}>{faction}</button>)}
    </div><label className="catalog-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索卡牌名称或效果…" aria-label="搜索卡牌" /></label></div>
    <div className="builder-layout">
      <div className="catalog-stage">
        <div className="card-catalog">
          {pagedCards.map((card) => <div className={`catalog-entry ${counts[card.id] ? "is-in-deck" : ""}`} key={card.id}>
            <div className="catalog-card" onClick={() => selectCard(card.id)} role="button" tabIndex={0} aria-label={`查看${card.name}属性`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCard(card.id); } }}><CardView def={card} compact /></div>
            <div className="catalog-stepper" aria-label={`${card.name}携带数量`}>
              <button className="stepper-control stepper-remove" onClick={() => adjustDeck(card.id, -1)} disabled={!counts[card.id]} aria-label={`从卡组移除${card.name}`}><span aria-hidden="true">−</span></button>
              <span className="stepper-count"><strong>{counts[card.id] ?? 0}</strong><small>/ {MAX_DUPLICATES}</small></span>
              <button className="stepper-control stepper-add" onClick={() => adjustDeck(card.id, 1)} disabled={isFull || (counts[card.id] ?? 0) >= MAX_DUPLICATES} aria-label={`加入${card.name}`}><span aria-hidden="true">+</span></button>
            </div>
          </div>)}
        </div>
        <nav className="catalog-pagination" aria-label="卡牌目录分页">
          <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} aria-label="上一页">‹</button>
          <span><b>{page + 1}</b> / {pageCount}</span>
          <button onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page === pageCount - 1} aria-label="下一页">›</button>
        </nav>
      </div>
      <aside className="deck-console">
        <div className="console-card"><span className="panel-kicker">COMBAT PROFILE</span><div className="profile-metrics"><div><strong>{averageCost}</strong><small>平均费用</small></div><div><strong>{Object.keys(counts).length}</strong><small>卡牌类型</small></div></div><div className="mana-curve">{curve.map((count, index) => <div key={index}><i style={{ height: `${Math.max(6, count * 18)}px` }} /><span>{count || ""}</span><small>{index + 1}</small></div>)}</div></div>
        <div className="console-card deck-list"><span className="panel-kicker">ACTIVE ROSTER</span>{deck.length ? Object.entries(counts).map(([id, count]) => { const card = CARD_POOL.find((entry) => entry.id === id)!; return <div className="deck-line" key={id}><span style={{ color: card.color }}>{card.icon}</span><b>{card.name}</b><em>×{count}</em><button onClick={() => adjustDeck(id, -1)} aria-label={`移除${card.name}`}>−</button></div>; }) : <p className="empty-deck">从左侧选择卡牌。</p>}</div>
        <button className="btn btn-primary deck-launch" disabled={!isFull} onClick={onStart}>{isFull ? "部署至竞技场 →" : `还需 ${MAX_DECK - deck.length} 个战术位`}</button>
      </aside>
    </div>
    {selectedCard ? <CardInspector card={selectedCard} count={counts[selectedCard.id] ?? 0} isFull={isFull} onAdjust={(delta) => adjustDeck(selectedCard.id, delta)} onClose={() => setSelectedCardId(null)} /> : null}
  </section>;
}

function CardInspector({ card, count, isFull, onAdjust, onClose }: { card: CardDef; count: number; isFull: boolean; onAdjust: (delta: 1 | -1) => void; onClose: () => void; }) {
  const story = CHARACTER_STORIES[card.id];
  return <div className="card-inspector-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="card-inspector" role="dialog" aria-modal="true" aria-labelledby="card-inspector-title">
      <button className="inspector-close" onClick={onClose} aria-label="关闭卡牌属性">×</button>
      <div className="inspector-card-stage"><CardView def={card} /></div>
      <div className="inspector-data">
        <p className="panel-kicker">UNIT ARCHIVE <i>·</i> CARD DOSSIER</p>
        <h2 id="card-inspector-title">{card.name}</h2>
        <span className="inspector-title">{card.title}</span>
        <div className="inspector-badges"><span>{card.type}</span><span>{RARITY_LABEL[card.rarity]}</span><span>星图序号 {String(card.stars).padStart(3, "0")}</span></div>
        <div className="inspector-stats">
          {card.kind === "spell"
            ? <><div><small>部署费用</small><b>{card.cost}</b></div><div><small>法术类别</small><b>{card.type}</b></div><div><small>目标指向</small><b>{card.skill.target === "enemy-unit" ? "敌方单位" : card.skill.target === "ally-unit" ? "我方单位" : "无需目标"}</b></div></>
            : card.kind === "weapon"
              ? <><div><small>部署费用</small><b>{card.cost}</b></div><div><small>攻击强度</small><b>{card.attack}</b></div><div><small>武器耐久</small><b>{card.durability}</b></div></>
              : <><div><small>部署费用</small><b>{card.cost}</b></div><div><small>攻击强度</small><b>{card.attack}</b></div><div><small>结构生命</small><b>{card.health}</b></div></>}
        </div>
        <div className="inspector-skill"><small>核心技能</small><h3>{card.skill.name}</h3><p>{card.skill.desc}</p><code>{card.skill.effect}</code></div>
        <section className="inspector-character" aria-label={`${card.name}人物属性`}>
          <header><small>人物属性</small><span>{story.chapter}</span></header>
          <div className="inspector-character-facts"><div><small>身份定位</small><b>{story.role}</b></div><div><small>性别 / 形态</small><b>{story.gender}</b></div><div><small>年龄 / 存续</small><b>{story.age}</b></div></div>
          <p><small>性格特质</small>{story.personality}</p>
          <p><small>关键关联</small>{story.connection}</p>
          <blockquote>{story.quote}</blockquote>
        </section>
        <div className="inspector-lore"><small>战线档案</small><p>{card.lore}</p><span>战术定位：{card.repo}</span></div>
        <div className="inspector-actions">
          <button onClick={() => onAdjust(-1)} disabled={!count}>移除</button>
          <strong>{count}<small> / {MAX_DUPLICATES}</small></strong>
          <button onClick={() => onAdjust(1)} disabled={isFull || count >= MAX_DUPLICATES}>加入卡组</button>
        </div>
      </div>
    </section>
  </div>;
}
