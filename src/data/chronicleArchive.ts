import type { CardType } from "../types";

export interface ArchivePerson {
  id: string;
  name: string;
  title: string;
  faction: CardType;
  gender: string;
  age: string;
  personality: string;
  hobbies: string[];
  attributes: Array<{ label: string; value: string }>;
  biography: string;
  color: string;
  monogram: string;
}

export interface ArchiveArticle {
  id: string;
  sequence: string;
  era: string;
  title: string;
  classification: string;
  summary: string;
  body: string;
  appendix: string;
  factions: CardType[];
  people: string[];
}

export const ARCHIVE_PEOPLE: ArchivePerson[] = [
  { id: "yinluo", name: "殷萝", title: "天衡律令官", faction: "天衡", gender: "女", age: "27岁", personality: "克制、敏锐，对任何未经核验的善意都保留一页空白。", hobbies: ["临摹旧印", "修复破损卷宗", "夜行观星"], attributes: [{ label: "擅长", value: "律令裁断" }, { label: "危险级", value: "乙上" }, { label: "信物", value: "断金笔" }], biography: "出身于被忘川潮抹去过一次的边城。她用三年找回母亲的名字，从此拒绝让任何口供未经记录便消失。", color: "#d8b15c", monogram: "萝" },
  { id: "xuanji", name: "玄玑", title: "天机缝命师", faction: "天机", gender: "女", age: "24岁", personality: "好奇、疏离，习惯先拆开命运再决定是否替人缝回去。", hobbies: ["折纸命盘", "收集失效罗盘", "听雨"], attributes: [{ label: "擅长", value: "命盘演算" }, { label: "危险级", value: "甲下" }, { label: "信物", value: "双环星规" }], biography: "她曾在天机塔最深处看见自己三十七种死法，因此把每一次笑都当作对预言的反驳。", color: "#7caee8", monogram: "玑" },
  { id: "suhe", name: "苏禾", title: "山海根谱守人", faction: "山海", gender: "女", age: "29岁", personality: "温和、坚韧，愿意为一株无名草停下整支队伍。", hobbies: ["采集种子", "烹煮草汤", "给树取名"], attributes: [{ label: "擅长", value: "根谱辨识" }, { label: "危险级", value: "乙中" }, { label: "信物", value: "青木匣" }], biography: "她的村庄被潮水带走后，只留下七枚种子。她相信名字会发芽，因此一直把根谱带在身上。", color: "#78b58a", monogram: "禾" },
  { id: "qingyao", name: "青遥", title: "幽冥渡口医者", faction: "幽冥", gender: "女", age: "31岁", personality: "冷静、慈悲，对活人与亡者一视同仁，却最讨厌被人道谢。", hobbies: ["配药", "抄写碑文", "养渡鸦"], attributes: [{ label: "擅长", value: "忘川医术" }, { label: "危险级", value: "乙上" }, { label: "信物", value: "白骨铃" }], biography: "她在渡口救下太多忘记姓名的人，便替每个人留下一张药方，药方背面写着他们最后记得的事。", color: "#9a7bc6", monogram: "遥" },
  { id: "linzhu", name: "林铸", title: "铁律铸印监", faction: "铁律", gender: "女", age: "35岁", personality: "严苛、坦率，宁愿把谎言锻成铁牌挂在胸前，也不让它躲进话术。", hobbies: ["打磨旧刀", "下盲棋", "记录炉温"], attributes: [{ label: "擅长", value: "阵图锻造" }, { label: "危险级", value: "甲下" }, { label: "信物", value: "黑钢尺" }], biography: "她曾是七门军械署最年轻的总监。封鼎大典后，她亲手熔毁了自己的官印，改用无主的铁为流民铸路标。", color: "#c77f65", monogram: "铸" },
  { id: "wanqing", name: "闻青", title: "天衡王印侍读", faction: "天衡", gender: "女", age: "20岁", personality: "谨慎、倔强，面对权威时声音很轻，留下的批注却从不退让。", hobbies: ["背诵判例", "写小楷", "晒书"], attributes: [{ label: "擅长", value: "古印释读" }, { label: "危险级", value: "丙上" }, { label: "信物", value: "半枚王印" }], biography: "作为侍读，她见过王印被人篡改的第一夜，并私自抄走了缺失的三行诏文。", color: "#d39a6c", monogram: "青" },
  { id: "luyin", name: "陆引", title: "天机记忆测绘师", faction: "天机", gender: "女", age: "22岁", personality: "开朗、执拗，把每一条失去来处的路都当作尚未完成的地图。", hobbies: ["制图", "吹叶笛", "收集车票"], attributes: [{ label: "擅长", value: "记忆定位" }, { label: "危险级", value: "乙下" }, { label: "信物", value: "潮汐尺" }], biography: "她在自己被抹掉的故乡边缘画了九十九次地图，最后发现地图的空白处正是第七天门的影子。", color: "#6dbcc4", monogram: "引" },
  { id: "zhuiyue", name: "追月", title: "山海潮线引路人", faction: "山海", gender: "女", age: "26岁", personality: "爽朗、果断，遇到险路时总是第一个踏出去。", hobbies: ["攀岩", "编绳结", "讲海怪故事"], attributes: [{ label: "擅长", value: "潮线导航" }, { label: "危险级", value: "乙中" }, { label: "信物", value: "月纹绳" }], biography: "她的姐姐在潮退时失踪。此后她带所有不敢回家的人走过会移动的海岸。", color: "#70a996", monogram: "月" },
  { id: "huanling", name: "桓铃", title: "幽冥无名传令", faction: "幽冥", gender: "女", age: "21岁", personality: "沉默、灵巧，善于观察人群里谁在假装没有害怕。", hobbies: ["折纸灯", "跑屋脊", "听评书"], attributes: [{ label: "擅长", value: "暗线传递" }, { label: "危险级", value: "乙下" }, { label: "信物", value: "七孔铃" }], biography: "她没有被登记过姓名，桓铃是她自己从七只破铃上拼出的称呼。每送出一封信，她都会记住收信人的脸。", color: "#a469aa", monogram: "铃" },
  { id: "luojin", name: "罗谨", title: "铁律边防校尉", faction: "铁律", gender: "男", age: "33岁", personality: "沉稳、念旧，习惯把最坏的路留给自己。", hobbies: ["擦拭甲片", "修屋顶", "喝浓茶"], attributes: [{ label: "擅长", value: "守备部署" }, { label: "危险级", value: "乙上" }, { label: "信物", value: "旧军牌" }], biography: "封鼎大典时他违令放走了一支流民队伍，军牌上至今留着被雨泡开的处分印。", color: "#9e8c75", monogram: "谨" },
  { id: "wenbai", name: "闻白", title: "天衡巡案使", faction: "天衡", gender: "男", age: "38岁", personality: "温文、难测，把问题问得像一杯恰好温热的茶。", hobbies: ["品茶", "解残局", "收藏旧信封"], attributes: [{ label: "擅长", value: "口供比对" }, { label: "危险级", value: "甲中" }, { label: "信物", value: "朱砂印盒" }], biography: "他曾为七君主整理过盟誓原本，后来发现原本里有一页从未被任何人读过。", color: "#b8a16f", monogram: "白" },
  { id: "shenzhu", name: "沈逐", title: "山海巡根人", faction: "山海", gender: "男", age: "30岁", personality: "寡言、耐心，对土地的信任远胜于任何旗帜。", hobbies: ["修水渠", "磨石哨", "辨鸟鸣"], attributes: [{ label: "擅长", value: "地脉巡查" }, { label: "危险级", value: "乙中" }, { label: "信物", value: "石哨" }], biography: "他守着一段不断后退的山脉，记录每一棵树被忘川带走前最后一次开花。", color: "#93a96d", monogram: "逐" },
];

export const ARCHIVE_ARTICLES: ArchiveArticle[] = [
  { id: "ash-before-dawn", sequence: "A-01", era: "日蚀前 17 年", title: "灰烬里的第一枚印", classification: "天衡 · 密级乙", summary: "王印库的一场无名火，让三份判例出现同一段被抹去的签名。", body: "殷萝在清点烧毁卷宗时发现，灰烬里压着一枚未刻完的印胚。它的边缘不是王室纹样，而是七座天门的旧制图。闻白要求将其立即封存，闻青却从背面读出了被删去的第三行盟誓：任何人不得以众生记忆充作天门燃料。", appendix: "证物去向：由闻青拆分为三片，分别寄往天衡、天机与山海。", factions: ["天衡", "天机"], people: ["yinluo", "wenbai", "wanqing"] },
  { id: "tide-map", sequence: "A-02", era: "日蚀前 12 年", title: "退潮后没有故乡", classification: "山海 · 行旅记录", summary: "陆引和追月在移动海岸上画出一张会自行遗忘的地图。", body: "地图每隔一个时辰就失去一段道路。追月用绳结记住潮线，陆引则把失去的地名写在自己手臂上。第七十九次测绘后，两人发现所有空白都指向同一个尚未存在的港口，那里后来被称为第七天门的背面。", appendix: "附注：苏禾在空白边缘种下七枚种子，其中一枚至今未发芽。", factions: ["山海", "天机"], people: ["luyin", "zhuiyue", "suhe"] },
  { id: "nameless-clinic", sequence: "A-03", era: "日蚀前 9 年", title: "渡口的无名诊室", classification: "幽冥 · 医案摘录", summary: "青遥为每个失去名字的人建立药方，而桓铃送走了第一百封没有收件人的信。", body: "忘川潮退去后，诊室里的人仍记得疼痛，却不记得该向谁索要药。青遥让他们用最后记得的一件小事代替姓名：晒过的被褥、没有送出的花、某句被打断的话。桓铃把这些代名寄往五方，希望有人愿意承认他们曾经存在。", appendix: "其中四封信收到回信，回信者均声称从未见过寄信人。", factions: ["幽冥", "天衡"], people: ["qingyao", "huanling", "yinluo"] },
  { id: "iron-route", sequence: "A-04", era: "日蚀前 7 年", title: "用废铁铺出的归路", classification: "铁律 · 工造档", summary: "林铸熔毁旧军械，和罗谨一起为流民铸造了不受潮水抹除的路标。", body: "铁律军部禁止把军械用于民路。林铸回答：当路被忘掉时，军队守住的只是墙。罗谨带走了被处分的军牌，替她守住熔炉三夜。第四天，第一批路标在潮水里亮起，路牌只刻一行字：往仍有人等你的地方去。", appendix: "军部追责令已撤销，撤销人不详。", factions: ["铁律", "山海"], people: ["linzhu", "luojin", "shenzhu"] },
  { id: "broken-astrolabe", sequence: "A-05", era: "日蚀前 5 年", title: "碎星规的三十七种结局", classification: "天机 · 观测禁录", summary: "玄玑看见了三十七种死法，并选择把第一个预言交给一个不该知道的人。", body: "星规碎裂的瞬间，玄玑看见每一条未来都以同一场大火结束。唯独第三十七条里，有人把真相拆成五份，让互相矛盾的证词同时留在世上。她没有告诉塔主，而是把那枚裂片交给闻青，要求她在最不该信任的人面前读出内容。", appendix: "裂片边缘有一个手写名字：旅者。", factions: ["天机", "天衡"], people: ["xuanji", "wanqing", "wenbai"] },
  { id: "seed-census", sequence: "A-06", era: "日蚀前 3 年", title: "根谱从不替人原谅", classification: "山海 · 根谱副本", summary: "苏禾拒绝删去一座城的罪名，哪怕那会让它失去补给资格。", body: "山海议会要求苏禾修订根谱，将曾参与封鼎大典的城镇从灾后名单中抹去。她没有同意，只在每个名字旁边补了一行：罪并不属于后来出生的人。沈逐带着副本穿过封锁线，追月则把根谱的种子页藏进渔网。", appendix: "根谱第七码头页至今仍有潮湿指纹，无法鉴定主人。", factions: ["山海", "铁律"], people: ["suhe", "shenzhu", "zhuiyue"] },
  { id: "letter-seven", sequence: "A-07", era: "日蚀前 1 年", title: "第七封无法寄出的信", classification: "幽冥 · 传递事故", summary: "桓铃送出的第七封信回到了她手里，信封上写着她从未拥有过的本名。", body: "那封信没有发件人，却准确抵达了渡口。青遥判断这不是忘川的恶作剧，因为墨迹里有活人的温度。桓铃没有拆开它，而是请殷萝替她封入公共卷宗：如果名字只在被看见时存在，那它应该被所有人看见。", appendix: "卷宗编号被人为涂改为 CASE 07。", factions: ["幽冥", "天衡"], people: ["huanling", "qingyao", "yinluo"] },
  { id: "five-table", sequence: "A-08", era: "日蚀当夜", title: "五家第一次坐回同一张桌子", classification: "联合会议 · 绝密", summary: "五方代表为是否重启天门争执到黎明，没有人愿意先承认自己的部分。", body: "林铸带着熔毁的官印，苏禾带着无法发芽的种子，玄玑带着第三十七条未来。闻白坚持程序，青遥坚持先救人。会议记录在第四页突然中断，只留下一个共同结论：第七天门必须由没有可被篡改过去的人开启。", appendix: "会议地点随后从所有地图上消失。", factions: ["天衡", "幽冥", "天机", "铁律", "山海"], people: ["linzhu", "suhe", "xuanji", "qingyao", "wenbai"] },
  { id: "field-of-names", sequence: "A-09", era: "日蚀后 8 日", title: "名字在田里发芽", classification: "山海 · 现场笔录", summary: "一片被忘川扫过的盐碱地上，长出了写着陌生名字的草。", body: "苏禾说那不是奇迹，而是有人把记忆埋得太深。沈逐沿田埂找到一串铁质路标，路标尽头是林铸留下的空炉。追月把草叶夹进潮线图，陆引则确认每个名字都与失踪名册相符。", appendix: "采样草叶已移交幽冥诊室，禁止焚毁。", factions: ["山海", "铁律", "幽冥"], people: ["suhe", "shenzhu", "zhuiyue", "linzhu"] },
  { id: "quiet-trial", sequence: "A-10", era: "日蚀后 21 日", title: "没有被宣读的审判", classification: "天衡 · 巡案备忘", summary: "闻白在公开审判前撤走了所有卫兵，只留下殷萝与三位自首者。", body: "三位自首者承认曾替七君主整理记忆灯芯，却要求用更多秘密交换赦免。殷萝拒绝了交易，把他们的口供拆分封存，分别交给五方。闻青在旁批注：真相不该成为新的门票。", appendix: "审判未宣读判词，但当晚有十二名旧署官员主动归案。", factions: ["天衡", "幽冥"], people: ["yinluo", "wenbai", "wanqing"] },
  { id: "paper-sky", sequence: "A-11", era: "日蚀后 37 日", title: "纸天之下的观星者", classification: "天机 · 私人日志", summary: "玄玑与陆引用一千张纸重建了一夜已经消失的星空。", body: "纸天完成时，星空中缺少最亮的一颗。玄玑说那颗星不在天上，在某个人没有被写下的过去里。陆引把这句话标在地图中央，并决定跟随旅者的每一次出征补全坐标。", appendix: "日志末页写着：预言不是命令，记录也不是。", factions: ["天机"], people: ["xuanji", "luyin"] },
  { id: "brass-bell", sequence: "A-12", era: "日蚀后 52 日", title: "铃响三次，城门不落", classification: "幽冥 · 守城战报", summary: "桓铃以三次铃声引开潮群，青遥在城门下救下了两百零七人。", body: "第一声铃让潮群记起自己曾经是人，第二声铃让守军放下弩箭，第三声铃后，桓铃失去了关于姐姐的最后记忆。青遥没有安慰她，只把姐姐的名字写进城门背面。", appendix: "城门仍在，名字已被重新刻过九次。", factions: ["幽冥", "铁律"], people: ["huanling", "qingyao", "luojin"] },
  { id: "unforged-key", sequence: "A-13", era: "日蚀后 71 日", title: "尚未铸成的钥匙", classification: "铁律 · 炉前证词", summary: "林铸拒绝为任何一方铸造开启天门的独占钥匙。", body: "她把五种材料分别放进炉中：王印金、无名灰、命盘铜、阵图铁与根谱木。五种材料彼此排斥，只有在罗谨把旧军牌投入炉火后才短暂相融。林铸因此得出结论：钥匙不是物件，是愿意承担后果的人。", appendix: "炉温记录缺失第七页，疑似被旅者取走。", factions: ["铁律", "天衡", "山海"], people: ["linzhu", "luojin", "yinluo", "suhe"] },
  { id: "guest-without-past", sequence: "A-14", era: "现在", title: "没有过去的来访者", classification: "第七天门 · 开放档案", summary: "五方终于确认：旅者不是答案，而是让所有答案无法被独占的见证人。", body: "玄玑交出裂片，殷萝交出烧毁的判例，青遥交出无名药方，林铸交出未成形的钥匙，苏禾交出未发芽的种子。它们都要求同一件事：下一次书写世界时，必须允许不同的人记住不同的真相。", appendix: "档案持续更新。每一次出征都会为本页增添一行尚未结案的证词。", factions: ["天衡", "幽冥", "天机", "铁律", "山海"], people: ["yinluo", "xuanji", "suhe", "qingyao", "linzhu"] },
];
