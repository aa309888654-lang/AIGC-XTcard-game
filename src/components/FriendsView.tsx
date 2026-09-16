import { useEffect, useMemo, useState } from "react";
import {
  EMOTE_DEFS, acceptPendingInvite, addFriend, addPendingInvite, decodeShareCode,
  loadFriends, loadPendingInvites, loadReplays, removeFriend, replayShareCode, saveReplay,
  type FriendEntry, type ReplayRecord,
} from "../community/Friends";
import { useGameAudio } from "../audio/AudioProvider";

interface Props {
  commander: { name: string; faction: string } | null;
  onReplay: (replay: ReplayRecord) => void;
}

type Tab = "friends" | "emotes" | "replays";

export default function FriendsView({ commander, onReplay }: Props) {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendEntry[]>(loadFriends);
  const [pending, setPending] = useState(loadPendingInvites);
  const [replays, setReplays] = useState<ReplayRecord[]>(loadReplays);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [faction, setFaction] = useState("天衡");
  const [notice, setNotice] = useState("");
  const [shareInput, setShareInput] = useState("");
  const [shareResult, setShareResult] = useState("");
  const { playSfx } = useGameAudio();

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(""), 2200); };

  const submitFriend = () => {
    const trimmed = name.trim();
    const codeTrim = code.trim();
    if (trimmed.length < 2 || codeTrim.length < 4) { flash("昵称至少 2 字，邀请码至少 4 位。"); return; }
    setFriends(addFriend(trimmed, codeTrim, faction));
    setPending(addPendingInvite(trimmed, codeTrim, faction));
    setName(""); setCode("");
    flash(`已添加「${trimmed}」，并发出邀请。`);
    playSfx("cardSelect");
  };

  const accept = (entry: { name: string; code: string; faction: string }) => {
    setFriends(acceptPendingInvite(entry.code));
    setPending(loadPendingInvites());
    flash(`已接受「${entry.name}」的好友请求。`);
    playSfx("reward");
  };

  const share = (replay: ReplayRecord) => {
    const codeStr = replayShareCode(replay);
    setShareResult(codeStr);
    flash("分享码已生成。");
    playSfx("cardSelect");
  };

  const importShare = () => {
    const decoded = decodeShareCode(shareInput.trim());
    if (!decoded) { flash("分享码无效。"); playSfx("uiError"); return; }
    setReplays((current) => {
      const next = [decoded, ...current].slice(0, 50);
      try { localStorage.setItem("astra-frontline-replays-v1", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setShareInput("");
    flash("回放已导入，可在回放列表查看。");
    playSfx("reward");
  };

  const tabContent = useMemo(() => {
    if (tab === "emotes") {
      return <div className="friends-emotes"><p className="panel-kicker">BATTLE EMOTES</p><h2>战斗表情</h2><p>对局中点击表情条即可发送，表情会即时显示在你的战场界面上；好友互发与对手可见需等待联机对战上线。</p>
        <div className="emote-grid">{EMOTE_DEFS.map((emote) => <button key={emote.id} className="emote-card" onClick={() => { playSfx("cardSelect"); flash(`发送「${emote.label}」`); }}><span>{emote.icon}</span><b>{emote.label}</b></button>)}</div>
      </div>;
    }
    if (tab === "replays") {
      return <div className="friends-replays"><p className="panel-kicker">REPLAY ARCHIVE</p><h2>对局回放</h2><p>最近 50 场对局记录，可生成分享码与他人共赏。</p>
        <div className="replay-import"><input value={shareInput} onChange={(e) => setShareInput(e.target.value)} placeholder="粘贴分享码导入回放" /><button className="btn btn-secondary" onClick={importShare}>导入</button></div>
        {shareResult ? <div className="replay-share-code"><small>最新分享码</small><code>{shareResult}</code><button className="btn btn-secondary" onClick={() => { void navigator.clipboard?.writeText(shareResult); flash("已复制到剪贴板。"); }}>复制</button></div> : null}
        <div className="replay-list">{replays.length === 0 ? <p className="replay-empty">暂无回放——完成一场对局后自动记录。</p> : replays.map((replay) => <article className="replay-row" key={replay.id}>
          <div><b>{replay.label}</b><small>{replay.mode} · {replay.turnCount} 回合 · {replay.winner === "player" ? "胜" : "负"} · {new Date(replay.createdAt).toLocaleString()}</small></div>
          <div className="replay-actions"><button className="btn btn-secondary" onClick={() => onReplay(replay)}>观看</button><button className="btn btn-secondary" onClick={() => share(replay)}>分享</button></div>
        </article>)}</div>
      </div>;
    }
    return <div className="friends-list-panel"><p className="panel-kicker">FRIENDS</p><h2>好友名录</h2><p>添加好友后可查看状态与邀请记录（服务器联机开放后支持互邀对局）。</p>
      <div className="friend-add-form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="好友昵称" maxLength={12} />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="邀请码" maxLength={16} />
        <select value={faction} onChange={(e) => setFaction(e.target.value)}>{
          ["天衡", "幽冥", "天机", "铁律", "山海"].map((f) => <option key={f} value={f}>{f}</option>)
        }</select>
        <button className="btn btn-primary" onClick={submitFriend}>添加</button>
      </div>
      <div className="friend-columns">
        <div className="friend-col"><h3>好友（{friends.length}）</h3>{friends.length === 0 ? <p className="friend-empty">暂无好友。</p> : friends.map((friend) => <article className="friend-row" key={friend.id}>
          <span className={`friend-status is-${friend.status}`} aria-hidden="true" />
          <div><b>{friend.name}</b><small>{friend.faction} · {friend.code}</small></div>
          <button className="btn btn-secondary" onClick={() => { setFriends(removeFriend(friend.code)); flash(`已移除「${friend.name}」。`); }}>移除</button>
        </article>)}</div>
        <div className="friend-col"><h3>邀请（{pending.length}）</h3>{pending.length === 0 ? <p className="friend-empty">暂无待处理邀请。</p> : pending.map((entry) => <article className="friend-row" key={entry.id}>
          <span className="friend-status is-pending" aria-hidden="true" />
          <div><b>{entry.name}</b><small>{entry.faction} · {entry.code}</small></div>
          <button className="btn btn-primary" onClick={() => accept(entry)}>接受</button>
        </article>)}</div>
      </div>
    </div>;
  }, [tab, friends, pending, replays, name, code, faction, shareInput, shareResult]);

  return <section className="command-view friends-view">
    <header className="command-heading"><div><p className="eyebrow">SOCIAL HUB</p><h1>往来客栈</h1><span>{commander ? `${commander.name} · ${commander.faction}` : ""} ——好友、表情与回放都在这。</span></div></header>
    {notice ? <div className="message-center-notice" role="status">{notice}</div> : null}
    <div className="friends-tabs" role="tablist" aria-label="社交功能">
      {([["friends", "好友"], ["emotes", "表情"], ["replays", "回放"]] as Array<[Tab, string]>).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}<small>{id === "friends" ? friends.length : id === "replays" ? replays.length : EMOTE_DEFS.length}</small></button>)}
    </div>
    {tabContent}
  </section>;
}
