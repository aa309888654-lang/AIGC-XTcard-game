import { useEffect, useMemo, useRef, useState } from "react";
import { useGameAudio } from "../audio/AudioProvider";
import "./MessageCenter.css";

type MessageCategory = "system" | "battle" | "guild";
type MessageFilter = "all" | MessageCategory;
type RewardCurrency = "starDust" | "guildMarks";

interface MessageAttachment { currency: RewardCurrency; amount: number; label: string; }
interface CommandMessage {
  id: string; category: MessageCategory; sender: string; title: string; summary: string;
  body: string[]; time: string; sequence: string; attachment?: MessageAttachment;
}
interface MessageState { readIds: string[]; claimedIds: string[]; deletedIds: string[]; }
interface MessageCenterProps { onClaimAttachment: (currency: RewardCurrency, amount: number) => void; }

const MESSAGES: CommandMessage[] = [
  {
    id: "season-brief-01", category: "system", sender: "仙侠指挥部", sequence: "S-017", time: "今天 09:42",
    title: "第七天门核验行动现已启动", summary: "五钥前线的委托、战报核验与补给通道现已开放。",
    body: ["旅者，星门观测站确认第七天门残响正在增强。第一批核验委托已同步至你的指挥终端。", "完成今日线索与前线交战可取得补给资格；在日蚀抵达前交回足够证词，还将解锁第七门见证徽记。"],
    attachment: { currency: "starDust", amount: 120, label: "赛季启程补给" },
  },
  {
    id: "battle-report-04", category: "battle", sender: "战术演算终端", sequence: "B-204", time: "今天 08:16",
    title: "模拟战场复盘：幽冥突袭", summary: "你的阵线在第 8 回合完成核心击破，战术评分 S。",
    body: ["本次演算已完成归档：你在第 5 回合连续触发天衡与铁律连携，并于第 8 回合击破敌方核心。", "建议保留低费用守卫单位，以减少幽冥阵营在前四回合造成的节奏压制。完整记录可在模拟战场中重新查看。"],
  },
  {
    id: "guild-supply-07", category: "guild", sender: "第七码头连队", sequence: "G-071", time: "昨天 22:05",
    title: "远征补给已送达", summary: "连队远征完成，所有参与成员获得同盟印记。",
    body: ["第七码头连队已完成本周裂隙航道勘测。你的战术卡组在护航阶段提供了关键支援。", "远征分配的同盟印记已装入附件。领取后可在作战连队或商城中兑换专属物资。"],
    attachment: { currency: "guildMarks", amount: 5, label: "远征参与奖励" },
  },
  {
    id: "system-maintenance-02", category: "system", sender: "星门维护局", sequence: "S-332", time: "昨天 18:30",
    title: "战线数据同步完成", summary: "卡牌图鉴与编年史资料已更新至最新版本。",
    body: ["指挥终端的数据同步已完成。本次更新补充了五个阵营的档案索引，并校准了部分人物关系记录。", "你可以前往图鉴收藏与仙侠编年史查看最新归档。同步期间未检测到卡组数据异常。"],
  },
  {
    id: "ranking-alert-03", category: "battle", sender: "赛季裁定所", sequence: "R-004", time: "08 月 01 日",
    title: "赛季战绩结算完成", summary: "最新一轮模拟战场战绩已计入赛季积分。",
    body: ["最新一轮战绩结算已完成，胜场、连胜与赛季积分均已同步至排行榜。", "保持节奏继续征战，冲刺下一段位与赛季勋章。"],
  },
  {
    id: "guild-invite-11", category: "guild", sender: "蔷薇战争", sequence: "G-114", time: "07 月 31 日",
    title: "联合演习邀请", summary: "蔷薇战争向你的连队发起了一场幽冥主题演习。",
    body: ["蔷薇战争希望在本周结算前进行一场幽冥主题联合演习，卡组中需至少包含 12 张幽冥单位。", "演习将按模拟战场规则完整结算，胜负会计入赛季积分。邀请将在本周日 22:00 失效，详情已同步至作战连队。"],
  },
];

const CATEGORY_META: Record<MessageCategory, { label: string; icon: string }> = {
  system: { label: "系统", icon: "✦" }, battle: { label: "战报", icon: "⚔" }, guild: { label: "连队", icon: "◈" },
};
const DEFAULT_STATE: MessageState = {
  readIds: ["system-maintenance-02", "ranking-alert-03", "guild-invite-11"], claimedIds: [], deletedIds: [],
};
const MESSAGE_STATE_KEY = "astra-frontline-message-state-v1";

function loadMessageState(): MessageState {
  try {
    const saved = JSON.parse(localStorage.getItem(MESSAGE_STATE_KEY) ?? "null");
    if (saved && Array.isArray(saved.readIds) && Array.isArray(saved.claimedIds) && Array.isArray(saved.deletedIds)) {
      return saved as MessageState;
    }
  } catch {
    // Malformed state falls back to defaults.
  }
  return DEFAULT_STATE;
}

export default function MessageCenter({ onClaimAttachment }: MessageCenterProps) {
  const [messageState, setMessageState] = useState<MessageState>(loadMessageState);
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [selectedId, setSelectedId] = useState(MESSAGES[0].id);
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef<number | null>(null);
  const { playSfx } = useGameAudio();
  useEffect(() => () => { if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current); }, []);

  const availableMessages = useMemo(() => MESSAGES.filter((message) => !messageState.deletedIds.includes(message.id)), [messageState.deletedIds]);
  const visibleMessages = useMemo(() => availableMessages.filter((message) => (filter === "all" || message.category === filter) && (!onlyUnread || !messageState.readIds.includes(message.id))), [availableMessages, filter, messageState.readIds, onlyUnread]);
  const selectedMessage = availableMessages.find((message) => message.id === selectedId) ?? visibleMessages[0] ?? availableMessages[0];
  const unreadCount = availableMessages.filter((message) => !messageState.readIds.includes(message.id)).length;
  const readCount = availableMessages.length - unreadCount;
  const updateMessageState = (update: (current: MessageState) => MessageState) => {
    setMessageState((current) => {
      const next = update(current);
      try {
        localStorage.setItem(MESSAGE_STATE_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable; state still works for this session.
      }
      return next;
    });
  };
  const flashNotice = (message: string) => { setNotice(message); if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current); noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2200); };
  const selectMessage = (messageId: string) => {
    setSelectedId(messageId);
    updateMessageState((current) => current.readIds.includes(messageId) ? current : { ...current, readIds: [...current.readIds, messageId] });
  };
  const markAllRead = () => {
    updateMessageState((current) => ({ ...current, readIds: [...new Set([...current.readIds, ...availableMessages.map((message) => message.id)])] }));
    flashNotice("所有通讯已标记为已读");
  };
  const clearReadMessages = () => {
    const idsToDelete = availableMessages.filter((message) => messageState.readIds.includes(message.id)).map((message) => message.id);
    const remaining = availableMessages.filter((message) => !idsToDelete.includes(message.id));
    updateMessageState((current) => ({ ...current, deletedIds: [...new Set([...current.deletedIds, ...idsToDelete])] }));
    setSelectedId(remaining[0]?.id ?? "");
    flashNotice(`已清理 ${idsToDelete.length} 封已读通讯`);
  };
  const claimAttachment = (message: CommandMessage) => {
    if (!message.attachment || messageState.claimedIds.includes(message.id)) return;
    onClaimAttachment(message.attachment.currency, message.attachment.amount);
    playSfx("reward");
    updateMessageState((current) => ({ ...current, readIds: [...new Set([...current.readIds, message.id])], claimedIds: [...current.claimedIds, message.id] }));
    flashNotice(`已领取 ${message.attachment.label}`);
  };

  return <section className="command-view message-center-view">
    <header className="command-heading message-center-heading">
      <div><p className="eyebrow">STARGATE COMMUNICATIONS</p><h1>消息中心</h1><span>接收战线公告、战术复盘与连队通讯。</span></div>
      <div className="message-signal" aria-label={`${unreadCount} 封未读消息`}><img src="/assets/ui/message-center-crest.png" alt="" /><span><small>待处理通讯</small><b>{String(unreadCount).padStart(2, "0")}</b></span></div>
    </header>
    {notice ? <div className="message-center-notice" role="status">{notice}</div> : null}
    <div className="message-toolbar">
      <div className="message-filters" role="tablist" aria-label="消息分类">
        {(["all", "system", "battle", "guild"] as MessageFilter[]).map((option) => {
          const count = option === "all" ? availableMessages.length : availableMessages.filter((message) => message.category === option).length;
          return <button key={option} role="tab" aria-selected={filter === option} className={filter === option ? "is-active" : ""} onClick={() => setFilter(option)}>{option === "all" ? "全部通讯" : CATEGORY_META[option].label}<small>{String(count).padStart(2, "0")}</small></button>;
        })}
      </div>
      <label className="message-unread-toggle"><input type="checkbox" checked={onlyUnread} onChange={(event) => setOnlyUnread(event.target.checked)} /><i aria-hidden="true" /><span>只看未读</span></label>
      <button className="message-tool-button" disabled={unreadCount === 0} onClick={markAllRead}>全部已读</button>
      <button className="message-tool-button is-danger" disabled={readCount === 0} onClick={clearReadMessages}>清理已读</button>
    </div>
    <div className="message-center-layout">
      <section className="message-list-panel" aria-label="通讯列表">
        <header><span>收件箱</span><small>{visibleMessages.length} / {availableMessages.length}</small></header>
        <div className="message-list">
          {visibleMessages.map((message) => {
            const isUnread = !messageState.readIds.includes(message.id);
            const hasAttachment = message.attachment && !messageState.claimedIds.includes(message.id);
            return <button className={`${selectedMessage?.id === message.id ? "is-selected" : ""} ${isUnread ? "is-unread" : ""}`} onClick={() => selectMessage(message.id)} key={message.id}>
              <span className="message-category-icon" aria-hidden="true">{CATEGORY_META[message.category].icon}</span>
              <span className="message-list-copy"><span><small>{message.sender}</small><time>{message.time}</time></span><b>{message.title}</b><em>{message.summary}</em><span className="message-list-meta"><i>{CATEGORY_META[message.category].label}</i>{hasAttachment ? <i className="has-attachment">✦ 附件待领取</i> : null}</span></span>
              {isUnread ? <i className="unread-indicator" aria-label="未读" /> : null}
            </button>;
          })}
          {visibleMessages.length === 0 ? <div className="message-empty-state"><span>✓</span><b>没有待处理通讯</b><small>调整分类或关闭“只看未读”后可查看归档。</small></div> : null}
        </div>
      </section>
      <article className="message-detail-panel" aria-live="polite">
        {selectedMessage ? <>
          <header className="message-detail-header"><div className="message-detail-sender"><span aria-hidden="true">{CATEGORY_META[selectedMessage.category].icon}</span><div><small>发件单位</small><b>{selectedMessage.sender}</b></div></div><dl><div><dt>通讯编号</dt><dd>{selectedMessage.sequence}</dd></div><div><dt>接收时间</dt><dd>{selectedMessage.time}</dd></div></dl></header>
          <section className="message-detail-body"><p className="panel-kicker">{CATEGORY_META[selectedMessage.category].label.toUpperCase()} CHANNEL</p><h2>{selectedMessage.title}</h2><div>{selectedMessage.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><footer><span>XIANXIA FRONTLINE COMMAND NETWORK</span><i aria-hidden="true">✦</i></footer></section>
          {selectedMessage.attachment ? <section className={`message-attachment ${messageState.claimedIds.includes(selectedMessage.id) ? "is-claimed" : ""}`}><span className="attachment-seal" aria-hidden="true">{selectedMessage.attachment.currency === "starDust" ? "✦" : "◈"}</span><div><small>加密附件</small><b>{selectedMessage.attachment.label}</b><span>{selectedMessage.attachment.currency === "starDust" ? "星辉" : "同盟印记"} × {selectedMessage.attachment.amount}</span></div><button disabled={messageState.claimedIds.includes(selectedMessage.id)} onClick={() => claimAttachment(selectedMessage)}>{messageState.claimedIds.includes(selectedMessage.id) ? "已领取" : "领取附件"}</button></section>
            : <section className="message-detail-status"><span aria-hidden="true">✓</span><div><b>通讯已归档</b><small>该消息不包含可领取附件。</small></div></section>}
        </> : <div className="message-empty-state is-detail"><span>⌑</span><b>收件箱为空</b><small>新的战线通讯将显示在这里。</small></div>}
      </article>
    </div>
  </section>;
}
