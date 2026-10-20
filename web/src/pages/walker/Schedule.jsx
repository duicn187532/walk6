import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession, useData, when, endTime, WEEK } from '../../lib.jsx';
import { api } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, StatusBadge, PetAvatar, Empty } from '../../components/ui.jsx';
import WalkMap from '../../components/WalkMap.jsx';

export default function WalkerSchedule() {
  const { walker, notify } = useSession();
  const nav = useNavigate();
  const [bookings] = useData(`/bookings?walkerId=${walker.id}`, [], 6000);
  const list = (bookings || []).filter((b) => ['accepted', 'in_progress'].includes(b.status)).sort((a, b) => a.start_at.localeCompare(b.start_at));
  const [sel, setSel] = useState(null);
  const id = sel || list[0]?.id;
  const [b] = useData(id ? `/bookings/${id}` : null);

  const start = async () => { await api.post(`/bookings/${b.id}/start`); notify(`已開始和 ${b.pet.name} 散步，GPS 模擬追蹤啟動！`); nav(`/walker/walk/${b.id}`); };

  return (
    <>
      <PageHead eyebrow="Tasks & handoff" title="行程與交接管理" sub="清楚檢視已接受任務、交接時間地點與飼主注意事項。" />
      {bookings && list.length === 0 ? <Empty icon="📆">還沒有已確認的行程，到「媒合接單」看看吧！<br /><Link className="btn primary sm mt" to="/walker/jobs">去接單</Link></Empty> : (
        <div className="grid split-r">
          <Card className="pad">
            <SectionHead title="📆 即將到來的行程" sub={`${list.length} 筆`} />
            <div className="list">
              {list.map((x) => {
                const d = new Date(x.start_at);
                return (
                  <button key={x.id} className={`item ${x.id === id ? 'selected' : ''}`} onClick={() => setSel(x.id)}>
                    <div className="stat-icon" style={{ width: 56, height: 56, flexDirection: 'column', lineHeight: 1.1 }}><b style={{ fontSize: 20 }}>{d.getDate()}</b><span className="tiny">週{WEEK[d.getDay()]}</span></div>
                    <div className="item-main"><div className="item-title">{x.pet_name}｜{x.duration} 分鐘</div><div className="item-sub">{when(x.start_at)} · {x.district} · 飼主 {x.owner_name}</div></div>
                    <StatusBadge status={x.status} />
                  </button>
                );
              })}
            </div>
          </Card>
          {b && (
            <Card className="pad">
              <SectionHead title={`📍 ${b.pet.name} 交接資訊`} action={<StatusBadge status={b.status} />} />
              <div className="pill-box"><PetAvatar pet={b.pet} /><div className="item-main"><b>{b.pet.name}</b><div className="tiny muted">{b.pet.breed} · {b.pet.weight}kg · {b.pet.energy} · {b.pet.social}</div></div></div>
              <div className="info"><Icon name="clock" size={16} /><b>{when(b.start_at)}－{endTime(b.start_at, b.duration)}</b></div>
              <div className="info"><Icon name="pin" size={16} />{b.address}</div>
              <div className="info"><Icon name="users" size={16} />飼主 <b>{b.owner.name}</b> · {b.owner.phone}</div>
              <WalkMap routes={[b.route]} selectedId={b.route.id} height={220} />
              <div className="small muted mt-s">建議路線：{b.route.icon} {b.route.name} — {b.route.note}</div>
              <div className="notice mt"><Icon name="info" size={15} /><span><b>醫療與禁忌：</b>{b.pet.medical || '無'}<br /><b>飼主備註：</b>{b.notes || '無'}<br /><b>牽繩：</b>{b.pet.leash}</span></div>
              <div className="row mt">
                <Link className="btn ghost" to={`/walker/chat/${b.owner_id}`}><Icon name="chat" size={16} />聯絡飼主</Link><span className="spacer" />
                {b.status === 'accepted' ? <button className="btn primary" onClick={start}>▶ 已接到毛孩，開始散步</button> : <Link className="btn primary" to={`/walker/walk/${b.id}`}>前往現況回報 →</Link>}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
