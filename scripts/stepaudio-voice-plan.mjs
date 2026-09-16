import { createServer } from "vite";

export const STEPAUDIO_MODEL = "stepaudio-2.5-tts";
export const VOICE_FORMAT = "wav";
export const VOICE_SAMPLE_RATE = 24000;

export const STEPFUN_CHRONICLE_VOICES = ["wenjingxuejie", "cixingnansheng", "shenchennanyin"];

export const factionDirections = {
  "天衡": "仪式感明亮而克制，吐字清晰，像在穹顶下宣誓；权威来自承担，不要甜腻或喊叫。",
  "幽冥": "低声贴近，带记忆回响与被压住的怒意；保留呼吸和停顿，不做脸谱化反派。",
  "天机": "精准、疏离、思维密度高；语速可略快，但推演的层次必须清楚。",
  "铁律": "沉稳、纪律严明、落字有重量；情绪内敛，像金属落在铁砧上。",
  "山海": "自然、开阔、直觉强；像风穿过旷野，避免城市播音腔。",
};

const FEMALE_PRESETS = ["yuanqishaonv", "jingdiannvsheng", "shuangkuaijiejie", "youyanvsheng", "jilingshaonv", "lengyanyujie", "qingchunshaonv", "zhixingjiejie", "qinqienvsheng", "wenjingxuejie"];
const MALE_PRESETS = ["zhengpaiqingnian", "wenrounansheng", "cixingnansheng", "ruyananshi", "shenchennanyin", "yuanqinansheng", "qingniandaxuesheng", "shuangkuainansheng", "wenrougongzi"];
const NEUTRAL_PRESETS = {
  "天衡": ["youyanvsheng", "ruyananshi"],
  "幽冥": ["shenchennanyin", "lengyanyujie"],
  "天机": ["zhixingjiejie", "wenjingxuejie"],
  "铁律": ["ruyananshi", "shenchennanyin"],
  "山海": ["qinqienvsheng", "wenrounansheng"],
};
const MINIMAX_FEMALE_PRESETS = ["female-yujie-jingpin", "female-chengshu-jingpin", "female-shaonv-jingpin", "female-tianmei-jingpin", "Chinese (Mandarin)_Wise_Women", "Chinese (Mandarin)_Crisp_Girl", "Chinese (Mandarin)_Soft_Girl"];
const MINIMAX_MALE_PRESETS = ["male-qn-jingying-jingpin", "male-qn-qingse-jingpin", "male-qn-daxuesheng-jingpin", "Chinese (Mandarin)_Reliable_Executive", "Chinese (Mandarin)_Male_Announcer", "Chinese (Mandarin)_Unrestrained_Young_Man", "Chinese (Mandarin)_Gentle_Youth"];
const MINIMAX_NEUTRAL_PRESETS = ["Chinese (Mandarin)_News_Anchor", "Chinese (Mandarin)_Reliable_Executive", "female-chengshu-jingpin"];
const CUES = ["summon", "attack", "skill", "death", "victory", "encounter"];
const CUE_DIRECTIONS = {
  summon: "登场：先有半拍落点，再进入角色状态；语气自然落地。",
  attack: "攻击：短促有目标感，力量放在动词上，收尾利落。",
  skill: "技能：专注并留出技能名后的半拍，像能力真正被发动。",
  death: "退场：气息下沉或收短，留出失去力量后的停顿，不拖成哭腔。",
  victory: "胜利：允许克制的释然或坚定，不要庆典式高喊。",
  encounter: "证词：像对熟人或对手说出关键一句，保留人物关系里的停顿。",
};

function pickVoice(card, story, index) {
  if (story.gender === "女") return FEMALE_PRESETS[index % FEMALE_PRESETS.length];
  if (story.gender === "男") return MALE_PRESETS[index % MALE_PRESETS.length];
  const candidates = NEUTRAL_PRESETS[card.type] ?? NEUTRAL_PRESETS["天机"];
  return candidates[index % candidates.length];
}

function pickMiniMaxFemaleVoice(story, index) {
  if (story.age.includes("55") || story.personality.includes("沉稳")) return "female-chengshu-jingpin";
  if (story.personality.includes("冷") || story.personality.includes("克制") || story.personality.includes("锋")) return "female-yujie-jingpin";
  return MINIMAX_FEMALE_PRESETS[index % MINIMAX_FEMALE_PRESETS.length];
}

function pickMiniMaxVoice(story, index) {
  if (story.gender === "女") return pickMiniMaxFemaleVoice(story, index);
  if (story.gender === "男") return MINIMAX_MALE_PRESETS[index % MINIMAX_MALE_PRESETS.length];
  return MINIMAX_NEUTRAL_PRESETS[index % MINIMAX_NEUTRAL_PRESETS.length];
}

function pacingFor(story) {
  if (story.gender === "无") return 0.9;
  if (story.age.includes("55")) return 0.88;
  return 0.94;
}

function characterDirection(card, story, cue) {
  const genderDirection = story.gender === "无"
    ? "无性别的器物、术式或灵体：避免任何男性或女性身份暗示，用质感与节奏塑造存在感。"
    : `性别为${story.gender}，不得使用与档案性别相反的声线或称谓。`;
  return [
    factionDirections[card.type],
    genderDirection,
    `身份：${story.role}`,
    `性格：${story.personality}`,
    `年龄资料：${story.age}`,
    CUE_DIRECTIONS[cue],
    "允许在不改名、不改意、不另起句子的前提下，用极轻的气声、吞吐或语气词起势（如嗯、啊、哼）承托情绪；宁少勿滥。标点处自然停顿，古诗词引文需读得像人物自己的话。",
  ].join(" ");
}

async function loadCurrentWorld() {
  const server = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  try {
    const [{ CARD_POOL }, world] = await Promise.all([
      server.ssrLoadModule("/src/data/cards.ts"),
      server.ssrLoadModule("/src/data/world.ts"),
    ]);
    return { CARD_POOL, ...world };
  } finally {
    await server.close();
  }
}

function buildWelcomeJobs() {
  const entries = [
    ["male-qn-jingying-jingpin", "欢迎来到仙侠战线。集结你的卡牌，在第七天门前，为谁能被记住而战。"],
    ["female-chengshu-jingpin", "欢迎回来，指挥官。每一张牌都有证词，每一次部署都要有答案。"],
    ["Chinese (Mandarin)_Reliable_Executive", "日蚀将至。五家都在等你的选择，别让任何一个名字再被抹去。"],
    ["Chinese (Mandarin)_Wise_Women", "编年史已经展开。读清局势，再把合适的同伴送上战场。"],
    ["Chinese (Mandarin)_Male_Announcer", "守住核心，也守住你愿意为之作证的人。战线由此开始。"],
    ["Chinese (Mandarin)_Soft_Girl", "风从山海吹来，旧账在天门下等着。带上你的卡组，往前走。"],
    ["male-qn-qingse-jingpin", "抽牌、部署、锁定目标。判断要快，代价也要记住。"],
    ["Chinese (Mandarin)_News_Anchor", "欢迎来到仙侠战线。档案不会替谁说谎，除非再没人愿意翻开它。"],
    ["Chinese (Mandarin)_Gentle_Youth", "先认识你的同伴，听完他们的故事，再让他们替你出战。"],
    ["female-yujie-jingpin", "第七天门还开着。别急着出牌，先看清谁在等你。"],
  ];
  return entries.map(([voice, text], index) => ({
    key: `welcome/intro-${String(index + 1).padStart(2, "0")}`,
    voice,
    direction: "进入游戏欢迎语：可靠、亲近、带一点进入战场前的提醒。节奏从容，句间留短停顿。",
    text,
    pacing: 0.9,
    provider: "MiniMax",
  }));
}

export async function buildVoiceJobs() {
  const { CARD_POOL, CHARACTER_STORIES, CHRONICLE, FACTIONS, STORY_ARCS, VOICE_LINES, WORLD_PREMISE } = await loadCurrentWorld();
  const characterJobs = CARD_POOL.flatMap((card, index) => {
    const story = CHARACTER_STORIES[card.id];
    const lines = (VOICE_LINES[card.id] ?? []).map((line) => line.text).filter(Boolean);
    if (!story || lines.length < 5) throw new Error(`${card.name} 缺少人物档案或五条专属台词`);
    const provider = "MiniMax";
    const voice = pickMiniMaxVoice(story, index);
    const cueTexts = [lines[0], lines[2], lines[1], lines[3], lines[4], lines[0]];
    const battleJobs = CUES.map((cue, cueIndex) => ({
      key: `character/${card.id}/${cue}`,
      voice,
      direction: characterDirection(card, story, cue),
      text: cueTexts[cueIndex],
      characterId: card.id,
      characterName: card.name,
      faction: card.type,
      cue,
      provider,
      pacing: pacingFor(story),
    }));
    const selectionJobs = lines.map((text, lineIndex) => ({
      key: `character/${card.id}/select-${lineIndex + 1}`,
      voice,
      direction: characterDirection(card, story, "encounter"),
      text,
      characterId: card.id,
      characterName: card.name,
      faction: card.type,
      cue: `select-${lineIndex + 1}`,
      provider,
      pacing: pacingFor(story),
    }));
    return [...battleJobs, ...selectionJobs];
  });
  const narrativeJobs = [
    { key: "story/world-premise", voice: STEPFUN_CHRONICLE_VOICES[0], direction: "世界序章旁白：庄重、克制，像翻开一卷不能被删去的史书。中等语速，年代、转折与后果后自然停顿。", text: WORLD_PREMISE, pacing: 1, provider: "StepFun" },
    ...CHRONICLE.map((entry, index) => ({ key: `story/chronicle-${String(index + 1).padStart(2, "0")}`, voice: STEPFUN_CHRONICLE_VOICES[index % STEPFUN_CHRONICLE_VOICES.length], direction: "编年史旁白：沉稳、清晰，在年代、转折与后果后自然停顿。中等语速，只朗读原文。", text: entry.summary, pacing: 1, provider: "StepFun" })),
    ...STORY_ARCS.map((arc, index) => ({ key: `story/chapter-${String(index + 1).padStart(2, "0")}`, voice: index === 2 ? "Chinese (Mandarin)_Wise_Women" : "Chinese (Mandarin)_Reliable_Executive", direction: `主线篇章旁白：${arc.theme}。层层推进，不要宣传片口吻。`, text: `${arc.act}，${arc.title}。${arc.synopsis}`, pacing: 0.88, provider: "MiniMax" })),
    ...FACTIONS.map((faction, index) => ({ key: `faction/${["dawn", "shadow", "arcane", "iron", "wild"][index]}-intro`, voice: MINIMAX_NEUTRAL_PRESETS[index % MINIMAX_NEUTRAL_PRESETS.length], direction: `${factionDirections[faction.id]} 阵营宣言：像一份公开证词，清楚说出立场。`, text: `${faction.id}。${faction.motto} ${faction.doctrine}`, pacing: 0.9, provider: "MiniMax" })),
  ];
  return [...buildWelcomeJobs(), ...narrativeJobs, ...characterJobs];
}
