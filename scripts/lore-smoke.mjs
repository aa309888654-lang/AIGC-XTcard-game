import { access } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [{ CARD_POOL }, world] = await Promise.all([
    server.ssrLoadModule("/src/data/cards.ts"),
    server.ssrLoadModule("/src/data/world.ts"),
  ]);
  const { CHARACTER_STORIES, CHRONICLE, FACTIONS, PLAYER_MANDATE, STORY_ARCS, WORLD_PREMISE } = world;

  const cardIds = CARD_POOL.map((card) => card.id);
  const uniqueCardIds = new Set(cardIds);
  if (uniqueCardIds.size !== CARD_POOL.length) throw new Error("卡牌 ID 存在重复");

  const factionIds = FACTIONS.map((faction) => faction.id);
  const uniqueFactionIds = new Set(factionIds);
  const cardTypes = new Set(CARD_POOL.map((card) => card.type));
  if (uniqueFactionIds.size !== FACTIONS.length) throw new Error("阵营 ID 存在重复");
  if (FACTIONS.length !== 5 || cardTypes.size !== 5) throw new Error("阵营数量必须为 5");
  for (const type of cardTypes) {
    if (!uniqueFactionIds.has(type)) throw new Error(`卡牌阵营 ${type} 缺少世界观档案`);
  }

  const storyIds = Object.keys(CHARACTER_STORIES);
  for (const card of CARD_POOL) {
    const story = CHARACTER_STORIES[card.id];
    if (!story) throw new Error(`${card.name} 缺少人物主线档案`);
    const detailedFields = ["chapter", "role", "connection", "quote"];
    const profileFields = ["gender", "age", "personality", "growthExperience", "trajectory"];
    for (const field of [...detailedFields, ...profileFields]) {
      const minimumLength = detailedFields.includes(field) ? 6 : 1;
      if (typeof story[field] !== "string" || story[field].trim().length < minimumLength) {
        throw new Error(`${card.name} 的 ${field} 档案不完整`);
      }
    }
    await access(join(process.cwd(), "public", "assets", "cards", `${card.id}.png`));
  }
  for (const storyId of storyIds) {
    if (!uniqueCardIds.has(storyId)) throw new Error(`人物档案 ${storyId} 没有对应卡牌`);
  }

  const assignedCards = new Set();
  for (const faction of FACTIONS) {
    if (!CARD_POOL.some((card) => card.name === faction.leader && card.type === faction.id)) {
      throw new Error(`${faction.id} 领袖 ${faction.leader} 不在本阵营卡牌中`);
    }
    const expected = new Set(CARD_POOL.filter((card) => card.type === faction.id).map((card) => card.id));
    const actual = new Set(faction.cards);
    if (actual.size !== faction.cards.length) throw new Error(`${faction.id} 成员列表存在重复`);
    if (actual.size !== expected.size || [...expected].some((id) => !actual.has(id))) {
      throw new Error(`${faction.id} 成员列表与卡池不一致`);
    }
    for (const id of actual) {
      if (assignedCards.has(id)) throw new Error(`${id} 被分配到多个阵营`);
      assignedCards.add(id);
    }
  }

  if (WORLD_PREMISE.trim().length < 250) throw new Error("世界观核心前提深度不足");
  if (PLAYER_MANDATE.trim().length < 80) throw new Error("玩家在世界观中的身份与使命不完整");
  if (CHRONICLE.length !== 12) throw new Error(`主线编年史应为 12 个节点，当前 ${CHRONICLE.length}`);
  const chronicleIds = new Set();
  for (const entry of CHRONICLE) {
    if (!entry.id || chronicleIds.has(entry.id)) throw new Error(`时间线节点 ${entry.title || "未命名"} ID 缺失或重复`);
    chronicleIds.add(entry.id);
    if (!entry.era || !entry.title || entry.summary.length < 45 || entry.revelation.length < 40 || entry.consequence.length < 30) throw new Error(`时间线节点 ${entry.title || "未命名"} 不完整`);
    for (const participant of entry.participants) {
      if (!uniqueFactionIds.has(participant)) throw new Error(`${entry.title} 引用了未知阵营 ${participant}`);
    }
  }
  const finalParticipants = new Set(CHRONICLE.at(-1)?.participants ?? []);
  if ([...uniqueFactionIds].some((id) => !finalParticipants.has(id))) throw new Error("当前主线未包含全部阵营");

  if (STORY_ARCS.length !== 8) throw new Error(`主线故事应为 8 个篇章，当前 ${STORY_ARCS.length}`);
  const arcIds = new Set();
  const coveredCharacters = new Set();
  for (const arc of STORY_ARCS) {
    if (!arc.id || arcIds.has(arc.id)) throw new Error(`${arc.title || "未命名篇章"} ID 缺失或重复`);
    arcIds.add(arc.id);
    if (!arc.act || !arc.title || arc.theme.length < 12 || arc.synopsis.length < 60 || arc.turningPoint.length < 25) throw new Error(`${arc.title} 篇章内容不完整`);
    for (const id of arc.cast) {
      if (!uniqueCardIds.has(id)) throw new Error(`${arc.title} 引用了未知角色 ${id}`);
      coveredCharacters.add(id);
    }
    for (const faction of arc.factions) {
      if (!uniqueFactionIds.has(faction)) throw new Error(`${arc.title} 引用了未知阵营 ${faction}`);
    }
  }
  if (cardIds.some((id) => !coveredCharacters.has(id))) throw new Error("八个主线篇章未覆盖全部卡牌人物");

  console.log(`叙事烟测通过：${FACTIONS.length} 个阵营，${CARD_POOL.length} 名角色，${CHRONICLE.length} 个编年节点，${STORY_ARCS.length} 个主线篇章，卡面资源完整`);
} finally {
  await server.close();
}
