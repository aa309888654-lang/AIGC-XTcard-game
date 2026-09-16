import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outputDirectory = mkdtempSync(join(tmpdir(), "astra-presentation-smoke-"));
const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  execFileSync(process.execPath, [viteBin, "build", "--ssr", "src/data/presentation.ts", "--config", "scripts/vite-ssr.config.mjs", "--outDir", outputDirectory, "--emptyOutDir"], { stdio: "pipe" });
  renameSync(join(outputDirectory, "presentation.js"), join(outputDirectory, "presentation.mjs"));
  const presentation = await import(pathToFileURL(join(outputDirectory, "presentation.mjs")).href);
  const cardSource = readFileSync(join(root, "src", "data", "cards.ts"), "utf8");
  const unitIds = [...cardSource.matchAll(/unit\(\{ id: "([a-z0-9-]+)"/g)].map((match) => match[1]);
  const effects = [...cardSource.matchAll(/effect: "([a-z0-9-]+)"/g)].map((match) => match[1]);
  const attackFamilies = new Set(["melee", "dash", "bolt", "beam", "arc", "swarm", "pulse"]);
  const profiles = presentation.CARD_PRESENTATION;
  assert(unitIds.length > 0, "应至少有一张单位卡");
  assert(unitIds.every((id) => profiles[id]), "每张单位必须有攻击表现配置");
  for (const id of unitIds) {
    const attack = profiles[id].attack;
    assert(attackFamilies.has(attack.family), `${id} 使用了未知攻击家族`);
    assert(attack.windupMs > 0 && attack.travelMs > 0 && attack.hitMs > 0, `${id} 攻击时序必须为正数`);
    assert(attack.vfxPreset.startsWith("attack-"), `${id} 缺少攻击 VFX 预设`);
  }
  const attackSource = readFileSync(join(root, "src", "components", "vfx", "attack.ts"), "utf8");
  for (const family of [...attackFamilies].filter((entry) => entry !== "beam")) {
    assert(attackSource.includes(`play${family[0].toUpperCase()}${family.slice(1)}`), `攻击渲染层缺少 ${family} 家族实现`);
  }
  assert(attackSource.includes("export function playAttack"), "攻击渲染层缺少 playAttack 分发入口");
  assert(attackSource.includes("return playProjectile"), "playAttack 应回退到 beam 曲线弹体");
  const soundTones = new Set(["star", "vacuum", "pulse", "metal", "thunder"]);
  for (const id of unitIds) {
    const rarityBudget = profiles[id].rarityBudget;
    if (rarityBudget === "SSR" || rarityBudget === "UR") {
      assert(soundTones.has(profiles[id].soundMark), `${id}（${rarityBudget}）必须有逐卡声音标记`);
    }
  }
  assert(effects.every((effect) => presentation.SKILL_PRESENTATION[effect]), "每种规则技能必须有表现配置");
  for (const id of ["astral-queen", "void-emperor", "prism-dragon", "iron-colossus", "world-root"]) {
    assert(profiles[id].rarityBudget === "UR", `${id} 必须使用 UR 演出预算`);
  }
  const battleSource = readFileSync(join(root, "src", "components", "Battle.tsx"), "utf8");
  for (const token of ["CombatInteractionState", "getAttackPreview", "targetPreview", "target-prediction", "handleTargetPreview"]) {
    assert(battleSource.includes(token), `战斗交互层缺少 ${token}`);
  }
  console.log(`表现烟测通过：${unitIds.length} 张单位、${new Set(effects).size} 种技能、${attackFamilies.size} 类攻击家族；交互预演入口完整`);
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}