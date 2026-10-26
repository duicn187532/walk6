import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSession, useData, when, endTime, utcClock, petEmoji } from '../../lib.jsx';
import { api, assetUrl } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, StatusBadge, PetAvatar, Avatar, Empty } from '../../components/ui.jsx';
import WalkMap from '../../components/WalkMap.jsx';

export default function OwnerLive() {
  const { owner, notify } = useSession();
  const { id } = useParams();
  const nav = useNavigate();
  const [bookings, reloadList] = useData(`/bookings?ownerId=${owner.id}`, [], 5000);
  const active = (bookings || []).filter((b) => ['in_progress', 'accepted', 'requested', 'open'].includes(b.status))
    .sort((a, b) => (a.status === 'in_progress' ? -1 : b.status === 'in_progress' ? 1 : a.start_at.localeCompare(b.start_at)));
  const bid = id || active[0]?.id;
  const [b, reload] = useData(bid ? `/bookings/${bid}` : null, [], 5000);
  const [live] = useData(bid ? `/bookings/${bid}/live` : null, [], 3000);

  if (bookings && !bid) return (<><PageHead eyebrow="Live walk monitor" title="散步即時守護" /><Empty icon="🗺️">目前沒有進行中或即將到來的散步。<br /><Link className="btn primary sm mt" to="/owner/book">預約散步</Link></Empty></>);
  if (!b) return <div className="loading">載入中…</div>;

  const running = b.status === 'in_progress';
  const trail = live?.gps?.map((p) => [p.lat, p.lng]);
  const offRoute = !!live?.off_route;
  const sim = async (offRoute) => { await api.post(`/bookings/${b.id}/simulate`, { offRoute }); notify(offRoute ? '已模擬 GPS 偏離路線。' : 'GPS 已恢復正常。'); };
  const cancel = async () => { if (!window.confirm('確定取消這筆預約？')) return; await api.post(`/bookings/${b.id}/cancel`); reloadList(); notify('已取消預約。'); nav('/owner/live'); };
  const photos = (live?.updates || []).filter((u) => u.photo_url);

  return (
    <>
      <PageHead eyebrow="Live walk monitor" title="你的安心散步守護站" sub="GPS 位置每 3 秒更新；遛狗者的照片與回報會即時出現在這裡。">
        {active.length > 1 && (
          <select className="input" style={{ width: 'auto' }} value={b.id} onChange={(e) => nav(`/owner/live/${e.target.value}`)}>
            {active.map((x) => <option key={x.id} value={x.id}>{x.pet_name} · {when(x.start_at)}</option>)}
          </select>
        )}
      </PageHead>
      <div className="grid split">
        <Card className="pad">
          <SectionHead title={`🗺️ ${b.pet.name} 的散步地圖`} sub={b.route.name} action={<StatusBadge status={b.status} />} />
          <WalkMap routes={[b.route]} selectedId={b.route.id} trail={running || b.status === 'completed' ? trail : null} current={running ? trail?.[trail.length - 1] : null} dog={petEmoji(b.pet)} alert={offRoute} height={380} />
          {running ? (
            <>
              <div className="row mt"><b className="small">散步進度 {Math.round((live?.progress || 0) * 100)}%</b><span className="spacer" /><span className="small muted">已走 {((live?.distance || 0) / 1000).toFixed(2)} km · 開始於 {utcClock(b.started_at)}</span></div>
              <div className="progress mt-s"><i style={{ width: `${(live?.progress || 0) * 100}%` }} /></div>
              <div className={`notice ${offRoute ? 'red' : 'blue'} mt`}>
                <Icon name={offRoute ? 'alert' : 'shield'} size={15} />
                <span>{offRoute ? 'GPS 顯示偏離預定路線約 150 公尺。建議先傳訊息確認現況（定位可能因建物產生誤差）。' : 'GPS 位置更新正常，未偵測到路線偏離。'}</span>
              </div>
              <div className="row wrap mt">
                <span className="tiny muted">展示用：</span>
                {offRoute ? <button className="btn ghost sm" onClick={() => sim(false)}>恢復正常路線</button> : <button className="btn danger sm" onClick={() => sim(true)}>模擬 GPS 偏離</button>}
                <Link className="btn soft sm" to={`/owner/chat/${b.walker_id}`}><Icon name="chat" size={14} />傳訊息給遛狗者</Link>
              </div>
            </>
          ) : (
            <div className="notice blue mt"><Icon name="info" size={15} />
              <span>{b.status === 'open' ? '公開任務徵求中，遛狗者接單後會通知你。' : b.status === 'requested' ? `等待 ${b.walker?.name} 確認接單。` : b.status === 'accepted' ? `${b.walker?.name} 已確認，${when(b.start_at)} 交接後會開始即時追蹤。` : '這趟散步已結束。'}</span>
            </div>
          )}
          {photos.length > 0 && (<><div className="divider" /><b className="small">📷 照片回報</b><div className="photo-grid mt-s">{photos.map((u) => <img key={u.id} src={assetUrl(u.photo_url)} alt={u.ai_label || '散步照片'} title={u.ai_label || ''} />)}</div></>)}
        </Card>

        <div className="stack">
          <Card className="pad">
            <div className="pill-box">
              <PetAvatar pet={b.pet} size={50} />
              <div className="item-main"><b>{b.pet.name}</b><div className="tiny muted">{b.pet.breed} · {b.duration} 分鐘 · {b.mode === 'free' ? '免費互助' : '付費任務'}</div></div>
            </div>
            <div className="info"><Icon name="clock" size={16} /><b>{when(b.start_at)}－{endTime(b.start_at, b.duration)}</b></div>
            <div className="info"><Icon name="pin" size={16} />{b.address}</div>
            {b.walker && <div className="info"><Avatar user={b.walker} size={26} />遛狗者 <b>{b.walker.name}</b>{['accepted', 'in_progress'].includes(b.status) && <span className="tiny muted">· {b.walker.phone}</span>}</div>}
            {b.notes && <div className="notice mt-s"><Icon name="info" size={15} /><span>{b.notes}</span></div>}
            {['requested', 'open', 'accepted'].includes(b.status) && <button className="btn danger sm mt" onClick={cancel}>取消預約</button>}
            {b.status === 'completed' && <Link className="btn primary wide mt" to={`/owner/report/${b.id}`}>查看照護報告並評價 →</Link>}
          </Card>
          <Card className="pad">
            <SectionHead title="🔔 即時回報" sub={b.photo_interval ? `約定每 ${b.photo_interval} 分鐘回報` : '依需求回報'} action={<button className="icon-btn" onClick={reload} aria-label="重新整理"><Icon name="refresh" size={15} /></button>} />
            <Timeline updates={live?.updates} />
          </Card>
        </div>
      </div>
    </>
  );
}

export function Timeline({ updates }) {
  if (!updates?.length) return <div className="small muted">尚無回報。</div>;
  return (
    <div className="timeline">
      {updates.map((u) => (
        <div key={u.id} className={`tl ${u.ai_flag ? 'alert' : u.photo_url ? 'photo' : ''}`}>
          <div className="tl-dot">{u.ai_flag ? '!' : u.photo_url ? '📷' : u.kind === 'system' ? '•' : '✎'}</div>
          <div className="tl-body">
            <time>{utcClock(u.at)}</time>{u.ai_label && <span className={`chip ${u.ai_flag ? 'red' : 'green'}`} style={{ marginLeft: 8 }}>🤖 {u.ai_label}</span>}
            <p>{u.text}</p>
            {u.photo_url && <img src={assetUrl(u.photo_url)} alt={u.ai_label || '照片'} />}
          </div>
        </div>
      ))}
    </div>
  );
}
