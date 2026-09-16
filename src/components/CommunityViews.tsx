import { useEffect, useState } from "react";
import { CARD_MAP } from "../data/cards";
import { PACK_COST, type PackResult } from "../game/meta";
import { guildApi, type GuildListing, type GuildState } from "../community/GuildApi";
import { socialApi, type GuildChatMessage, type GuildContribution, type GuildTask } from "../community/SocialApi";
import CardView from "./CardView";

type Currency = "starDust" | "guildMarks" | "arcaneDust";

interface ShopProps {
  starDust: number;
  guildMarks: number;
  ownedItems: string[];
  onPurchase: (itemId: string, currency: Currency, cost: number) => boolean;
  arcaneDust: number;
  onOpenPack: () => PackResult | null;
}

const STORE_ITEMS: { id: string; title: string; subtitle: string; detail: string; icon: string; asset: string; cost: number; currency: Currency; featured?: boolean }[] = [
  { id: "echo-cache", title: "回响秘匣", subtitle: "限时补给", detail: "收录一枚稀有战术徽记，计入赛季补给记录。", icon: "◇", asset: "echo-cache", cost: 160, currency: "starDust", featured: true },
  { id: "dusk-banner", title: "幽冥军旗", subtitle: "连队装饰", detail: "将大厅旗帜替换为幽冥远征纹章。", icon: "⚑", asset: "dusk-banner", cost: 90, currency: "guildMarks" },
  { id: "astral-frame", title: "星环名牌", subtitle: "指挥官外观", detail: "为你的名牌增加一圈动态星环。", icon: "✦", asset: "astral-frame", cost: 260, currency: "starDust" },
  { id: "vanguard-order", title: "先锋调令", subtitle: "战术补给", detail: "前线补给调令，兑换后计入赛季补给记录。", icon: "♜", asset: "vanguard-order", cost: 120, currency: "starDust" },
  { id: "celestial-title", title: "日冕称号", subtitle: "指挥官外观", detail: "解锁「承星者」称号，展示在名牌与排行榜。", icon: "☀", asset: "celestial-title", cost: 320, currency: "starDust" },
  { id: "moonless-avatar", title: "无月头像框", subtitle: "指挥官外观", detail: "以无月之夜为边框的头像框，幽冥配色。", icon: "☾", asset: "moonless-avatar", cost: 110, currency: "guildMarks" },
  { id: "lantern-banner", title: "万灯旌旗", subtitle: "连队装饰", detail: "点灯人亲手扎的旌旗，大厅升起时满城皆明。", icon: "☼", asset: "lantern-banner", cost: 140, currency: "starDust" },
  { id: "tome-skin", title: "典籍书皮", subtitle: "卡组外观", detail: "为整备库的卡组界面换上云阶书库皮面。", icon: "📖", asset: "tome-skin", cost: 200, currency: "arcaneDust" },
];

export function ShopView({ starDust, guildMarks, ownedItems, onPurchase, arcaneDust, onOpenPack }: ShopProps) {
  const [notice, setNotice] = useState("");
  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const supplyProgress = Math.min(6, ownedItems.length);
  const purchase = (item: (typeof STORE_ITEMS)[number]) => {
    if (ownedItems.includes(item.id)) return;
    setNotice(onPurchase(item.id, item.currency, item.cost) ? `已取得「${item.title}」` : "资源不足，完成委托或参与连队行动可获得资源。");
  };
  const openPack = () => {
    const result = onOpenPack();
    if (!result) { setNotice("星辉不足，完成战役或任务挑战可获得星辉。"); return; }
    setPackResult(result);
    setNotice("");
  };

  return <section className="command-view shop-view">
    <header className="command-heading shop-heading"><div><p className="eyebrow">XIANXIA EXCHANGE</p><h1>星门补给站</h1><span>用前线缴获的资源换取补给、外观与可带回第七天门的陈设。</span></div><div className="balance-board"><span><i>✦</i> 星辉 <b>{starDust}</b></span><span><i>◈</i> 连队印记 <b>{guildMarks}</b></span><span><i>◇</i> 尘晶 <b>{arcaneDust}</b></span></div></header>
    <div className="shop-strip"><div><p className="panel-kicker">SEASON 01 ROTATION</p><h2>五钥前线补给</h2><span>本周物资由五家分别送抵星门，兑换记录会留在你的补给档里。</span></div><i aria-hidden="true">✦</i><strong>SEASON<br />01</strong></div>
    {notice && <div className="community-notice" role="status">{notice}</div>}
    <section className="pack-shop"><div className="pack-shop-copy"><p className="panel-kicker">ECLIPSE BOOSTER</p><h2>日蚀秘匣</h2><p>每匣 {PACK_COST} 星辉，开出 5 张卡牌：最后一席必为精锐（SR 及以上）。重复卡牌自动折为尘晶，可于图鉴收藏中合成缺卡。</p><button className="parchment-button" disabled={starDust < PACK_COST} onClick={openPack}>开启秘匣 <span>→</span></button></div><div className="pack-shop-box" aria-hidden="true"><img src="/assets/ui/generated/shop/eclipse-booster.png" alt="" style={{ width: "90px", height: "90px", objectFit: "contain" }} /><b>日蚀秘匣</b><small>ECLIPSE BOOSTER</small></div></section>
    {packResult ? <section className="pack-result" role="dialog" aria-modal="true" aria-labelledby="pack-result-title"><div className="pack-result-panel"><header><div><p className="panel-kicker">BOOSTER REVEALED</p><h2 id="pack-result-title">秘匣开启</h2><span>5 张卡牌已归档{packResult.totalDust > 0 ? ` · 重复卡折为 ${packResult.totalDust} 尘晶` : ""}</span></div><button className="pack-result-close" onClick={() => setPackResult(null)} aria-label="关闭开包结果">×</button></header><div className="pack-result-row">{packResult.cards.map((card) => { const def = CARD_MAP[card.defId]; return <article className={`pack-result-card pack-rarity-${card.rarity}`} key={card.defId}><CardView def={def} compact /><em>{card.isNew ? "新收录" : card.dustGained > 0 ? `+${card.dustGained} 尘晶` : "重复"}</em></article>; })}</div><button className="btn btn-primary" onClick={() => setPackResult(null)}>收下</button></div></section> : null}
    <div className="shop-grid">{STORE_ITEMS.map((item) => { const owned = ownedItems.includes(item.id); const resource = item.currency === "starDust" ? "星辉" : item.currency === "arcaneDust" ? "尘晶" : "连队印记"; const currencyIcon = item.currency === "starDust" ? "✦" : item.currency === "arcaneDust" ? "◇" : "◈"; return <article className={`shop-item ${item.featured ? "is-featured" : ""}`} key={item.id}><div className="shop-item-icon"><img src={`/assets/ui/generated/shop/${item.asset}.png`} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.hidden = true; }} /></div><div className="shop-item-copy"><small>{item.subtitle}</small><h2>{item.title}</h2><p>{item.detail}</p></div><div className="shop-item-action"><span><i>{currencyIcon}</i>{item.cost} {resource}</span><button disabled={owned} onClick={() => purchase(item)}>{owned ? "已取得" : "兑换"}</button></div></article>; })}</div>
    <section className="shop-footer"><span className="shop-footer-mark"><img src="/assets/ui/generated/shop/supply-badge.png" alt="" aria-hidden="true" onError={(event) => { event.currentTarget.hidden = true; }} /></span><div><p className="panel-kicker">ACCOUNT SUPPLY STATUS</p><b>你的赛季补给进度</b><small>累计在补给站兑换 {supplyProgress} / 6 件物资，即可开启日蚀纪念徽章。</small></div><div className="supply-progress"><i><span style={{ width: `${supplyProgress / 6 * 100}%` }} /></i><small>{supplyProgress} / 6</small></div></section>
  </section>;
}

const EMPTY_GUILD: GuildState = { guild: null, me: null, members: [], applications: [] };
const GUILD_ERRORS: Record<string, string> = {
  CLOUD_SERVICE_NOT_CONFIGURED: "在线连队服务尚未配置。请连接云端服务后重试。",
  GUILD_INPUT_INVALID: "连队名称需为 2-24 个字符；代号使用 2-6 位大写字母或数字。",
  GUILD_NAME_OR_TAG_TAKEN: "该连队名称或代号已被使用。",
  GUILD_INVITE_INVALID: "邀请码格式不正确。",
  GUILD_INVITE_NOT_FOUND: "未找到对应的连队邀请码。",
  GUILD_MEMBER_LIMIT_REACHED: "该连队已满员。",
  GUILD_MEMBERSHIP_EXISTS: "你已加入一个作战连队。",
  GUILD_APPLICATION_EXISTS: "你已经向该连队提交过申请。",
  GUILD_LEADER_TRANSFER_REQUIRED: "连队长须先转让职位或移除其他成员后才能解散连队。",
};

function guildError(error: unknown) {
  const code = error instanceof Error ? error.message : "NETWORK_UNAVAILABLE";
  return GUILD_ERRORS[code] ?? (code === "Failed to fetch" ? "无法连接在线连队服务。" : `连队操作失败：${code}`);
}

export function GuildView() {
  const [state, setState] = useState<GuildState>(EMPTY_GUILD);
  const [discoveries, setDiscoveries] = useState<GuildListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [createForm, setCreateForm] = useState({ name: "", tag: "", description: "" });
  const [inviteCode, setInviteCode] = useState("");
  const [noticeDraft, setNoticeDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<GuildChatMessage[]>([]);
  const [contributions, setContributions] = useState<GuildContribution[]>([]);
  const [guildTasks, setGuildTasks] = useState<GuildTask[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [socialConnected, setSocialConnected] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [next, directory] = await Promise.all([guildApi.mine(), guildApi.discover()]);
      setState(next);
      setDiscoveries(directory.guilds);
      setNoticeDraft(next.guild?.notice ?? "");
      setNotice("");
    } catch (error) {
      setNotice(guildError(error));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const loadSocial = async () => {
    try {
      const [chat, ranking, tasks] = await Promise.all([socialApi.guildChat(), socialApi.guildContributions(), socialApi.guildTasks()]);
      setChatMessages(chat.messages);
      setContributions(ranking.rows);
      setGuildTasks(tasks.tasks);
      setSocialConnected(true);
    } catch {
      setSocialConnected(false);
    }
  };

  useEffect(() => {
    if (state.guild) void loadSocial();
  }, [state.guild?.id]);

  const run = async (operation: () => Promise<GuildState>, success: string) => {
    setBusy(true);
    try {
      const next = await operation();
      setState(next);
      setNoticeDraft(next.guild?.notice ?? "");
      setNotice(success);
    } catch (error) {
      setNotice(guildError(error));
    } finally { setBusy(false); }
  };

  if (loading) return <section className="command-view guild-view guild-online-view"><header className="command-heading"><p className="eyebrow">ONLINE COMPANY SERVICE</p><h1>作战连队</h1><span>正在连接连队档案…</span></header></section>;

  if (!state.guild || !state.me) return <section className="command-view guild-view guild-online-view">
    <header className="command-heading guild-heading"><div><p className="eyebrow">ONLINE COMPANY SERVICE</p><h1>作战连队</h1><span>创建自己的连队，或通过邀请码加入已有战线。成员、公告和权限全部保存在云端。</span></div><button className="outline-command" onClick={() => void load()} disabled={busy}>刷新连接 <b>↻</b></button></header>
    {notice ? <div className="community-notice" role="status">{notice}</div> : null}
    <div className="guild-enrollment">
      <form className="guild-panel guild-create-form" onSubmit={(event) => { event.preventDefault(); void run(() => guildApi.create(createForm), "连队已成立，你现在是连队长。"); }}>
        <div className="guild-panel-heading"><div><p className="panel-kicker">FOUND A COMPANY</p><h2>建立作战连队</h2></div><span>云端归档</span></div>
        <label>连队名称<input required maxLength={24} value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如：第七天门远征队" /></label>
        <label>连队代号<input required maxLength={6} value={createForm.tag} onChange={(event) => setCreateForm((current) => ({ ...current, tag: event.target.value.toUpperCase() }))} placeholder="XF07" /></label>
        <label>招募说明<textarea maxLength={180} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="写下连队的作战目标与招募要求" /></label>
        <button type="submit" className="parchment-button" disabled={busy}>建立连队 <span>→</span></button>
      </form>
      <form className="guild-panel guild-join-form" onSubmit={(event) => { event.preventDefault(); void run(() => guildApi.join(inviteCode), "已加入作战连队，成员名单已同步。"); }}>
        <p className="panel-kicker">JOIN BY INVITATION</p><h2>加入已有连队</h2><p>向连队长获取 8 位邀请码。加入后可查看实时成员名册与连队公告。</p>
        <label>邀请码<input required maxLength={8} value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="例如：A1B2C3D4" /></label>
        <button type="submit" className="outline-command" disabled={busy}>加入连队 <b>→</b></button>
      </form>
    </div>
    {discoveries.length > 0 ? <section className="guild-panel guild-discovery"><div className="guild-panel-heading"><div><p className="panel-kicker">OPEN RECRUITMENT</p><h2>公开招募连队</h2></div><span>{discoveries.length} 个连队</span></div><div>{discoveries.map((guild) => <article key={guild.id}><i>{guild.tag.slice(0, 1)}</i><div><b>{guild.name} <small>[{guild.tag}]</small></b><span>{guild.description || "暂无招募说明"}</span></div><em>{guild.memberCount} / {guild.memberLimit}</em><button disabled={busy || guild.memberCount >= guild.memberLimit} onClick={() => { setBusy(true); void guildApi.apply(guild.id).then(() => setNotice("申请已提交，等待连队管理者审批。")).catch((error) => setNotice(guildError(error))).finally(() => setBusy(false)); }}>申请</button></article>)}</div></section> : null}
  </section>;

  const canManage = state.me.role === "leader" || state.me.role === "officer";
  const copiedInvite = async () => {
    try { await navigator.clipboard.writeText(state.guild!.inviteCode); setNotice("邀请码已复制，可发给队友加入。"); }
    catch { setNotice(`邀请码：${state.guild!.inviteCode}`); }
  };
  const sendChat = async () => {
    const message = chatDraft.trim();
    if (!message || busy) return;
    setBusy(true);
    try {
      await socialApi.sendGuildChat(message);
      setChatDraft("");
      await loadSocial();
    } catch (error) {
      setNotice(guildError(error));
    } finally { setBusy(false); }
  };
  return <section className="command-view guild-view guild-online-view">
    <header className="command-heading guild-heading"><div><p className="eyebrow">ONLINE COMPANY · {state.guild.tag}</p><h1>{state.guild.name}</h1><span>{state.guild.description || "尚未填写连队说明。"}</span></div><div className="guild-rank"><i>{state.me.role === "leader" ? "L" : state.me.role === "officer" ? "O" : "M"}</i><span>你的职位</span><b>{state.me.roleLabel}</b></div></header>
    {notice ? <div className="community-notice" role="status">{notice}</div> : null}
    <section className="guild-online-brief"><div className="guild-emblem">{state.guild.tag.slice(0, 1)}</div><div><p className="panel-kicker">COMPANY BULLETIN</p><h2>连队公告</h2>{canManage ? <textarea value={noticeDraft} maxLength={240} onChange={(event) => setNoticeDraft(event.target.value)} placeholder="发布本周作战目标、集合时间或招募要求" /> : <p>{state.guild.notice || "连队长尚未发布公告。"}</p>}</div><aside>{canManage ? <button className="parchment-button" disabled={busy || noticeDraft === state.guild.notice} onClick={() => void run(() => guildApi.updateNotice(noticeDraft), "连队公告已更新并同步给全体成员。")} >发布公告 <span>→</span></button> : <><small>本周贡献</small><b>{state.me.contribution}</b><em>云端实时记录</em></>}</aside></section>
    <section className="guild-live-grid" aria-label="连队联合作战">
      <article className="guild-panel guild-chat-panel"><header className="guild-panel-heading"><div><p className="panel-kicker">COMPANY CHANNEL</p><h2>连队频道</h2></div><span className={socialConnected ? "is-online" : ""}>{socialConnected ? "已连接" : "等待服务"}</span></header><div className="guild-chat-log">{chatMessages.length ? chatMessages.slice(-8).map((message) => <div key={message.id}><b>{message.sender}</b><small>{message.body}</small></div>) : <p>在线服务连接后，连队消息会显示在这里。</p>}</div><form onSubmit={(event) => { event.preventDefault(); void sendChat(); }}><input value={chatDraft} maxLength={500} disabled={!socialConnected || busy} onChange={(event) => setChatDraft(event.target.value)} placeholder="向连队发送作战讯息" /><button disabled={!socialConnected || !chatDraft.trim() || busy} aria-label="发送连队消息" title="发送">↑</button></form></article>
      <article className="guild-panel guild-task-panel"><header className="guild-panel-heading"><div><p className="panel-kicker">JOINT OBJECTIVES</p><h2>联合任务</h2></div><span>{guildTasks.length}</span></header>{guildTasks.length ? guildTasks.map((task) => { const percent = Math.min(100, task.progress / task.target * 100); const reward = task.reward.map((item) => `${item.amount} ${item.currency === "guildMarks" ? "印记" : item.currency === "arcaneDust" ? "尘晶" : "星辉"}`).join(" · "); return <div className="guild-task-row" key={task.id}><div><b>{task.title}</b><small>{task.progress} / {task.target} · {reward}</small><i><span style={{ width: `${percent}%` }} /></i></div><button disabled={!socialConnected || task.claimed || task.progress < task.target || busy} onClick={() => { setBusy(true); void socialApi.claimGuildTask(task.id).then(() => { setNotice("联合任务奖励已发放至云端钱包。"); return loadSocial(); }).catch((error) => setNotice(guildError(error))).finally(() => setBusy(false)); }}>{task.claimed ? "已领取" : task.progress >= task.target ? "领取" : "推进中"}</button></div>; }) : <p>完成连队行动后，将显示由服务端结算的联合任务。</p>}</article>
      <article className="guild-panel guild-contribution-panel"><header className="guild-panel-heading"><div><p className="panel-kicker">WEEKLY CONTRIBUTION</p><h2>贡献排行</h2></div><span>本周</span></header>{contributions.length ? contributions.slice(0, 5).map((entry) => <div className="guild-contribution-row" key={entry.publicCode}><i>{String(entry.rank).padStart(2, "0")}</i><b>{entry.publicCode}</b><span>{entry.contribution}</span></div>) : <p>贡献由 PvE、PvP 与连队任务的服务端结算写入。</p>}</article>
    </section>
    <div className="guild-online-layout"><section className="guild-panel guild-members"><div className="guild-panel-heading"><div><p className="panel-kicker">ACTIVE ROSTER</p><h2>远征成员</h2></div><span>{state.members.length} / {state.guild.memberLimit}</span></div>{state.members.map((member) => <div className={`guild-member ${member.isSelf ? "is-player" : ""}`} key={member.playerId}><i>{member.role === "leader" ? "♜" : member.role === "officer" ? "✦" : "◇"}</i><div><b>{member.isSelf ? "你" : member.publicCode}</b><small>{member.roleLabel} · 加入于 {new Date(member.joinedAt).toLocaleDateString("zh-CN")}</small></div><em>{member.contribution}</em></div>)}</section><aside className="guild-panel guild-online-actions"><div className="guild-panel-heading"><div><p className="panel-kicker">COMPANY ACCESS</p><h2>连队操作</h2></div><span>在线</span></div><article><i>⌘</i><div><b>邀请码</b><small>{state.guild.inviteCode}</small></div><button onClick={() => void copiedInvite()}>复制</button></article><article><i>↻</i><div><b>同步名册</b><small>刷新成员、公告与权限</small></div><button disabled={busy} onClick={() => void load()}>刷新</button></article><article><i>×</i><div><b>{state.me.role === "leader" ? "解散连队" : "退出连队"}</b><small>{state.me.role === "leader" ? "仅剩你一人时可解散" : "退出不会删除个人档案"}</small></div><button className="danger-command" disabled={busy} onClick={() => { if (window.confirm(state.me?.role === "leader" ? "确认解散该连队？" : "确认退出该连队？")) void run(() => guildApi.leave(), state.me?.role === "leader" ? "连队已解散。" : "已退出作战连队。"); }}>离开</button></article></aside></div>
    {canManage && state.applications.length > 0 ? <section className="guild-panel guild-applications"><div className="guild-panel-heading"><div><p className="panel-kicker">PENDING APPLICATIONS</p><h2>待审批申请</h2></div><span>{state.applications.length}</span></div>{state.applications.map((application) => <article key={application.id}><div><b>{application.publicCode}</b><small>{application.message || "未附言"}</small></div><button disabled={busy} onClick={() => void run(() => guildApi.decideApplication(application.id, false), "已拒绝申请。")}>拒绝</button><button disabled={busy} onClick={() => void run(() => guildApi.decideApplication(application.id, true), "已批准申请，成员名册已更新。")}>批准</button></article>)}</section> : null}
  </section>;
}
