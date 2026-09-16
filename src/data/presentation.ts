export type AttackFamily = "melee" | "dash" | "bolt" | "beam" | "arc" | "swarm" | "pulse";
export type PresentationPriority = "normal" | "important" | "major" | "terminal";
export type SkillTier = "S1" | "S2" | "S3" | "S4";
export type SoundTone = "star" | "vacuum" | "pulse" | "metal" | "thunder";

export interface AttackProfile {
  family: AttackFamily;
  windupMs: number;
  travelMs: number;
  hitMs: number;
  camera: "none" | "micro" | "strong";
  soundSet: "melee" | "dash" | "bolt" | "beam" | "arc" | "swarm" | "pulse";
  vfxPreset: string;
}

export interface SkillPresentation {
  tier: SkillTier;
  priority: PresentationPriority;
  targetMode: "self" | "single" | "multi" | "hero" | "board";
  baseVfx: string;
  soundSet: string;
}

const profile = (family: AttackFamily, windupMs: number, travelMs: number, camera: AttackProfile["camera"] = "none"): AttackProfile => ({
  family,
  windupMs,
  travelMs,
  hitMs: family === "melee" || family === "pulse" ? 190 : 150,
  camera,
  soundSet: family,
  vfxPreset: `attack-${family}`,
});

export interface CardPresentation {
  attack: AttackProfile;
  rarityBudget: "R" | "SR" | "SSR" | "UR";
  soundMark?: SoundTone;
}

export const CARD_PRESENTATION: Record<string, CardPresentation> = {
  "dawn-scout": { attack: profile("bolt", 110, 380), rarityBudget: "R" },
  "iron-guard": { attack: profile("melee", 140, 290), rarityBudget: "R" },
  "void-pickpocket": { attack: profile("dash", 90, 310), rarityBudget: "R" },
  "ember-adept": { attack: profile("bolt", 100, 350), rarityBudget: "R" },
  "wild-bloom": { attack: profile("swarm", 120, 410), rarityBudget: "R" },
  "sunblade": { attack: profile("melee", 150, 320, "micro"), rarityBudget: "SR" },
  "mirror-smith": { attack: profile("pulse", 150, 250), rarityBudget: "SR" },
  "night-conductor": { attack: profile("beam", 120, 430), rarityBudget: "SR" },
  "aether-weaver": { attack: profile("beam", 110, 450), rarityBudget: "SR" },
  "dust-rider": { attack: profile("dash", 90, 300, "micro"), rarityBudget: "SR" },
  "star-archivist": { attack: profile("bolt", 120, 400), rarityBudget: "SR" },
  "hollow-beast": { attack: profile("pulse", 160, 290, "micro"), rarityBudget: "SR" },
  "forge-singer": { attack: profile("pulse", 130, 270), rarityBudget: "SSR", soundMark: "metal" },
  "comet-ranger": { attack: profile("bolt", 110, 420, "micro"), rarityBudget: "SSR", soundMark: "star" },
  "rift-oracle": { attack: profile("beam", 130, 470, "micro"), rarityBudget: "SSR", soundMark: "pulse" },
  "bastion-warden": { attack: profile("melee", 170, 300, "micro"), rarityBudget: "SSR", soundMark: "metal" },
  "thunder-herd": { attack: profile("arc", 130, 380, "micro"), rarityBudget: "SSR", soundMark: "thunder" },
  "astral-queen": { attack: profile("beam", 150, 460, "strong"), rarityBudget: "UR", soundMark: "star" },
  "void-emperor": { attack: profile("beam", 150, 440, "strong"), rarityBudget: "UR", soundMark: "vacuum" },
  "prism-dragon": { attack: profile("arc", 160, 470, "strong"), rarityBudget: "UR", soundMark: "pulse" },
  "iron-colossus": { attack: profile("pulse", 190, 270, "strong"), rarityBudget: "UR", soundMark: "metal" },
  "world-root": { attack: profile("swarm", 170, 490, "strong"), rarityBudget: "UR", soundMark: "thunder" },
  "wind-wisp": { attack: profile("swarm", 90, 320), rarityBudget: "R" },
  "dawn-horn": { attack: profile("bolt", 100, 360), rarityBudget: "R" },
  "wall-smith": { attack: profile("melee", 150, 300), rarityBudget: "R" },
  "seed-guardian": { attack: profile("melee", 120, 320), rarityBudget: "R" },
  "rune-seeker": { attack: profile("bolt", 110, 400), rarityBudget: "R" },
  "night-tide": { attack: profile("bolt", 100, 380), rarityBudget: "R" },
  "sky-lantern": { attack: profile("bolt", 120, 410), rarityBudget: "SR" },
  "solar-judge": { attack: profile("melee", 150, 310, "micro"), rarityBudget: "SR" },
  "grave-watcher": { attack: profile("pulse", 140, 280), rarityBudget: "SR" },
  "siege-engine": { attack: profile("bolt", 160, 450, "micro"), rarityBudget: "SR" },
  "time-echo": { attack: profile("bolt", 110, 420), rarityBudget: "SR" },
  "wild-mother": { attack: profile("swarm", 150, 420), rarityBudget: "SR" },
  "titan-keeper": { attack: profile("melee", 180, 310, "micro"), rarityBudget: "SSR", soundMark: "metal" },
  "stone-golem": { attack: profile("melee", 150, 310), rarityBudget: "R" },
  "sprout": { attack: profile("swarm", 80, 300), rarityBudget: "R" },
  "venom-viper": { attack: profile("melee", 110, 300), rarityBudget: "R" },
  "ancient-egg": { attack: profile("pulse", 140, 260), rarityBudget: "SR" },
  "lute-officer": { attack: profile("bolt", 110, 380), rarityBudget: "R" },
  "seal-maiden": { attack: profile("melee", 140, 300), rarityBudget: "R" },
  "night-whistle": { attack: profile("bolt", 100, 350), rarityBudget: "R" },
  "edict-clerk": { attack: profile("bolt", 120, 400), rarityBudget: "SR", soundMark: "star" },
  "crimson-guardian": { attack: profile("melee", 150, 310), rarityBudget: "SR", soundMark: "star" },
  "dawn-herald": { attack: profile("dash", 90, 310), rarityBudget: "SR", soundMark: "star" },
  "mirror-tutor": { attack: profile("bolt", 120, 400), rarityBudget: "SR" },
  "celestial-weaver": { attack: profile("beam", 120, 450), rarityBudget: "SSR", soundMark: "star" },
  "eclipse-princess": { attack: profile("beam", 150, 460), rarityBudget: "UR", soundMark: "star" },
  "gatekeeper-old": { attack: profile("melee", 150, 300), rarityBudget: "R" },
  "royal-herald": { attack: profile("bolt", 100, 360), rarityBudget: "R" },
  "shadow-warden": { attack: profile("dash", 90, 310), rarityBudget: "R" },
  "tide-singer": { attack: profile("bolt", 100, 380), rarityBudget: "R" },
  "ghost-bell": { attack: profile("pulse", 130, 270), rarityBudget: "R" },
  "bone-lantern": { attack: profile("pulse", 120, 280), rarityBudget: "SR", soundMark: "vacuum" },
  "void-whisper": { attack: profile("beam", 120, 430), rarityBudget: "SR", soundMark: "vacuum" },
  "crypt-keeper": { attack: profile("dash", 90, 310), rarityBudget: "R" },
  "abyss-reader": { attack: profile("pulse", 140, 280), rarityBudget: "SR" },
  "night-queen": { attack: profile("beam", 130, 440), rarityBudget: "SSR", soundMark: "vacuum" },
  "moonless": { attack: profile("beam", 150, 440), rarityBudget: "UR", soundMark: "vacuum" },
  "ferryman": { attack: profile("melee", 150, 300), rarityBudget: "R" },
  "shadow-claw": { attack: profile("dash", 90, 310), rarityBudget: "SR" },
  "star-stitcher": { attack: profile("bolt", 110, 400), rarityBudget: "R" },
  "clock-maiden": { attack: profile("bolt", 100, 380), rarityBudget: "R" },
  "rune-calligrapher": { attack: profile("bolt", 110, 400), rarityBudget: "R" },
  "fate-dancer": { attack: profile("dash", 90, 320), rarityBudget: "SR", soundMark: "pulse" },
  "thread-puppeteer": { attack: profile("beam", 120, 450), rarityBudget: "SR", soundMark: "pulse" },
  "void-mathematician": { attack: profile("bolt", 110, 420), rarityBudget: "SR" },
  "prophecy-weaver": { attack: profile("beam", 130, 470), rarityBudget: "SSR", soundMark: "pulse" },
  "eclipse-calculator": { attack: profile("beam", 150, 470), rarityBudget: "UR", soundMark: "pulse" },
  "chess-master": { attack: profile("melee", 140, 290), rarityBudget: "SR" },
  "hourglass": { attack: profile("pulse", 140, 260), rarityBudget: "R" },
  "rivet-forger": { attack: profile("melee", 140, 290), rarityBudget: "R" },
  "armor-tailor": { attack: profile("melee", 130, 300), rarityBudget: "R" },
  "siege-matron": { attack: profile("bolt", 160, 450), rarityBudget: "R" },
  "gear-dancer": { attack: profile("dash", 90, 300), rarityBudget: "SR", soundMark: "metal" },
  "furnace-priestess": { attack: profile("pulse", 140, 280), rarityBudget: "SR", soundMark: "metal" },
  "blueprint-warden": { attack: profile("melee", 150, 310), rarityBudget: "SR" },
  "anvil-queen": { attack: profile("pulse", 150, 250), rarityBudget: "SSR", soundMark: "metal" },
  "zero-warden": { attack: profile("pulse", 190, 270), rarityBudget: "UR", soundMark: "metal" },
  "gate-mason": { attack: profile("melee", 150, 300), rarityBudget: "R" },
  "iron-dog": { attack: profile("melee", 110, 300), rarityBudget: "R" },
  "root-daughter": { attack: profile("swarm", 120, 410), rarityBudget: "R" },
  "rain-girl": { attack: profile("bolt", 100, 380), rarityBudget: "R" },
  "seed-weaver": { attack: profile("melee", 120, 320), rarityBudget: "R" },
  "bloom-singer": { attack: profile("swarm", 120, 410), rarityBudget: "SR", soundMark: "thunder" },
  "valley-mother": { attack: profile("swarm", 150, 420), rarityBudget: "SR", soundMark: "thunder" },
  "star-fruit": { attack: profile("swarm", 90, 320), rarityBudget: "R" },
  "earth-dancer": { attack: profile("pulse", 140, 260), rarityBudget: "SR" },
  "world-bloom": { attack: profile("swarm", 170, 490), rarityBudget: "UR", soundMark: "thunder" },
  "wind-sister": { attack: profile("dash", 90, 300), rarityBudget: "SR" },
  "ox-herd": { attack: profile("melee", 150, 310), rarityBudget: "R" },
};

export const SKILL_PRESENTATION: Record<string, SkillPresentation> = {
  "battlecry-draw": { tier: "S2", priority: "normal", targetMode: "self", baseVfx: "star-gate", soundSet: "draw" },
  taunt: { tier: "S1", priority: "normal", targetMode: "self", baseVfx: "guard-wall", soundSet: "guard" },
  quick: { tier: "S2", priority: "important", targetMode: "self", baseVfx: "rift-step", soundSet: "dash" },
  "battlecry-hero-damage": { tier: "S3", priority: "important", targetMode: "hero", baseVfx: "ember-mark", soundSet: "flame" },
  "end-heal": { tier: "S2", priority: "normal", targetMode: "single", baseVfx: "spore-link", soundSet: "heal" },
  pierce: { tier: "S3", priority: "important", targetMode: "hero", baseVfx: "solar-line", soundSet: "pierce" },
  ward: { tier: "S2", priority: "important", targetMode: "self", baseVfx: "prism-shield", soundSet: "shield" },
  "battlecry-buff": { tier: "S3", priority: "important", targetMode: "multi", baseVfx: "tide-command", soundSet: "command" },
  "battlecry-discount": { tier: "S2", priority: "normal", targetMode: "self", baseVfx: "aether-weave", soundSet: "arcane" },
  "double-strike": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "wind-return", soundSet: "dash" },
  "death-draw": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "stardust-memory", soundSet: "memory" },
  "death-burst": { tier: "S3", priority: "important", targetMode: "hero", baseVfx: "void-collapse", soundSet: "void" },
  "end-buff": { tier: "S2", priority: "normal", targetMode: "single", baseVfx: "forge-chord", soundSet: "forge" },
  "splash-hero": { tier: "S3", priority: "important", targetMode: "hero", baseVfx: "comet-echo", soundSet: "bolt" },
  "turn-burn": { tier: "S4", priority: "major", targetMode: "multi", baseVfx: "prophecy-burn", soundSet: "prophecy" },
  "last-stand": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "bastion-crack", soundSet: "guard" },
  "battlecry-token": { tier: "S3", priority: "important", targetMode: "board", baseVfx: "storm-call", soundSet: "thunder" },
  "battlecry-banner": { tier: "S4", priority: "major", targetMode: "multi", baseVfx: "stellar-crown", soundSet: "crown" },
  revive: { tier: "S4", priority: "major", targetMode: "self", baseVfx: "night-return", soundSet: "revive" },
  "turn-grow": { tier: "S2", priority: "normal", targetMode: "self", baseVfx: "aurora-growth", soundSet: "prism" },
  "stasis-field": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "stasis-field", soundSet: "stasis" },
  "end-heal-all": { tier: "S4", priority: "major", targetMode: "multi", baseVfx: "root-revival", soundSet: "growth" },
  "wisp-core-heal": { tier: "S2", priority: "normal", targetMode: "hero", baseVfx: "wind-heal", soundSet: "heal" },
  "battlecry-hero-heal": { tier: "S2", priority: "important", targetMode: "hero", baseVfx: "dew-restore", soundSet: "heal" },
  "battlecry-spell-discount": { tier: "S2", priority: "normal", targetMode: "self", baseVfx: "rune-rubbing", soundSet: "arcane" },
  "battlecry-hero-damage-draw": { tier: "S3", priority: "important", targetMode: "hero", baseVfx: "tide-whisper", soundSet: "tide" },
  "end-heal-one": { tier: "S2", priority: "normal", targetMode: "single", baseVfx: "lantern-mend", soundSet: "heal" },
  lifesteal: { tier: "S3", priority: "important", targetMode: "hero", baseVfx: "verdict-light", soundSet: "verdict" },
  "death-strike": { tier: "S3", priority: "important", targetMode: "single", baseVfx: "paper-ash", soundSet: "void" },
  "battlecry-board-damage": { tier: "S3", priority: "important", targetMode: "multi", baseVfx: "tremor-round", soundSet: "cannon" },
  "end-ping": { tier: "S2", priority: "normal", targetMode: "single", baseVfx: "echo-slice", soundSet: "arcane" },
  "ward-start": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "armor-ward", soundSet: "shield" },
  "death-token": { tier: "S3", priority: "important", targetMode: "board", baseVfx: "root-rebirth", soundSet: "growth" },
  "death-heal": { tier: "S2", priority: "normal", targetMode: "hero", baseVfx: "sprout-return", soundSet: "heal" },
  "spell-strike": { tier: "S2", priority: "important", targetMode: "single", baseVfx: "ember-spark", soundSet: "bolt" },
  "spell-draw-discount": { tier: "S2", priority: "normal", targetMode: "self", baseVfx: "fate-slip", soundSet: "draw" },
  "spell-temp-mana": { tier: "S2", priority: "normal", targetMode: "self", baseVfx: "coin-light", soundSet: "coin" },
  "spell-heal": { tier: "S2", priority: "important", targetMode: "single", baseVfx: "root-set", soundSet: "heal" },
  "spell-buff": { tier: "S3", priority: "important", targetMode: "single", baseVfx: "ink-bless", soundSet: "arcane" },
  "spell-hero-heal": { tier: "S2", priority: "important", targetMode: "hero", baseVfx: "dawn-ointment", soundSet: "heal" },
  "spell-summon": { tier: "S3", priority: "important", targetMode: "board", baseVfx: "golem-rune", soundSet: "cannon" },
  "spell-burst": { tier: "S3", priority: "important", targetMode: "multi", baseVfx: "oblivion-page", soundSet: "void" },
  "spell-buff-all": { tier: "S4", priority: "major", targetMode: "multi", baseVfx: "bloom-flood", soundSet: "growth" },
  venom: { tier: "S3", priority: "important", targetMode: "single", baseVfx: "venom-fang", soundSet: "void" },
  "spell-silence": { tier: "S3", priority: "important", targetMode: "single", baseVfx: "dust-seal", soundSet: "arcane" },
  "spell-freeze": { tier: "S2", priority: "important", targetMode: "single", baseVfx: "stasis-needle", soundSet: "arcane" },
  "spell-weak": { tier: "S2", priority: "normal", targetMode: "single", baseVfx: "rust-fetter", soundSet: "forge" },
  discover: { tier: "S4", priority: "major", targetMode: "board", baseVfx: "astral-insight", soundSet: "arcane" },
  "death-random-token": { tier: "S3", priority: "important", targetMode: "board", baseVfx: "root-rebirth", soundSet: "growth" },
  "weapon-plain": { tier: "S2", priority: "normal", targetMode: "self", baseVfx: "star-burst", soundSet: "metal" },
  "secret-heal": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "mirror-guard", soundSet: "heal" },
  "secret-draw": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "spell-eater", soundSet: "arcane" },
  "secret-strike": { tier: "S3", priority: "important", targetMode: "single", baseVfx: "spike-field", soundSet: "forge" },
  "battlecry-tutor": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "rune-rubbing", soundSet: "arcane" },
  "battlecry-mana": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "coin-light", soundSet: "coin" },
  "conditional-buff": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "seal-awaken", soundSet: "guard" },
  "conditional-damage": { tier: "S4", priority: "major", targetMode: "hero", baseVfx: "eclipse-mark", soundSet: "prophecy" },
  "end-conditional-buff": { tier: "S3", priority: "important", targetMode: "single", baseVfx: "weave-mend", soundSet: "heal" },
  "overkill-draw": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "whistle-echo", soundSet: "draw" },
  "quick-overkill-draw": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "whistle-echo", soundSet: "draw" },
  "death-tutor": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "stardust-memory", soundSet: "memory" },
  "spell-tutor-draw": { tier: "S3", priority: "important", targetMode: "self", baseVfx: "rune-rubbing", soundSet: "arcane" },
  "spell-heal-or-draw": { tier: "S2", priority: "normal", targetMode: "single", baseVfx: "root-set", soundSet: "heal" },
  "counter-spell": { tier: "S4", priority: "major", targetMode: "self", baseVfx: "mirror-guard", soundSet: "arcane" },
};

export function getAttackProfile(cardId: string): AttackProfile {
  return CARD_PRESENTATION[cardId]?.attack ?? profile("bolt", 110, 380);
}

export function getSkillPresentation(effect: string): SkillPresentation {
  return SKILL_PRESENTATION[effect] ?? { tier: "S2", priority: "normal", targetMode: "single", baseVfx: "generic-skill", soundSet: "skill" };
}