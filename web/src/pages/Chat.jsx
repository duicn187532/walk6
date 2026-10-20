import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession, useData, utcClock } from '../lib.jsx';
import { api, qs } from '../api.js';
import { Card, Icon, PageHead, Avatar, AiTag, Empty } from '../components/ui.jsx';

export default function Chat({ role }) {
  const s = useSession();
  const me = role === 'owner' ? s.owner : s.walker;
  const { otherId } = useParams();
  const nav = useNavigate();
  const [threads, reloadThreads] = useData('/threads' + qs({ userId: me.id, role }), [], 5000);
  const activeId = Number(otherId) || threads?.[0]?.other_id;
  const other = s.users.find((u) => u.id === activeId);
  const pair = role === 'owner' ? { ownerId: me.id, walkerId: activeId } : { ownerId: activeId, walkerId: me.id };
  const [msgs, reload] = useData(activeId ? '/messages' + qs(pair) : null, [], 3000);
  const [text, setText] = useState('');
  const [tips, setTips] = useState(null);
  const [pets] = useData(role === 'owner' ? `/owners/${me.id}/pets` : null);
  const stream = useRef();
  useEffect(() => { stream.current?.scrollTo(0, stream.current.scrollHeight); }, [msgs?.length]);
  useEffect(() => {
    if (role !== 'owner' || !pets?.[0]) return;
    api.post('/ai/interview', { petId: pets[0].id }).then(setTips);
  }, [pets?.[0]?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !activeId) return;
    await api.post('/messages', { owner_id: pair.ownerId, walker_id: pair.walkerId, sender_id: me.id, text: text.trim() });
    setText(''); reload(); reloadThreads();
  };
  const list = [...(threads || [])];
  if (other && !list.some((t) => t.other_id === other.id)) list.unshift({ other_id: other.id, name: other.name, avatar: other.avatar, last_text: '開始新的對話' });

  return (
    <>
      <PageHead eyebrow="Interview & messages" title={role === 'owner' ? '面談訊息' : '飼主訊息'} sub={role === 'owner' ? '預約前先聊聊照護細節；切換到遛狗者身分即可看到對方視角並回覆。' : '回覆飼主的提問，建立信任再接單。'} />
      <Card className="chat">
        <div className="threads">
          {list.length === 0 && <div className="small muted" style={{ padding: 10 }}>尚無對話</div>}
          {list.map((t, i) => (
            <button key={t.other_id} className={`thread ${t.other_id === activeId ? 'on' : ''}`} onClick={() => nav(`/${role}/chat/${t.other_id}`)}>
              <Avatar user={t} size={38} tone={i} /><div><b className="small">{t.name}</b><small>{t.last_text}</small></div>
            </button>
          ))}
        </div>
        <div className="chat-main">
          {!other ? <div style={{ padding: 30 }}><Empty icon="💬">從「AI 信任媒合」選擇遛狗者後即可開始面談。</Empty></div> : (
            <>
              <div className="row" style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
                <Avatar user={other} size={36} /><b>{other.name}</b><span className="tiny muted">{other.district}</span>
              </div>
              <div className="chat-stream" ref={stream}>
                {(msgs || []).map((m) => (
                  <div key={m.id} className={`bubble ${m.sender_id === me.id ? 'mine' : ''}`}>{m.text}<time>{utcClock(m.at)}</time></div>
                ))}
                {msgs?.length === 0 && <div className="small muted" style={{ textAlign: 'center' }}>打個招呼吧！</div>}
              </div>
              {tips && (
                <div className="suggest">
                  <AiTag ai={tips.ai} />
                  {tips.questions.map((q) => <button key={q} type="button" onClick={() => setText(q)}>{q}</button>)}
                </div>
              )}
              <form className="chat-input" onSubmit={send}>
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="輸入訊息…" />
                <button className="btn primary"><Icon name="arrow" size={16} />送出</button>
              </form>
            </>
          )}
        </div>
      </Card>
    </>
  );
}
