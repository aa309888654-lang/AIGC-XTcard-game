import type { CardType } from "../types";

export interface FactionDossier {
  id: CardType;
  motto: string;
  color: string;
  crest: string;
  doctrine: string;
  wound: string;
  ambition: string;
  leader: string;
  cards: string[];
}

export interface ChronicleEntry {
  id: string;
  era: string;
  title: string;
  summary: string;
  detail: string;
  revelation: string;
  consequence: string;
  verse: string;
  participants: string[];
}

export interface StoryArc {
  id: string;
  act: string;
  title: string;
  theme: string;
  synopsis: string;
  turningPoint: string;
  cast: string[];
  factions: CardType[];
}

export interface CharacterStory {
  chapter: string;
  role: string;
  connection: string;
  quote: string;
  gender: string;        // "男" | "女" | "无"
  age: string;           // "17岁" | "55岁" | "不详" | ""
  personality: string;   // 性格描述
  growthExperience: string; // 成长经历
  trajectory: string;    // 活动轨迹
}

export interface VoiceLine {
  text: string;
  ref?: string;  // 唐诗出处（化用/引用）
}

export interface WelcomeLine {
  text: string;
  ref?: string;  // 诗词出处（化用/引用）
}

export const WORLD_PREMISE = "东玄神洲之上，上古有七座天门撑起天地的昼夜，也替天下人记住名姓。天战不休，七峰道统的掌门密谋点众生记忆为灯，求一个永昼——那场封鼎大典却让星辰坠入天门，天光从此偏斜，只剩下吃人的忘川潮。忘川过处，名姓被抹、家谱成灰；被忘的人还活着，却像从未活过。五方各守一物：天衡藏王印，幽冥收无名册，天机攥命盘，铁律存阵图，山海护根谱。谁集齐五物、打开第七天门，谁就能按自己的规矩重写天下。而天门偏斜之后，被压进灯网的人还卡在天门之间，日夜听着活人的动静；忘川学着死人的腔调说话，也从活人脑子里抽走没登记的名姓。七峰道统当年的盟誓早就烂了，两家各有各的罪，各有各的说辞——后来变成五家，谁也盖不住谁。传闻第七次日蚀一到，天门必坠——要么五家各赢各的，天下裂成五种活法；要么让一个没有过去、盖不住记性的人，把五样家底同时背在身上，当众作一场谁都删不掉的证。只有让五家互相矛盾的真相同时立得住，天门才不至于再吃一次人。";

export const PLAYER_MANDATE = "你从第七天门的废墟里醒来，过去被忘川洗得干干净净。正因为谁的历史都盖不住你，五家才都肯把话讲给你听。你不是天命钦定的救世主，只是一个被天下人借来记性的人——五家怎么谈，谈成什么样，全看你在每一战里选谁、信谁。";

export const FACTIONS: FactionDossier[] = [
  { id: "天衡", motto: "天不藏奸，律不枉人", color: "#e3bd67", crest: "☲", doctrine: "以天衡律法治世，以案牍为凭断是非。天衡信一条古训：天下太平，旧账须翻。", wound: "天衡王庭瞒了第一场坠星的真相——那不是天灾，是祖上封鼎大典留下的祸根。", ambition: "找回失落的第七天门，让日头重有准绳。", leader: "星冕女帝", cards: ["dawn-scout", "dawn-horn", "sky-lantern", "sunblade", "solar-judge", "star-archivist", "comet-ranger", "astral-queen", "spark-star", "radiance-bless", "astral-insight", "star-blade", "mirror-guard", "lute-officer", "seal-maiden", "night-whistle", "edict-clerk", "crimson-guardian", "dawn-herald", "mirror-tutor", "celestial-weaver", "eclipse-princess", "gatekeeper-old", "royal-herald", "dawn-summon", "star-halo"] },
  { id: "幽冥", motto: "忘川不留名，幽冥替它收着", color: "#9d79e8", crest: "☷", doctrine: "由被除名之人、走夜路之人和认不出脸之人组成。他们将忘川冲走的记性捡回，当柴烧、当饭吃。", wound: "忘川是天门偏斜后从门缝里漫出来的河，如今河水倒灌，认不得自家人。", ambition: "让所有被抹掉的名字重新有人喊，哪怕要漫过阳世这一片天。", leader: "冥府判官", cards: ["void-pickpocket", "night-tide", "night-conductor", "hollow-beast", "grave-watcher", "void-emperor", "shadow-bolt", "forget-curse", "venom-viper", "echo-shard", "spell-eater", "shadow-warden", "tide-singer", "ghost-bell", "bone-lantern", "void-whisper", "crypt-keeper", "abyss-reader", "night-queen", "moonless", "ferryman", "shadow-claw", "forgotten-curse", "dusk-blade"] },
  { id: "天机", motto: "卦不敢算尽，畏天道难堪", color: "#d787ff", crest: "☴", doctrine: "不分出身、只看卦艺的观星同盟，用织网、命盘和时隙替人改命改运。", wound: "他们最早窥见大祸临头，却为留翻盘余地，亲手将天命剪成了乱麻。", ambition: "修好命盘，让天下不被唯一一种结局锁死。", leader: "天机散人", cards: ["rune-seeker", "ember-adept", "aether-weaver", "time-echo", "rift-oracle", "prism-dragon", "fate-charm", "focus-spirit", "stasis-seal", "dust-seal", "star-stitcher", "clock-maiden", "rune-calligrapher", "fate-dancer", "thread-puppeteer", "void-mathematician", "prophecy-weaver", "eclipse-calculator", "chess-master", "hourglass", "mirror-hex", "star-array"] },
  { id: "铁律", motto: "城墙不欠人情，工钱当面结清", color: "#aebdcc", crest: "☱", doctrine: "由城邦、工坊和匠人行会撑起来的盟约，靠规矩、手艺和字据过日子。", wound: "零号兵俑胸口藏着一卷阵图，能证明王庭当年的背叛——也证明铁律自己没少收王庭的银子。", ambition: "立起天穹防线，把每座天门都修成谁也过不去的界碑。", leader: "铁壁司命", cards: ["iron-guard", "wall-smith", "mirror-smith", "forge-singer", "siege-engine", "bastion-warden", "titan-keeper", "iron-colossus", "forge-hammer", "golem-rune", "rust-fetter", "iron-anvil", "spike-field", "rivet-forger", "armor-tailor", "siege-matron", "gear-dancer", "furnace-priestess", "blueprint-warden", "anvil-queen", "zero-warden", "gate-mason", "iron-dog", "rivet-storm", "wall-oath"] },
  { id: "山海", motto: "地不欺人，人别欺地", color: "#9aca70", crest: "☳", doctrine: "游牧、种田和养牲口的人结的松散盟，跟万木灵根同吃同住，谁想拿天灾当令箭，他们先不答应。", wound: "灵根不是圣物，它正在醒，醒来的第一顿饭是吃记忆。", ambition: "让灵根自己挑下一任守树人，别让任何一方把它当兵器使。", leader: "万木灵根", cards: ["seed-guardian", "wild-bloom", "dust-rider", "thunder-herd", "wild-mother", "world-root", "earth-roots", "bloom-sea", "ancient-egg", "root-daughter", "rain-girl", "seed-weaver", "bloom-singer", "valley-mother", "star-fruit", "earth-dancer", "world-bloom", "wind-sister", "ox-herd", "root-call", "spring-rain"] },
];

export const CHRONICLE: ChronicleEntry[] = [
  { id: "seven-gates", era: "癸亥 · 坠星前", title: "七峰歃血", summary: "东玄神洲七座天门主峰打了百年宗门大战，最终在云霄峰巅杀牲立誓：天门归天管，昼夜与名讳归天下共管，谁也不许独自改天。", detail: "东玄神洲，云霄山脉绵延三千里，七座天门主峰各据一脉——剑峰、丹峰、符峰、阵峰、傀峰、傀峰、药峰，峰峰有法门，代代有传人。百年宗门战打到第三代，七峰的护山大阵都矮了三尺——不是被攻破的，是被自家弟子拆了炼器。癸亥年秋，七位掌门在云霄峰巅设坛，杀白马、沥血酒，立下七峰之盟。盟约刻在七块青铜符板上，一人一块，嵌进峰门。天衡王朝的史官把盟约抄了三百卷，分发各郡；天机观星台的星官在七块符板上各刻了一道卦。没人注意到，七位掌门散场后回到后殿，又喝了一壶酒。那壶酒喝完，符板上最后一条誓文就被抹去了。", revelation: "那份盟约真正护的不是地界，是天下人共用一段旧账的权利。七位掌门后来偷偷抹掉了最后一条誓文——那条写着「不得以活人魂灯作薪」。抹掉它的时候，天衡的旧王说了一句话：灯总要油，油总要从人来。更深一层：天机阁秘档另有一说——七位掌门抹掉的除了「不得以活人魂灯作薪」，还有一条——「天门有第八道阵纹，不可触碰」。那第八道阵纹不是卦象，是上古天陨碎片在门缝里留下的共振。初代观星者以血脉禁术锁死了七位铸鼎匠的命数，让他们至死说不出第八阵纹的存在。", consequence: "天门网带来四十年太平，也让整片天地的记性都拴在了一套能被官家动手脚的账本上。后来的人管那四十年叫符板太平，可符板背面刻着什么，谁也不肯说。而第八阵纹的封印，让后来的封鼎大典从一开始就缺了一环。", verse: "七峰歃血云霄巅，白马沥酒刻符板。太平四十谁记得？卦爻背面字已删。", participants: ["天衡", "天机"] },
  { id: "eternal-day-draft", era: "乙未 · 坠星前", title: "永昼疏", summary: "战火再起，星辰转暗。天衡王朝上《永昼疏》，请以自愿献出之记忆点一盏永昼灯，天机观星台推演过，成数不足三成，还是帮着把灯网织了起来。", detail: "乙未年春，天衡王朝上了一道奏疏，题曰《永昼疏》。疏中言：星辰将暗，天门失修，若不点一盏永昼灯，天下人连白天都保不住。灯油从何而来？奏疏写的是自愿献出之记忆。天机观星台连夜推了一卦，成数不足三成，可天机散人没有拦，反而帮着把灯网织了起来。永昼灯点起来的那夜，全城确实亮了。可亮了多久？没人记得。", revelation: "所谓自愿名单，混进了战俘、流民和档册里从未存在的人。幽冥最早的居民，正是被圈在名册之外的那些。天机阁秘档另载：天机观星台上《永昼疏》的同时，暗中建了九座观星塔——明为测天象，实为观测天陨碎片的第八阵纹。塔基埋着七位铸鼎匠的血脉样本，试图在封鼎之前找到第八阵纹的共振点。观测未成，封鼎已至。", consequence: "王朝拿到了点灯的钥匙，天机留了改命的余地，两家联手造了一口后来谁也没本事关上的锅。幽冥最早的居民，正是此时被圈在名册之外的那些。九座观星塔的基座，后来成了观测站的前身。", verse: "永昼疏成自愿名，三成卦象亦燃灯。名册之外灯油尽，谁记当年暗处声。", participants: ["天衡", "天机"] },
  { id: "crowning-night", era: "甲子 · 坠星元年", title: "封鼎之变", summary: "七峰掌门登坛封鼎。数十万人的记忆接上天门，星辰却在点燃前坠进灯网，天光从此偏斜，第一批名讳从人间蒸发。", detail: "甲子年冬至，七峰掌门登坛封鼎。鼎是铁律百工坊铸的，七座，一座天门一座。灯网是天机织的，从七座鼎拉出七根线，接上数十万人的记忆。封鼎大典选在子时。子时一到，七位掌门各执一盏魂灯，灯芯连着灯网，灯网连着天门，天门连着星辰。可灯没点着。星辰在点燃前坠进了灯网，天光偏斜。烧掉的那些记忆，连名讳一起蒸发了——不是死了，是从来没活过。那天夜里，全城有七万三千人同时忘了自己的名字。", revelation: "大祸不是灯油不够，是有人在最后一刻剪断了灯芯——那一剪救了活人，却让烧进去的死者永远卡在天门之间。剪灯芯的人，是天机织命者——即织命坊裁缝aether-weaver。更深一层：星冕先王登坛之前，曾独自登上未完工的观星塔顶，以王印封印了一枚天陨碎片。王印压住了第八阵纹的共振，封鼎大典缺的不是灯油，是那道被压住的阵纹——星冕一脉的骨血里，至今还背着这桩旧账。", consequence: "七门崩毁，天衡封了原稿，天机扯断命盘，两家各有各的罪，各有各的说辞——后来变成五家。王印至今未碎，可星冕一脉的血里压着的那道阵纹，成了五家争夺的又一件隐秘家底。", verse: "七鼎同封子时灯，星辰未燃坠无声。七万三千名讳灭，剪灯人是织灯人。", participants: ["天衡", "天机"] },
  { id: "black-tide-awakens", era: "甲子 · 静默元年", title: "忘川涌", summary: "名册之外的人逃进忘川渡口。忘川从天门残响里漫出来，学死人的腔调说话，也从活人脑子里抽走没登记的名讳。", detail: "封鼎之变后第三天，忘川渡口来了第一批人。他们没有名字——不是忘了，是从来没被写进过名册。忘川是从天门残响里漫出来的。天门偏斜之后，门缝里漏出一种声音——不是风声，是所有被烧掉的记忆在天门之间回响。那些回响聚在一起，变成了一条河。忘川渡口的老船夫说，河水头一回开口说话的时候，说的是一句：我也要一个名字。", revelation: "忘川不是外来的怪物，是所有不被承认的念想在天门网里抱成团的求生本能。冥府判官，是忘川捏出来跟人间谈判的第一个人。天机阁秘档另有一解：忘川之下还有一层——上古墨脉。那是比天门更古老的记忆储存介质，天陨撞击打破了墨脉的封印，它从地底涌出，读取一切被天门网漏掉的记忆。忘川学人说话，墨脉读人记性；忘川是回响，墨脉是原典。", consequence: "幽冥收留失名者，代价是得不停从外面讨回记性，否则河水连自己人一起吞。墨脉的存在，让幽冥收留失名者的代价多了一层：不是忘川吞人，是墨脉在替忘川记着。", verse: "渡口无名客最先，忘川学舌说人言。判官脸上千张面，哪一张是你从前？", participants: ["幽冥"] },
  { id: "burned-register", era: "戊辰 · 静默五年", title: "焚册之祸", summary: "天衡派净军烧了忘川渡的户籍册，想断掉忘川顺名讳追人的路。典籍司丞私藏了副本，把原稿誓文拆成七页分送出去。", detail: "戊辰年秋，天衡王朝签了一道批文：焚忘川渡户籍册，断河追名之路。净军是天衡王朝的暗卫，穿黑衣，不挂腰牌。那夜他们过了忘川渡，把渡口存了四年的户籍册全搬出来，一把火烧了。可典籍司丞没有烧。她在火起之前，把正本里夹着的七页誓文拆了出来，分别夹进七本不同的书里，交给了七个不同的人。净军追了三页，追到两页烧了一角，还有五页追丢了。", revelation: "放火的批文是王朝议会签的，年轻的星冕继承人并不知情。那卷封鼎全本阵图（含焚册执行记录）后来被挪进了还没完工的零号兵俑。星冕王朝密档另载：焚册之夜，天机观星台内部也有人同时动手——烧的是所有记载天陨碎片共振阵纹的典籍、星图和铸器图谱。他们不是怕忘川追人，是怕墨脉顺着碎片共振找到七门的准确位置。两把火，一个烧名册，一个烧真相。", consequence: "幽冥从避难变成了寻仇，天衡内部裂成保秩序和认罪责两派。焚册那夜之后，忘川渡口的河水涨了三尺。天机阁的焚书让第八阵纹的线索断了十二年，直到铁砧歃血才重新接上。", verse: "净军夜渡焚册灰，七页誓文夹书飞。兵俑胸口藏铁证，银子到手谁敢追？", participants: ["天衡", "幽冥", "铁律"] },
  { id: "iron-oath", era: "庚辰 · 重建十二年", title: "铁砧歃血", summary: "忘川逼到城下，七座城在铁砧上立誓：城墙之内，名讳不许删，记忆不许当军饷，凡背誓者，五家共弃之。", detail: "庚辰年冬，忘川河水漫到了七座城的城墙根。铁律的营造司在城门口支了一口铁砧，砧上烧着炭，炭上热着血。七座城的代表依次走上前，把右手按在铁砧上，念了一句誓：城墙之内，名讳不许删，记忆不许当军饷，凡背誓者，五家共弃之。誓词刻在铁砧上，铁砧嵌在城门里。铁律的人说，铁砧比人靠谱——人会忘，铁不会。", revelation: "铁律议会一面立誓，一面收着王朝的银子，偷偷修一道能把所有裂隙关死的天穹防线——关死裂隙，等于把还困在里面的人一块儿埋了。铁律兵俑阵图另载：铁砧歃血之前，铁律营造司的三位老匠已将封鼎时回收的三枚碎片熔铸为一枚铁砧印。铁砧印不是盟约信物，是能读取墨脉记忆的翻译器——三印合一，墨脉的封印便被激活。铁律议会不知道，他们敲的不是誓词，是一把能打开所有真相的钥匙。", consequence: "铁律成了百姓最信得过的守门人，也握住了谁配进这扇门的大权。铁砧印后来成为观测派的圣物，也是五钥不交中最难交出的一件。", verse: "铁砧烧炭血犹温，七城歃血誓刻痕。城墙修得人信过，暗处又多一道门。", participants: ["铁律", "天衡", "幽冥"] },
  { id: "severed-futures", era: "癸巳 · 观测十九年", title: "河图断线", summary: "天机议会想补好封鼎用的灯网，补来补去，发现每补好一次，献祭就重开一次。天机织命者一剪刀剪断主命盘，把将来劈成了一百零八条岔路。", detail: "癸巳年，天机观星台推了一卦，卦象是否极泰来——可泰的那一面，每次都差一爻。天机织命者——织命坊裁缝aether-weaver站在主命盘前，看了一夜。那命盘是河图洛书的传世之器，龟背纹路，纵横十九道。天亮的时候，她拿起剪刀，一剪子剪断了主命盘的正中央。命盘断线的那一瞬，观星台所有的卦象同时翻转。原来只有一种结局的将来，被劈成了一百零八条岔路——恰合天罡地煞之数。", revelation: "天机散人——观星人rift-oracle看到的所谓天命，不过是灯网按五家眼下的打法推演出来的仗局。预言能改，只是每改一次，都得赔上另一种可能。天机阁秘档另载：命盘断线之前，天机织命者曾在黑潮中读到十三条未来线——每一条都指向天陨二次降临。天机散人强行断线，不是怕预言不准，是怕十三条线里有一条写着「第八阵纹重启之日，即天门尽毁之时」。", consequence: "天机拦住了唯一结局，也让天下开始闹时差错乱：有人走投无路，有人一梦两世，有人的证词怎么都对不上。选线派与守线派的分裂，从命盘断线那夜就埋下了。一百零八条岔路，恰与黑潮中封存的劫数经卷同数——天机至今说不清这是巧合还是命数。", verse: "十九年缝灯网裂，缝一寸开一寸血。河图断线剪一刀，一百零八劫数灭。", participants: ["天机"] },
  { id: "root-migration", era: "丙午 · 漂泊二十七年", title: "神木北迁", summary: "万木灵根从南边死土里拔起根，驮着药圃、兽群和几万逃荒的人一路往北。它让废城重开过花，也从每个被救的人身上取走一段记性当路费。", detail: "丙午年春，南边的死土里长不出任何东西了。万木灵根在地下睡了三千年，那年被渴醒的。它拔起根的时候，整片大地都在抖——不是地震，是一棵树在搬家。灵根驮着药圃、兽群和几万逃荒的人一路往北。它走过的地方，废城重开了花，干河重新有了水。可每救一个人，它就从那人身上取走一段记性当路费。山海的人不怨它。他们说，树走路也要吃饭，记性就是它的干粮。神农尝过百草，灵根尝过百人的记性。", revelation: "灵根正在养一个不靠天门也能活的新念头。它吃记忆不是贪嘴，是想学明白：人到底要留什么。山海灵根记忆另载：万木灵根不是自己醒的，是被古根叫醒的。古根是比天门更早的地脉记忆库，比墨脉更深。黑潮侵蚀了古根的根系，它向灵根发出求救——借人的记性读懂黑潮的脉。灵根北迁，不是搬家，是救援。", consequence: "山海手里多了条断忘川的路，代价可能是旧的恩怨、旧的深情，连同旧世界一起被新地皮盖掉。古根的求救，让灵根取记忆当路费的行为多了一层解释：它在学人怎么记住。", verse: "三千年来头一回走，驮着活人向北流。路费不收金银宝，只收记性抵荒秋。", participants: ["山海", "幽冥"] },
  { id: "colossus-sleeps", era: "癸丑 · 铁壁三十四年", title: "兵俑沉眠", summary: "天穹兵俑在黑潮围城时睁过一次眼，守住了七座城，也差点把城外的难民当靶子打了。铁壁司命亲手把它按回去。", detail: "癸丑年冬，忘川黑潮围城。零号兵俑是铁律造的最大一具战争机关，高三丈，胸口铸着一卷封鼎全本阵图——那是墨家机关术的巅峰之作，以青铜为骨，以符阵为脉。它只睁过一次眼——造好那天，全城的钟都慢了半拍。黑潮围城第七天，城墙裂了一道缝。铁壁司命下令唤醒兵俑，守门人bastion-warden攥着唤醒机关的钥匙亲手转动。兵俑睁眼的那一瞬，黑潮退了三里。可它没停——它开始朝城外的难民走过去。铁壁司命冲上去按唤醒机关，bastion-warden同时反转钥匙——两人合力将兵俑按回沉眠。", revelation: "兵俑胸口的封鼎全本阵图记着封鼎之夜的全本——王朝的名单和天机的断线都在，单听任何一家的说辞，都只算听了半截。铁律兵俑阵图另载：黑潮之下还有更早的遗迹——古根曾试过用陶化的方式保存记忆，那些陶俑残骸至今埋在黑潮之下，一如始皇陵前的兵马俑，只是它们封存的是记性。零号兵俑的封鼎全本阵图里，有一部分正是从陶俑残骸中拓下来的。铁壁司命与bastion-warden按回去的不只是兵俑，也是古根用人命换时间的最后一步。", consequence: "铁律封了兵俑，自己也裂成两派：一派要铁壁封死一切，一派要救所有能救的人。陶俑残骸至今埋在黑潮之下，古根的解码仍未完成——但不是等一个救世主，是等五家把真相拼全。", verse: "三丈铁俑睡未醒，黑潮围城钟慢鸣。钥转机关双掌合，一眼至今犹未平。", participants: ["铁律", "天衡", "幽冥"] },
  { id: "one-hundred-eight", era: "庚申 · 观测四十一年", title: "百八劫数", summary: "天机散人向天下摊牌：第七次日蚀一到，天门必坠。五家各赢各的，天下就有五种活法，也各有五种人活不成。", detail: "庚申年秋，天机散人——观星人rift-oracle在观星台设了一百零八盏灯，每盏灯代表一条将来——那是照着天罡三十六、地煞七十二的旧谱排的。天衡赢了，忘川就得被堵死；幽冥赢了，灯网就得被拆；天机赢了，命盘就得重排；铁律赢了，天门就得封死；山海赢了，灵根就得吃光所有人的记性。一百零八盏灯，没有一盏是全亮的。散人把灯全灭了，只留了一句：灯网算不出还有一条空白路。", revelation: "那条空白路不在一百零八条岔路里，是织命者剪断命盘时留下的一个毛边。毛边不是失误，是她故意留的。天机阁秘档另载：一百零八不是命盘岔路数，是黑潮中封存的记忆被转译成的劫数经卷数。天罡地煞，一百零八卷。前一百零七卷都是墨脉记忆——上古文明在天陨之前的完整记录。第一百零八卷才出现天机推算。天机散人（rift-oracle）看到的第一百零九条空白路，是墨脉记忆与天机推算之间的裂缝。", consequence: "五家开始满天下找钥匙、找那个空白的人。停战没撑过三个月，就变成了围着第七天门打的代理仗。劫数经的存在，让五家争夺的不再是钥匙，是谁有资格读那前一百零七卷。", verse: "一百零八盏灯明，灭了只剩黑里行。空白路人谁不识？五家都找五家争。", participants: ["天机", "天衡", "幽冥", "铁律", "山海"] },
  { id: "seventh-gate-echo", era: "壬戌 · 回响四十三年", title: "天门残响", summary: "破晓斥候穿过失落的第七天门，带回来典籍司丞的残页和一个没有名字的旅者。她说门后没有天堂，只有五家都肯丢掉的旧账。", detail: "壬戌年春，破晓斥候做了一件所有人都不敢做的事——她走进了第七天门。天门偏斜之后，七座天门崩了六座，只有第七座还半开着，如半开的宫门，槛外是人间，槛内是忘川的回响。可她出来了，不仅记得，还记得全本。怀里揣着典籍司丞在焚册那夜拆出来的残页，身后跟着一个没有名字的旅者。旅者说，门后没有天堂，也没有地狱，只有一间堆满旧账的屋子——像县衙后堂的档案库，落灰三寸，没人敢翻。", revelation: "旅者不是失忆，是封鼎大典为装下冲突的记性特意留的空座。旅者选什么，天门就把什么写成新的天下史。第七天门不是实体门，是声波构成的虚门——初代观星者用第八阵纹铸了一道后门，不是让人进，是让人别进。", consequence: "曜剑郎奉命追人，铁誓卫士奉命封路，幽冥窃影却先把旅者的消息卖给了五家。声波虚门的存在，让第七天门的钥匙不再是实物，而是一段阵纹——谁能发出那段阵纹，谁就能打开虚门。", verse: "第七天门半扇开，残响如鸣入梦来。斥候怀中七页纸，旅者身后旧账堆。", participants: ["天衡", "幽冥", "铁律", "天机"] },
  { id: "eclipse-protocol", era: "甲子 · 今 · 蚀日之盟", title: "五钥不交", summary: "星冕女帝召集停战大会，当众答应翻出王朝旧罪。冥府判官要先还名字，铁律要先立界碑，山海不肯交根谱，天机警告：这场会本身就写进了命盘。", detail: "甲子年，第七次日蚀将至。星冕女帝在七座天门的废墟上搭了一座坛，召集五家停战——坛是按古礼设的，九丈见方，八方立柱，正中一炉香。她当众答应了三件事：翻出王朝旧罪，公开献祭名单，交出星冕王印。可冥府判官说：名字先还。铁壁司命说：界碑先立。山海的守树人不说话，只是把手按在灵根上——根谱不交。天机散人最后开口：这场会本身就写进了命盘。坛上五个人，五把钥匙，谁也不肯先交。", revelation: "五件家底必须在同一次当众作证里自愿交出来。谁要是用强，第七天门就把赢家的规矩写成全天下。天机阁秘档另载：五钥不交的僵局，早在初代观星者封印第八阵纹时就已注定。五家代表在坛上争的不只是钥匙，还有被初代观星者藏起的第八阵纹样本。铁砧印能读墨脉，星冕王印压着阵纹，两件下落不明的家底——一件在星冕一脉的骨血里，一件在初代观星者的遗言中。", consequence: "你要定的不是信谁，是哪一段真相够格让所有人一起扛、往后谁也别想再删。蚀日之盟的真正赌注，不是五家谁先交钥匙，是第八阵纹会不会在日蚀之前先被黑潮破解。", verse: "五钥五家五不交，坛上人人心似刀。日蚀一到天门坠，谁写新章谁旧抄。", participants: ["天衡", "幽冥", "天机", "铁律", "山海"] },
];

export const STORY_ARCS: StoryArc[] = [
  { id: "prologue", act: "序章", title: "封鼎之变", theme: "苍生可否以少数之命，换多数之天明", synopsis: "典籍司丞发现永昼名单被动了手脚；天机织命者在大典最后一刻剪断灯芯。她们没能拦住那场灾，只把一次板上钉钉的屠杀，拖成了一条淌了四十三年的伤口。", turningPoint: "典籍司丞把原稿誓文拆成七页，打定主意：审判的事，留给后人，不留给王庭。", cast: ["star-archivist", "aether-weaver", "astral-queen", "rune-seeker", "sky-lantern", "edict-clerk", "crimson-guardian", "royal-herald", "rune-calligrapher", "star-halo"], factions: ["天衡", "天机"] },
  { id: "lost-gate", act: "第一章", title: "天门遗踪", theme: "忠者，认冠乎？认誓乎？认眼前当护之人乎", synopsis: "破晓斥候带着残页和无名旅者回到现世。曜剑郎奉命追自己教出来的学生，铁誓卫士奉命封路；三个人都自称在护人，却都得先盘算：自己护的那套规矩，底下是不是埋着谎。", turningPoint: "铁誓卫士在盾甲夹层里翻见父亲被删掉的名字，亲手给斥候开了要塞侧门。", cast: ["dawn-scout", "sunblade", "iron-guard", "dawn-horn", "wall-smith", "star-blade", "mirror-guard", "lute-officer", "seal-maiden", "night-whistle", "dawn-herald", "gatekeeper-old", "gate-mason", "iron-dog", "armor-tailor", "wall-oath", "dawn-summon"], factions: ["天衡", "铁律"] },
  { id: "nameless", act: "第二章", title: "无名册", theme: "受亏欠者，可有义务先按住己仇", synopsis: "幽冥窃影把旅者的消息带回幽冥。夜幕都统要借旅者把失名者的名单当众晾出来，无面凶兽却因为同时听见一千个死人的名字当场失控。幽冥得想明白：是让天下记住受害者，还是让天下陪他们一起疼。", turningPoint: "凶兽在斥候面前站住了——她身上那页残纸，头一回把它拼成的一个个名字念全了。", cast: ["void-pickpocket", "night-conductor", "hollow-beast", "grave-watcher", "night-tide", "echo-shard", "spell-eater", "shadow-warden", "tide-singer", "ghost-bell", "bone-lantern", "crypt-keeper", "ferryman", "shadow-claw", "dusk-blade"], factions: ["幽冥", "天衡"] },
  { id: "severed-prophecy", act: "第三章", title: "命盘断线", theme: "窥终局者，可有资格替人断路", synopsis: "天机散人确认旅者就是第一百零九条空白路。余烬学徒用火把压住的记忆烧成看得见的样子，天机织命者却发现：每多护旅者一步，就有另一条将来离死更近。天机由此劈成两半——一派管将来，一派留活路。", turningPoint: "余烬学徒烧掉一份必胜的预言，因为那份胜利的价码，是要她亲手杀了还没醒的棱镜古龙。", cast: ["ember-adept", "aether-weaver", "rift-oracle", "time-echo", "fate-charm", "astral-insight", "star-stitcher", "clock-maiden", "fate-dancer", "thread-puppeteer", "void-mathematician", "prophecy-weaver", "chess-master", "hourglass", "mirror-hex", "star-array"], factions: ["天机"] },
  { id: "three-testimonies", act: "第四章", title: "三路证词", theme: "真相非遗物，乃几路冤家肯同席作证", synopsis: "流星猎手和幽冥窃影追残页；镜界锻师和熔炉吟游者试着唤醒零号阵图；山海花灵带着尘风骑手顺记性的气味追北迁的灵根。三路人各带回一份证词：文字一份，机器一份，活物一份。", turningPoint: "三份证词互相打架，却都咬住同一句：封鼎之夜没有干净人，也没有哪家握着全部真相。", cast: ["comet-ranger", "void-pickpocket", "mirror-smith", "forge-singer", "wild-bloom", "dust-rider", "siege-engine", "seed-guardian", "earth-roots", "ancient-egg", "mirror-tutor", "rivet-forger", "siege-matron", "gear-dancer", "furnace-priestess", "blueprint-warden", "rivet-storm", "root-daughter", "rain-girl", "seed-weaver", "bloom-singer", "valley-mother", "star-fruit", "earth-dancer", "wind-sister", "ox-herd", "root-call", "spring-rain"], factions: ["天衡", "幽冥", "铁律", "山海"] },
  { id: "black-throne", act: "第五章", title: "幽冥王座", theme: "以受害者之记性活过来的王，能否不学施害者之做派", synopsis: "冥府判官请旅者进忘川渡旧址，说他能把名字全数奉还。铁壁司命守住出口，夜幕都统却查明白：判官的计划，是让全天下都先当一阵子失名者，好叫众生体谅幽冥。雷霆兽群则被灵根派来，替快塌的防线垫一脚。", turningPoint: "判官认了：他既是失名者的代言人，也是当年替名单画押的一位君主残影。幽冥军第一回抗命。", cast: ["void-emperor", "night-conductor", "bastion-warden", "thunder-herd", "solar-judge", "titan-keeper", "shadow-bolt", "void-whisper", "abyss-reader", "night-queen", "moonless", "forgotten-curse"], factions: ["幽冥", "铁律", "山海"] },
  { id: "key-war", act: "第六章", title: "五钥之战", theme: "救世之法一旦被一家捂死，即成另一种末劫", synopsis: "第七次日蚀提前到了。棱镜古龙醒来交出七片鳞，天穹兵俑复原全本阵图，万木灵根走到天门脚下，星冕女帝当众摊开王庭名册。五样家底终于凑齐，可每一家都还想着拿自己的那一份做主导。", turningPoint: "旅者不肯选主钥匙，逼着五家在输着赢和一起赌之间当众表决。", cast: ["prism-dragon", "iron-colossus", "world-root", "astral-queen", "wild-mother", "spark-star", "forge-hammer", "radiance-bless", "iron-anvil", "spike-field", "celestial-weaver", "anvil-queen", "zero-warden", "world-bloom"], factions: ["天衡", "天机", "铁律", "山海", "幽冥"] },
  { id: "seventh-eclipse", act: "终章", title: "七蚀之盟", theme: "真正的天下史，须容得下罪责、牺牲与盼头同记", synopsis: "第七天门要旅者写下唯一一个结局。女帝肯交王印，判官肯放忘川，散人肯封命盘，兵俑肯公开阵图，灵根肯让人留着疼。每一句承诺都可能临阵变卦，最后那场大典，由你一路结下的信任来定。", turningPoint: "终局不是挑出正派，是看五家能不能不抹掉彼此，一起扛一个没有保证的将来。", cast: ["astral-queen", "void-emperor", "rift-oracle", "iron-colossus", "world-root", "dawn-scout", "focus-spirit", "golem-rune", "forget-curse", "bloom-sea", "venom-viper", "stasis-seal", "rust-fetter", "dust-seal", "eclipse-princess", "eclipse-calculator"], factions: ["天衡", "幽冥", "天机", "铁律", "山海"] },
];

export const CHARACTER_STORIES: Record<string, CharacterStory> = {
  "dawn-scout": { chapter: "第一章 · 天门遗踪", role: "唯一穿过第七天门还留着全本记性的人。", connection: "揣着典籍司丞托付的残页，被幽冥和铁律两路盯上。", quote: "我见过太阳咽气前的样子。", gender: "女", age: "17岁", personality: "果敢沉默，执着于传递真相，不问命令只问对错", growthExperience: "传令营出身，癸亥年七门歃血时十七岁，跑的是最远的那条路。后成为唯一穿过第七天门还留着全本记性的人", trajectory: "传令营→第七天门→携带残页归来→蚀日之盟坛下" },
  "sunblade": { chapter: "第一章 · 天门遗踪", role: "王庭亲卫的决斗官，以护驾之名追捕擅离天门的斥候。", connection: "他教过破晓斥候的剑，还不知道她怀里揣的是王庭的罪证。", quote: "光也不是无罪的，但罪得有人来算。", gender: "男", age: "28岁", personality: "正直矛盾，重义轻命，剑朝外不朝内", growthExperience: "王庭亲卫剑术第一人，破晓斥候的师父。奉命追捕学生，却在第七天门前收了剑", trajectory: "王庭亲卫→追捕斥候→第七天门前放行" },
  "star-archivist": { chapter: "序章 · 封鼎之变", role: "典籍司丞（云阶书库保管人），七位君主原稿誓文的最后一位保管人。", connection: "她把禁页拆成碎片，分交给破晓斥候和流星猎手。", quote: "烧掉的史书，最先照亮追问的人。", gender: "女", age: "30岁", personality: "沉静果决，守档如命，烧掉的史书最先照亮追问的人", growthExperience: "云阶书库保管人，焚册之夜把七页誓文拆出分送七人，衙门烧过三次档她抄了四遍", trajectory: "云阶书库→焚册之夜分送誓文→序章" },
  "comet-ranger": { chapter: "第四章 · 三路证词", role: "在王庭边界跑单帮的猎手，替典籍司丞回收散落的史页。", connection: "和幽冥窃影盯上同一件东西，却从不信她的报价。", quote: "我不替王冠卖命，我只替真相多走两步。", gender: "女", age: "24岁", personality: "独立不羁，只信真相不信王冠，跑单帮不卖命", growthExperience: "王庭边界跑单帮的猎手，替典籍司丞回收散落史页，与幽冥窃影盯上同一件东西", trajectory: "流星林地→忘川渡口→三路证词" },
  "astral-queen": { chapter: "终章 · 七蚀之盟", role: "她的血是开第七天门的最后一把钥匙，也是头一桩坠星的嫡传。", connection: "要么向天下翻出祖上的罪，要么再借一次沉默保住王庭。", quote: "加冕不是拥有光，是替它还债。", gender: "女", age: "22岁", personality: "隐忍担当，背负祖罪不翻案因翻案等于承认有罪", growthExperience: "封鼎后最年轻的继承人，焚册时不知情，印被盖上去的。甲子年蚀日之盟当众答应翻旧罪", trajectory: "王庭→蚀日之盟→终章" },
  "void-pickpocket": { chapter: "第二章 · 无名册", role: "在忘川边上捡名姓的掮客，能从影子里摸走一段记性。", connection: "替冥府判官找人，暗中却给流星猎手留了证据。", quote: "我不偷东西，我只拿走没人认领的。", gender: "女", age: "22岁", personality: "狡黠两面，有底线，不偷有人认的只拿没人认领的", growthExperience: "忘川渡口掮客，能从影子里摸走一段记性，替判官找人暗中给猎手留证据", trajectory: "暗巷行会→忘川渡口→无名册→三路证词" },
  "night-conductor": { chapter: "第二章 · 无名册", role: "幽冥军团的前线指挥，用失名者的回声排兵布阵。", connection: "她认定女帝得受审，却在凶兽失控那夜对判官起了疑。", quote: "不会说话的人，也该有一支队伍。", gender: "女", age: "30岁", personality: "冷静果决，不喊口令只打手势，失名者看得懂的手势", growthExperience: "幽冥军团前线指挥，带的全是失名者，幽冥王座那夜查明白判官计划后抗命", trajectory: "黑潮军团→幽冥王座抗命" },
  "hollow-beast": { chapter: "第二章 · 无名册", role: "由一千个无名死者的怕拼出来的裂隙守望兽。", connection: "只认夜幕都统的哨音，却在破晓斥候面前收住了脚。", quote: "它记得所有人，独独不记得自己。", gender: "无", age: "不详（由千名失名者聚合）", personality: "千面千怕，咽不下名字，只认哨音", growthExperience: "由一千个无名死者的怕拼出来的裂隙守望兽，在斥候面前收住脚", trajectory: "深渊裂口→无名册→斥候面前站住" },
  "void-emperor": { chapter: "第五章 · 幽冥王座", role: "从忘川渡旧址回来的判官，忘川借他的身子学会了善和狠。", connection: "他攥着王庭献祭的名册，也可能正是名册最后画押的人。", quote: "我没想统治黑暗，黑暗只是舍不得放下我这个谎。", gender: "男", age: "不详", personality: "善狠并存，黑暗借他的名字开口，既是代言人也是残影", growthExperience: "忘川捏出来跟人间谈判的第一个人，脸是所有失名者的脸叠在一起", trajectory: "忘川渡旧址→冥府王座→幽冥王座认罪" },
  "ember-adept": { chapter: "第三章 · 命盘断线", role: "赤焰塔最后的学徒，能把压住的记忆点成看得见的火。", connection: "天机织命者的学生，也是铁律镜界锻师失散多年的女儿。", quote: "火最诚实，它从来不替谁保密。", gender: "女", age: "18岁", personality: "直率勇敢重情，火最诚实不替谁保密", growthExperience: "赤焰塔最后的学徒，天机织命者的学生，铁律镜界锻师失散的女儿，烧掉必胜预言因为价码是杀古龙", trajectory: "赤焰塔→命盘断线→三路证词" },
  "aether-weaver": { chapter: "第三章 · 命盘断线", role: "织命坊的裁缝，拿概率替同伴缝第二回的机会。", connection: "她替女帝修过封鼎大典，至今没原谅自己那两剪——一剪灯芯，一剪命盘。", quote: "命不是路，是被一遍遍缝起来的口子。", gender: "女", age: "35岁", personality: "自责坚韧，命不是路是被一遍遍缝起来的口子", growthExperience: "织命坊裁缝，封鼎之夜剪断灯芯救了活人让死者卡在天门之间；癸巳年又剪断主命盘，把将来劈成一百零八条岔路。两剪都是她，至今没原谅自己", trajectory: "织命坊→封鼎之变剪灯芯→命盘断线" },
  "rift-oracle": { chapter: "第三章 · 命盘断线", role: "看过一百零八种收场的观星人，唯独看不见自己的死。", connection: "她知道棱镜古龙是第一百零九种结局的证人，却拿不准该唤醒它还是杀了它。", quote: "预言不是令箭，预言是报警的锣。", gender: "女", age: "38岁", personality: "冷静果决，算得出每个人的命从不算自己的，预言是报警的锣，敢断敢摊", growthExperience: "看过一百零八种收场的观星人，唯独看不见自己的死。庚申年设一百零八盏灯向天下摊牌，亲手灭灯留出空白路——不是旁观，是替天下做最难的裁断", trajectory: "裂隙观测站→百八劫数→蚀日之盟" },
  "prism-dragon": { chapter: "终章 · 七蚀之盟", role: "在天地还没名分时就守着天顶的龙，七片鳞即七座天门的钥匙。", connection: "每家都需要它一片鳞，它只搭理肯放下王座的人。", quote: "天不属于飞得最高的，天属于肯抬头看的。", gender: "无", age: "不详（天门初成前已存在）", personality: "超然古老，只搭理肯放下王座的人，天属于肯抬头看的", growthExperience: "天地还没名分时就守着天顶的龙，七片鳞即七座天门钥匙，睡了四十三年", trajectory: "虹膜山脉→五钥之战交鳞→终章" },
  "iron-guard": { chapter: "第一章 · 天门遗踪", role: "铁誓最年轻的城墙匠，把避难城的名字刻在盾内壁。", connection: "奉命拦斥候，却发现她带的证据能洗清自家长辈的叛徒罪名。", quote: "墙不是用来挡人的，是让墙里的人敢闭眼。", gender: "男", age: "20岁", personality: "正直年轻有担当，墙不是用来挡人的是让墙里的人敢闭眼", growthExperience: "铁誓最年轻的城墙匠，把避难城的名字刻在盾内壁，盾甲夹层里翻见父亲被删掉的名字", trajectory: "守城司→开侧门放行斥候→第一章" },
  "mirror-smith": { chapter: "第四章 · 三路证词", role: "棱晶工坊的锻师，能让金属映出人故意忘掉的那一眼。", connection: "她从余烬学徒的火里认出故人的影子，用镜甲替她藏了身世。", quote: "镜子不说谎，说谎的是遮镜子的人。", gender: "女", age: "38岁", personality: "沉默洞察藏身世，镜子不说谎说谎的是遮镜子的人", growthExperience: "棱晶工坊锻师打铁三十年，余烬学徒失散多年的母亲，从火里认出故人影子用镜甲藏了身世", trajectory: "棱晶工坊→三路证词" },
  "forge-singer": { chapter: "第四章 · 三路证词", role: "用打铁歌给要塞对心跳的工坊领唱。", connection: "她握着零号兵俑的唤醒口诀，却不肯交给主张封死一切的议会。", quote: "铁记得每一锤，也记得谁先动的手。", gender: "女", age: "36岁", personality: "听声辨铁有主见不屈服，铁记得每一锤也记得谁先动的手", growthExperience: "熔炉剧场领唱用打铁歌给要塞对心跳，握着零号兵俑唤醒口诀不肯交给议会", trajectory: "熔炉剧场→三路证词" },
  "bastion-warden": { chapter: "第五章 · 幽冥王座", role: "第七防线唯一没撤走的守门人，攥着兵俑唤醒机关的钥匙。", connection: "他守着通往判官旧城的那扇门，也守着自己当年放走的一个孩子。", quote: "我不是不怕败，是不肯让败先过去。", gender: "男", age: "55岁", personality: "坚守不退有秘密，不是不怕败是不肯让败先过去", growthExperience: "第七防线唯一没撤走的守望者，站了三十一年，兵俑沉眠那夜与铁壁司命合力将兵俑按回沉眠，攥着唤醒机关钥匙守门三十一年", trajectory: "第七防线→兵俑沉眠→幽冥王座" },
  "iron-colossus": { chapter: "终章 · 七蚀之盟", role: "零号兵俑，胸口存着封鼎之夜的全本阵图。", connection: "它一重启，铁律就攥住真相，也可能把整条防线变成无差别兵器。", quote: "记录在案：人把犯下的错，叫作必要。", gender: "无", age: "不详（零号机体）", personality: "记录在案的沉默，人把犯下的错叫作必要", growthExperience: "铁律造的最大战争机关，胸口铸着封鼎全本阵图（含焚册执行记录），睁眼那晚全城钟慢半拍", trajectory: "零号工厂→兵俑沉眠→五钥之战→终章" },
  "wild-bloom": { chapter: "第四章 · 三路证词", role: "从万木灵根的梦里开出来的花，闻得出记性的气味。", connection: "她带着尘风骑手穿忘川，去找被灵根驮走的失名者。", quote: "每朵花都记得埋它的人。", gender: "女", age: "20岁", personality: "纯粹不问公平，每朵花都记得埋它的人，闻得出记性的气味", growthExperience: "从万木灵根的梦里开出来的花，带着尘风骑手穿忘川找失名者", trajectory: "温室营地→穿忘川→三路证词" },
  "dust-rider": { chapter: "第四章 · 三路证词", role: "逐风车队的领路人，从不在同一座城过两夜。", connection: "欠夜幕都统一条命，却得护送破晓斥候进王庭。", quote: "风会散，选了的不会。", gender: "男", age: "26岁", personality: "不羁重诺不驻足，风会散选了的不会", growthExperience: "逐风车队领路人，从不在同一座城过两夜，欠夜幕都统一条命却护送斥候", trajectory: "逐风车队→护送斥候→三路证词" },
  "thunder-herd": { chapter: "第五章 · 幽冥王座", role: "被灵根叫醒的兽群，它们的奔徙定着大地的走向。", connection: "山海长老想拿它们踏平要塞，灵根却让它们去救第七防线。", quote: "雷声不光是开战的鼓，也可以是回家的信。", gender: "无", age: "不详（灵根唤醒的兽群）", personality: "雷声不光是开战的鼓也可以是回家的信", growthExperience: "被灵根叫醒的兽群，奔徙定着大地走向，山海长老想拿它们踏平要塞灵根让它们救防线", trajectory: "雷鸣草海→幽冥王座救防线" },
  "world-root": { chapter: "终章 · 七蚀之盟", role: "旧世界最后一脉根，和新世界还没出生的念头。", connection: "它能断忘川，代价是拿所有幸存者的记性当柴烧。", quote: "我不审你们，我只管长。", gender: "无", age: "三千岁以上", personality: "我不审你们我只管长，旧世界最后一脉根", growthExperience: "地下睡了三千年被渴醒，拔起根驮着人和兽群北迁，每救一人取一段记性当路费", trajectory: "原初林海→北迁→五钥之战→终章" },
  "dawn-horn": { chapter: "第一章 · 天门遗踪", role: "传令营守了三十年的老钟，一响全城人都会醒。", connection: "斥候过门那夜，是它没等命令自己响的，钟声替她开了一路城门。", quote: "钟声不怕老，怕的是没人听。", gender: "男", age: "55岁", personality: "沉稳守信，三十年如一日，不问缘由只问该不该响", growthExperience: "传令营老钟匠的徒弟，铸钟三十年，钟声成了全城的生物钟。斥候过门那夜，钟没等命令自己响了", trajectory: "传令营钟楼→城门→全城唤醒" },
  "wall-smith": { chapter: "第一章 · 天门遗踪", role: "营造司砌墙的匠人，工钱当面结，砖缝里从不掺假。", connection: "铁誓卫士开侧门放行斥候，那扇侧门是他头天下午修的，修得谁也没看出来。", quote: "墙是我砌的，门也是我留的。", gender: "男", age: "39岁", personality: "踏实有良心不掺假，墙是我砌的门也是我留的", growthExperience: "营造司砌墙匠人，工钱当面结砖缝里从不掺假，头天下午修的侧门谁也没看出来", trajectory: "营造司→第一章" },
  "seed-guardian": { chapter: "第四章 · 三路证词", role: "播种队的兵，身上揣着三十七种庄稼的种。", connection: "山海花灵借他的种盘认路，他跟着灵根一路走，把种子种进每一处死土。", quote: "仗打完，地还得种。", gender: "男", age: "22岁", personality: "朴实坚韧以种为本，仗打完地还得种", growthExperience: "播种队的兵，身上揣着三十七种庄稼的种，跟着灵根一路走把种子种进每一处死土", trajectory: "播种队→跟着灵根北迁→三路证词" },
  "rune-seeker": { chapter: "序章 · 封鼎之变", role: "观星台抄卦的学徒，把封鼎名单当符咒抄了半辈子。", connection: "他最先认出名单上混进的名字不对，抄完最后一个字，人就不见了。", quote: "字认得我，我还不认得它。", gender: "男", age: "32岁", personality: "执迷安静，抄了半辈子字被字收了", growthExperience: "观星台抄卦学徒，把封鼎名单当符咒抄了半辈子，最先认出名单上混进的名字不对，抄完最后一个字人就不见了", trajectory: "观星台→消失" },
  "night-tide": { chapter: "第二章 · 无名册", role: "黑潮渡口的潮语师，能听懂忘川水说的话。", connection: "失名者的话都让河水先学去，他再把话学回来，一句一句传给人间。", quote: "潮水退走时，总带着一句没说完的话。", gender: "男", age: "26岁", personality: "沉默善听，把忘川学去的话一句一句学回来传给人间", growthExperience: "黑潮渡口潮语师，能听懂忘川水说的话，失名者的话让河水先学去他再学回来", trajectory: "黑潮渡口" },
  "sky-lantern": { chapter: "序章 · 封鼎之变", role: "边关驿站守夜的点灯人，挨家挨户给人续命灯。", connection: "她给名单上被划掉的人各点了一盏灯，那夜全城都亮着，谁也没死成。", quote: "灯不挑贵贱，亮了才算数。", gender: "女", age: "25岁", personality: "温柔坚韧，不放弃任何一盏灯，哪怕灯油烧完用自己的记性", growthExperience: "边关驿站守夜人，封鼎之夜为被划掉的人各点一盏灯，灯油烧完后用自己的记性续灯", trajectory: "边关驿站→各城挨家点灯→序章封鼎之变" },
  "solar-judge": { chapter: "第五章 · 幽冥王座", role: "大理司的推官，判过的案子日落前必须给说法。", connection: "他要审幽冥王座，先审的是自己手里那份盖了王庭印的旧档。", quote: "天光不撒谎，它只是来得晚。", gender: "男", age: "55岁", personality: "严谨公正，日落前必给说法，审人先审己", growthExperience: "大理司推官坐堂三十年，从没拖过第二天。幽冥王座审判先审自己手里的旧档", trajectory: "大理司→幽冥王座审判" },
  "grave-watcher": { chapter: "第二章 · 无名册", role: "无名坟场的更夫，替没人认的陵守夜。", connection: "失名者的陵头没有碑，他把名字刻在心里，一个陵一个名字，从不记混。", quote: "陵不认人，认的是有人还记得。", gender: "男", age: "35岁", personality: "执着沉默，把名字刻在心里一个陵一个名字从不记混", growthExperience: "无名坟场更夫，替没人认的陵守夜，焚册后一夜刻了一千个名字", trajectory: "无名坟场" },
  "siege-engine": { chapter: "第四章 · 三路证词", role: "军械所的火铳，炮膛里刻着上一任炮手的遗言。", connection: "三路证词回城那天，是它一炮轰开了封死的城门，炮响得比欢迎的鼓还早。", quote: "开炮前喊一声：躲好。", gender: "无", age: "不详（军械所旧制）", personality: "开炮前先喊躲好的火铳，炮膛里刻着上一任炮手的遗言", growthExperience: "军械所的火铳，三路证词回城那天一炮轰开封死的城门", trajectory: "军械所→三路证词" },
  "time-echo": { chapter: "第三章 · 命盘断线", role: "时隙观测所的迟到的客人，总在事情发生后才到场。", connection: "他补刀补得准，是因为每次都能看见剪断灯芯那一秒的旧影。", quote: "我来晚了，但每回都赶得上。", gender: "男", age: "28岁", personality: "迟到精准，来晚了但每回都赶得上补刀", growthExperience: "时隙观测所的怪客，总在事情发生后才到场，能看见剪断灯芯那一秒的旧影", trajectory: "时隙观测所→命盘断线后时差错乱" },
  "wild-mother": { chapter: "第六章 · 五钥之战", role: "母兽领地的山一样大的兽，叼回的猎物一半喂幼崽一半喂难民。", connection: "五钥之战它驮着温室和半城人过天门，蹄子落地的每一下都有人跟着活。", quote: "山不走，山会替人挡住风。", gender: "无", age: "不详（山海古兽）", personality: "山不走山会替人挡住风，叼回的猎物一半喂幼崽一半喂难民", growthExperience: "母兽领地山一样大的兽，五钥之战驮着温室和半城人过天门", trajectory: "母兽领地→五钥之战" },
  "titan-keeper": { chapter: "第五章 · 幽冥王座", role: "零号工厂的铁甲门神，给兵俑守了十年门。", connection: "判官旧城的钥匙在他身上，他没交，也没砸，就这么站着，让人自己选。", quote: "我守的不是门，是门后面的选择。", gender: "男", age: "38岁", personality: "沉默守门让人自己选，守的不是门是门后面的选择", growthExperience: "零号工厂铁甲门神，给兵俑守了十年门，判官旧城钥匙在他身上没交也没砸", trajectory: "零号工厂→幽冥王座" },
  "spark-star": { chapter: "第六章 · 五钥之战", role: "杂役房的一盏油灯，灯芯是封鼎之夜没点完的那截。", connection: "五钥之战第一夜，是她这点星火先亮，照得五家都看清了彼此的脸。", quote: "别小看一点星火，它能点着整片麦田。", gender: "无", age: "不详（封鼎夜余烬）", personality: "微小而执着的星火，灯芯是封鼎之夜没点完的那截", growthExperience: "杂役房的油灯，灯芯源自封鼎之夜未燃尽的余烬", trajectory: "杂役房→五钥之战第一夜照亮全城" },
  "fate-charm": { chapter: "第三章 · 命盘断线", role: "卦棚里唯一一支上上签，抽到的都说灵。", connection: "签筒里其实只有这一支签，其余全是卜者的良心。", quote: "签不说谎，说谎的是求签的人。", gender: "无", age: "不详（卦棚传世）", personality: "签不说谎说谎的是求签的人，上上签留给所有还敢抽的人", growthExperience: "卦棚里唯一一支上上签，签筒里其实只有这一支签其余全是卜者的良心", trajectory: "卦棚→命盘断线" },
  "shadow-bolt": { chapter: "第五章 · 幽冥王座", role: "暗巷行会的暗箭，从影子里射出来，没人看见弓。", connection: "判官旧城一夜之间射出三百支，每一支都只对准了锁链。", quote: "看不见的箭，留得下看得见的门。", gender: "无", age: "不详（暗巷行会造物）", personality: "从影子里射出的暗箭，留得下看得见的门", growthExperience: "暗巷行会的暗箭，幽冥王座那夜射出三百支只对准锁链", trajectory: "暗巷行会→幽冥王座" },
  "forge-hammer": { chapter: "第六章 · 五钥之战", role: "铸坊的铁锤，祖传了三代，把手包了浆。", connection: "五钥之战它把五样家底锻成一把钥匙，锤到第四十九下，王庭的印自己裂了。", quote: "铁不打不成器，日子不打不成日子。", gender: "无", age: "不详（三代传承）", personality: "铁不打不成器日子不打不成日子，敲了三代人的锤", growthExperience: "铸坊铁锤祖传三代把手包了浆，五钥之战把五样家底锻成一把钥匙", trajectory: "铸坊→五钥之战" },
  "earth-roots": { chapter: "第四章 · 三路证词", role: "药圃的地脉，受了伤的人回土里躺一会儿就好。", connection: "三路证词的人都靠它接的骨，它把五家的血喂进同一块地。", quote: "受了伤别硬扛，土会替你说话。", gender: "无", age: "不详（地脉）", personality: "受了伤别硬扛土会替你说话，五家的血喂进同一块地", growthExperience: "药圃的地脉，三路证词的人都靠它接的骨", trajectory: "药圃→三路证词" },
  "focus-spirit": { chapter: "终章 · 七蚀之盟", role: "绘卷斋最后一点墨，画龙点睛那一笔的余韵。", connection: "终章大典前，它给五家每人点了睛，好让他们看清自己要扛什么。", quote: "点睛的那一笔，是最快见效，也最晚学会的。", gender: "无", age: "不详（绘卷遗墨）", personality: "点睛那一笔最快见效也最晚学会，来不及也得点", growthExperience: "绘卷斋最后一点墨画龙点睛那一笔的余韵，七蚀之盟前给五家每人点了睛", trajectory: "绘卷斋→七蚀之盟" },
  "radiance-bless": { chapter: "第六章 · 五钥之战", role: "医正司城头药铺，城门将破时整间铺子都在城头。", connection: "五钥之战打完，城头第一个亮起来的是它的幌子。", quote: "药不分敌我，伤分。", gender: "无", age: "不详（医正司传承）", personality: "不分敌我的救治，城头药铺的坚守", growthExperience: "医正司城头药铺，城门将破时整间铺子搬上城墙", trajectory: "医正司→城墙→五钥之战" },
  "golem-rune": { chapter: "终章 · 七蚀之盟", role: "机关司的搬山术，图纸被虫蛀了，凭记忆又造了出来。", connection: "终章它替铁律挡住第一波潮水，石俑上的裂纹像祖辈手写的批注。", quote: "祖辈没画完的，我们接着画。", gender: "无", age: "不详（按复造计）", personality: "祖辈没画完的我们接着画，裂纹像祖辈手写的批注", growthExperience: "机关司搬山术，图纸被虫蛀了凭记忆又造了出来", trajectory: "机关司→七蚀之盟" },
  "forget-curse": { chapter: "终章 · 七蚀之盟", role: "黑潮渡口的揭页咒，能让一段历史安静下来。", connection: "终章有人想用它揭过幽冥王座那页，被五家人一起按住了。", quote: "要让历史消失，先让记得它的人闭嘴——可闭嘴的人，也会梦见。", gender: "无", age: "不详（忘川旧咒）", personality: "让历史安静但不让消失的揭页咒，闭嘴的人也会梦见", growthExperience: "黑潮渡口的揭页咒，七蚀之盟有人想揭过幽冥王座那页被五家按住", trajectory: "黑潮渡口→七蚀之盟" },
  "bloom-sea": { chapter: "终章 · 七蚀之盟", role: "温室营地的春汛，山海的花开起来像水漫过来。", connection: "终章大典那天，花从城门口一直开到第七天门脚下。", quote: "山海的花，不是一朵一朵开的，是一片一片。", gender: "无", age: "不详（温室营地春汛）", personality: "山海的花不是一朵一朵开的是一片一片像水漫过来", growthExperience: "温室营地的春汛，七蚀之盟那天花从城门口开到第七天门脚下", trajectory: "温室营地→七蚀之盟" },
  "venom-viper": { chapter: "第二章 · 无名册", role: "黑潮渡口养在阴影里的蛇，咬住就不松口。", connection: "失名者的事它知道得最全，因为没人敢从它嘴里再问。", quote: "影子先烂的猎物，话会烂在肚子里。", gender: "无", age: "不详（黑潮渡口异蛇）", personality: "咬住就不松口的蚀髓蛇，影子先烂", growthExperience: "黑潮渡口养在阴影里的蛇，失名者的事知道得最全", trajectory: "黑潮渡口→无名册" },
  "stasis-seal": { chapter: "第三章 · 命盘断线", role: "织命坊的定针，能把一瞬间缝在原处。", connection: "命盘断线那天，它替时隙法师定住了剪灯芯的手，就慢了半息。", quote: "最利的针，是让时光停住的针。", gender: "无", age: "不详（织命坊定针）", personality: "最利的针是让时光停住的针，可时光不停针再利也白搭", growthExperience: "织命坊的定针，命盘断线那天替时隙法师定住剪灯芯的手就慢了半息", trajectory: "织命坊→命盘断线" },
  "rust-fetter": { chapter: "第六章 · 五钥之战", role: "铸坊栓武器架的旧链，锈得越狠，拴得越牢。", connection: "五钥之战它锁过双方的火炮，谁也没能先开火，反倒逼出谈判。", quote: "生锈的链子，比新的牢。", gender: "无", age: "不详（铸坊旧链）", personality: "生锈的链子比新的牢，时间拴住的东西钥匙打不开", growthExperience: "铸坊栓武器架的旧链，五钥之战锁过双方火炮逼出谈判", trajectory: "铸坊→五钥之战" },
  "dust-seal": { chapter: "序章 · 封鼎之变", role: "观星台封档的旧咒，让不该发亮的那页字不再发亮。", connection: "封鼎之夜它被用来盖住名单，可墨干了，字还在底下等着。", quote: "尘封的惩罚，是让字等。", gender: "无", age: "不详（观星台封档旧咒）", personality: "尘封的惩罚是让字等，字等得越久底下那页越烫", growthExperience: "观星台封档的旧咒，封鼎之夜被用来盖住名单可墨干了字还在底下等着", trajectory: "观星台→封鼎之变" },
  "astral-insight": { chapter: "第三章 · 命盘断线", role: "观星台那卷翻不完的星图，每次翻开都只给三条路。", connection: "命盘断线那天，散人从它上头挑中了封命盘的那条路，其余两条留给后人。", quote: "命盘会骗人，星图只会让你自己选。", gender: "无", age: "不详（观星台星图）", personality: "只给三条路让你自己选的星图，不骗人也不替人选", growthExperience: "观星台翻不完的星图，命盘断线那天散人从中挑中封命盘的路", trajectory: "观星台→命盘断线" },
  "echo-shard": { chapter: "第二章 · 无名册", role: "忘川水底的残片，谁喊你的名字，它就应一声。", connection: "失名者靠它听见过人间最后的动静，也靠它把没说完的话传回来。", quote: "忘川冲不走的东西，都沉在回声里。", gender: "无", age: "不详（忘川水底残片）", personality: "只应喊过的名字不帮喊忘了的名字，忘川最狠的规矩", growthExperience: "忘川水底的残片，谁喊名字就应一声，失名者靠它听见人间动静", trajectory: "黑潮渡口→无名册" },
  "ancient-egg": { chapter: "第四章 · 三路证词", role: "山海苗圃里那颗没人记得谁埋下的卵。", connection: "三路证词的人从它身边过了三回，直到灵根北迁那夜它才裂开，钻出的东西替山海先认了路。", quote: "它裂开时，带着一股记性的气味。", gender: "无", age: "不详（孵化前）", personality: "带着记性气味的古卵，没人记得谁埋下的", growthExperience: "山海苗圃里没人记得谁埋下的卵，灵根北迁那夜裂开钻出的东西替山海先认了路", trajectory: "温室营地→灵根北迁裂开→三路证词" },
  "star-blade": { chapter: "第一章 · 天门遗踪", role: "王庭亲卫传下来的巡夜短刃，剑在人在。", connection: "曜剑郎追人的路上拔过它；刃口见血的那晚，他头一回没朝学生出鞘。", quote: "剑要见血，也要见光。", gender: "无", age: "不详（王庭亲卫旧刃）", personality: "见血见光的巡夜短刃，剑在人在", growthExperience: "王庭亲卫传下来的巡夜短刃，曜剑郎追人时拔过", trajectory: "王庭亲卫→追捕之路" },
  "iron-anvil": { chapter: "第六章 · 五钥之战", role: "铁律铸坊三代人敲同一块铁砧。", connection: "五样家底凑齐那夜，它在砧上敲完了阵图的最后一行——敲完，整条天穹防线的账才算对上。", quote: "铁砧上敲了三代人的锤，敲的是自家的疼。", gender: "无", age: "不详（三代传承）", personality: "敲了三代人的疼，铁砧上敲的不是铁是自家的疼", growthExperience: "铁律铸坊三代人敲同一块铁砧，五样家底凑齐那夜敲完阵图最后一行", trajectory: "铸坊→五钥之战" },
  "mirror-guard": { chapter: "第一章 · 天门遗踪", role: "医正司传下来的回光返照，挨打之后才显灵。", connection: "斥候突围那夜，咒印替守军挡回了一口命；后来他们才懂，咒不伤人，咒只照见来路。", quote: "挨打不怕，就怕忘了疼。", gender: "无", age: "不详（医正司古咒）", personality: "挨打之后才显灵的回光返照，照见来路让人记得疼", growthExperience: "医正司传下来的古咒，斥候突围那夜替守军挡回一口命", trajectory: "医正司→斥候突围" },
  "spell-eater": { chapter: "第二章 · 无名册", role: "黑潮渡口压箱底的噬术咒。", connection: "忘川第一次漫过渡口时，靠它把对岸甩来的法术吞成了自己的牌。失名者们从此信：吃进去的，迟早吐回来。", quote: "以彼之道，还施彼身——先还一张牌。", gender: "无", age: "不详（忘川渡口旧咒）", personality: "以彼之道还施彼身，吃进去的迟早吐回来", growthExperience: "忘川渡口压箱底的噬术咒，忘川头一回漫过渡口时学会的", trajectory: "黑潮渡口" },
  "spike-field": { chapter: "第六章 · 五钥之战", role: "守城司撒在墙根下的铁蒺藜。", connection: "五钥之战那夜，谁翻墙谁挨咬；天穹防线最后守住的，一半是墙，一半是墙根下的牙。", quote: "来多少人，地就咬多少人。", gender: "无", age: "不详（守城司军械）", personality: "来多少人地就咬多少人，地不挑人牙也不挑", growthExperience: "守城司撒在墙根下的铁蒺藜，五钥之战谁翻墙谁挨咬", trajectory: "守城司→五钥之战" },
  // ── 天衡 · 新篇（P1 扩充）──
  "lute-officer": { chapter: "第一章 · 天门遗踪", role: "云阶书库的琴师，把王庭旧案谱成曲子，弦声一起，蒙尘的卷宗自己会应。", connection: "她替典籍司丞把七页誓文的调子记在弦上，誓文烧了，曲子还在。", quote: "弦声起处，旧账自己会翻页。", gender: "女", age: "21岁", personality: "温婉敏锐，以弦代笔，记住所有谱过的旧案", growthExperience: "云阶书库琴师，幼时被典籍司丞捡回书库，以琴声记档三十年。誓文焚毁后，她把七页誓文的调子缝进琴弦", trajectory: "云阶书库→天门遗踪→携带誓文之曲" },
  "seal-maiden": { chapter: "第一章 · 天门遗踪", role: "大理司掌印的女官，印盖下去之前总要数清对面来了多少人。", connection: "她收过铁誓卫士父亲被删的名字，也藏过一张没敢盖下去的批文。", quote: "印是秤，不是刀。", gender: "女", age: "27岁", personality: "谨慎持重，敌众我寡也不慌，印是秤不是刀", growthExperience: "大理司掌印女官，父亲是前任掌印。她见过焚册批文从自己手上过，没敢盖，把批文夹进旧档", trajectory: "大理司→天门遗踪→旧档里的批文" },
  "night-whistle": { chapter: "第一章 · 天门遗踪", role: "边关驿站的夜哨，哨过三更，给守城人一句：我还醒着。", connection: "破晓斥候过门那夜，是她的哨声一路开的路。", quote: "哨声不催人，只叫人别睡。", gender: "女", age: "19岁", personality: "机警果敢，夜里的眼睛比白天的亮", growthExperience: "边关驿站夜哨，三更换一次班，从不误点。斥候过门那夜，她用哨声串起七个驿站", trajectory: "边关驿站→破晓过门" },
  "edict-clerk": { chapter: "序章 · 封鼎之变", role: "王庭诏书女史，诏书到她手上，字里行间总会多出半句人话。", connection: "她誊抄过永昼名单，抄完那夜，她把自己的名字划掉了。", quote: "笔比刀更早知道谁该死。", gender: "女", age: "26岁", personality: "温柔坚韧，笔下留情，宁删自己也不删别人", growthExperience: "王庭诏书女史，誊抄永昼名单时认出其中有流民和战俘，把自己的名字填进去替下了一个", trajectory: "王庭→封鼎之变→名单上的留白" },
  "crimson-guardian": { chapter: "第一章 · 天门遗踪", role: "王庭亲卫绛衣卫，挡过的不是刀，是那句还没说出口的诏令。", connection: "她替女帝挡过三次暗杀，也替女帝藏过三封不想签的旨。", quote: "红是替谁染的，心里要清楚。", gender: "女", age: "31岁", personality: "忠而不愚，护卫之余替主子守着良心", growthExperience: "绛衣卫统领，十七岁入亲卫，替女帝挡过三次暗杀。封鼎之夜她在场，替女帝藏了三封没签的旨", trajectory: "王庭亲卫→封鼎之变→三封未签的旨" },
  "dawn-herald": { chapter: "第一章 · 天门遗踪", role: "传令营最快的信使，天亮之前，信一定到。", connection: "她替典籍司丞送过最后一封没有收件人的信。", quote: "信不到，人不睡。", gender: "女", age: "23岁", personality: "风一样快，信比命重，说到必到", growthExperience: "传令营信使，跑过最远的路。最后一封无收件人的信，她送到了第七天门门口", trajectory: "传令营→第七天门" },
  "mirror-tutor": { chapter: "第四章 · 三路证词", role: "云阶书库镜史官，死后留下的镜子里还能照出半卷没抄完的史。", connection: "她生前把最后一卷史书夹进镜子背面，留给典籍司丞。", quote: "史书不怕烧，怕没人照。", gender: "女", age: "47岁", personality: "沉静守诺，照史如镜，身后事也想好了", growthExperience: "云阶书库镜史官，抄史四十年。焚册之夜她把最后一卷史书夹进镜背，自己守在书架前没走", trajectory: "云阶书库→焚册之夜→镜背里的史" },
  "celestial-weaver": { chapter: "第六章 · 五钥之战", role: "织造司的天纬织女，把满天星斗织进一匹布里，布的另一头拴着天门的铰链。", connection: "五钥之战她织完最后一根纬线，天门铰链松了一扣。", quote: "天幕漏了，线头在我这。", gender: "女", age: "34岁", personality: "专注执拗，织天为幕，一根线也不肯断", growthExperience: "织造司织女，师承上一任天纬。五钥之战前夜织完最后一根纬线，天门的铰链松了一扣", trajectory: "织造司→五钥之战" },
  "eclipse-princess": { chapter: "终章 · 七蚀之盟", role: "日蚀那天出生的王族，天生记着光是怎么走的。", connection: "她记得封鼎之夜每一盏灯灭的顺序，比任何档案都全。", quote: "光走的时候，我看见了。", gender: "女", age: "16岁", personality: "早慧沉静，记性如海，唯独记不起自己的生母", growthExperience: "日蚀日出生的王族，封鼎之夜她刚满月。四十三年后，她成为唯一记得那夜灯序的人", trajectory: "王庭→七蚀之盟" },
  "gatekeeper-old": { chapter: "第一章 · 天门遗踪", role: "王庭老门监，守了四十年门，最恨忘川学着人敲门。", connection: "斥候过门那夜，他假装没听见。", quote: "门认得人，不认得脸。", gender: "男", age: "61岁", personality: "寡言守信，装聋作哑只对好人", growthExperience: "王庭门监四十年，封鼎之夜他在岗。斥候过门那夜，他头一回假装没听见", trajectory: "王庭门监→破晓过门" },
  "royal-herald": { chapter: "序章 · 封鼎之变", role: "王庭传诏，念诏书背得滚瓜烂熟，只有一句总也念不响：恕你无罪。", connection: "永昼名单颁布那天，他念漏了一个名字。", quote: "恕你无罪——这四个字，我练了三十年。", gender: "男", age: "44岁", personality: "油滑的外表下藏着良心，念漏的名字是故意的", growthExperience: "王庭传诏三十年，永昼名单颁布那天，他故意念漏一个流民的名字", trajectory: "王庭→封鼎之变" },
  // ── 幽冥 · 新篇（P1 扩充）──
  "shadow-warden": { chapter: "第二章 · 无名册", role: "暗巷行会的影守女，影子替她站岗，她替影子记路。", connection: "她给失名者做过三百个假影子，每个都能走回原来的家。", quote: "影子不怕丢，怕的是没人认。", gender: "女", age: "22岁", personality: "缄默狡黠，影子是她唯一信任的伴", growthExperience: "暗巷行会影守女，失名者求她做假影子，她做了三百个，每个都按记忆描的家", trajectory: "暗巷行会→无名册" },
  "tide-singer": { chapter: "第二章 · 无名册", role: "黑潮渡口的潮歌女，歌是从水里学的，学的是不会唱的人的声音。", connection: "忘川学舌学来的调子，她一句一句还给人间。", quote: "水里的歌，得有人接住。", gender: "女", age: "20岁", personality: "沉静善听，替不会说话的人发声", growthExperience: "黑潮渡口潮歌女，夜潮术士的师妹。忘川学舌，她学忘川，把失名者的声音唱回人间", trajectory: "黑潮渡口→无名册" },
  "ghost-bell": { chapter: "第二章 · 无名册", role: "无名坟场的鬼铃，铃铛一响，赶路的鬼就知道家在哪边。", connection: "她给每个失名者编了一种铃音，死了也分得清。", quote: "铃音是回家的路。", gender: "女", age: "28岁", personality: "温和执着，记性全在铃上", growthExperience: "无名坟场守铃人，给三百个失名者各编一种铃音，从不混", trajectory: "无名坟场→无名册" },
  "bone-lantern": { chapter: "第二章 · 无名册", role: "无名坟场的骨灯女，灯芯是骨头做的，烧的不是油，是没人要的夜。", connection: "她守的坟里埋的不是死人，是没人敢认的往事。", quote: "骨灯不挑人，谁冷照谁。", gender: "女", age: "33岁", personality: "寡言温柔，以骨为烛，照亮无主的夜", growthExperience: "无名坟场骨灯女，守陵人的妹妹。她把没人认的往事当灯油，烧了十年", trajectory: "无名坟场→无名册" },
  "void-whisper": { chapter: "第五章 · 幽冥王座", role: "黑潮渡口的虚语女，话只说给忘川听，忘川学会了，就不敢再忘。", connection: "她替冥府判官传过一句不该传的话，之后只对忘川说话。", quote: "有些话，只能让河水听。", gender: "女", age: "29岁", personality: "疏离神秘，话少而重", growthExperience: "黑潮渡口虚语女，替判官传过一句话后闭口十年，只与忘川对谈", trajectory: "黑潮渡口→幽冥王座" },
  "crypt-keeper": { chapter: "第二章 · 无名册", role: "无名坟场的墓守女，烧的纸钱不是给死人花的，是给活人看的。", connection: "她给每个失名者烧一张写着名字的纸，灰落在哪，哪就记得。", quote: "纸灰认得名字。", gender: "女", age: "18岁", personality: "安静灵巧，纸烬里藏着温柔", growthExperience: "无名坟场墓守女，守陵人收留的孤女，学会了给失名者烧名字", trajectory: "无名坟场→无名册" },
  "abyss-reader": { chapter: "第五章 · 幽冥王座", role: "深渊裂口的渊读女，读过的深渊比她活过的日子还深。", connection: "她在深渊里读到过冥府判官的旧名，没说出去。", quote: "深渊不骗人，它只是太深。", gender: "女", age: "35岁", personality: "冷静深邃，知而不言", growthExperience: "深渊裂口渊读女，reads深渊三十年，读到判官旧名后选择沉默", trajectory: "深渊裂口→幽冥王座" },
  "night-queen": { chapter: "第二章 · 无名册", role: "黑潮军团的夜后，不点灯，她的影子就是全城的灯火。", connection: "夜幕都统的继任者，也接过她的疑。", quote: "夜再黑，也得有人掌灯。", gender: "女", age: "32岁", personality: "威严而不冷，影子替她掌灯", growthExperience: "黑潮军团夜后，夜幕都统的继任者，幽冥王座那夜她选择抗命", trajectory: "黑潮军团→幽冥王座" },
  "moonless": { chapter: "第五章 · 幽冥王座", role: "无月那夜出生的孩子，天生记得月亮是怎么没的。", connection: "她记得封鼎之夜月亮消失的确切时刻，比判官的档案还准。", quote: "月没的那夜，我看见了。", gender: "女", age: "17岁", personality: "早慧孤冷，记性惊人", growthExperience: "无月夜出生的幽冥子民，封鼎之夜她刚出生。四十三年来，她记得那夜每一刻", trajectory: "黑潮军团→幽冥王座" },
  "ferryman": { chapter: "第二章 · 无名册", role: "黑潮渡口的渡夫，船不载活人，也不载死人，只载还没想好自己是谁的。", connection: "他渡过的失名者，没有一个回头。", quote: "船到对岸，名字自己会想起来的。", gender: "男", age: "52岁", personality: "沉稳寡言，渡人不渡己", growthExperience: "黑潮渡口渡夫三十年，渡过失名者无数，自己却一直没想好自己是谁", trajectory: "黑潮渡口→无名册" },
  "shadow-claw": { chapter: "第二章 · 无名册", role: "深渊裂口的影爪，比影子先到，等影子到的时候，猎物已经不见了。", connection: "它替夜幕都统清过三批叛徒，也从没动过失名者一根指头。", quote: "爪快，心不能快。", gender: "无", age: "不详（深渊造物）", personality: "迅捷克制，爪快心不快", growthExperience: "深渊裂口影爪，夜幕都统的暗器，只动该动的人", trajectory: "深渊裂口→无名册" },
  // ── 天机 · 新篇（P1 扩充）──
  "star-stitcher": { chapter: "第三章 · 命盘断线", role: "织命坊的星缝女，缝的不是布，是天幕漏下来的那几颗星。", connection: "她替天机织命者缝过断线，也替自己缝过一颗星。", quote: "天幕的线头，在我手里。", gender: "女", age: "24岁", personality: "专注灵巧，针下有星", growthExperience: "织命坊星缝女，天机织命者的弟子，命盘断线后她缝了一颗自己的星", trajectory: "织命坊→命盘断线" },
  "clock-maiden": { chapter: "第三章 · 命盘断线", role: "时隙观测所的钟灵，敲的不是钟，是提醒时间还欠谁一段。", connection: "她替时隙法师记着迟到的时间，从没漏过。", quote: "时间欠的账，我记着。", gender: "女", age: "19岁", personality: "机灵守时，钟声是她的语言", growthExperience: "时隙观测所钟灵，时隙法师的助手，命盘断线后时间错乱，她成了唯一守时的人", trajectory: "时隙观测所→命盘断线" },
  "rune-calligrapher": { chapter: "序章 · 封鼎之变", role: "观星台的符书女，写的符字，落笔越重，卦就越灵。", connection: "她替符文寻者抄过最后一页名单，抄完就明白他为什么消失了。", quote: "字重卦灵，心重人迷。", gender: "女", age: "30岁", personality: "虔诚专注，字里藏心", growthExperience: "观星台符书女，符文寻者的同门，替他抄完最后一页名单后，开始找他的下落", trajectory: "观星台→寻找符文寻者" },
  "fate-dancer": { chapter: "第三章 · 命盘断线", role: "观星台的命舞女，跳舞的时候，脚下的命盘跟着转。", connection: "命盘断线那夜，她的舞步停了，之后再没跳过完整的。", quote: "命盘转，舞步随；命盘断，舞步乱。", gender: "女", age: "22岁", personality: "灵动敏感，舞是她的卦", growthExperience: "观星台命舞女，以舞步问卦，命盘断线后她的舞步永远缺一拍", trajectory: "观星台→命盘断线" },
  "thread-puppeteer": { chapter: "第三章 · 命盘断线", role: "织命坊的线偶师，手里的线，牵着所有人看不见的那根命运。", connection: "她替天机织命者收过线头，也替自己剪断过一根。", quote: "线在人手，命在人心。", gender: "女", age: "27岁", personality: "冷静疏离，牵线者不牵心", growthExperience: "织命坊线偶师，天机织命者的同门，命盘断线后她剪断了自己的命运线", trajectory: "织命坊→命盘断线" },
  "void-mathematician": { chapter: "第三章 · 命盘断线", role: "裂隙观测站的虚数女，算得清天上的星，算不清人心里的数。", connection: "她算出第一百零九条路，也算出自己不在路上。", quote: "虚数不是假的，只是算不到。", gender: "女", age: "36岁", personality: "冷静理性，数里有诗", growthExperience: "裂隙观测站虚数女，天机散人的弟子，算出第一百零九条路后选择了沉默", trajectory: "裂隙观测站→命盘断线" },
  "prophecy-weaver": { chapter: "第三章 · 命盘断线", role: "织命坊的预织女，把未来的线先织好，等命运自己走上来。", connection: "她织过十三种结局，每种都有一个人活不成。", quote: "未来不是注定，是织出来的。", gender: "女", age: "40岁", personality: "慈祥而沉重，织线如织命", growthExperience: "织命坊预织女，天机织命者的前辈，织过十三种结局，每织一次就少一截自己的记忆", trajectory: "织命坊→命盘断线" },
  "eclipse-calculator": { chapter: "终章 · 七蚀之盟", role: "裂隙观测站的日蚀算女，算出日蚀的每一刻，唯独算不出自己为何总在日蚀时想起故乡。", connection: "她的故乡在第七天门后面，她记得，却说不出口。", quote: "日蚀是算术，故乡是题外话。", gender: "女", age: "25岁", personality: "聪明疏离，算术之外拒绝多想", growthExperience: "裂隙观测站日蚀算女，天机散人的学生，算尽日蚀却算不回家乡", trajectory: "裂隙观测站→七蚀之盟" },
  "chess-master": { chapter: "第三章 · 命盘断线", role: "观星台的弈者，下棋从不悔子，因为悔子的人，往往连人生也想悔。", connection: "他陪天机散人对弈四十年，那盘棋至今没下完。", quote: "落子不悔，悔的是心。", gender: "男", age: "55岁", personality: "沉稳从容，棋如人生", growthExperience: "观星台弈者，与天机散人对弈四十年，命盘断线那夜他落下了最后一子", trajectory: "观星台→命盘断线" },
  "hourglass": { chapter: "第三章 · 命盘断线", role: "时隙观测所的时漏，沙的见证，见证了每一段被遗忘的时间。", connection: "它漏完一次，就有一段时间被记起。", quote: "沙漏完，时间记得。", gender: "无", age: "不详（时隙观测所造物）", personality: "见证者，不偏不倚", growthExperience: "时隙观测所时漏，见证过命盘断线的瞬间，之后它的沙漏得慢了", trajectory: "时隙观测所→命盘断线" },
  // ── 铁律 · 新篇（P1 扩充）──
  "rivet-forger": { chapter: "第四章 · 三路证词", role: "营造司的铆钉女匠，敲铆钉的声音，比铁律的钟声还准。", connection: "她替铁誓卫士修过盾，也替墙匠修过门。", quote: "铆钉咬合，日子就不散。", gender: "女", age: "25岁", personality: "踏实利落，手上活比嘴上话多", growthExperience: "营造司铆钉女匠，墙匠的徒弟，三路证词回城那夜她钉好了所有裂开的城门", trajectory: "营造司→三路证词" },
  "armor-tailor": { chapter: "第四章 · 三路证词", role: "棱晶工坊的甲衣裁女，缝的甲衣，比城墙更让人安心。", connection: "她给镜界锻师缝过镜甲，也给余烬学徒缝过冬衣。", quote: "甲衣护身，针脚护心。", gender: "女", age: "23岁", personality: "细心温和，针脚里藏着关心", growthExperience: "棱晶工坊甲衣裁女，镜界锻师的弟子，给余烬学徒缝冬衣时认出了故人的手艺", trajectory: "棱晶工坊→三路证词" },
  "siege-matron": { chapter: "第四章 · 三路证词", role: "军械所的攻城母将，指挥的炮火，从不让敌人喘口气。", connection: "她与攻城重砲搭档三十年，开炮前的那声躲好，是她教的。", quote: "炮火不停，是因为敌人在动。", gender: "女", age: "48岁", personality: "刚毅果决，炮火里的主心骨", growthExperience: "军械所攻城母将，攻城重砲的搭档，三路证词那夜她一炮轰开了城门", trajectory: "军械所→三路证词" },
  "gear-dancer": { chapter: "第四章 · 三路证词", role: "零号工厂的齿轮舞女，跳的舞，是齿轮咬合的声音谱成的。", connection: "她听得出零号兵俑的齿轮哪里卡了，比检修师还准。", quote: "齿轮的舞步，我一听就会。", gender: "女", age: "21岁", personality: "灵动专注，机械是她的舞伴", growthExperience: "零号工厂齿轮舞女，兵俑看守的助手，兵俑沉眠那夜她用舞步校准了齿轮", trajectory: "零号工厂→兵俑沉眠" },
  "furnace-priestess": { chapter: "第四章 · 三路证词", role: "熔炉剧场的炉膛女祭司，相信火里住着神明，只是神明也怕打铁声。", connection: "她与熔炉吟游者同炉二十年，会唱她的打铁歌。", quote: "炉火是神明的歌，锤声是凡人的答。", gender: "女", age: "39岁", personality: "虔诚豪迈，炉火旁的守护者", growthExperience: "熔炉剧场炉膛女祭司，熔炉吟游者的搭档，兵俑沉眠那夜她守着炉火没让灭", trajectory: "熔炉剧场→三路证词" },
  "blueprint-warden": { chapter: "第四章 · 三路证词", role: "营造司的图纸女卫，守护的图纸，比她的命还重要。", connection: "她手里有一张零号兵俑的备份图，铁律议会不知道。", quote: "图纸在，手艺就在。", gender: "女", age: "37岁", personality: "严谨忠诚，图纸是她的铠甲", growthExperience: "营造司图纸女卫，机关司的文书，备份了零号兵俑的图纸，藏在书架的暗格里", trajectory: "营造司→三路证词" },
  "anvil-queen": { chapter: "第六章 · 五钥之战", role: "铸坊的铁砧女王，敲的每一锤，都在锻造铁律的未来。", connection: "她与铸界锤、熔炉残锤同炉，三代人的锤声她都听过。", quote: "铁砧不说话，但每一锤都是回答。", gender: "女", age: "45岁", personality: "沉稳大气，锤声里的女王", growthExperience: "铸坊铁砧女王，三代铁匠的长女，五钥之战她亲手锻出最后一把钥匙", trajectory: "铸坊→五钥之战" },
  "zero-warden": { chapter: "第六章 · 五钥之战", role: "零号工厂的女卫，守护的零号，是铁律最后的防线。", connection: "她与兵俑看守共事十年，最懂他为什么守着那扇门。", quote: "零号在，防线就在。", gender: "女", age: "34岁", personality: "坚定沉着，零号是她的信仰", growthExperience: "零号工厂女卫，兵俑看守的搭档，五钥之战她守在零号门口三天三夜", trajectory: "零号工厂→五钥之战" },
  "gate-mason": { chapter: "第一章 · 天门遗踪", role: "营造司的门匠，修的门比城门还坚固。", connection: "铁誓卫士开的侧门，图纸是他画的。", quote: "门要修得比墙结实，人才敢进出。", gender: "男", age: "42岁", personality: "实在厚道，手艺说话", growthExperience: "营造司门匠，墙匠的同门，画过铁誓卫士侧门的图纸", trajectory: "营造司→第一章" },
  "iron-dog": { chapter: "第一章 · 天门遗踪", role: "守城司的铁犬，不看门，看的是门后的人心。", connection: "它只对一种人摇尾巴：心里没鬼的。", quote: "铁犬不叫，心里有数。", gender: "无", age: "不详（守城司造物）", personality: "忠诚敏锐，识人于无声", growthExperience: "守城司铁犬，铁誓卫士的伙伴，开侧门那夜它没叫", trajectory: "守城司→第一章" },
  // ── 山海 · 新篇（P1 扩充）──
  "root-daughter": { chapter: "第四章 · 三路证词", role: "温室营地的根女，出生在万木灵根的根须上，一生都在寻找属于自己的那节根。", connection: "她跟着灵根北迁，一路把断掉的根接回去。", quote: "根断了，接上就是。", gender: "女", age: "20岁", personality: "坚韧温和，根是她的家", growthExperience: "温室营地根女，万木灵根的孩子，北迁路上她接了三百节断根", trajectory: "温室营地→灵根北迁" },
  "rain-girl": { chapter: "第四章 · 三路证词", role: "播种队的雨女，走到哪，雨就跟到哪，庄稼也长到哪。", connection: "她跟着种子卫士走，种子种到哪，她的雨就下到哪。", quote: "雨不挑地，地挑雨。", gender: "女", age: "17岁", personality: "温柔灵动，雨是她的性子", growthExperience: "播种队雨女，种子卫士的同伴，北迁路上她让三十七种庄稼都活了下来", trajectory: "播种队→灵根北迁" },
  "seed-weaver": { chapter: "第四章 · 三路证词", role: "温室营地的种织女，把种子织进衣裳，走到哪就把春天穿到哪。", connection: "她给每个北迁的孩子织了一件带种子的衣裳。", quote: "衣裳破了自己补，种子丢了自己种。", gender: "女", age: "26岁", personality: "手巧心细，种子是她的针线", growthExperience: "温室营地种织女，北迁路上织了三百件带种子的衣裳", trajectory: "温室营地→灵根北迁" },
  "bloom-singer": { chapter: "第四章 · 三路证词", role: "温室营地的花歌女，唱的歌，能让枯了一季的花重新活过来。", connection: "她的歌里有一段是跟山海花灵学的。", quote: "花开不是运气，是有人唱对了调子。", gender: "女", age: "24岁", personality: "明朗温暖，歌声是她的阳光", growthExperience: "温室营地花歌女，山海花灵的知音，北迁路上她的歌声让花海一路开过去", trajectory: "温室营地→灵根北迁" },
  "valley-mother": { chapter: "第四章 · 三路证词", role: "母兽领地的谷母，哺育的谷子，喂饱了整个山谷的饥荒。", connection: "山海母兽的邻居，兽群的幼崽和她种的孩子一起长大。", quote: "谷子不分谁家的，吃饱就行。", gender: "女", age: "50岁", personality: "慈祥包容，谷仓是她的胸怀", growthExperience: "母兽领地谷母，山海母兽的邻居，北迁路上她让整个车队没饿过肚子", trajectory: "母兽领地→灵根北迁" },
  "star-fruit": { chapter: "第四章 · 三路证词", role: "温室营地的星果灵，星果树结的果子，吃了能梦见星星。", connection: "它结的第一颗果，被万木灵根吃了。", quote: "果子落了，梦就熟了。", gender: "无", age: "不详（温室营地造物）", personality: "安静生长，果子是它的语言", growthExperience: "温室营地星果灵，第一颗果被灵根吃掉，之后每年结七颗", trajectory: "温室营地→灵根北迁" },
  "earth-dancer": { chapter: "第四章 · 三路证词", role: "播种队的地舞女，跳舞的时候，大地跟着她一起呼吸。", connection: "她踩过的死土，来年都能长庄稼。", quote: "地不骗人，舞也不骗人。", gender: "女", age: "28岁", personality: "自由坚韧，舞步是大地的脉搏", growthExperience: "播种队地舞女，北迁路上她踩活了三千里死土", trajectory: "播种队→灵根北迁" },
  "world-bloom": { chapter: "第六章 · 五钥之战", role: "山海的花灵之首，万花开遍的地方，就是山海的疆土。", connection: "山海花灵的妹妹，灵根最信任的花。", quote: "花开到哪，山海就到哪。", gender: "女", age: "19岁", personality: "纯净明亮，花海是她的王国", growthExperience: "温室营地花灵之首，山海花灵的妹妹，五钥之战她让花海开到天门脚下", trajectory: "温室营地→五钥之战" },
  "wind-sister": { chapter: "第四章 · 三路证词", role: "逐风车队的风姊妹，两人一个追风，一个被风追。", connection: "尘风骑手的同门，一个追风，一个追他。", quote: "风追人，人追风，谁也追不上谁。", gender: "女", age: "21岁", personality: "活泼洒脱，风是她们的性子", growthExperience: "逐风车队风姊妹，尘风骑手的同门，北迁路上她们替车队探了三次路", trajectory: "逐风车队→三路证词" },
  "ox-herd": { chapter: "第四章 · 三路证词", role: "雷鸣草海的牧牛人，牵的牛，是山谷里最后一批会犁地的。", connection: "雷霆兽群不认生人，只认他的牧牛鞭。", quote: "牛认犁，人认地。", gender: "男", age: "35岁", personality: "憨厚老实，牛是他的家人", growthExperience: "雷鸣草海牧牛人，北迁路上他的牛犁开了第一片新地", trajectory: "雷鸣草海→灵根北迁" },
  // ── 法术与器物 · 新篇（P1 扩充）──
  "dawn-summon": { chapter: "第一章 · 天门遗踪", role: "传令营的破晓号令，号令一响，睡着的城也会自己站起来。", connection: "破晓斥候过门那夜，吹响它的人是她自己。", quote: "号声不等人，人不等天亮。", gender: "无", age: "不详（传令营号角）", personality: "号声即军令，睡着的城也会自己站起来", growthExperience: "传令营号角，随破晓斥候走过第七天门，吹响时满城皆醒", trajectory: "传令营→第七天门" },
  "star-halo": { chapter: "序章 · 封鼎之变", role: "医正司的星环，星光不借人，可它借给赶夜路的人一程。", connection: "封鼎之夜，它照过典籍司丞抄档的手。", quote: "星光不借人，只借路。", gender: "无", age: "不详（医正司古咒）", personality: "星光不借人只借路，照亮赶夜路的人", growthExperience: "医正司星环，封鼎之夜照过典籍司丞抄档的手，此后悬挂在医正司门前", trajectory: "医正司→封鼎之变" },
  "forgotten-curse": { chapter: "第五章 · 幽冥王座", role: "忘川渡口的忘咒，忘川教她念的一句咒：先把名字还给人。", connection: "幽冥王座那夜，它把判官名册上的名字念了一遍。", quote: "名字还给人，忘川就退了。", gender: "无", age: "不详（忘川旧咒）", personality: "忘川教的咒，先把名字还给人", growthExperience: "忘川渡口旧咒，幽冥王座那夜念完名册，忘川退了三尺", trajectory: "黑潮渡口→幽冥王座" },
  "dusk-blade": { chapter: "第二章 · 无名册", role: "暗巷行会的暮刃，黄昏的刀最狠，因为没人愿意看它出鞘。", connection: "它斩过忘川的第一道浪，刃口至今没锈。", quote: "黄昏的刀，只出鞘一次。", gender: "无", age: "不详（暗巷行会兵刃）", personality: "黄昏一刀，出鞘即无悔", growthExperience: "暗巷行会暮刃，斩过忘川第一道浪，此后只在黄昏出鞘", trajectory: "暗巷行会→无名册" },
  "mirror-hex": { chapter: "第三章 · 命盘断线", role: "观星台的镜卦，照见的不是吉凶，是来路。", connection: "命盘断线那天，它照见天机织命者的手。", quote: "镜卦照路，不照命。", gender: "无", age: "不详（观星台古卦）", personality: "照见来路的镜卦，不照吉凶", growthExperience: "观星台镜卦，命盘断线那天照见织命者的手，此后卦面留了一道裂", trajectory: "观星台→命盘断线" },
  "star-array": { chapter: "第三章 · 命盘断线", role: "观星台的星阵，铺开的时候，连星星都以为是来赴宴的。", connection: "它替天机散人铺过一百零八盏灯。", quote: "星阵铺开，星星赴宴。", gender: "无", age: "不详（观星台古阵）", personality: "布星为网，星星也以为是赴宴", growthExperience: "观星台星阵，百八劫数那夜替散人铺过一百零八盏灯", trajectory: "观星台→百八劫数" },
  "rivet-storm": { chapter: "第四章 · 三路证词", role: "军械所的铆钉风暴，落下的声音，像一场不会停的铁雨。", connection: "三路证词回城那夜，它替攻城重砲补了最后一道火。", quote: "铁雨落下，城门自开。", gender: "无", age: "不详（军械所军械）", personality: "铁雨落下，城门自开", growthExperience: "军械所铆钉风暴，三路证词那夜替攻城重砲补火，铁雨落了一夜", trajectory: "军械所→三路证词" },
  "wall-oath": { chapter: "第一章 · 天门遗踪", role: "守城司的城墙誓，城墙上的誓言，比砖石更硬。", connection: "铁誓卫士开侧门时，念的就是它。", quote: "誓言刻在墙上，墙就记住了。", gender: "无", age: "不详（守城司古誓）", personality: "城墙誓，誓言比砖石更硬", growthExperience: "守城司城墙誓，铁誓卫士开侧门时念过它，此后墙记住了那句话", trajectory: "守城司→第一章" },
  "root-call": { chapter: "第四章 · 三路证词", role: "温室营地的根呼，一响，沉睡的树根都会醒过来。", connection: "灵根北迁那夜，是它叫醒了第一段根。", quote: "根呼响，根就醒。", gender: "无", age: "不详（山海古咒）", personality: "唤根的古咒，一响树根皆醒", growthExperience: "温室营地根呼，灵根北迁那夜叫醒第一段根，此后一路上树根跟着走", trajectory: "温室营地→灵根北迁" },
  "spring-rain": { chapter: "第四章 · 三路证词", role: "播种队的春雨，不声张，却让整片大地都记住了它。", connection: "它下的第一场雨，落在种子卫士的种盘上。", quote: "春雨不声张，大地记得。", gender: "无", age: "不详（播种队古雨）", personality: "润物无声的春雨，大地记得", growthExperience: "播种队春雨，第一场雨落在种子卫士的种盘上，此后每场雨都跟着播种队走", trajectory: "播种队→灵根北迁" },
};

// ── 天衡阵营 VOICE_LINES ──
export const VOICE_LINES: Record<string, VoiceLine[]> = {
  // 天衡 · 王庭继承人
  "astral-queen": [
    { text: "加冕不是拥有光，是替它还债。" },
    { text: "长风破浪会有时——但风来之前，得先扛住浪。", ref: "李白《行路难》" },
    { text: "祖上的罪我不翻，翻案等于认罪。" },
    { text: "王冠太重？那是因为底下压着七万三千条名姓。" },
    { text: "天门要我的血开锁，那就让它开。但开完之后，谁也别想再关上。" },
  ],
  // 天衡 · 王庭亲卫决斗官
  "sunblade": [
    { text: "光也不是无罪的，但罪得有人来算。" },
    { text: "但使龙城飞将在——我守的不是城，是城后的人。", ref: "王昌龄《出塞》" },
    { text: "剑朝外不朝内，这是规矩。可今天……剑该朝谁？" },
    { text: "我教过她的剑，她教过我的路。" },
    { text: "追了她三千里，在第七天门前，我收了剑。" },
  ],
  // 天衡 · 穿过第七天门的人
  "dawn-scout": [
    { text: "我见过太阳咽气前的样子。" },
    { text: "前不见古人，后不见来者——我走的这条路，只有我。", ref: "陈子昂《登幽州台歌》" },
    { text: "残页在怀里，真相在路上，我不回头。" },
    { text: "穿过第七天门的人不少，留着全本记性的，只有我。" },
    { text: "不问命令只问对错——这是传令营教我的，也是我离开传令营的原因。" },
  ],
  // 天衡 · 传令营老钟
  "dawn-horn": [
    { text: "钟声不怕老，怕的是没人听。" },
    { text: "少小离家老大回——可我从未离开，钟在哪，我就在哪。", ref: "贺知章《回乡偶书》" },
    { text: "三十年，钟没漏过一次，我也没漏过一次。" },
    { text: "那夜没等命令，钟自己响了。有些事不用等命令。" },
    { text: "全城人都听我的钟醒来，可谁听见过钟自己的声音？" },
  ],
  // 天衡 · 典籍司丞
  "star-archivist": [
    { text: "烧掉的史书，最先照亮追问的人。" },
    { text: "野火烧不尽，春风吹又生——烧了三遍档，我抄了四遍。", ref: "白居易《赋得古原草送别》" },
    { text: "七页誓文，分送七人。审判的事，留给后人，不留给王庭。" },
    { text: "云阶书库的每一页纸，都比我的命重。" },
    { text: "禁页拆成碎片，才没人能一次烧完。" },
  ],
  // 天衡 · 王庭边界猎手
  "comet-ranger": [
    { text: "我不替王冠卖命，我只替真相多走两步。" },
    { text: "大鹏一日同风起——我不需要风，我自己就是风。", ref: "李白《上李邕》" },
    { text: "跑单帮的规矩：不卖命，不卖人，只卖消息。" },
    { text: "王庭边界的路我闭着眼都走得了，可真相的路……睁着眼也不够。" },
    { text: "幽冥窃影的报价？我不信她的价，我只信我自己的眼。" },
  ],
  // 天衡 · 边关驿站点灯人
  "sky-lantern": [
    { text: "灯不挑贵贱，亮了才算数。" },
    { text: "蜡炬成灰泪始干——灯油烧完了，我用记性续。", ref: "李商隐《无题》" },
    { text: "那夜全城都亮着，谁也没死成。" },
    { text: "挨家挨户给人续命灯，这是我唯一会做的事。" },
    { text: "灯灭了不怕，怕的是没人再点。" },
  ],
  // 天衡 · 巡夜短刃
  "star-blade": [
    { text: "剑要见血，也要见光。" },
    { text: "秦时明月汉时关——刃口上的月光，比钟楼上的亮。", ref: "王昌龄《出塞》" },
    { text: "剑在人在，剑亡……我不认那个字。" },
    { text: "那晚曜剑郎拔了我，刃口见血，却没朝学生出鞘。" },
    { text: "巡夜的刃不挑人，只挑夜。" },
  ],
  // 天衡 · 回光返照
  "mirror-guard": [
    { text: "挨打不怕，就怕忘了疼。" },
    { text: "沉舟侧畔千帆过——挨过的打，都变成挡回去的力。", ref: "刘禹锡《酬乐天扬州初逢席上见赠》" },
    { text: "咒不伤人，咒只照见来路。" },
    { text: "回光返照不是死前那一亮，是活着的时候不肯闭眼。" },
    { text: "斥候突围那夜，我替守军挡了一口命。后来他们才懂。" },
  ],

  // ── 幽冥阵营 ──

  // 幽冥 · 忘川判官
  "void-emperor": [
    { text: "我没想统治黑暗，黑暗只是舍不得放下我这个谎。" },
    { text: "天长地久有时尽，可忘川的恨，连天都数不完。", ref: "白居易《长恨歌》" },
    { text: "名册上最后一个画押的人，可能就是我。" },
    { text: "忘川借我的身子学会了善和狠——善给活人看，狠替死人记。" },
    { text: "幽冥不需要王，需要的是一个肯替所有人背罪的人。" },
  ],
  // 幽冥 · 幽冥军团前线指挥
  "night-conductor": [
    { text: "不会说话的人，也该有一支队伍。" },
    { text: "辚辚车马萧萧角——我的兵不喊号子，手势就是军令。", ref: "杜甫《兵车行》" },
    { text: "失名者看得懂的手势，比口令响。" },
    { text: "判官要全天下当失名者？那我先抗命。" },
    { text: "幽冥军第一回不听令，是因为命令错了。" },
  ],
  // 幽冥 · 忘川渡口掮客
  "void-pickpocket": [
    { text: "我不偷东西，我只拿走没人认领的。" },
    { text: "事了拂衣去——我连名姓都替你藏好。", ref: "李白《侠客行》" },
    { text: "忘川渡口的规矩：有人认的还给人家，没人认的归我。" },
    { text: "替判官找人？行，但我给猎手留的证据，判官不知道。" },
    { text: "影子里的记性最值钱，因为没人敢伸手。" },
  ],
  // 幽冥 · 裂隙守望兽
  "hollow-beast": [
    { text: "它记得所有人，独独不记得自己。" },
    { text: "黑云压城城欲摧——一千个死人的怕，压成了一头兽。", ref: "李贺《雁门太守行》" },
    { text: "哨音一响，脚就收住。不是听话，是怕里头有一丝认得。" },
    { text: "咽不下名字，因为名字太烫。" },
    { text: "裂隙守望兽不看路，只听声。" },
  ],
  // 幽冥 · 无名坟场更夫
  "grave-watcher": [
    { text: "陵不认人，认的是有人还记得。" },
    { text: "出师未捷身先死——可他们的名字，我替他们活着。", ref: "杜甫《蜀相》" },
    { text: "焚册那夜，我刻了一千个名字。手还在抖，名不能停。" },
    { text: "无名坟场没有碑，我心里有。一个陵一个名字，从不记混。" },
    { text: "守夜的人不用灯，记性就是灯。" },
  ],
  // 幽冥 · 黑潮渡口潮语师
  "night-tide": [
    { text: "潮水退走时，总带着一句没说完的话。" },
    { text: "春江潮水连海平——可忘川的水，连的是人间没说完的话。", ref: "张若虚《春江花月夜》" },
    { text: "失名者的话让河水先学去，我再一句一句学回来。" },
    { text: "黑潮渡口最安静的时候，是忘川在听人说话。" },
    { text: "潮语师不翻译，只把水学去的话还给人间。" },
  ],
  // 幽冥 · 忘川水底残片
  "echo-shard": [
    { text: "忘川冲不走的东西，都沉在回声里。" },
    { text: "空山不见人，但闻人语响——忘川底下，回声替人活着。", ref: "王维《鹿柴》" },
    { text: "谁喊你的名字，它就应一声。可没人喊的名字，它不应。" },
    { text: "残片不帮喊忘了的名字，这是忘川最狠的规矩。" },
    { text: "沉在水底的东西，比浮在上面的真。" },
  ],
  // 幽冥 · 噬术咒
  "spell-eater": [
    { text: "以彼之道，还施彼身——先还一张牌。" },
    { text: "东风不与周郎便——可对岸甩来的法术，我吃得干干净净。", ref: "杜牧《赤壁》" },
    { text: "吃进去的，迟早吐回来。" },
    { text: "忘川头一回漫过渡口，我学会了吞法术当牌。" },
    { text: "噬术咒不挑菜，什么法术都咽得下。" },
  ],
  // 幽冥 · 蚀髓蛇
  "venom-viper": [
    { text: "影子先烂的猎物，话会烂在肚子里。" },
    { text: "春蚕到死丝方尽——我咬住就不松口，到死也不吐。", ref: "李商隐《无题》" },
    { text: "失名者的事我知道得最全，因为没人敢从我嘴里再问。" },
    { text: "黑潮渡口的阴影养着我，我养着渡口的秘密。" },
    { text: "蛇不说话，蛇只咬。咬住的那个字，比话重。" },
  ],
  // 幽冥 · 暗巷暗箭
  "shadow-bolt": [
    { text: "看不见的箭，留得下看得见的门。" },
    { text: "林暗草惊风——可我的弓没人看得见，箭也没人躲得了。", ref: "卢纶《塞下曲》" },
    { text: "判官旧城那夜，三百支箭，每一支只对准锁链。" },
    { text: "暗巷行会的规矩：射锁链不射人。" },
    { text: "影子里的箭最准，因为影子不抖。" },
  ],
  // ── 天机阵营 ──
  // 天机 · 织命坊裁缝
  "aether-weaver": [
    { text: "命不是路，是被一遍遍缝起来的口子。" },
    { text: "此情可待成追忆——可我追忆的不是情，是那两剪。", ref: "李商隐《锦瑟》" },
    { text: "一剪灯芯，一剪命盘。两剪都是我，至今没原谅自己。" },
    { text: "封鼎之夜剪断灯芯救了活人，却让死者卡在天门之间。" },
    { text: "拿概率替同伴缝第二回的机会——这是我唯一会做的事。" },
  ],
  // 天机 · 观星人
  "rift-oracle": [
    { text: "预言不是令箭，预言是报警的锣。" },
    { text: "行到水穷处，坐看云起时——一百零八条路走尽了，我才坐得下。", ref: "王维《终南别业》" },
    { text: "我算得出每个人的命，从不算自己的。" },
    { text: "庚申年设一百零八盏灯，亲手灭灯留出空白路——不是旁观，是裁断。" },
    { text: "第一百零九种结局？我不看结局，我只留路。" },
  ],
  // 天机 · 赤焰塔学徒
  "ember-adept": [
    { text: "火最诚实，它从来不替谁保密。" },
    { text: "会当凌绝顶——火往高处烧，人也一样。", ref: "杜甫《望岳》" },
    { text: "我烧掉了必胜的预言，因为那份胜利的价码是杀古龙。" },
    { text: "织命者是我师父，锻师是我母亲。两边的火，我都认。" },
    { text: "压住的记忆点成看得见的火——这是赤焰塔教我的唯一本事。" },
  ],
  // 天机 · 时隙观测所怪客
  "time-echo": [
    { text: "我来晚了，但每回都赶得上。" },
    { text: "夜半钟声到客船——我到的永远比钟声晚半拍，但该补的刀一刀不落。", ref: "张继《枫桥夜泊》" },
    { text: "我能看见剪断灯芯那一秒的旧影，所以补刀补得准。" },
    { text: "迟到不是习惯，是时隙观测所的规矩——事情发生了，我才到。" },
    { text: "来晚了？不，我来得刚刚好。" },
  ],
  // 天机 · 卦棚上上签
  "fate-charm": [
    { text: "签不说谎，说谎的是求签的人。" },
    { text: "劝君更尽一杯酒——签筒里只有这一支签，其余全是卜者的良心。", ref: "王维《送元二使安西》" },
    { text: "抽到我的都说灵，可他们不知道签筒里只有我一支。" },
    { text: "上上签留给所有还敢抽的人。" },
    { text: "命盘会骗人，签不会——签只给你路，走不走在你。" },
  ],
  // 天机 · 观星台星图
  "astral-insight": [
    { text: "命盘会骗人，星图只会让你自己选。" },
    { text: "星垂平野阔——每次翻开只给三条路，多了怕你挑花眼。", ref: "杜甫《旅夜书怀》" },
    { text: "散人从我上头挑中了封命盘的路，其余两条留给后人。" },
    { text: "翻不完的不是星图，是路。" },
    { text: "三条路，你选哪条我都亮着——但我不替你选。" },
  ],
  // 天机 · 织命坊定针
  "stasis-seal": [
    { text: "最利的针，是让时光停住的针。" },
    { text: "何当共剪西窗烛——我定住了剪灯芯的手，就慢了半息。", ref: "李商隐《夜雨寄北》" },
    { text: "命盘断线那天，我替时隙法师定住了一瞬间。" },
    { text: "时光不停，针再利也白搭。" },
    { text: "把一瞬间缝在原处——这是定针唯一会做的事。" },
  ],
  // 天机 · 观星台封档咒
  "dust-seal": [
    { text: "尘封的惩罚，是让字等。" },
    { text: "国破山河在——墨干了，字还在底下等着。", ref: "杜甫《春望》" },
    { text: "封鼎之夜我被用来盖住名单，可字没消失，只是在等。" },
    { text: "字等得越久，底下那页越烫。" },
    { text: "不该发亮的那页字，我让它不再发亮——可我没说让它消失。" },
  ],
  // 天机 · 观星台抄卦学徒
  "rune-seeker": [
    { text: "字认得我，我还不认得它。" },
    { text: "松下问童子——我抄了半辈子的字，最后被字收了。", ref: "贾岛《寻隐者不遇》" },
    { text: "封鼎名单上混进的名字不对，我抄完最后一个字，人就不见了。" },
    { text: "把名单当符咒抄了半辈子，到头来被符咒收了。" },
    { text: "字在纸上，人在字里——我分不清哪个是我。" },
  ],
  // ── 铁律阵营 ──
  // 铁律 · 铁誓卫士
  "iron-guard": [
    { text: "墙不是用来挡人的，是让墙里的人敢闭眼。" },
    { text: "羌笛何须怨杨柳——守城墙的人不吹笛，只听风里有没有铁声。", ref: "王之涣《凉州词》" },
    { text: "我把避难城的名字刻在盾内壁，墙塌了名字还在。" },
    { text: "她带的证据能洗清我祖辈的叛名，可铁律的令箭说：拦住她。" },
    { text: "铁砧印烙在盾上，不是让人怕，是让自己别忘了——盾比命重。", ref: "岑参《白雪歌送武判官归京》" },
  ],
  // 铁律 · 铁壁司命
  "bastion-warden": [
    { text: "我不是不怕败，是不肯让败先过去。" },
    { text: "醉卧沙场君莫笑——我没醉，我只是第七防线最后一个还站着的人。", ref: "王翰《凉州词》" },
    { text: "兵俑的唤醒钥匙在我手里，可我更怕自己先倒下。" },
    { text: "五十五年了，每一道门我都亲手关上，没有一道是从里面推开的。" },
    { text: "莫愁前路无知己——我守的不是路，是路尽头的那些人还能回头。", ref: "高适《别董大》" },
  ],
  // 铁律 · 营造司匠人
  "wall-smith": [
    { text: "墙是我砌的，门也是我留的。" },
    { text: "安得广厦千万间——我砌不了千万间，但每一块砖我都亲手验过。", ref: "杜甫《茅屋为秋风所破歌》" },
    { text: "工钱当面结，砖缝里从不掺假——营造司的规矩比铁律还硬。" },
    { text: "墨脉穿过地基的时候，我拿铁尺量了三遍，差一毫都不行。" },
    { text: "墙塌了可以再砌，良心塌了砌不回来。", ref: "杜甫《石壕吏》" },
  ],
  // 铁律 · 棱晶工坊锻师
  "mirror-smith": [
    { text: "镜子不说谎，说谎的是遮镜子的人。" },
    { text: "此情可待成追忆——棱晶映出的不是情，是人故意忘掉的那一眼。", ref: "李商隐《锦瑟》" },
    { text: "我锻的金属能映出你不敢看的东西，所以找我打镜子的人越来越少。" },
    { text: "铁砧印烙在镜背上，意思是：看见的不能假装没看见。" },
    { text: "沧海月明珠有泪——我淬火的不是珠，是那些被忘川洗掉又映回来的脸。", ref: "李商隐《锦瑟》" },
  ],
  // 铁律 · 熔炉吟游者
  "forge-singer": [
    { text: "铁记得每一锤，也记得谁先动的手。" },
    { text: "天生我材必有用——铁也是，听它唱就知道该打成什么。", ref: "李白《将进酒》" },
    { text: "打铁歌不是唱给人听的，是给要塞对心跳。" },
    { text: "炉火照天地，红星乱紫烟——我唱的不是诗，是铁在火里说的话。", ref: "李白《秋浦歌》" },
    { text: "灵根听不出铁声，可铁听得出谁的手在抖。" },
  ],
  // 铁律 · 零号兵俑
  "iron-colossus": [
    { text: "记录在案：人把犯下的错，叫作必要。" },
    { text: "尔曹身与名俱灭——我不灭，我胸口存着封鼎之夜的全本阵图。", ref: "杜甫《戏为六绝句》" },
    { text: "兵俑没有灵根，但阵图记得每一个被忘川抹去的名字。" },
    { text: "沉默不是默认，是记录。" },
    { text: "存者且偷生，死者长已矣——阵图不分存亡，只记先后。", ref: "杜甫《石壕吏》" },
  ],
  // 铁律 · 零号工厂铁甲门神
  "titan-keeper": [
    { text: "我守的不是门，是门后面的选择。" },
    { text: "空山不见人——门后不是空山，是还没走过的路。", ref: "王维《鹿柴》" },
    { text: "判官的钥匙我没交也没砸，让人自己选：进还是退。" },
    { text: "十年守一门，门缝里看天门开合看了三千六百五十夜。" },
    { text: "夜来风雨声——我听的不是风雨，是有人敲门不敢推。", ref: "孟浩然《春晓》" },
  ],
  // 铁律 · 军械所火铳
  "siege-engine": [
    { text: "炮膛里刻着上一任的遗言：躲好。" },
    { text: "忽如一夜春风来——我轰开的不是春风，是封死的城门。", ref: "岑参《白雪歌送武判官归京》" },
    { text: "开炮前喊一声，不是规矩，是上一任用命换的教训。" },
    { text: "三路证词那天，城门封了三年，我一炮替它开了口。" },
    { text: "战士军前半死生——我膛里的火药，是半死之人留给半生之人的话。", ref: "高适《燕歌行》" },
  ],
  // 铁律 · 铸坊铁锤
  "forge-hammer": [
    { text: "铁不打不成器，日子不打不成日子。" },
    { text: "十年磨一剑——我磨的不是剑，是三代人攥出包浆的把手。", ref: "贾岛《剑客》" },
    { text: "五样家底锻成一把钥匙，锤落那天铁砧印亮了一整夜。" },
    { text: "祖传的不是锤，是锤落下去那一刻不犹豫的劲。" },
    { text: "会当凌绝顶——可顶上风大，铁得先在炉里走一遭。", ref: "杜甫《望岳》" },
  ],
  // 铁律 · 铸坊铁砧
  "iron-anvil": [
    { text: "铁砧上敲了三代人的锤，敲的是自家的疼。" },
    { text: "大珠小珠落玉盘——我砧上落的不是珠，是三代人咬碎的牙。", ref: "白居易《琵琶行》" },
    { text: "五样家底凑齐那夜，我在砧上敲完阵图最后一行，敲完天就亮了。" },
    { text: "国破山河在——砧不破，铁律的账就在。", ref: "杜甫《春望》" },
    { text: "铁砧不说话，但每一锤它都记着——疼是记号，不是伤口。" },
  ],
  // 铁律 · 机关司搬山术
  "golem-rune": [
    { text: "祖辈没画完的，我们接着画。" },
    { text: "黑云压城城欲摧——我替铁律挡住了第一波潮水，裂纹就是祖辈的批注。", ref: "李贺《雁门太守行》" },
    { text: "图纸被虫蛀了，我凭记忆又造了出来——记忆比纸结实。" },
    { text: "石俑上的裂纹不是伤，是祖辈手写的批注，每一道都在说：这里该转弯。" },
    { text: "天街小雨润如酥——可搬山术不靠雨，靠的是祖辈画了一半的墨脉。", ref: "韩愈《早春呈水部张十八员外》" },
  ],
  // 铁律 · 铸坊旧链
  "rust-fetter": [
    { text: "生锈的链子，比新的牢。" },
    { text: "沉舟侧畔千帆过——锈链不沉，它拴住的东西比千帆都重。", ref: "刘禹锡《酬乐天扬州初逢席上见赠》" },
    { text: "五钥之战锁过双方火炮，谁也没能先开火——锈链逼出的谈判，比炮弹管用。" },
    { text: "时间在链子上结的锈，比铁律的规矩还硬。" },
    { text: "旧时王谢堂前燕——我不是燕子，我是拴住那座堂的旧链，锈了也不松。", ref: "刘禹锡《乌衣巷》" },
  ],
  // ── 山海阵营 ──
  "wild-bloom": [
    { text: "灵根的梦醒了，我还在开。" },
    { text: "野火烧不尽——可我记得每一根草是谁埋的，春风吹来的不只是生，还有欠债。", ref: "白居易《赋得古原草送别》" },
    { text: "万木灵根替我记着路，我只管往有记性的地方开。" },
    { text: "闻到铁砧印的气味，就知道有人又翻了一回墨脉——那味道比花还浓。" },
    { text: "人闲桂花落——我不闲，我落在谁手上，谁就得记着我是从哪片根里长出来的。", ref: "王维《鸟鸣涧》" },
  ],
  "seed-guardian": [
    { text: "身上揣着三十七种种，丢哪颗我都心疼。" },
    { text: "安得广厦千万间——我不要厦，我要地。有地就有种，有种就有人。", ref: "杜甫《茅屋为秋风所破歌》" },
    { text: "五钥不交又怎样？种子不认阵营，它只认土。" },
    { text: "仗打完地还得种，这是铁律——比你们铁砧印上刻的规矩还铁。" },
    { text: "田家少闲月——播种队的人哪有闲着的时候，灵根北迁的路上，种子比人先到。", ref: "白居易《观刈麦》" },
  ],
  "wild-mother": [
    { text: "山不走，山会替人挡住风。" },
    { text: "会当凌绝顶——我不用登顶，我就是那座山，幼崽和难民都在我身后。", ref: "杜甫《望岳》" },
    { text: "叼回的猎物一半喂幼崽，一半喂难民——山海不挑谁更值得活。" },
    { text: "相看两不厌——人和兽对望的时候，谁也不是猎物，谁也不是救主，都是活下来的。", ref: "李白《独坐敬亭山》" },
    { text: "灵根北迁那年，母兽领地收留了整条忘川渡口跑散的孩子。" },
  ],
  "world-root": [
    { text: "我不审你们，我只管长。" },
    { text: "下马饮君酒，问君何所之——我不问，旧世界的根不问路，它只管往有水的地方钻。", ref: "王维《送别》" },
    { text: "古根用地脉保存记忆，我用地脉保存明天——你们管那叫希望，我管那叫还没死透。" },
    { text: "墨脉读的是人的记性，我记的是土的记性——土比人诚实。" },
    { text: "人间四月芳菲尽——旧世界花落完了，新世界的芽才从我的根上冒出来。", ref: "白居易《大林寺桃花》" },
  ],
  "ancient-egg": [
    { text: "它裂开时，带着一股记性的气味。" },
    { text: "老兔寒蟾泣天色——苗圃里的卵不泣，它等，等到闻见对的人的记性才肯裂。", ref: "李贺《梦天》" },
    { text: "没人记得谁埋下的我，可我记得苗圃还没建时的天门——七座，一座没少。" },
    { text: "铁砧印读不出我的梦，我的梦比墨脉还老。" },
    { text: "石鼓之歌止于此——古卵的歌还没开始，山海苗圃的土替我记着调子。", ref: "韩愈《石鼓歌》" },
  ],
  "thunder-herd": [
    { text: "雷声不光是开战的鼓，也可以是回家的信。" },
    { text: "忽如一夜春风来——灵根叫醒兽群的时候，不是春风，是地底的雷，可奔起来的势头比春风还急。", ref: "岑参《白雪歌送武判官归京》" },
    { text: "被灵根叫醒的兽群不选方向，大地替我们定——脚落下的地方就是路。" },
    { text: "明月出天山——我们奔过忘川渡口的时候，月亮也这么亮，苍茫得像天门还没关。", ref: "李白《关山月》" },
    { text: "铁律的炮声和灵根的雷声，兽群分得清——一个是催命，一个是催归。" },
  ],
  "bloom-sea": [
    { text: "山海的花，不是一朵一朵开的，是一片一片。" },
    { text: "好雨知时节——温室营地的春汛不用等雨，灵根的暖意一到，花就漫过来了。", ref: "杜甫《春夜喜雨》" },
    { text: "花开像水漫过来，挡不住也不必挡——谁拦春汛谁被淹。" },
    { text: "乱花渐欲迷人眼——花灵不迷人，它迷的是墨脉里那些还没忘干净的旧事。", ref: "白居易《钱塘湖春行》" },
    { text: "温室营地外头打五钥之战，里头花开成海——花不管你们交不交，它只管开。" },
  ],
  "earth-roots": [
    { text: "受了伤别硬扛，土会替你说话。" },
    { text: "空山不见人——药圃的地脉不需要人说话，你往土里一躺，它就替你把伤喊出来。", ref: "王维《鹿柴》" },
    { text: "古根存记忆，我存伤——伤好了，记性也就跟着好了。" },
    { text: "春眠不觉晓——在药圃的土里睡一觉，醒来伤好了，连灵根北迁的路都替你记着了。", ref: "孟浩然《春晓》" },
    { text: "忘川渡口送走的人，药圃的土替他们留着体温——地脉比人念旧。" },
  ],
  "dust-rider": [
    { text: "我从不在同一座城过两夜——不是风不停，是我停不下来。" },
    { text: "欲穷千里目——逐风车队不登楼，我们往天门外头赶，路比楼高。", ref: "王之涣《登鹳雀楼》" },
    { text: "欠夜幕都统一条命，这条命我认——但护送斥候进王庭，是我自己选的。" },
    { text: "莫愁前路无知己——车队旗过忘川渡口，天下谁不识这阵风。", ref: "高适《别董大》" },
    { text: "风会散，选了的不会——我选了这条路，走到天门关了也不回头。" },
  ],
  "prism-dragon": [
    { text: "天不属于飞得最高的，天属于肯抬头看的。" },
    { text: "长风破浪会有时——可我不用等风，七片鳞开七座天门，风是我放出去的。", ref: "李白《行路难》" },
    { text: "天地还没名分的时候我就在天顶了——你们的王座，是我踩过的云。" },
    { text: "只搭理肯放下王座的人——握着权柄的手，摸不到我的鳞。" },
    { text: "无边落木萧萧下——旧世界的叶落完了，我还在天顶守着，等新世界自己长上来。", ref: "杜甫《登高》" },
  ],

  // ── 跨阵营 ──
  "solar-judge": [
    { text: "日落之前，这案子必须有说法——天光不等人，我也不等。" },
    { text: "暮投石壕村——我见过天黑前还不上说法的官，他们比犯人更该被审。", ref: "杜甫《石壕吏》" },
    { text: "审人先审己，判案先判心——铁律不是给犯人写的，是给推官自己写的。" },
    { text: "此时无声胜有声——沉默的证词比口供更重，大理司的卷宗里，空白处才是真话。", ref: "白居易《琵琶行》" },
    { text: "天门开合有定时，我断案也有定时——日头落下去之前，真相必须站起来。" },
  ],
  "spark-star": [
    { text: "别小看一点星火，封鼎之夜那截没点完的灯芯，到现在还亮着。" },
    { text: "烽火连三月——杂役房的灯芯烧了三季还没灭，它等的不是油，是一整片麦田。", ref: "杜甫《春望》" },
    { text: "众鸟高飞尽——灯不嫌油少，也不嫌夜长，它只嫌没人肯让它点着。", ref: "李白《独坐敬亭山》" },
    { text: "墨脉走多远，灯芯就亮多远——我照的不是路，是走路的人。" },
    { text: "一粒火星落进忘川，整条河都会沸腾——封鼎没点完的那截，值一座天门。" },
  ],
  "focus-spirit": [
    { text: "点睛的那一笔，是最快见效，也最晚学会——绘卷斋的墨，等的就是这一笔。" },
    { text: "远看山有色——可点睛之后，山就不再只是有颜色了，它会从卷子里走出来。", ref: "王维《画》" },
    { text: "丹青不知老将至——墨不认年纪，灵根不认岁月，点睛那一笔永远不晚。", ref: "杜甫《丹青引》" },
    { text: "墨脉走到尽头，就是画龙张嘴的地方——我不画龙身，我只画它睁眼。" },
    { text: "五钥开五锁，可绘卷斋的最后一笔不在钥匙上——在锁自己想打开的那一刻。" },
  ],
  "radiance-bless": [
    { text: "药不分敌我，伤分——城头药铺的门槛，只认伤口不认人。" },
    { text: "安得广厦千万间——城门将破的时候，整间药铺都搬上了城头，广厦就是这堵墙。", ref: "杜甫《茅屋为秋风所破歌》" },
    { text: "上阳人——城头药铺不问谁守城、谁攻城，只问谁还流血。", ref: "白居易《新乐府》" },
    { text: "铁砧印烙在守城司的兵身上，也烙在攻城的人身上——药铺只管揭印，不管阵营。" },
    { text: "忘川对岸的伤员也往这边送——药铺的门朝两面开，伤没有阵营。" },
  ],
  "forget-curse": [
    { text: "要让历史安静，先让记得它的人闭嘴——可闭嘴的人，也会梦见。" },
    { text: "此情可待成追忆——揭页咒不让人追忆，只让历史安静地躺在黑潮渡口底下。", ref: "李商隐《锦瑟》" },
    { text: "群山万壑赴荆门——可揭页咒一落，群山安静，万壑无声，荆门自己也会忘记自己。", ref: "杜甫《咏怀古迹》" },
    { text: "黑潮渡口的每一页，都是一段不想被提起的灵根往事——我不烧，我只是合上。" },
    { text: "封鼎那天的事，揭页咒替所有人忘了——可忘川的水，会替那些闭嘴的人做梦。" },
  ],
  "spike-field": [
    { text: "来多少人，地就咬多少人——铁蒺藜不讲道理，只讲牙口。" },
    { text: "但使龙城飞将在——可飞将不在的时候，墙根下的铁蒺藜替他咬着。", ref: "王昌龄《出塞》" },
    { text: "林暗草惊风——守城司的铁蒺藜比草更暗，比风更惊，踩上去才知道什么叫地会咬人。", ref: "卢纶《塞下曲》" },
    { text: "铁砧印烙在铁蒺藜上——每一颗都是守城司的牙齿，掉了也会长回来。" },
    { text: "五钥锁天门，铁蒺藜锁墙根——天门有人守，墙根有我咬。" },
  ],

  "lute-officer": [
    { text: "弦声起处，旧账自己会翻页。" },
    { text: "此曲只应天上有——可我弹的是人间没记完的账。" },
    { text: "七页誓文的调子，我缝进琴弦，烧了纸也烧不了曲。" },
    { text: "琴案官的弦，不弹闲情，只弹没归档的真相。" },
    { text: "云阶书库的夜里，只有琴声替旧案翻页。" }
  ],
  "seal-maiden": [
    { text: "印是秤，不是刀。" },
    { text: "水落石出——可有些批文，落到底也照不出底。" },
    { text: "我藏过一张没敢盖下去的批文，夹在旧档第三层。" },
    { text: "敌众我寡也不慌，印在手里，秤在心里。" },
    { text: "掌印的人，先学会不盖章。" }
  ],
  "night-whistle": [
    { text: "哨声不催人，只叫人别睡。" },
    { text: "夜半钟声到客船——我的哨声比钟更早，替斥候开了一路门。" },
    { text: "三更换一次班，从不误点。" },
    { text: "夜里的眼睛，比白天的亮。" },
    { text: "哨过三更，我还醒着。" }
  ],
  "edict-clerk": [
    { text: "笔比刀更早知道谁该死。" },
    { text: "长风破浪会有时——可我誊抄的名单里，有人等不到风来。" },
    { text: "我把自己的名字填进去，替下了一个流民。" },
    { text: "诏书到我手上，总会多出半句人话。" },
    { text: "划掉自己名字的那夜，我睡得最沉。" }
  ],
  "crimson-guardian": [
    { text: "红是替谁染的，心里要清楚。" },
    { text: "山回路转不见君——绛衣卫挡过三次暗杀，也藏过三封不签的旨。" },
    { text: "护卫之余，还要替主子守良心。" },
    { text: "绛衣不是铠甲，是承诺。" },
    { text: "剑出鞘前，先问一句为谁。" }
  ],
  "dawn-herald": [
    { text: "信不到，人不睡。" },
    { text: "一骑红尘妃子笑——可我的信里没有荔枝，只有天亮之前必须到的真相。" },
    { text: "最后一封没有收件人的信，我送到了第七天门门口。" },
    { text: "风会歇，信不会。" },
    { text: "传令营最快的信使，只送该送的信。" }
  ],
  "mirror-tutor": [
    { text: "史书不怕烧，怕没人照。" },
    { text: "野火烧不尽——我把最后一卷史夹进镜背，火来的时候，镜子还亮着。" },
    { text: "抄史四十年，焚册之夜我守着书架没走。" },
    { text: "镜子照见来路，也照见没抄完的史。" },
    { text: "镜史官死后，镜子里还留着半卷。" }
  ],
  "celestial-weaver": [
    { text: "天幕漏了，线头在我这。" },
    { text: "牵牛织女渡河桥——我织的不是鹊桥，是天门的铰链。" },
    { text: "五钥之战前夜，我织完最后一根纬线。" },
    { text: "织天为幕，一根线也不肯断。" },
    { text: "星斗是线，天幕是布。" }
  ],
  "eclipse-princess": [
    { text: "光走的时候，我看见了。" },
    { text: "月落乌啼霜满天——封鼎那夜每一盏灯灭的顺序，我都记得。" },
    { text: "日蚀日出生的孩子，天生记着光是怎么走的。" },
    { text: "我记不得生母的脸，只记得那夜灯灭的顺序。" },
    { text: "光尽之后，还有人在等天亮。" }
  ],
  "gatekeeper-old": [
    { text: "门认得人，不认得脸。" },
    { text: "柴门闻犬吠——可我守的是王庭的门，犬吠不得。" },
    { text: "斥候过门那夜，我假装没听见。" },
    { text: "四十年，我数过每一道门的开关。" },
    { text: "忘川学着人敲门，我一听就知道。" }
  ],
  "royal-herald": [
    { text: "恕你无罪——这四个字，我练了三十年。" },
    { text: "春风得意马蹄疾——可我传的诏，没有一道是春风。" },
    { text: "永昼名单颁布那天，我念漏了一个名字。" },
    { text: "传诏三十年，只有一句话念不响。" },
    { text: "念漏的那个名字，是我唯一敢做的事。" }
  ],
  "dawn-summon": [
    { text: "号声不等人，人不等天亮。" },
    { text: "角声满天秋色里——破晓号令一响，睡着的城自己站起来。" },
    { text: "随斥候走过第七天门，吹响时满城皆醒。" },
    { text: "传令营的号角，只在天亮前响一次。" },
    { text: "号令一响，路就开了。" }
  ],
  "star-halo": [
    { text: "星光不借人，只借路。" },
    { text: "星垂平野阔——我照过典籍司丞抄档的手。" },
    { text: "封鼎之夜过后，我挂在医正司门前。" },
    { text: "星环不亮的时候，是路自己在走。" },
    { text: "借光一程，天亮还你。" }
  ],
  "shadow-warden": [
    { text: "影子不怕丢，怕的是没人认。" },
    { text: "举杯邀明月——我的影子是借来的，月不借我。" },
    { text: "给失名者做过三百个假影子，每个都按记忆描的家。" },
    { text: "暗巷行会的规矩：影子可以借，命不可以。" },
    { text: "影子替我站岗，我替影子记路。" }
  ],
  "tide-singer": [
    { text: "水里的歌，得有人接住。" },
    { text: "春江潮水连海平——忘川学舌，我学忘川，把失名者的声音唱回人间。" },
    { text: "我不会唱的人的声音，我替他唱。" },
    { text: "潮歌女不写歌，只接歌。" },
    { text: "水唱人应，人应水唱。" }
  ],
  "ghost-bell": [
    { text: "铃音是回家的路。" },
    { text: "姑苏城外寒山寺——我编的铃音，比钟声更认得路。" },
    { text: "给三百个失名者各编一种铃音，从不混。" },
    { text: "鬼铃不招魂，只唤归。" },
    { text: "铃响一声，赶路的鬼就知道家在哪边。" }
  ],
  "bone-lantern": [
    { text: "骨灯不挑人，谁冷照谁。" },
    { text: "蜡炬成灰泪始干——我的灯芯是骨头做的，烧的是没人要的夜。" },
    { text: "守的坟里埋的不是死人，是没人敢认的往事。" },
    { text: "把无人认领的往事当灯油，烧了十年。" },
    { text: "骨灯亮着，夜就短一点。" }
  ],
  "void-whisper": [
    { text: "有些话，只能让河水听。" },
    { text: "大江东去——可我的话只对忘川说，它学会了，就不敢再忘。" },
    { text: "替判官传过一句话之后，我闭口十年。" },
    { text: "虚语女的话，河水先学，人间后听。" },
    { text: "忘川不撒谎，它只是学舌。" }
  ],
  "crypt-keeper": [
    { text: "纸灰认得名字。" },
    { text: "纸灰飞作白蝴蝶——我烧的不是纸钱，是写着你名字的纸。" },
    { text: "给每个失名者烧一张写着名字的纸，灰落在哪，哪就记得。" },
    { text: "墓守女不守墓，守的是名字。" },
    { text: "纸烧完了，名字还在灰里。" }
  ],
  "abyss-reader": [
    { text: "深渊不骗人，它只是太深。" },
    { text: "长风破浪会有时——深渊没有浪，只有一层一层的静。" },
    { text: "在深渊里读到判官的旧名，我没说出去。" },
    { text: "读渊三十年，比活过的日子还深。" },
    { text: "渊读女读的不是字，是沉下去的东西。" }
  ],
  "night-queen": [
    { text: "夜再黑，也得有人掌灯。" },
    { text: "月黑雁飞高——夜后的影子就是全城的灯火。" },
    { text: "不点灯，是因为我的影子够亮。" },
    { text: "幽冥王座那夜，我选择抗命。" },
    { text: "夜后掌的不是灯，是夜。" }
  ],
  "moonless": [
    { text: "月没的那夜，我看见了。" },
    { text: "海上生明月——可我记得月亮消失的确切时刻。" },
    { text: "无月夜出生的孩子，记性比档案准。" },
    { text: "封鼎之夜我刚好出生，四十三年来记得每一刻。" },
    { text: "月亮怎么没的，只有我记得。" }
  ],
  "ferryman": [
    { text: "船到对岸，名字自己会想起来的。" },
    { text: "野渡无人舟自横——我的船不载活人，也不载死人。" },
    { text: "渡过失名者无数，自己却一直没想好自己是谁。" },
    { text: "摆渡三十年，渡人不渡己。" },
    { text: "黑潮渡口的船，只载还没想好自己是谁的。" }
  ],
  "shadow-claw": [
    { text: "爪快，心不能快。" },
    { text: "林暗草惊风——我的爪比影子先到，猎物却已不见。" },
    { text: "替夜幕都统清过三批叛徒，从没动过失名者一根指头。" },
    { text: "深渊造物不知快慢，只知该不该。" },
    { text: "爪先于影，影到爪收。" }
  ],
  "forgotten-curse": [
    { text: "名字还给人，忘川就退了。" },
    { text: "忘川渡口的咒，是先还名字再谈别的。" },
    { text: "幽冥王座那夜，我把名册念了一遍，忘川退了三尺。" },
    { text: "忘川教的咒，忘川自己怕。" },
    { text: "先把名字还给人——这是忘川唯一不敢忘的。" }
  ],
  "dusk-blade": [
    { text: "黄昏的刀，只出鞘一次。" },
    { text: "夕阳无限好——暮刃出鞘的时候，没人愿意看。" },
    { text: "斩过忘川的第一道浪，刃口至今没锈。" },
    { text: "黄昏一刀，出鞘即无悔。" },
    { text: "暗巷的刃，只在黄昏见血。" }
  ],
  "star-stitcher": [
    { text: "天幕的线头，在我手里。" },
    { text: "天阶夜色凉如水——我缝的不是布，是天幕漏下来的星。" },
    { text: "替织命者缝过断线，也替自己缝过一颗星。" },
    { text: "针下有星，线头在天。" },
    { text: "星缝女缝的不是衣裳，是天。" }
  ],
  "clock-maiden": [
    { text: "时间欠的账，我记着。" },
    { text: "白日依山尽——可钟灵敲的不是钟，是提醒时间还欠谁一段。" },
    { text: "命盘断线后时间错乱，我是唯一守时的人。" },
    { text: "钟声是她的语言，迟到是她的账本。" },
    { text: "时辰的看守，从不错漏。" }
  ],
  "rune-calligrapher": [
    { text: "字重卦灵，心重人迷。" },
    { text: "笔落惊风雨——我写的符字，落笔越重，卦就越灵。" },
    { text: "替符文寻者抄完最后一页名单，就明白他为什么消失了。" },
    { text: "符书女写的是字，藏的是心。" },
    { text: "观星台的墨，比人重。" }
  ],
  "fate-dancer": [
    { text: "命盘转，舞步随；命盘断，舞步乱。" },
    { text: "起舞弄清影——我的舞步是卦，一步一爻。" },
    { text: "命盘断线后，我的舞步永远缺一拍。" },
    { text: "命舞女跳的不是舞，是命。" },
    { text: "舞步停的那夜，我知道将来断了。" }
  ],
  "thread-puppeteer": [
    { text: "线在人手，命在人心。" },
    { text: "牵一发而动全身——我手里的线，牵着所有人看不见的那根命运。" },
    { text: "替织命者收过线头，也替自己剪断过一根。" },
    { text: "线偶师不牵心，只牵线。" },
    { text: "断线那根，是我自己剪的。" }
  ],
  "void-mathematician": [
    { text: "虚数不是假的，只是算不到。" },
    { text: "山重水复疑无路——虚数女算得清星，算不清人心。" },
    { text: "算出第一百零九条路，也算出自己不在路上。" },
    { text: "裂隙观测站的数，永远差一位。" },
    { text: "虚数是算不到的数，不是没有的数。" }
  ],
  "prophecy-weaver": [
    { text: "未来不是注定，是织出来的。" },
    { text: "春蚕到死丝方尽——我织过十三种结局，每种都有一个人活不成。" },
    { text: "织线如织命，每织一次就少一截自己的记忆。" },
    { text: "预织女的线，是未来的经。" },
    { text: "织到第十三种，我不再织了。" }
  ],
  "eclipse-calculator": [
    { text: "日蚀是算术，故乡是题外话。" },
    { text: "举头望明月——可我总在日蚀时想起故乡，那是算不出的数。" },
    { text: "算尽日蚀的每一刻，算不回家乡。" },
    { text: "裂隙观测站的算术，从不算故乡。" },
    { text: "第七天门后面有我的故乡，我记得，却说不出口。" }
  ],
  "chess-master": [
    { text: "落子不悔，悔的是心。" },
    { text: "闲敲棋子落灯花——与散人对弈四十年，那盘棋至今没下完。" },
    { text: "命盘断线那夜，我落下了最后一子。" },
    { text: "弈者下棋，从不悔子。" },
    { text: "棋盘上没有悔棋，人生也没有。" }
  ],
  "hourglass": [
    { text: "沙漏完，时间记得。" },
    { text: "一寸光阴一寸金——可时漏见证的，是没人要的时间。" },
    { text: "见证过命盘断线的瞬间，之后沙漏得慢了。" },
    { text: "时漏不催人，只见证。" },
    { text: "沙落完，时间还在。" }
  ],
  "mirror-hex": [
    { text: "镜卦照路，不照命。" },
    { text: "以铜为镜，可正衣冠——镜卦照见的不是吉凶，是来路。" },
    { text: "命盘断线那天，它照见织命者的手。" },
    { text: "卦面留了一道裂，像没走完的路。" },
    { text: "镜卦不骗人，它只照。" }
  ],
  "star-array": [
    { text: "星阵铺开，星星赴宴。" },
    { text: "星汉灿烂，若出其里——布星为网，连星星都以为是赴宴。" },
    { text: "百八劫数那夜，替散人铺过一百零八盏灯。" },
    { text: "星阵是网，也是席。" },
    { text: "星落阵起，天机自现。" }
  ],
  "rivet-forger": [
    { text: "铆钉咬合，日子就不散。" },
    { text: "千锤万凿出深山——我敲铆钉的声音，比铁律的钟声还准。" },
    { text: "三路证词回城那夜，我钉好了所有裂开的城门。" },
    { text: "营造司的铆钉，比话牢。" },
    { text: "一锤一钉，日子就咬合了。" }
  ],
  "armor-tailor": [
    { text: "甲衣护身，针脚护心。" },
    { text: "慈母手中线——我缝的甲衣，比城墙更让人安心。" },
    { text: "给镜界锻师缝过镜甲，也给余烬学徒缝过冬衣。" },
    { text: "针脚里藏着关心，甲衣里藏着人。" },
    { text: "缝甲的姑娘，最懂哪里该厚。" }
  ],
  "siege-matron": [
    { text: "炮火不停，是因为敌人在动。" },
    { text: "烽火连三月——开炮前的那声躲好，是我教的。" },
    { text: "与攻城重砲搭档三十年，三路证词那夜一炮轰开城门。" },
    { text: "军械所的女将，指挥炮火不喘气。" },
    { text: "炮声是她的命令，躲好是她的温柔。" }
  ],
  "gear-dancer": [
    { text: "齿轮的舞步，我一听就会。" },
    { text: "大珠小珠落玉盘——齿轮咬合的声音，谱成了我的舞。" },
    { text: "兵俑沉眠那夜，我用舞步校准了齿轮。" },
    { text: "零号工厂的舞者，机械是她的舞伴。" },
    { text: "齿轮转，我转；齿轮停，我守。" }
  ],
  "furnace-priestess": [
    { text: "炉火是神明的歌，锤声是凡人的答。" },
    { text: "炉火照天地——熔炉剧场的炉膛女祭司，信火里住着神明。" },
    { text: "与熔炉吟游者同炉二十年，会唱她的打铁歌。" },
    { text: "兵俑沉眠那夜，我守着炉火没让灭。" },
    { text: "神明也怕打铁声，所以我替火守着人间。" }
  ],
  "blueprint-warden": [
    { text: "图纸在，手艺就在。" },
    { text: "纸上得来终觉浅——可零号兵俑的图纸，比命重。" },
    { text: "备份的图纸藏在书架的暗格里，议会不知道。" },
    { text: "图纸女卫守的不是纸，是手艺。" },
    { text: "图在，手艺就在；手艺在，城就在。" }
  ],
  "anvil-queen": [
    { text: "铁砧不说话，但每一锤都是回答。" },
    { text: "千锤百炼出深山——三代铁匠的长女，听过所有锤声。" },
    { text: "五钥之战，我亲手锻出最后一把钥匙。" },
    { text: "铁砧女王敲的，是铁律的未来。" },
    { text: "砧上无字，锤锤有答。" }
  ],
  "zero-warden": [
    { text: "零号在，防线就在。" },
    { text: "一夫当关，万夫莫开——零号女卫守在零号门口，三天三夜。" },
    { text: "与兵俑看守共事十年，最懂他为什么守着那扇门。" },
    { text: "零号是铁律最后的防线，我是零号的影子。" },
    { text: "门后是防线，门前是我。" }
  ],
  "gate-mason": [
    { text: "门要修得比墙结实，人才敢进出。" },
    { text: "安得广厦千万间——门匠修的门，比城门还坚固。" },
    { text: "铁誓卫士开的侧门，图纸是我画的。" },
    { text: "营造司的门匠，手艺说话。" },
    { text: "门修得好，人才走得安心。" }
  ],
  "iron-dog": [
    { text: "铁犬不叫，心里有数。" },
    { text: "柴门闻犬吠——可守城司的铁犬，只对心里没鬼的人摇尾巴。" },
    { text: "开侧门那夜，它没叫。" },
    { text: "铁犬不看门，看的是门后的人心。" },
    { text: "不叫的铁犬，最认得人。" }
  ],
  "rivet-storm": [
    { text: "铁雨落下，城门自开。" },
    { text: "黑云压城城欲摧——铆钉落下的声音，像一场不会停的铁雨。" },
    { text: "三路证词那夜，替攻城重砲补了最后一道火。" },
    { text: "军械所的铁雨，落一夜城门自开。" },
    { text: "铁雨是命令，也是回答。" }
  ],
  "wall-oath": [
    { text: "誓言刻在墙上，墙就记住了。" },
    { text: "海内存知己——城墙誓念过的话，砖石替人记着。" },
    { text: "铁誓卫士开侧门时念的就是它。" },
    { text: "守城司的誓，比砖石硬。" },
    { text: "墙记住了誓言，誓言守住了墙。" }
  ],
  "root-daughter": [
    { text: "根断了，接上就是。" },
    { text: "离离原上草——我出生在灵根的根须上，一生都在找属于自己的那节根。" },
    { text: "北迁路上，我接了三百节断根。" },
    { text: "根女是灵根的孩子，也是大地的女儿。" },
    { text: "根在，家就在。" }
  ],
  "rain-girl": [
    { text: "雨不挑地，地挑雨。" },
    { text: "好雨知时节——播种队的雨女走到哪，雨就跟到哪。" },
    { text: "种子种到哪，我的雨就下到哪。" },
    { text: "北迁路上，我让三十七种庄稼都活了下来。" },
    { text: "雨是她的性子，润物是她的命。" }
  ],
  "seed-weaver": [
    { text: "衣裳破了自己补，种子丢了自己种。" },
    { text: "春种一粒粟——我把种子织进衣裳，走到哪就把春天穿到哪。" },
    { text: "给每个北迁的孩子织了一件带种子的衣裳。" },
    { text: "种织女的手，织的是来年。" },
    { text: "种子在衣，春天随身。" }
  ],
  "bloom-singer": [
    { text: "花开不是运气，是有人唱对了调子。" },
    { text: "山寺桃花始盛开——我唱的歌，能让枯了一季的花重新活过来。" },
    { text: "歌里有一段是跟山海花灵学的。" },
    { text: "北迁路上，我的歌声让花海一路开过去。" },
    { text: "以歌养花，以花养人。" }
  ],
  "valley-mother": [
    { text: "谷子不分谁家的，吃饱就行。" },
    { text: "锄禾日当午——母兽领地的谷母，喂饱了整个山谷的饥荒。" },
    { text: "与山海母兽做邻居，幼崽和我的孩子一起长大。" },
    { text: "北迁路上，我让整个车队没饿过肚子。" },
    { text: "谷仓是她的胸怀，谷子是她的爱。" }
  ],
  "star-fruit": [
    { text: "果子落了，梦就熟了。" },
    { text: "星垂平野阔——星果树结的果子，吃了能梦见星星。" },
    { text: "第一颗果被灵根吃了，之后每年结七颗。" },
    { text: "温室营地的星果灵，安静地长。" },
    { text: "果子是它的语言，梦是它的果实。" }
  ],
  "earth-dancer": [
    { text: "地不骗人，舞也不骗人。" },
    { text: "大江东去浪淘尽——地舞女踩过的死土，来年都能长庄稼。" },
    { text: "北迁路上，我踩活了三千里死土。" },
    { text: "舞步是大地的脉搏，大地是我的舞台。" },
    { text: "踏地成歌，地应人舞。" }
  ],
  "world-bloom": [
    { text: "花开到哪，山海就到哪。" },
    { text: "乱花渐欲迷人眼——山海花灵的妹妹，万花开遍的地方就是山海的疆土。" },
    { text: "五钥之战，我让花海开到天门脚下。" },
    { text: "花灵之首，纯净明亮。" },
    { text: "花开之处，皆是故乡。" }
  ],
  "wind-sister": [
    { text: "风追人，人追风，谁也追不上谁。" },
    { text: "随风潜入夜——我们两个，一个追风，一个被风追。" },
    { text: "尘风骑手的同门，北迁路上替车队探了三次路。" },
    { text: "风姊妹的性子，是风给的。" },
    { text: "风不停，我们就不停。" }
  ],
  "ox-herd": [
    { text: "牛认犁，人认地。" },
    { text: "牧童骑黄牛——雷鸣草海的牧牛人，牵的牛是最后一批会犁地的。" },
    { text: "雷霆兽群不认生人，只认我的牧牛鞭。" },
    { text: "北迁路上，我的牛犁开了第一片新地。" },
    { text: "牛在，地在，人在。" }
  ],
  "root-call": [
    { text: "根呼响，根就醒。" },
    { text: "野火烧不尽——温室营地的根呼，一响沉睡的树根都会醒。" },
    { text: "灵根北迁那夜，它叫醒了第一段根。" },
    { text: "唤根的古咒，一响树根皆醒。" },
    { text: "根呼是山海的号角。" }
  ],
  "spring-rain": [
    { text: "春雨不声张，大地记得。" },
    { text: "随风潜入夜，润物细无声——播种队的春雨，让整片大地记住了它。" },
    { text: "第一场雨落在种子卫士的种盘上。" },
    { text: "每场雨都跟着播种队走。" },
    { text: "春雨润物，大地记恩。" }
  ],
};

// ── 进入游戏画面的古风欢迎语 ──────────────────────────────
export const WELCOME_LINES: WelcomeLine[] = [
  // 天门 / 封鼎
  { text: "长风破浪会有时——可天门不开，风从哪来？", ref: "李白《行路难》" },
  { text: "七座天门封了七段旧事，你推哪一扇，哪一段就活过来。" },
  { text: "会当凌绝顶——可天门之上，是封鼎的灰烬。", ref: "杜甫《望岳》" },
  { text: "封鼎那日星辰坠入天门，从此天光偏斜，人间有名无姓。" },
  { text: "天门偏斜之后，灯网里的人日夜听着活人的动静——你听见了么？" },
  // 忘川 / 幽冥
  { text: "野火烧不尽——忘川比野火更绝，烧的是名姓。", ref: "白居易《赋得古原草送别》" },
  { text: "忘川渡口不收船资，收的是你最后一个还记得自己名字的人。" },
  { text: "此情可待成追忆——忘川过处，追忆也被抹了。", ref: "李商隐《锦瑟》" },
  { text: "幽冥无名册上没有你的名字——因为忘川还没走到你那页。" },
  { text: "青海长云暗雪山——忘川的云更暗，暗到连自己的名字都看不见。", ref: "王昌龄《从军行》" },
  // 天衡 / 星辰
  { text: "无边落木萧萧下——天衡王庭的星辰也在落，只是落得无声。", ref: "杜甫《登高》" },
  { text: "天衡藏王印，可王印的光是借来的——借了就得还。" },
  { text: "旧时王谢堂前燕——天衡王庭的燕子早飞了，只剩星辰还债。", ref: "刘禹锡《乌衣巷》" },
  { text: "星穹之上天衡王印亮了又灭——每一灭都是一笔还不清的债。" },
  // 铁律 / 铸坊
  { text: "忽如一夜春风来——铁律铸坊没有春风，只有铁砧印和烧不完的炉火。", ref: "岑参《白雪歌送武判官归京》" },
  { text: "铁砧印烙在兵俑身上，兵俑不喊疼——铁律教人把疼铸成墙。" },
  { text: "守墙人不用刀，用铁砧印——印到哪，墙就长到哪。" },
  // 山海 / 灵根
  { text: "乱花渐欲迷人眼——山海灵根开的花，迷人眼也迷人心。", ref: "白居易《钱塘湖春行》" },
  { text: "万木灵根深扎古土，花开花落都是山海在记账。" },
  { text: "山海护根谱，根谱记着每一棵树几时生几时灭——你也在谱上。" },
  // 天机 / 命盘
  { text: "空山不见人——天机观星台上也看不见人，只有命盘转着。", ref: "王维《鹿柴》" },
  { text: "天机攥命盘，命盘不认人——它只认概率，不认你的苦。" },
  { text: "织命者不织自己的命——天机的规矩，旁观者不入局。" },
  // 五钥 / 七蚀
  { text: "国破山河在——五钥散了山河还在，可第七日蚀一到，山河也未必留得住。", ref: "杜甫《春望》" },
  { text: "五钥之战打了三百年，第七日蚀还剩几日——你数得清么？" },
  { text: "前不见古人——五钥之战前的人早被忘川抹了，后不见来者，只有你。", ref: "陈子昂《登幽州台歌》" },
  { text: "七蚀之期天门必坠——要么五家各赢各的，要么你来扛。" },
  // 旅者 / 选择
  { text: "天生我材必有用——可你连自己是谁都忘了，拿什么用？", ref: "李白《将进酒》" },
  { text: "劝君更尽一杯酒——出了这天门，西边可没有故人。", ref: "王维《送元二使安西》" },
  { text: "明月出天山——你从第七天门醒来，头顶没有明月，只有偏斜的天光。", ref: "李白《关山月》" },
];

export function getFaction(type: CardType) { return FACTIONS.find((faction) => faction.id === type)!; }
