import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const outputDirectory = mkdtempSync(join(tmpdir(), "astra-engine-smoke-"));
const viteBin = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");

try {
  execFileSync(process.execPath, [viteBin, "build", "--config", "scripts/vite-ssr.config.mjs", "--outDir", outputDirectory, "--emptyOutDir"], { stdio: "pipe" });
  const bundledEngine = join(outputDirectory, "engine.js");
  const moduleEngine = join(outputDirectory, "engine.mjs");
  renameSync(bundledEngine, moduleEngine);
  const engine = await import(pathToFileURL(moduleEngine).href);
  const deck = [
    "dawn-scout", "iron-guard", "ember-adept", "night-conductor", "aether-weaver",
    "dust-rider", "star-archivist", "hollow-beast", "forge-singer", "comet-ranger",
    "rift-oracle", "thunder-herd", "astral-queen", "void-emperor", "prism-dragon",
  ];
  let state = engine.createBattle(deck, [...deck].reverse());
  if (state.player.mana !== 1 || state.enemy.mana !== 1) throw new Error("首回合法力应当对称");
  if (state.player.nextCheaper !== 0 || state.enemy.nextCheaper !== 0) throw new Error("双方开局都不应获得先锋指令减费");
  const openingPlayState = engine.createBattle(deck, deck);
  if (!openingPlayState.enemy.hand.some((unit) => unit.defId === "astral-coin")) throw new Error("后手开局应获得一枚星辉令");
  if (openingPlayState.player.hand.some((unit) => unit.defId === "astral-coin")) throw new Error("先手开局不应获得星辉令");
  const coinIndex = openingPlayState.enemy.hand.findIndex((unit) => unit.defId === "astral-coin");
  openingPlayState.enemy.hand[coinIndex].cost = 0;
  engine.endTurn(openingPlayState);
  engine.playSpell(openingPlayState, "enemy", coinIndex, undefined);
  if (openingPlayState.enemy.mana !== 2) throw new Error("星辉令应使后手首回合法力 +1");
  if (state.player.hand.length !== 3 || state.enemy.hand.length !== 7) throw new Error("先后手应分别从随机洗牌后的牌库抽取 3 张与 6 张手牌，后手另持一枚星辉令");
  state = engine.endTurn(state);
  if (state.turn !== "enemy" || state.enemy.mana !== 1 || state.enemy.maxMana !== 1) throw new Error("后手首回合不应额外获得法力");
  if (state.enemy.hand.length !== 7) throw new Error("后手首回合不应额外抽牌");
  state = engine.endTurn(state);
  if (state.turn !== "player" || state.player.mana !== 2 || state.player.maxMana !== 2) throw new Error("第 2 回合应当获得第 2 点法力");
  if (state.enemy.maxMana !== 2) throw new Error("新轮开始时双方的法力上限应同步");
  if (state.player.hand.length !== 4) throw new Error("我方第二回合开始时应自动抽取 1 张牌");
  state = engine.endTurn(state);
  if (state.turn !== "enemy" || state.enemy.mana !== 2 || state.enemy.maxMana !== 2) throw new Error("双方在同一轮应拥有相同的法力上限");

  const wardState = engine.createBattle(deck, deck);
  const sunblade = engine.createUnit("star-archivist", 9001);
  const mirror = engine.createUnit("mirror-smith", 9002);
  sunblade.canAttack = true;
  wardState.player.board = [sunblade];
  wardState.enemy.board = [mirror];
  const wardPreview = engine.getAttackPreview(wardState, "player", sunblade.uid, { hero: false, uid: mirror.uid });
  if (!wardPreview || wardPreview.damage !== 1 || wardPreview.targetAfter !== 4 || !wardPreview.notes.includes("减至 1")) throw new Error("攻击预演应准确显示折光装甲减伤");
  engine.attackTarget(wardState, "player", sunblade.uid, { hero: false, uid: mirror.uid });
  if (mirror.health !== 4 || mirror.flags.wardUsed !== 1) throw new Error("折光装甲应只将首次伤害降至 1 点");
  sunblade.canAttack = true;
  engine.attackTarget(wardState, "player", sunblade.uid, { hero: false, uid: mirror.uid });
  if (mirror.health !== 1) throw new Error("折光装甲消耗后应承受完整伤害");

  const stasisState = engine.createBattle(deck, deck);
  const stasisAttacker = engine.createUnit("bastion-warden", 9051);
  const colossus = engine.createUnit("iron-colossus", 9052);
  stasisAttacker.canAttack = true;
  stasisState.player.board = [stasisAttacker];
  stasisState.enemy.board = [colossus];
  engine.attackTarget(stasisState, "player", stasisAttacker.uid, { hero: false, uid: colossus.uid });
  if (colossus.health !== 10 || colossus.flags.stasisUsed !== 1) throw new Error("静滞力场应完全免疫首次伤害");
  stasisAttacker.canAttack = true;
  engine.attackTarget(stasisState, "player", stasisAttacker.uid, { hero: false, uid: colossus.uid });
  if (colossus.health !== 7) throw new Error("静滞力场解除后应承受完整伤害");

  const rootState = engine.createBattle(deck, deck);
  const root = engine.createUnit("world-root", 9061);
  const woundedScout = engine.createUnit("dawn-scout", 9062);
  root.health = 8;
  woundedScout.health = 1;
  rootState.player.board = [root, woundedScout];
  engine.endTurn(rootState);
  if (root.health !== 9 || woundedScout.health !== 2) throw new Error("无尽复苏应为所有受伤友军恢复 1 点生命");

  const wispState = engine.createBattle(deck, deck);
  wispState.player.hand = [engine.createUnit("thunder-herd", 9071)];
  wispState.player.mana = 10;
  wispState.player.nextCheaper = 0;
  wispState.player.heroHealth = 25;
  engine.playCard(wispState, "player", 0);
  if (wispState.player.heroHealth !== 26 || !wispState.fx.some((event) => event.type === "skill" && event.label === "回风")) throw new Error("雷霆兽群召唤的风灵应触发回风并治疗核心");

  const pursuitState = engine.createBattle(deck, deck);
  const rider = engine.createUnit("dust-rider", 9101);
  const scout = engine.createUnit("dawn-scout", 9102);
  rider.canAttack = true;
  pursuitState.player.board = [rider];
  pursuitState.enemy.board = [scout];
  engine.attackTarget(pursuitState, "player", rider.uid, { hero: false, uid: scout.uid });
  if (!rider.canAttack) throw new Error("尘风骑手击破单位后应可再次攻击");
  engine.attackTarget(pursuitState, "player", rider.uid, { hero: true });
  if (pursuitState.enemy.heroHealth !== 26 || rider.canAttack) throw new Error("尘风骑手的追击只能来自击破单位，不能造成双击斩杀");

  const hornState = engine.createBattle(deck, deck);
  hornState.player.hand = [engine.createUnit("dawn-horn", 9151)];
  hornState.player.mana = 10;
  hornState.player.nextCheaper = 0;
  hornState.player.heroHealth = 24;
  engine.playCard(hornState, "player", 0);
  if (hornState.player.heroHealth !== 26) throw new Error("晨钟使应为我方核心恢复 2 点生命");

  const lifeState = engine.createBattle(deck, deck);
  const judge = engine.createUnit("solar-judge", 9161);
  const lifeScout = engine.createUnit("dawn-scout", 9162);
  judge.canAttack = true;
  lifeState.player.board = [judge];
  lifeState.enemy.board = [lifeScout];
  lifeState.player.heroHealth = 20;
  engine.attackTarget(lifeState, "player", judge.uid, { hero: false, uid: lifeScout.uid });
  if (lifeState.player.heroHealth !== 23) throw new Error("明镜推官吸血应恢复与伤害等量的生命（3 点攻击造成 3 点伤害）");

  const sproutState = engine.createBattle(deck, deck);
  const guard = engine.createUnit("seed-guardian", 9171);
  const enemyBeast = engine.createUnit("hollow-beast", 9172);
  sproutState.player.board = [guard];
  sproutState.enemy.board = [enemyBeast];
  sproutState.turn = "enemy";
  enemyBeast.canAttack = true;
  engine.attackTarget(sproutState, "enemy", enemyBeast.uid, { hero: false, uid: guard.uid });
  if (sproutState.player.board.length !== 1 || sproutState.player.board[0].defId !== "sprout") throw new Error("种卫死亡后应留下一株幼苗");

  const wardStartState = engine.createBattle(deck, deck);
  const keeper = engine.createUnit("titan-keeper", 9181);
  const keeperAttacker = engine.createUnit("hollow-beast", 9182);
  wardStartState.turn = "enemy";
  keeperAttacker.canAttack = true;
  wardStartState.player.board = [keeper];
  wardStartState.enemy.board = [keeperAttacker];
  engine.attackTarget(wardStartState, "enemy", keeperAttacker.uid, { hero: false, uid: keeper.uid });
  if (keeper.health !== 7) throw new Error("甲胄（折光）应把兵俑看守首次受到的 4 点伤害减至 1");

  const spellState = engine.createBattle(deck, deck);
  spellState.player.hand = [engine.createUnit("shadow-bolt", 9201)];
  spellState.player.mana = 10;
  spellState.player.nextCheaper = 0;
  const boltTarget = engine.createUnit("iron-guard", 9202);
  spellState.enemy.board = [boltTarget];
  const boltOptions = engine.getSpellPlayOptions(spellState, "player", 0);
  if (!boltOptions.playable || !boltOptions.needsTarget || !boltOptions.enemyUnits.includes(boltTarget.uid)) throw new Error("蚀影箭应列出敌方单位作为合法目标");
  engine.playSpell(spellState, "player", 0, { uid: boltTarget.uid });
  if (spellState.player.hand.length !== 0 || boltTarget.health !== 1) throw new Error("蚀影箭应对目标单位造成 3 点伤害");
  if (!spellState.fx.some((event) => event.type === "spell")) throw new Error("法术应产生 spell 事件");

  const burstState = engine.createBattle(deck, deck);
  burstState.player.hand = [engine.createUnit("forget-curse", 9211)];
  burstState.player.mana = 10;
  burstState.player.nextCheaper = 0;
  burstState.enemy.board = [engine.createUnit("dawn-scout", 9212), engine.createUnit("wall-smith", 9213)];
  engine.playCard(burstState, "player", 0);
  if (burstState.enemy.board.length !== 1 || burstState.enemy.board[0].defId !== "wall-smith" || burstState.enemy.board[0].health !== 2) throw new Error("忘川揭页应对所有敌方单位造成 2 点伤害（1/2 被消灭，1/4 剩 2 血）");

  const buffState = engine.createBattle(deck, deck);
  buffState.player.hand = [engine.createUnit("bloom-sea", 9221)];
  buffState.player.mana = 10;
  buffState.player.nextCheaper = 0;
  const buffAlly = engine.createUnit("iron-guard", 9222);
  buffState.player.board = [buffAlly];
  engine.playSpell(buffState, "player", 0);
  if (buffAlly.attack !== 3 || buffAlly.health !== 5) throw new Error("花海应使所有友军获得 +1/+1");

  const summonState = engine.createBattle(deck, deck);
  summonState.player.hand = [engine.createUnit("golem-rune", 9231)];
  summonState.player.mana = 10;
  summonState.player.nextCheaper = 0;
  engine.playSpell(summonState, "player", 0);
  if (summonState.player.board.length !== 1 || summonState.player.board[0].defId !== "stone-golem") throw new Error("机关俑应召唤一个石俑");

  const healState = engine.createBattle(deck, deck);
  healState.player.hand = [engine.createUnit("earth-roots", 9241)];
  healState.player.mana = 10;
  healState.player.nextCheaper = 0;
  const healAlly = engine.createUnit("sunblade", 9242);
  healAlly.health = 1;
  healState.player.board = [healAlly];
  const healOptions = engine.getSpellPlayOptions(healState, "player", 0);
  if (!healOptions.allyUnits.includes(healAlly.uid)) throw new Error("地脉根须应列出友方单位作为合法目标");
  engine.playSpell(healState, "player", 0, { uid: healAlly.uid });
  if (healAlly.health !== 3) throw new Error("地脉根须应为一个友方单位恢复 4 点生命（上限为最大生命）");

  const discountState = engine.createBattle(deck, deck);
  discountState.player.hand = [engine.createUnit("fate-charm", 9251), engine.createUnit("shadow-bolt", 9252)];
  discountState.player.mana = 10;
  discountState.player.nextCheaper = 0;
  discountState.enemy.board = [engine.createUnit("iron-guard", 9253)];
  engine.playSpell(discountState, "player", 0);
  if (discountState.player.nextSpellCheaper !== 1) throw new Error("命符应使下一张法术费用 -1");
  const discountedCost = engine.getSpellPlayOptions(discountState, "player", 0).cost;
  if (discountedCost !== 1) throw new Error("命符折扣应使 2 费法术降为 1 费");

  state = engine.createBattle(deck, [...deck].reverse());
  for (let round = 0; round < 24 && !state.winner; round += 1) {
    if (state.turn === "player") {
      let playableIndex = state.player.hand.findIndex((unit) => Math.max(0, unit.cost - state.player.nextCheaper) <= state.player.mana && (unit.defKind === "spell" || unit.defKind === "weapon" || state.player.board.length < 6));
      while (playableIndex >= 0) {
        state = engine.playCard(state, "player", playableIndex);
        playableIndex = state.player.hand.findIndex((unit) => Math.max(0, unit.cost - state.player.nextCheaper) <= state.player.mana && (unit.defKind === "spell" || unit.defKind === "weapon" || state.player.board.length < 6));
      }
      for (const unit of [...state.player.board]) {
        const targets = engine.getValidTargets(state, "player", unit.uid);
        if (targets.units.length) state = engine.attackTarget(state, "player", unit.uid, { hero: false, uid: targets.units[0] });
        else if (targets.hero) state = engine.attackTarget(state, "player", unit.uid, { hero: true });
      }
      state = engine.endTurn(state);
    } else {
      state = engine.aiTurn(state);
    }
  }
  const emitted = new Set(state.fx.map((event) => event.type));
  for (const eventType of ["summon", "attack", "damage", "skill"]) {
    if (!emitted.has(eventType)) throw new Error(`缺少 ${eventType} 引擎事件`);
  }
  if (!state.log.length || state.turnNumber < 3) throw new Error("对战未推进到有效回合");
  const noviceState = engine.createBattle(deck, [...deck].reverse());
  noviceState.turn = "enemy";
  noviceState.enemy.mana = 10;
  noviceState.enemy.maxMana = 10;
  const noviceHandBefore = noviceState.enemy.hand.length;
  engine.aiTurn(noviceState, "novice");
  if (noviceState.enemy.hand.length < noviceHandBefore - 1) throw new Error("新手 AI 每回合最多部署一个单位");

  const masterState = engine.createBattle(deck, [...deck].reverse());
  masterState.turn = "enemy";
  masterState.enemy.mana = 10;
  masterState.enemy.maxMana = 10;
  engine.aiTurn(masterState, "master");
  if (masterState.winner === "player") throw new Error("专家 AI 不应在满法力开局中直接输给空场");

  const comboState = engine.createBattle(deck, deck);
  comboState.player.hand = [engine.createUnit("dawn-scout", 9301), engine.createUnit("ember-adept", 9302)];
  comboState.player.deck = ["iron-guard", "iron-guard"];
  comboState.player.mana = 10;
  comboState.player.maxMana = 10;
  engine.playCard(comboState, "player", 0);
  engine.playCard(comboState, "player", 0);
  const comboLogCheck = comboState.log.some((entry) => entry.includes("天衡与天机相映"));
  if (comboState.player.hand.length !== 2 || !comboLogCheck) throw new Error("天衡与天机的呼应应额外抽取 1 张牌");
  console.log(`引擎烟测通过：${state.turnNumber} 回合，${state.fx.length} 个特效事件，胜者：${state.winner ?? "未决"}`);
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}



