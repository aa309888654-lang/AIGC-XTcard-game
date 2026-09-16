import type { AiDifficulty } from "../types";
import { CARD_MAP, CARD_POOL } from "./cards";
import { RULES } from "../game/rules";

export interface CampaignStage {
  arcId: string;
  act: string;
  title: string;
  commander: string;
  commanderTitle: string;
  difficulty: AiDifficulty;
  enemyDeck: string[];
  rewardStarDust: number;
  rewardDust: number;
  brief: string;
}

function stageDeck(primary: string[], extras: string[]): string[] {
  const counts = new Map<string, number>();
  const deck: string[] = [];
  const add = (id: string) => {
    if ((counts.get(id) ?? 0) >= RULES.MAX_DUPLICATES) return;
    deck.push(id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  };
  for (const id of primary) add(id);
  for (const id of primary) add(id);
  for (const id of extras) add(id);
  const primaryTypes = new Set(primary.map((id) => CARD_MAP[id]?.type).filter(Boolean));
  const sameFaction = CARD_POOL.filter((card) => primaryTypes.has(card.type)).map((card) => card.id);
  const allFactions = CARD_POOL.map((card) => card.id);
  let guard = 0;
  while (deck.length < RULES.MAX_DECK && guard < 100) {
    let added = false;
    for (const id of [...sameFaction, ...allFactions]) {
      const before = deck.length;
      add(id);
      if (deck.length > before) added = true;
      if (deck.length >= RULES.MAX_DECK) break;
    }
    if (!added) break;
    guard += 1;
  }
  return deck.slice(0, RULES.MAX_DECK);
}

const TIANHENG = ["dawn-scout", "dawn-horn", "sky-lantern", "sunblade", "solar-judge", "star-archivist", "comet-ranger", "astral-queen", "spark-star", "radiance-bless", "astral-insight", "star-blade", "mirror-guard"];
const YOUMING = ["void-pickpocket", "night-tide", "night-conductor", "hollow-beast", "grave-watcher", "void-emperor", "shadow-bolt", "forget-curse", "venom-viper", "echo-shard", "spell-eater"];
const TIANJI = ["rune-seeker", "ember-adept", "aether-weaver", "time-echo", "rift-oracle", "prism-dragon", "fate-charm", "focus-spirit", "stasis-seal", "dust-seal"];
const TIELV = ["iron-guard", "wall-smith", "mirror-smith", "forge-singer", "siege-engine", "bastion-warden", "titan-keeper", "iron-colossus", "forge-hammer", "golem-rune", "rust-fetter", "iron-anvil", "spike-field"];
const SHANHAI = ["seed-guardian", "wild-bloom", "dust-rider", "thunder-herd", "wild-mother", "world-root", "earth-roots", "bloom-sea", "ancient-egg"];

export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    arcId: "prologue",
    act: "序章",
    title: "封鼎之变",
    commander: "典籍司丞·仪衡",
    commanderTitle: "天衡 · 云阶书库",
    difficulty: "novice",
    enemyDeck: stageDeck([...TIANHENG, ...TIANJI].slice(0, 11), ["rune-seeker", "fate-charm", "focus-spirit", "dust-seal", "stasis-seal", "star-blade", "mirror-guard", "radiance-bless"]),
    rewardStarDust: 120,
    rewardDust: 20,
    brief: "名单被动了手脚。她的对手是整座书库的旧账——先赢下这一页。",
  },
  {
    arcId: "lost-gate",
    act: "第一章",
    title: "天门遗踪",
    commander: "曜剑郎·莱恩",
    commanderTitle: "天衡 · 王庭亲卫",
    difficulty: "novice",
    enemyDeck: stageDeck(TIANHENG, ["iron-guard", "wall-smith", "forge-hammer", "rust-fetter", "iron-anvil", "spike-field"]),
    rewardStarDust: 150,
    rewardDust: 30,
    brief: "他奉命追自己教出来的学生。剑尖指向你时，别无选择。",
  },
  {
    arcId: "nameless",
    act: "第二章",
    title: "无名册",
    commander: "夜幕都统·歌岚",
    commanderTitle: "幽冥 · 黑潮军团",
    difficulty: "skilled",
    enemyDeck: stageDeck(YOUMING, ["void-pickpocket", "venom-viper", "shadow-bolt", "spell-eater"]),
    rewardStarDust: 180,
    rewardDust: 40,
    brief: "失名者的名单要在当众晾出来之前，先过了她这一关。",
  },
  {
    arcId: "severed-prophecy",
    act: "第三章",
    title: "命盘断线",
    commander: "天机散人·司命",
    commanderTitle: "天机 · 裂隙观测站",
    difficulty: "skilled",
    enemyDeck: stageDeck(TIANJI, ["ember-adept", "night-tide", "shadow-bolt", "spark-star", "radiance-bless", "stasis-seal", "dust-seal"]),
    rewardStarDust: 220,
    rewardDust: 60,
    brief: "她算得出每个人的命。你的每一步，都在她眼皮底下。",
  },
  {
    arcId: "three-testimonies",
    act: "第四章",
    title: "三路证词",
    commander: "流星猎手·照夜",
    commanderTitle: "五家联军 · 追猎者",
    difficulty: "expert",
    enemyDeck: stageDeck([...TIANHENG, ...SHANHAI].slice(0, 12), ["forge-singer", "siege-engine", "mirror-smith", "dust-rider", "ancient-egg", "bloom-sea", "earth-roots"]),
    rewardStarDust: 260,
    rewardDust: 80,
    brief: "三份证词互相打架，却都咬住同一句：封鼎之夜没有干净人。",
  },
  {
    arcId: "black-throne",
    act: "第五章",
    title: "幽冥王座",
    commander: "冥府判官·卡戎",
    commanderTitle: "幽冥 · 冥府王座",
    difficulty: "expert",
    enemyDeck: stageDeck(YOUMING, ["bastion-warden", "titan-keeper", "thunder-herd", "solar-judge", "iron-guard", "rust-fetter"]),
    rewardStarDust: 300,
    rewardDust: 100,
    brief: "他说能把名字全数奉还。先让他的王座听你的号令。",
  },
  {
    arcId: "key-war",
    act: "第六章",
    title: "五钥之战",
    commander: "星冕女帝·薇洛",
    commanderTitle: "天衡 · 王庭",
    difficulty: "master",
    enemyDeck: stageDeck(TIANHENG, ["rift-oracle", "prism-dragon", "iron-colossus", "world-root", "void-emperor"]),
    rewardStarDust: 340,
    rewardDust: 140,
    brief: "五样家底终于凑齐，可每一家都还想着拿自己那份做主导。",
  },
  {
    arcId: "seventh-eclipse",
    act: "终章",
    title: "七蚀之盟",
    commander: "天穹兵俑·零号",
    commanderTitle: "铁律 · 零号工厂",
    difficulty: "master",
    enemyDeck: stageDeck(TIELV, ["astral-queen", "void-emperor", "prism-dragon", "world-root", "thunder-herd", "rift-oracle"]),
    rewardStarDust: 400,
    rewardDust: 200,
    brief: "第七天门要你写下唯一一个结局。先打赢这场，再谈大典。",
  },
];

export const CAMPAIGN_TOTAL = CAMPAIGN_STAGES.length;
