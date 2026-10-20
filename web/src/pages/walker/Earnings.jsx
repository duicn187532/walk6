import { useSession, useData, fmt, when } from '../../lib.jsx';
import { Card, PageHead, SectionHead, StatusBadge, Stars, Meter } from '../../components/ui.jsx';

export default function WalkerEarnings() {
  const { walker } = useSession();
  const [earn] = useData(`/walkers/${walker.id}/earnings`, [], 8000);
  const [trust] = useData(`/walkers/${walker.id}/trust`);
  const s = trust?.stats;
  return (
    <>
      <PageHead eyebrow="Earnings & reviews" title="收益與服務評價" sub="每筆任務的收費、抽成與實收都清楚對帳。" />
      <Card className="pad" style={{ marginBottom: 18 }}>
        <SectionHead title="📊 本月對帳" sub={earn ? `已結單 ${earn.month.count} 筆` : ''} />
        <div className="earn-grid">
          <div><span>本月服務金額</span><strong>{fmt(earn?.month.gross)}</strong></div>
          <div><span>平台抽成 10%</span><strong>−{fmt(earn?.month.fee)}</strong></div>
          <div className="net"><span>本月實收</span><strong>{fmt(earn?.month.net)}</strong></div>
          <div><span>待飼主結單</span><strong>{fmt(earn?.pending)}</strong></div>
        </div>
      </Card>
      <div className="grid split">
        <Card className="pad">
          <SectionHead title="💰 最近結算紀錄" sub={`累積實收 ${fmt(earn?.total)}`} />
          <div className="list">
            {(earn?.rows || []).map((b) => (
              <div className="item" key={b.id}>
                <div className="item-main"><div className="item-title">{b.pet_name} · {b.duration} 分鐘</div><div className="item-sub">{when(b.start_at, { time: false })} · 飼主 {b.owner_name} · {b.mode === 'free' ? '免費互助' : `服務 ${fmt(b.bill?.subtotal)}，抽成 ${fmt(b.bill?.walkerFee)}`}</div></div>
                <StatusBadge status={b.status} />
                <b style={{ color: 'var(--blue-d)', minWidth: 76, textAlign: 'right' }}>{fmt(b.bill?.net)}</b>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack">
          <Card className="pad">
            <SectionHead title="🛡️ 信譽與服務紀錄" sub="由真實訂單評價自動計算" />
            {s && (<>
              <div className="trust-stats"><div><strong>{s.avgStars ?? '–'} ★</strong><small>{s.reviews} 則評價</small></div><div><strong>{s.onTime}%</strong><small>準時率</small></div><div><strong>{s.noShow}</strong><small>放鳥次數</small></div></div>
              <div className="stack mt" style={{ gap: 10 }}>
                <Meter label="安全照護" value={Math.round((s.breakdown.safety || 0) * 20)} />
                <Meter label="準時交接" value={Math.round((s.breakdown.punctual || 0) * 20)} />
                <Meter label="回報品質" value={Math.round((s.breakdown.updates || 0) * 20)} />
                <Meter label="照護細心度" value={Math.round((s.breakdown.care || 0) * 20)} />
              </div>
            </>)}
          </Card>
          <Card className="pad">
            <SectionHead title="💛 最近飼主回饋" />
            {(trust?.reviews || []).map((r) => (
              <div className="review" key={r.id}>
                <div className="row"><Stars value={Math.round(r.stars)} size={13} /><span className="tiny muted">{r.owner_name} · {r.pet_name} · {r.at.slice(0, 10)}</span></div>
                <p>{r.text || '（未留下文字評價）'}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
