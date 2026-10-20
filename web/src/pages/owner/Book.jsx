import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession, useData, fmt, localInput, when, endTime } from '../../lib.jsx';
import { api, qs } from '../../api.js';
import { Card, Icon, PageHead, SectionHead } from '../../components/ui.jsx';
import WalkMap from '../../components/WalkMap.jsx';

const len = (p) => { let s = 0; for (let i = 1; i < p.length; i++) { const [a, b] = p[i - 1], [c, d] = p[i]; s += Math.hypot((c - a) * 111000, (d - b) * 101000); } return s; };

export default function OwnerBook() {
  const { owner, meta, notify } = useSession();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [pets] = useData(`/owners/${owner.id}/pets`);
  const [allWalkers] = useData('/users?role=walker');
  const walkers = allWalkers?.filter((w) => w.id !== owner.id); // 兼任者不能指定自己
  const [b, setB] = useState({
    pet_id: Number(params.get('pet')) || '', walker_id: Number(params.get('walker')) || '', start_at: params.get('at') || localInput(1, 16),
    duration: Number(params.get('d')) || 60, mode: params.get('mode') || 'paid', extras: { photo: true, care: false }, conditions: {},
    district: owner.district || '大安區', address: `臺北市${owner.district || '大安區'}（示範交接點）`, route_id: '', photo_interval: 15, notes: '',
  });
  useEffect(() => { if (pets?.[0] && !b.pet_id) setB((x) => ({ ...x, pet_id: pets[0].id })); }, [pets]); // eslint-disable-line react-hooks/exhaustive-deps
  const [routes] = useData('/routes' + qs({ district: b.district }));
  useEffect(() => { if (routes && !routes.routes.some((r) => r.id === b.route_id)) setB((x) => ({ ...x, route_id: routes.routes[0].id })); }, [routes]); // eslint-disable-line react-hooks/exhaustive-deps

  const [quote, setQuote] = useState(null);
  const quoteKey = JSON.stringify([b.walker_id, b.pet_id, b.mode, b.duration, b.extras, b.conditions, b.start_at]);
  useEffect(() => { api.post('/quote', { walkerId: b.walker_id || null, petId: b.pet_id, mode: b.mode, duration: b.duration, extras: b.extras, conditions: b.conditions, startAt: b.start_at }).then(setQuote); }, [quoteKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Auto-tick special-care conditions the pet profile implies.
  useEffect(() => { if (quote?.suggested) setB((x) => ({ ...x, conditions: { ...x.conditions, ...Object.fromEntries(Object.entries(quote.suggested).filter(([, v]) => v)) } })); }, [b.pet_id, quote?.suggested?.large, quote?.suggested?.reactive, quote?.suggested?.senior]); // eslint-disable-line react-hooks/exhaustive-deps

  const pet = pets?.find((p) => p.id === Number(b.pet_id));
  const set = (k, v) => setB({ ...b, [k]: v });
  const route = routes?.routes.find((r) => r.id === b.route_id);
  const rates = quote?.profile?.rates || {};
  const free = b.mode === 'free';
  const ok = useMemo(() => (quote ? quote.fits && quote.modeOk : true), [quote]);

  const submit = async () => {
    if (!b.pet_id) return notify('請先建立毛孩檔案。');
    const created = await api.post('/bookings', { ...b, owner_id: owner.id, walker_id: b.walker_id || null });
    notify(created.walker ? `已送出預約給 ${created.walker.name}，等待對方確認。` : '已發布公開任務，附近的遛狗者都能看到。');
    nav(`/owner/live/${created.id}`);
  };

  return (
    <>
      <PageHead eyebrow="Booking & route planner" title="預約一場安心散步" sub="指定遛狗者或發布公開任務；收費由平台即時試算，雙方看到同一份明細。" />
      <div className="grid split">
        <div className="stack">
          <Card className="pad">
            <SectionHead title="🗓️ 預約資訊" />
            <div className="form-grid">
              <label className="field"><span>毛孩</span><select value={b.pet_id} onChange={(e) => setB({ ...b, pet_id: Number(e.target.value), conditions: {} })}>{(pets || []).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.breed}</option>)}</select></label>
              <label className="field"><span>遛狗者</span><select value={b.walker_id} onChange={(e) => set('walker_id', Number(e.target.value) || '')}><option value="">📢 發布公開任務（不指定）</option>{(walkers || []).map((w) => <option key={w.id} value={w.id}>{w.avatar} {w.name}</option>)}</select></label>
              <label className="field"><span>交接時間</span><input type="datetime-local" value={b.start_at} onChange={(e) => set('start_at', e.target.value)} /></label>
              <label className="field"><span>照片回報頻率</span><select value={b.photo_interval} onChange={(e) => set('photo_interval', Number(e.target.value))}><option value={10}>每 10 分鐘</option><option value={15}>每 15 分鐘</option><option value={30}>每 30 分鐘</option><option value={0}>依需求</option></select></label>
              <div className="field span2"><span>散步時長</span>
                <div className="seg">{[30, 60, 90].map((d) => <button key={d} type="button" className={b.duration === d ? 'on' : ''} onClick={() => set('duration', d)}>{d} 分鐘<small>{free ? '免費互助' : fmt(quote?.profile?.base_rates?.[d] ?? { 30: 300, 60: 520, 90: 700 }[d])}</small></button>)}</div>
              </div>
              <div className="field span2"><span>任務模式</span>
                <div className="seg">
                  <button type="button" className={!free ? 'on' : ''} onClick={() => set('mode', 'paid')}>💛 付費任務<small>平台抽成透明公開</small></button>
                  <button type="button" className={free ? 'on' : ''} onClick={() => set('mode', 'free')}>🤝 免費互助<small>社區鄰里互相幫忙</small></button>
                </div>
              </div>
            </div>
            {b.walker_id && quote && (
              <div className={`notice ${ok ? 'green' : 'red'} mt`}>
                <Icon name={ok ? 'check' : 'alert'} size={15} />
                <span>{when(b.start_at)}－{endTime(b.start_at, b.duration)}：{!quote.modeOk ? '此遛狗者不接受目前的任務模式。' : quote.fits ? '所選遛狗者此時段可以服務。' : '所選遛狗者此時段不在可服務時間，仍可送出但可能被婉拒。'}</span>
              </div>
            )}
          </Card>

          <Card className="pad">
            <SectionHead title="🐾 加購與特殊照護" sub={pet ? `已依 ${pet.name} 的檔案自動勾選建議項目` : ''} />
            <div className="stack" style={{ gap: 8 }}>
              {Object.entries(meta?.extras || {}).map(([k, e]) => (
                <label key={k} className="option"><input type="checkbox" disabled={free} checked={!!b.extras[k]} onChange={(ev) => set('extras', { ...b.extras, [k]: ev.target.checked })} /><div><b>{e.name}</b></div><span className="amt">{free ? '—' : `+${fmt(e.price)}`}</span></label>
              ))}
              {(meta?.conditions || []).map((c) => (
                <label key={c.id} className="option"><input type="checkbox" disabled={free} checked={!!b.conditions[c.id]} onChange={(ev) => set('conditions', { ...b.conditions, [c.id]: ev.target.checked })} />
                  <div><b>{c.name} {quote?.suggested?.[c.id] && <span className="chip gold">建議</span>}</b><small>{c.help}</small></div>
                  <span className="amt">{free ? '—' : b.walker_id ? `+${fmt(rates[c.id] || 0)}` : '依接單者'}</span></label>
              ))}
            </div>
            <label className="field mt"><span>給遛狗者的備註</span><textarea value={b.notes} onChange={(e) => set('notes', e.target.value)} placeholder="例如：天熱請多補水、避開其他大型犬…" /></label>
          </Card>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 90 }}>
          <Card className="pad">
            <SectionHead title="🌳 交接點與散步路線" />
            <div className="form-grid">
              <label className="field"><span>地區</span><select value={b.district} onChange={(e) => setB({ ...b, district: e.target.value, address: `臺北市${e.target.value}（示範交接點）` })}>{(meta?.districts || []).map((d) => <option key={d}>{d}</option>)}</select></label>
              <label className="field"><span>交接地址</span><input value={b.address} onChange={(e) => set('address', e.target.value)} /></label>
            </div>
            <div className="mt"><WalkMap routes={routes?.routes} selectedId={b.route_id} onSelect={(id) => set('route_id', id)} height={240} /></div>
            <div className="route-list mt">
              {(routes?.routes || []).map((r) => (
                <button key={r.id} type="button" className={`route-opt ${r.id === b.route_id ? 'on' : ''}`} onClick={() => set('route_id', r.id)}>
                  <div className="ico">{r.icon}</div><div><b>{r.name}</b><small>{r.note}</small></div><span className="dist">{(len(r.path) / 1000).toFixed(1)} km</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="pad">
            <SectionHead title="💳 費用明細" sub={free ? '免費互助任務不收取任何費用' : '平台不會在此階段扣款'} />
            <div className="price-box">
              {(quote?.bill.lines || []).map((l) => <div className="price-line" key={l.label}><span>{l.label}</span><span>{fmt(l.amount)}</span></div>)}
              {!free && <div className="price-line"><span>飼主服務費 5%</span><span>{fmt(quote?.bill.ownerFee)}</span></div>}
              <div className="price-total"><span className="strong">應付總額</span><b>{fmt(quote?.bill.total)}</b></div>
              {!free && b.walker_id && <div className="tiny muted mt-s">遛狗者實收 {fmt(quote?.bill.net)}（平台抽成 10%：{fmt(quote?.bill.walkerFee)}）</div>}
              {!b.walker_id && !free && <div className="tiny muted mt-s">公開任務以平台預設費率試算，接單後依遛狗者的條件加給重新計算。</div>}
            </div>
            <button className="btn primary wide mt" onClick={submit} disabled={!pet || !route}>
              {b.walker_id ? '送出預約邀請' : '發布公開任務'} <Icon name="arrow" size={16} />
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}
