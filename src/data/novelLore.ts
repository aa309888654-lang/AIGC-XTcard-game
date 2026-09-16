import type { CardDef, CardType } from "../types";

const FACTION_CONTEXT: Record<CardType, { place: string; role: string; tone: string }> = {
  "天衡": { place: "仙侠宗·云霄峰", role: "云霄峰弟子", tone: "守正、克制，先问是非再拔剑" },
  "幽冥": { place: "黑渊·血战宗", role: "血战宗修士", tone: "狠厉而多疑，为夺机缘不惜越界" },
  "天机": { place: "仙侠宗·阵符一脉", role: "阵符峰修士", tone: "善观阵势，心思缜密" },
  "铁律": { place: "仙侠宗·炼器一脉", role: "炼器峰弟子", tone: "沉稳坚忍，信奉器成于千锤" },
  "山海": { place: "云霄山脉·灵兽与药园", role: "灵兽峰修士", tone: "亲近草木灵兽，重视生机与守护" },
};

export const NOVEL_FACTION_LABEL: Record<CardType, string> = {
  "天衡": "云霄峰",
  "幽冥": "血战宗",
  "天机": "阵符峰",
  "铁律": "炼器峰",
  "山海": "灵兽药园",
};

const NOVEL_NAMES: Record<string, string> = {
  "dawn-scout": "林尘", "dawn-horn": "刘存", "iron-guard": "外门执事", "wall-smith": "登天梯守卫", "void-pickpocket": "血战宗斥候", "seed-guardian": "药园弟子", "rune-seeker": "阵符峰学徒", "ember-adept": "焚天火种", "night-tide": "黑渊潮修", "wild-bloom": "紫心兰灵", "sky-lantern": "陆雪清", "sunblade": "金乌翎", "mirror-smith": "验灵石守者", "night-conductor": "血战宗领队", "aether-weaver": "柳婵婵", "dust-rider": "轻云步弟子", "solar-judge": "顾玄清", "star-archivist": "藏书阁长老", "hollow-beast": "铁背妖狼", "grave-watcher": "古墓守尸", "siege-engine": "青铜傀儡", "forge-singer": "炼器堂师姐", "comet-ranger": "北邙巡山弟子", "time-echo": "幻心林阵灵", "wild-mother": "护山灵猿", "rift-oracle": "阵法长老", "bastion-warden": "云霄峰护法", "thunder-herd": "雷角兽群", "titan-keeper": "秘境镇守傀儡", "astral-queen": "仙侠宗宗主", "void-emperor": "血战宗宗主", "prism-dragon": "玄炎尊者", "iron-colossus": "玄玉镇宗傀", "world-root": "云霄灵脉", "spark-star": "焚天真火", "fate-charm": "入门荐信", "shadow-bolt": "血煞暗箭", "forge-hammer": "炼器锻锤", "earth-roots": "药圃地脉", "focus-spirit": "聚灵阵眼", "radiance-bless": "清心普善咒", "golem-rune": "搬山傀儡", "forget-curse": "蚀骨幽兰", "bloom-sea": "百草回春阵", "venom-viper": "赤鳞毒蟒", "stasis-seal": "封灵符", "rust-fetter": "缚妖锁", "dust-seal": "藏书禁制", "astral-insight": "玄炎玉简", "echo-shard": "古墓残碑", "ancient-egg": "灵兽卵", "star-blade": "冰魄飞剑", "iron-anvil": "玄铁砧", "mirror-guard": "护体灵盾", "spell-eater": "噬灵诀", "spike-field": "地刺符阵",
  "lute-officer": "琴修师姐", "seal-maiden": "掌印弟子", "night-whistle": "巡山哨卫", "edict-clerk": "宗门执事", "crimson-guardian": "赤霄剑卫", "dawn-herald": "传功弟子", "mirror-tutor": "藏书阁先生", "celestial-weaver": "天灵根弟子", "eclipse-princess": "月华仙子", "gatekeeper-old": "山门长老", "royal-herald": "试炼执事", "dawn-summon": "开山收徒令", "star-halo": "月华护符",
  "shadow-warden": "黑渊影卫", "tide-singer": "血战宗女修", "ghost-bell": "招魂铃", "bone-lantern": "幽骨灯", "void-whisper": "黑渊密探", "crypt-keeper": "古墓盗修", "abyss-reader": "血煞长老", "night-queen": "血战宗圣女", "moonless": "黑渊少主", "ferryman": "冥河摆渡人", "shadow-claw": "噬血魔爪", "forgotten-curse": "血煞咒",
  "star-stitcher": "阵符峰师姐", "clock-maiden": "阵盘灵侍", "rune-calligrapher": "符箓弟子", "fate-dancer": "幻阵舞修", "thread-puppeteer": "傀儡师", "void-mathematician": "演算长老", "prophecy-weaver": "观星长老", "eclipse-calculator": "天机真人", "chess-master": "弈阵师", "hourglass": "时砂阵盘", "mirror-hex": "幻心阵图", "star-array": "北斗剑阵",
  "rivet-forger": "炼器堂学徒", "armor-tailor": "法衣师姐", "siege-matron": "傀儡堂长老", "gear-dancer": "机巧弟子", "furnace-priestess": "丹炉守火人", "blueprint-warden": "器谱守藏人", "anvil-queen": "炼器峰峰主", "zero-warden": "玄铁战傀", "gate-mason": "山门石匠", "iron-dog": "巡山灵犬", "rivet-storm": "千机钉雨", "wall-oath": "守山誓符",
  "root-daughter": "药园小师妹", "rain-girl": "灵雨术士", "seed-weaver": "百草弟子", "bloom-singer": "药谷琴修", "valley-mother": "百草峰长老", "star-fruit": "朱果灵", "earth-dancer": "地脉守人", "world-bloom": "千年灵芝王", "wind-sister": "御风双修", "ox-herd": "青牛灵兽", "root-call": "万木回春诀", "spring-rain": "甘霖术",
  "wind-wisp": "御风小灵", "stone-golem": "试炼石傀", "sprout": "药园灵芽", "astral-coin": "后手灵符",
};

const MAJOR_PROFILES: Record<string, Pick<CardDef, "title" | "lore" | "repo">> = {
  "dawn-scout": { title: "木火双灵根的外门弟子", lore: "林尘出身青石村。村庄被魔修屠戮后，他携顾玄清的荐信登上云霄山门；沉稳、勤勉，心中藏着复仇与守护的两团火。", repo: "仙侠宗·外门丙字七号院" },
  "dawn-horn": { title: "登天梯上伸出的手", lore: "刘存出身农家，土系灵力厚重。他在登天梯上与林尘相扶而行，又替他硬扛青铜傀儡一拳；憨厚仗义，认定的兄弟绝不放手。", repo: "仙侠宗·外门弟子" },
  "sky-lantern": { title: "清冷如雪的首席弟子", lore: "陆雪清乃千年一遇天灵根，十八岁已至金丹初期。她以《清心普善咒》助林尘松动关隘，剑意冷冽，待人却有克制的温柔。", repo: "仙侠宗·首席弟子" },
  "solar-judge": { title: "留下荐信的外门长老", lore: "顾玄清在荒山救下濒死的林尘，见其根骨与品性，留下一封荐信。为人温厚通透，最重弟子能否守住本心。", repo: "仙侠宗·外门长老" },
  "prism-dragon": { title: "焚天金火诀的主人", lore: "玄炎尊者是三千年前的绝世强者，曾以焚天真火焚尽万邪，最终冲击大乘时坐化。其赤玉简与金乌翎，成为林尘踏上强者之路的机缘。", repo: "上古秘境·玄炎遗府" },
  "astral-queen": { title: "执掌七峰的宗主", lore: "仙侠宗宗主坐镇云霄峰，与诸位长老共守东玄神洲。三万年宗门传承压在肩上，面对黑渊与血战宗从不退让。", repo: "仙侠宗·云霄主峰" },
  "void-emperor": { title: "黑渊血战宗之主", lore: "血战宗以血煞功法行事，屡次侵扰仙侠宗边境。宗主善于蛊惑人心，将秘境、灵脉与弟子的贪念都视作可夺之物。", repo: "黑渊·血战宗" },
};

export function novelizeCard(card: CardDef): CardDef {
  const context = FACTION_CONTEXT[card.type];
  const name = NOVEL_NAMES[card.id] ?? `${context.role}`;
  const profile = MAJOR_PROFILES[card.id];
  return {
    ...card,
    name,
    title: profile?.title ?? `${context.place}传承`,
    lore: profile?.lore ?? `${name}出自${context.place}。${context.tone}；在云霄山脉的试炼、秘境与黑渊冲突中留下了自己的痕迹。`,
    repo: profile?.repo ?? context.place,
  };
}
