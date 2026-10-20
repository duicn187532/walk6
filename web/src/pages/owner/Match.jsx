import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession, useData, localInput, WEEK } from '../../lib.jsx';
import { api, qs } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, Avatar, Meter, Badge, Stars, AiTag, Empty } from '../../components/ui.jsx';

export default function OwnerMatch() {
  const { owner, meta } = useSession();
  const [params] = useSearchParams();
  const [pets] = useData(`/owners/${owner.id}/pets`);
  const [f, setF] = useState({ petId: '', district: owner.district, startAt: localInput(1, 16), duration: 60, mode: 'paid', gender: '', transport: '', skill: '', onlyAvailable: false, noIncidents: false });
  useEffect(() => { if (pets?.[0] && !f.petId) setF((x) => ({ ...x, petId: pets[0].id })); }, [pets]); // eslint-disable-line react-hooks/exhaustive-deps
  const [list] = useData(f.petId ? '/walkers' + qs({ ...f, excludeId: owner.id, onlyAvailable: f.onlyAvailable ? '1' : '', noIncidents: f.noIncidents ? '1' : '' }) : null);
  const [sel, setSel] = useState(Number(params.get('walker')) || null);
  const chosen = list?.find((w) => w.id === sel) || list?.[0];
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <PageHead eyebrow="AI matching & trust" title="找到最合拍的散步夥伴" sub="分數來自真實訂單評價、準時率、放鳥／取消紀錄與毛孩特性；可先聊天面談再決定。" />
      <Card className="pad" style={{ marginBottom: 18 }}>
        <SectionHead title="🔎 搜尋條件" sub={list ? `符合條件 ${list.length} 位` : ''} />
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          <label className="field"><span>為哪隻毛孩找</span><select value={f.petId} onChange={set('petId')}>{(pets || []).map((p) => <option key={p.id} value={p.id}>{p.name}（{p.breed}）</option>)}</select></label>
          <label className="field"><span>交接地區</span><select value={f.district} onChange={set('district')}>{(meta?.districts || []).map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="field"><span>預計時間</span><input type="datetime-local" value={f.startAt} onChange={set('startAt')} /></label>
          <label className="field"><span>時長</span><select value={f.duration} onChange={set('duration')}><option value="30">30 分鐘</option><option value="60">60 分鐘</option><option value="90">90 分鐘</option></select></label>
          <label className="field"><span>任務模式</span><select value={f.mode} onChange={set('mode')}><option value="paid">付費任務</option><option value="free">免費互助</option></select></label>
          <label className="field"><span>性別</span><select value={f.gender} onChange={set('gender')}><option value="">不限</option><option>女</option><option>男</option></select></label>
          <label className="field"><span>交通方式</span><select value={f.transport} onChange={set('transport')}><option value="">不限</option>{['步行', '大眾運輸', '機車', '自行車'].map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="field"><span>專長</span><select value={f.skill} onChange={set('skill')}><option value="">不限</option>{['大型犬照護', '敏感犬照護', '高齡犬照護', '定時照片回報', '餵藥協助'].map((t) => <option key={t}>{t}</option>)}</select></label>
        </div>
        <div className="checks mt">
          <label className="check"><input type="checkbox" checked={f.onlyAvailable} onChange={set('onlyAvailable')} />只看此時段可服務</label>
          <label className="check"><input type="checkbox" checked={f.noIncidents} onChange={set('noIncidents')} />排除有放鳥紀錄</label>
        </div>
      </Card>

      <div className="grid split">
        <div className="list">
          {list?.length === 0 && <Empty icon="🔍">沒有符合條件的遛狗者，試著放寬時段或專長條件。</Empty>}
          {(list || []).map((w, i) => (
            <button key={w.id} className={`item ${chosen?.id === w.id ? 'selected' : ''}`} onClick={() => setSel(w.id)}>
              <Avatar user={w} size={56} tone={i} />
              <div className="item-main">
                <div className="item-title">{w.name} {i === 0 && <span className="rank">TOP 1</span>}{!w.profile.available && <Badge tone="grey">暫停接單</Badge>}</div>
                <div className="item-sub">★ {w.stats.avgStars ?? '–'}（{w.stats.reviews} 則評價）· 完成 {w.stats.completed} 趟 · {w.profile.gender} · {w.profile.age} 歲 · {w.profile.transport?.join('/')}</div>
                <div className="chips mt-s">
                  <span className="chip">準時率 {w.stats.onTime}%</span>
                  <span className={`chip ${w.stats.noShow ? 'red' : 'green'}`}>放鳥 {w.stats.noShow} 次</span>
                  <span className={`chip ${w.stats.lateCancel > 1 ? 'gold' : ''}`}>臨時取消 {w.stats.lateCancel} 次</span>
                  {!w.match.fits && <span className="chip red">時段不符</span>}
                  {!w.match.modeOk && <span className="chip red">模式不符</span>}
                </div>
              </div>
              <div className="score"><strong>{w.match.score}%</strong><small>適配分數</small></div>
            </button>
          ))}
        </div>
        {chosen && <TrustPanel w={chosen} f={f} pet={pets?.find((p) => String(p.id) === String(f.petId))} />}
      </div>
    </>
  );
}

function TrustPanel({ w, f, pet }) {
  const [trust] = useData(`/walkers/${w.id}/trust`);
  const [reason, setReason] = useState(null);
  useEffect(() => {
    setReason(null);
    if (!pet) return;
    let alive = true;
    api.post('/ai/match-reason', { petId: pet.id, walkerId: w.id, district: f.district, startAt: f.startAt, duration: f.duration, mode: f.mode }).then((r) => alive && setReason(r));
    return () => { alive = false; };
  }, [w.id, pet?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const p = w.profile;
  return (
    <Card className="pad" style={{ position: 'sticky', top: 90 }}>
      <div className="row">
        <Avatar user={w} size={60} />
        <div className="item-main"><h3>{w.name}</h3><div className="small muted">{p.areas?.join('、')} · {p.years} 年經驗 · {p.qualification}</div></div>
        <div className="score"><strong>{w.match.score}%</strong><small>適配</small></div>
      </div>
      <div className="reason mt">
        <div className="row" style={{ marginBottom: 4 }}><b className="small">為什麼推薦</b><span className="spacer" />{reason && <AiTag ai={reason.ai} />}</div>
        {reason ? reason.text : <span className="muted">AI 正在閱讀 {pet?.name} 的檔案與履歷…</span>}
      </div>
      <div className="stack mt" style={{ gap: 10 }}>
        <Meter label="照護需求匹配" value={w.match.factors.care} />
        <Meter label="時段與模式" value={w.match.factors.time} />
        <Meter label="歷史評價可靠度" value={w.match.factors.reputation} />
        <Meter label="地區與路線" value={w.match.factors.area} />
      </div>
      <div className="divider" />
      <div className="trust-stats">
        <div><strong>{w.stats.avgStars ?? '–'} ★</strong><small>{w.stats.reviews} 則訂單評價</small></div>
        <div><strong>{w.stats.onTime}%</strong><small>準時到場率</small></div>
        <div><strong>{w.stats.completed}</strong><small>已完成趟次</small></div>
      </div>
      <p className="small mt">{w.bio}</p>
      <div className="chips">{p.skills?.map((s) => <span key={s} className="chip">{s}</span>)}</div>
      <div className="small mt-s muted">
        ✅ 已核驗：{p.verified?.join('、') || '無'}　⏳ 待審：{p.pending?.join('、') || '無'}<br />
        🗓️ 服務時間：週{p.days?.map((d) => WEEK[d]).join('、')} {p.start_time}–{p.end_time} · {p.mode === 'free' ? '僅免費互助' : p.mode === 'paid' ? '僅付費' : '付費／免費皆可'}
      </div>
      <div className="divider" />
      <b className="small">🗣️ 近期飼主評價</b>
      {(trust?.reviews || []).slice(0, 3).map((r) => (
        <div className="review" key={r.id}>
          <div className="row"><Stars value={Math.round(r.stars)} size={13} /><span className="tiny muted">{r.owner_name} · {r.pet_name} · {r.at.slice(5, 10).replace('-', '/')}</span></div>
          <p>{r.text}</p>
        </div>
      ))}
      {trust?.incidents?.length > 0 && (
        <div className="notice red mt-s"><Icon name="alert" size={15} /><span>{trust.incidents.map((i) => `${i.type === 'no_show' ? '確認放鳥' : i.type === 'late_cancel' ? '臨時取消' : '照護申訴'}（${i.at.slice(0, 7)}）`).join('、')}</span></div>
      )}
      <div className="row mt">
        <Link className="btn ghost" style={{ flex: 1 }} to={`/owner/chat/${w.id}`}><Icon name="chat" size={16} />聊天面談</Link>
        <Link className="btn primary" style={{ flex: 1 }} to={`/owner/book?walker=${w.id}&pet=${f.petId}&at=${f.startAt}&d=${f.duration}&mode=${f.mode}`}>預約 {w.name}</Link>
      </div>
    </Card>
  );
}
