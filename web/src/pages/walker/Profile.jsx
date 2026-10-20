import { useEffect, useState } from 'react';
import { useSession, useData, fmt, WEEK } from '../../lib.jsx';
import { api } from '../../api.js';
import { Card, PageHead, SectionHead, Avatar, Badge } from '../../components/ui.jsx';

const SKILLS = ['大型犬照護', '敏感犬照護', '高齡犬照護', '定時照片回報', '餵藥協助', '安靜路線規劃', '行為矯正基礎'];
const TRANSPORT = ['步行', '大眾運輸', '機車', '自行車'];

export default function WalkerProfile() {
  const { walker, meta, notify, refresh } = useSession();
  const [me, reload] = useData(`/users/${walker.id}`);
  const [trust] = useData(`/walkers/${walker.id}/trust`);
  const [f, setF] = useState(null);
  useEffect(() => { if (me) setF(structuredClone(me)); }, [me]);
  if (!f) return <div className="loading">載入中…</div>;
  const p = f.profile;
  const setU = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setP = (k, v) => setF({ ...f, profile: { ...p, [k]: v } });
  const toggleIn = (k, v) => setP(k, p[k]?.includes(v) ? p[k].filter((x) => x !== v) : [...(p[k] || []), v]);
  const save = async (e) => { e.preventDefault(); await api.put(`/users/${walker.id}`, f); reload(); refresh(); notify('履歷已更新，飼主端的媒合與報價會立即使用新設定。'); };
  const filled = [f.name, f.bio, f.experience, p.qualification, p.skills?.length, p.areas?.length, p.days?.length, f.phone, f.email, p.years].filter(Boolean).length * 10;
  const sample = p.mode === 'free' ? 0 : (p.base_rates?.[60] || 520) + (p.rates?.large || 0);

  return (
    <>
      <PageHead eyebrow="Walker onboarding & credibility" title="成為值得信賴的遛狗夥伴" sub="專業履歷 × 可驗證紀錄 × 真實服務表現。這些資訊會直接影響 AI 媒合分數。" />
      <div className="grid split">
        <form className="stack" onSubmit={save}>
          <Card className="pad">
            <SectionHead title="01 · 基本資料與介紹" />
            <div className="form-grid">
              <label className="field"><span>姓名</span><input value={f.name} onChange={setU('name')} /></label>
              <label className="field"><span>主要地區</span><input value={f.district || ''} onChange={setU('district')} /></label>
              <label className="field"><span>Email</span><input value={f.email || ''} onChange={setU('email')} /></label>
              <label className="field"><span>電話</span><input value={f.phone || ''} onChange={setU('phone')} /></label>
              <label className="field"><span>性別</span><select value={p.gender} onChange={(e) => setP('gender', e.target.value)}><option>女</option><option>男</option><option>其他</option></select></label>
              <label className="field"><span>年齡</span><input type="number" value={p.age || ''} onChange={(e) => setP('age', Number(e.target.value))} /></label>
              <label className="field"><span>照護經驗（年）</span><input type="number" value={p.years ?? ''} onChange={(e) => setP('years', Number(e.target.value))} /></label>
              <label className="field"><span>資格摘要</span><input value={p.qualification || ''} onChange={(e) => setP('qualification', e.target.value)} /></label>
              <label className="field span2"><span>自我介紹</span><textarea value={f.bio || ''} onChange={setU('bio')} /></label>
              <label className="field span2"><span>相關經歷</span><textarea value={f.experience || ''} onChange={setU('experience')} /></label>
            </div>
            <div className="field mt"><span>專長</span><div className="checks">{SKILLS.map((s) => <label key={s} className="check"><input type="checkbox" checked={p.skills?.includes(s)} onChange={() => toggleIn('skills', s)} />{s}</label>)}</div></div>
          </Card>
          <Card className="pad">
            <SectionHead title="02 · 服務時間與地區" sub="不在可服務時段的預約會在飼主端顯示警示" />
            <div className="field"><span>每週可服務日</span><div className="checks">{WEEK.map((d, i) => <label key={d} className="check"><input type="checkbox" checked={p.days?.includes(i)} onChange={() => setP('days', p.days?.includes(i) ? p.days.filter((x) => x !== i) : [...p.days, i].sort())} />週{d}</label>)}</div></div>
            <div className="form-grid mt">
              <label className="field"><span>開始時間</span><input type="time" value={p.start_time} onChange={(e) => setP('start_time', e.target.value)} /></label>
              <label className="field"><span>結束時間</span><input type="time" value={p.end_time} onChange={(e) => setP('end_time', e.target.value)} /></label>
            </div>
            <div className="field mt"><span>服務地區</span><div className="checks">{[...(meta?.districts || []), '中正區', '大同區'].map((d) => <label key={d} className="check"><input type="checkbox" checked={p.areas?.includes(d)} onChange={() => toggleIn('areas', d)} />{d}</label>)}</div></div>
            <div className="field mt"><span>交通方式</span><div className="checks">{TRANSPORT.map((t) => <label key={t} className="check"><input type="checkbox" checked={p.transport?.includes(t)} onChange={() => toggleIn('transport', t)} />{t}</label>)}</div></div>
          </Card>
          <Card className="pad">
            <SectionHead title="03 · 收費與條件加給" sub="平台抽成 10%，飼主另付 5% 服務費" />
            <div className="field"><span>接受的任務模式</span>
              <div className="seg">{[['both', '付費＋免費'], ['paid', '只接付費'], ['free', '只接免費互助']].map(([v, l]) => <button type="button" key={v} className={p.mode === v ? 'on' : ''} onClick={() => setP('mode', v)}>{l}</button>)}</div>
            </div>
            <div className="form-grid mt">
              {[30, 60, 90].map((d) => <label key={d} className="field"><span>{d} 分鐘基本費</span><input type="number" step="10" value={p.base_rates?.[d] ?? ''} onChange={(e) => setP('base_rates', { ...p.base_rates, [d]: Number(e.target.value) })} /></label>)}
              {(meta?.conditions || []).map((c) => <label key={c.id} className="field"><span>{c.name}</span><input type="number" step="10" value={p.rates?.[c.id] ?? 0} onChange={(e) => setP('rates', { ...p.rates, [c.id]: Number(e.target.value) })} /></label>)}
            </div>
          </Card>
          <div><button className="btn primary">儲存履歷</button></div>
        </form>

        <div className="stack" style={{ position: 'sticky', top: 90 }}>
          <Card className="pad">
            <SectionHead title="飼主看到的公開履歷" />
            <div className="row"><Avatar user={f} size={60} /><div className="item-main"><h3>{f.name}</h3><div className="small muted">{p.areas?.join('、')} · {p.years} 年經驗</div></div></div>
            <p className="small">{f.bio}</p>
            <div className="chips">{p.skills?.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            <div className="trust-stats mt">
              <div><strong>{me.stats.avgStars ?? '–'} ★</strong><small>{me.stats.reviews} 則評價</small></div>
              <div><strong>{me.stats.onTime}%</strong><small>準時率</small></div>
              <div><strong>{me.stats.completed}</strong><small>完成趟次</small></div>
            </div>
            <div className="mt-s small muted">履歷完整度 {filled}%</div>
            <div className="progress mt-s"><i style={{ width: `${filled}%` }} /></div>
          </Card>
          <Card className="pad">
            <SectionHead title="📌 認證與紀錄" sub="認證須由平台正式驗證流程完成（MVP 為模擬）" />
            <div className="chips">{p.verified?.map((v) => <Badge key={v} tone="green">✓ {v}</Badge>)}{p.pending?.map((v) => <Badge key={v} tone="gold">⏳ {v}</Badge>)}</div>
            <div className="divider" />
            {(trust?.incidents || []).length === 0 ? <div className="small muted">沒有任何已確認的不良紀錄 🎉</div> :
              trust.incidents.map((i) => <div key={i.id} className="review"><Badge tone={i.status === 'confirmed' ? 'red' : 'gold'}>{i.status === 'confirmed' ? '已確認' : '審核中'}</Badge> <b className="small">{i.type === 'no_show' ? '未依約到場' : i.type === 'late_cancel' ? '臨時取消' : '照護申訴'}</b><p>{i.description}</p></div>)}
          </Card>
          <Card className="pad">
            <SectionHead title="🧾 收費試算範例" sub="60 分鐘 + 大型犬加給" />
            <div className="price-box">
              <div className="price-line"><span>飼主支付</span><span>{fmt(Math.round(sample * 1.05))}</span></div>
              <div className="price-line"><span>平台抽成 10%</span><span>−{fmt(Math.round(sample * 0.1))}</span></div>
              <div className="price-total"><span className="strong">你的實收</span><b>{fmt(sample - Math.round(sample * 0.1))}</b></div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
