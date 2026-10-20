import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSession, useData, fmt, when, petEmoji } from '../../lib.jsx';
import { api } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, StatusBadge, Stars, AiTag, Empty } from '../../components/ui.jsx';
import WalkMap from '../../components/WalkMap.jsx';
import { Timeline } from './Live.jsx';

const FACTORS = [['safety', '安全照護'], ['punctual', '準時交接'], ['updates', '回報品質'], ['care', '照護細心度']];

export default function OwnerReport() {
  const { owner, notify } = useSession();
  const { id } = useParams();
  const nav = useNavigate();
  const [bookings] = useData(`/bookings?ownerId=${owner.id}`);
  const finished = (bookings || []).filter((b) => ['completed', 'settled'].includes(b.status)).sort((a, b) => (a.status === 'completed' ? -1 : b.status === 'completed' ? 1 : b.start_at.localeCompare(a.start_at)));
  const bid = id || finished[0]?.id;
  const [b, reload] = useData(bid ? `/bookings/${bid}` : null);
  const [live] = useData(bid ? `/bookings/${bid}/live` : null);
  const [report, setReport] = useState(null);
  const [rv, setRv] = useState({ stars: 5, safety: 5, punctual: 5, updates: 5, care: 5, text: '' });
  const [inc, setInc] = useState({ type: 'care_issue', description: '' });

  useEffect(() => {
    if (!b) return;
    setReport(b.ai_report ? { text: b.ai_report, ai: null } : null);
    if (!b.ai_report && b.status === 'completed') api.post(`/bookings/${b.id}/report`).then(setReport);
    if (b.review) setRv(b.review);
  }, [b?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (bookings && !bid) return (<><PageHead eyebrow="Care report" title="散步照護報告" /><Empty icon="📖">還沒有完成的散步紀錄。</Empty></>);
  if (!b) return <div className="loading">載入中…</div>;
  const settled = b.status === 'settled';
  const bill = b.bill || {};
  const regen = async () => { setReport(null); setReport(await api.post(`/bookings/${b.id}/report`)); };
  const settle = async () => {
    if (rv.stars <= 2 && !rv.text.trim()) return notify('評分 1–2 星時，請補充具體說明。');
    await api.post(`/bookings/${b.id}/review`, rv);
    notify(`已完成 ${rv.stars} 星評價與模擬付款結單（不會真的扣款）。`);
    reload();
  };
  const fileIncident = async () => {
    if (inc.description.trim().length < 10) return notify('請至少輸入 10 個字描述事件。');
    await api.post('/incidents', { ...inc, walker_id: b.walker_id, booking_id: b.id, reporter_id: owner.id });
    setInc({ ...inc, description: '' });
    notify('已建立事件回報，將由平台人工審核，不會直接扣分。');
  };
  const minutes = b.started_at && b.ended_at ? Math.max(1, Math.round((new Date(b.ended_at + 'Z') - new Date(b.started_at + 'Z')) / 60000)) : b.duration;

  return (
    <>
      <PageHead eyebrow="Care report & settlement" title="散步照護報告" sub="由散步紀錄自動整理成報告，完成評價後結單。">
        {finished.length > 1 && (
          <select className="input" style={{ width: 'auto' }} value={b.id} onChange={(e) => nav(`/owner/report/${e.target.value}`)}>
            {finished.slice(0, 12).map((x) => <option key={x.id} value={x.id}>{x.pet_name} · {when(x.start_at, { time: false })} · {x.status === 'completed' ? '待評價' : '已結單'}</option>)}
          </select>
        )}
      </PageHead>
      <div className="grid split">
        <div className="stack">
          <Card className="pad" style={{ background: 'linear-gradient(110deg,#ebf4f6,#fbf7ea)' }}>
            <div className="row">
              <div className="item-main"><div className="eyebrow">{when(b.start_at)} · {b.walker?.name}</div><h2 style={{ fontSize: 23, margin: '4px 0' }}>{b.pet.name} 今天散步得很開心！</h2><div className="small muted">{b.route.name} · {b.address}</div></div>
              <div style={{ fontSize: 58 }}>{petEmoji(b.pet)}</div>
            </div>
            <div className="kv mt">
              <div>散步時間<b>{minutes} 分鐘</b></div>
              <div>距離<b>{((live?.distance || 0) / 1000).toFixed(2)} km</b></div>
              <div>現況回報<b>{(live?.updates || []).filter((u) => u.kind !== 'system').length} 則</b></div>
            </div>
          </Card>
          <Card className="pad">
            <SectionHead title="📖 照護報告" action={<div className="row">{report && report.ai !== null && <AiTag ai={report.ai} />}<button className="btn ghost sm" onClick={regen}><Icon name="refresh" size={14} />重新生成</button></div>} />
            {report ? <div className="report-text">{report.text}</div> : <div className="reason">🤖 AI 正在根據 GPS 軌跡與回報紀錄撰寫報告…</div>}
          </Card>
          <Card className="pad">
            <SectionHead title="🗺️ 軌跡與紀錄" />
            <WalkMap routes={[b.route]} selectedId={b.route.id} trail={live?.gps?.map((p) => [p.lat, p.lng])} height={230} />
            <div className="mt"><Timeline updates={live?.updates} /></div>
          </Card>
        </div>

        <div className="stack">
          <Card className="pad">
            <SectionHead title="⭐ 給遛狗者的評價" action={<StatusBadge status={b.status} />} />
            <div className="row"><Stars value={rv.stars} onChange={settled ? null : (n) => setRv({ ...rv, stars: n })} size={30} /><b>{rv.stars} / 5</b></div>
            <div className="form-grid mt">
              {FACTORS.map(([k, label]) => (
                <label className="field" key={k}><span>{label}</span>
                  <select disabled={settled} value={rv[k]} onChange={(e) => setRv({ ...rv, [k]: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} 分</option>)}</select></label>
              ))}
              <label className="field span2"><span>文字評價（會公開在遛狗者履歷）</span><textarea disabled={settled} value={rv.text || ''} onChange={(e) => setRv({ ...rv, text: e.target.value })} placeholder="分享這次的照護經驗…" /></label>
            </div>
          </Card>
          <Card className="pad">
            <SectionHead title="💳 費用明細與結單" />
            <div className="price-box">
              {(bill.lines || []).map((l) => <div className="price-line" key={l.label}><span>{l.label}</span><span>{fmt(l.amount)}</span></div>)}
              {bill.mode !== 'free' && <div className="price-line"><span>飼主服務費 5%</span><span>{fmt(bill.ownerFee)}</span></div>}
              <div className="price-total"><span className="strong">{settled ? '已支付' : '應付總額'}</span><b>{fmt(bill.total)}</b></div>
            </div>
            {settled ? <div className="notice green mt"><Icon name="check" size={15} /><span>已完成評價與模擬付款結單。感謝你的回饋！</span></div>
              : <button className="btn primary wide mt" onClick={settle}>確認評價並模擬付款結單</button>}
            <Link className="btn ghost wide mt-s" to={`/owner/book?walker=${b.walker_id}&pet=${b.pet_id}`}>再次預約 {b.walker?.name}</Link>
          </Card>
          <Card className="pad">
            <SectionHead title="🚩 事件與申訴回報" sub="由平台人工審核，確認後才會列入信任履歷" />
            <label className="field"><span>事件類型</span><select value={inc.type} onChange={(e) => setInc({ ...inc, type: e.target.value })}><option value="care_issue">照護問題</option><option value="late_cancel">臨時取消</option><option value="no_show">未依約到場</option><option value="other">其他</option></select></label>
            <label className="field mt-s"><span>具體描述</span><textarea value={inc.description} onChange={(e) => setInc({ ...inc, description: e.target.value })} placeholder="請描述時間、地點與發生經過…" /></label>
            <button className="btn danger sm mt-s" onClick={fileIncident}>送出回報</button>
          </Card>
        </div>
      </div>
    </>
  );
}
