import { describe, expect, it } from "vitest";
import { CARD_POOL, TOKEN_POOL } from "../data/cards";
import { CARD_PRESENTATION, getSkillPresentation, type SoundTone } from "../data/presentation";
import { getSkillSound, SOUND_TONE_TO_SFX } from "./cardSounds";

const TONES: SoundTone[] = ["star", "vacuum", "pulse", "metal", "thunder"];
const UNITS = [...CARD_POOL, ...TOKEN_POOL].filter((card) => card.id in CARD_PRESENTATION);

describe("逐卡技能音", () => {
  it("图鉴中的每张卡都有选择时的后备音，不会退化成静默", () => {
    expect(CARD_POOL.length).toBeGreaterThanOrEqual(56);
    for (const card of CARD_POOL) {
      expect(getSkillSound(card.id, card.type).sfx, card.id).toBeDefined();
    }
  });

  it("全部单位都有可播放的技能音，不静默", () => {
    expect(UNITS.length).toBeGreaterThanOrEqual(39);
    for (const card of UNITS) {
      const sound = getSkillSound(card.id, card.type);
      expect(sound.sfx, card.id).toBeDefined();
      expect(sound.tier, card.id).toMatch(/^(ui|combat|major|terminal)$/);
    }
  });

  it("稀有度与 presentation.rarityBudget 一致，SSR/UR 必有声音标记", () => {
    for (const card of UNITS) {
      const presentation = CARD_PRESENTATION[card.id];
      expect(presentation.rarityBudget, card.id).toBe(card.rarity);
      if (card.rarity === "SSR" || card.rarity === "UR") {
        expect(TONES, card.id).toContain(presentation.soundMark);
      }
    }
  });

  it("SSR/UR 技能升为 major；UR 追加稀有尾音；高价值效果可提升普通卡优先级", () => {
    const ur = getSkillSound("astral-queen", "天衡");
    expect(ur.tier).toBe("major");
    expect(ur.tail).toBe("rareReveal");
    const ssr = getSkillSound("forge-singer", "铁律");
    expect(ssr.tier).toBe("major");
    expect(ssr.tail).toBeUndefined();
    const rare = getSkillSound("dawn-scout", "天衡");
    expect(rare.tier).toBe("combat");
    expect(rare.tail).toBeUndefined();
    const revive = getSkillSound("sprout", "山海");
    expect(getSkillPresentation("death-heal").soundSet).toBe("heal");
    expect(revive.tier).toBe("combat");
  });

  it("技能优先使用效果声集，缺失时再按阵营音色补位", () => {
    expect(getSkillSound("iron-guard", "铁律").sfx).toBe("guard");
    expect(getSkillSound("void-pickpocket", "幽冥").sfx).toBe("attackReady");
    expect(getSkillSound("wild-bloom", "山海").sfx).toBe("heal");
    expect(getSkillSound("forge-singer", "铁律").sfx).toBe("skillIron");
    for (const tone of TONES) {
      expect(SOUND_TONE_TO_SFX[tone], tone).toMatch(/^skill/);
    }
  });
});
