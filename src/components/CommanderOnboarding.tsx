import { useMemo, useState, type CSSProperties } from "react";
import type { CardType } from "../types";
import { createCommander, type MetaSave } from "../game/meta";

interface Props {
  meta: MetaSave;
  onComplete: (next: MetaSave) => void;
}

const FACTIONS: Array<{ id: CardType; crest: string; title: string; doctrine: string; color: string }> = [
  { id: "天衡", crest: "☲", title: "离火之明", doctrine: "以律法与锋芒守住仍可被书写的明日。", color: "#e1ad62" },
  { id: "幽冥", crest: "☷", title: "忘川之藏", doctrine: "收回被抹去的名字，让旧誓再次显形。", color: "#a580d8" },
  { id: "天机", crest: "☴", title: "巽风之变", doctrine: "在未定的命盘中，为每一次抉择寻找回响。", color: "#69cbd3" },
  { id: "铁律", crest: "☱", title: "兑金之坚", doctrine: "用城墙、机关与契约，抵住裂隙的每一次冲击。", color: "#b3c4d2" },
  { id: "山海", crest: "☳", title: "震雷之生", doctrine: "与万灵并肩，让山河仍能回答呼唤。", color: "#8bb87d" },
];

export default function CommanderOnboarding({ meta, onComplete }: Props) {
  const [step, setStep] = useState<"identity" | "faction" | "oath">("identity");
  const [name, setName] = useState("");
  const [faction, setFaction] = useState<CardType>("天衡");
  const [error, setError] = useState("");
  const selected = useMemo(() => FACTIONS.find((item) => item.id === faction)!, [faction]);
  const submitIdentity = () => {
    const normalized = name.trim();
    if (normalized.length < 2 || normalized.length > 12) { setError("指挥官名需为 2 至 12 个字符。"); return; }
    setName(normalized);
    setError("");
    setStep("faction");
  };
  const complete = () => onComplete(createCommander(meta, name, faction));

  return <main className="onboarding-shell" aria-labelledby="onboarding-title">
    <div className="onboarding-backdrop" aria-hidden="true" />
    <div className="onboarding-grain" aria-hidden="true" />
    <section className="onboarding-frame">
      <header className="onboarding-header"><p>STAR GATE REGISTRY · 01</p><span>{step === "identity" ? "身份登记" : step === "faction" ? "阵营归属" : "星门誓约"}</span></header>
      <div className="onboarding-progress" aria-label={`创建进度 ${step === "identity" ? 1 : step === "faction" ? 2 : 3} / 3`}><i className={step !== "identity" ? "is-done" : "is-active"}>01</i><b /><i className={step === "oath" ? "is-done" : step === "faction" ? "is-active" : ""}>02</i><b /><i className={step === "oath" ? "is-active" : ""}>03</i></div>

      {step === "identity" && <div className="onboarding-content identity-step">
        <p className="eyebrow">COMMANDER REGISTRY</p><h1 id="onboarding-title">登记你的指挥官档案</h1><p className="onboarding-lead">名字会被写入星门名册。编号由天机司生成，作为跨设备恢复档案的唯一凭据。</p>
        <label className="commander-name-field"><span>指挥官名</span><input autoFocus value={name} maxLength={12} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitIdentity(); }} placeholder="输入 2 至 12 个字符" aria-describedby="commander-name-hint" /><small id="commander-name-hint">可使用汉字、字母或数字。创建后可在档案中改名。</small></label>
        {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
        <footer><span>本机档案已启用。完成登记后会保留现有收藏与设置。</span><button className="onboarding-primary" onClick={submitIdentity}>继续 <b>→</b></button></footer>
      </div>}

      {step === "faction" && <div className="onboarding-content faction-step">
        <p className="eyebrow">ORIGIN FACTION</p><h1 id="onboarding-title">选择你的起源阵营</h1><p className="onboarding-lead">阵营决定首次教学的叙事与试用编队，不会锁定卡池或后续构筑。</p>
        <div className="faction-choice-grid" role="radiogroup" aria-label="起源阵营">{FACTIONS.map((item) => <button key={item.id} role="radio" aria-checked={faction === item.id} className={faction === item.id ? "is-selected" : ""} style={{ "--faction-color": item.color } as CSSProperties} onClick={() => setFaction(item.id)}><i>{item.crest}</i><span><b>{item.id}</b><small>{item.title}</small></span></button>)}</div>
        <article className="faction-brief" style={{ "--faction-color": selected.color } as CSSProperties}><i>{selected.crest}</i><div><b>{selected.id} · {selected.title}</b><p>{selected.doctrine}</p></div></article>
        <footer><button className="onboarding-secondary" onClick={() => setStep("identity")}>返回</button><button className="onboarding-primary" onClick={() => setStep("oath")}>确认归属 <b>→</b></button></footer>
      </div>}

      {step === "oath" && <div className="onboarding-content oath-step">
        <p className="eyebrow">FIRST DEPLOYMENT</p><h1 id="onboarding-title">{name}，星门正在等待你的回答</h1><div className="oath-seal" style={{ "--faction-color": selected.color } as CSSProperties}><i>{selected.crest}</i><span>起源阵营</span><b>{selected.id}</b></div>
        <div className="oath-rewards"><article><i>01</i><div><b>阵营教学编队</b><small>一套可直接出征的 30 张试用卡组</small></div></article><article><i>02</i><div><b>星门初行者勋章</b><small>完成首场引导后解锁第一阶</small></div></article><article><i>03</i><div><b>首航补给</b><small>180 指挥官经验与首战星辉奖励，完成引导战后发放</small></div></article></div>
        <footer><button className="onboarding-secondary" onClick={() => setStep("faction")}>返回</button><button className="onboarding-primary" onClick={complete}>立下誓约 <b>→</b></button></footer>
      </div>}
    </section>
  </main>;
}
