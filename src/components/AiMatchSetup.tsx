import type { AiDifficulty } from "../types";

interface Props {
  difficulty: AiDifficulty;
  onDifficultyChange: (difficulty: AiDifficulty) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const LEVELS: Array<{ id: AiDifficulty; name: string; rank: string; description: string; detail: string }> = [
  { id: "novice", name: "新手", rank: "I", description: "适合熟悉规则与卡牌节奏", detail: "每回合仅部署一张单位，攻击选择较为直接。" },
  { id: "skilled", name: "高手", rank: "II", description: "具备稳定的进攻意识", detail: "会管理两次部署机会，并在可行时施压核心。" },
  { id: "expert", name: "专家", rank: "III", description: "会分析场面交换与技能价值", detail: "完整利用法力，优先清除高威胁单位。" },
  { id: "master", name: "大师", rank: "IV", description: "以压制节奏推进每一步", detail: "更激进地计算单位交换，寻找最强攻势。" },
];

export default function AiMatchSetup({ difficulty, onDifficultyChange, onConfirm, onClose }: Props) {
  const selected = LEVELS.find((level) => level.id === difficulty) ?? LEVELS[0];
  return <div className="ai-setup-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ai-setup" role="dialog" aria-modal="true" aria-labelledby="ai-setup-title">
      <button className="ai-setup-close" onClick={onClose} aria-label="关闭 AI 对战设置">×</button>
      <div className="ai-setup-heading"><p className="panel-kicker">OPPONENT PROTOCOL</p><h2 id="ai-setup-title">与 AI 对战</h2><p>选择虚空阵营指挥官的战术推演等级。</p></div>
      <div className="ai-levels" role="radiogroup" aria-label="AI 难度">
        {LEVELS.map((level) => <button key={level.id} role="radio" aria-checked={difficulty === level.id} className={difficulty === level.id ? "is-selected" : ""} onClick={() => onDifficultyChange(level.id)}>
          <span className="ai-level-rank">{level.rank}</span><span><b>{level.name}</b><small>{level.description}</small></span><i>{difficulty === level.id ? "✦" : ""}</i>
        </button>)}
      </div>
      <div className="ai-setup-summary"><span>已选择</span><b>{selected.name} AI</b><p>{selected.detail}</p></div>
      <div className="ai-setup-actions"><button className="btn btn-secondary" onClick={onClose}>取消</button><button className="btn btn-primary" onClick={onConfirm}>进入对战 <span>→</span></button></div>
    </section>
  </div>;
}
