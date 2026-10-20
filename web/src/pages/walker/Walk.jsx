import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSession, useData, utcClock, petEmoji } from '../../lib.jsx';
import { api } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, StatusBadge, PetAvatar, Empty } from '../../components/ui.jsx';
import WalkMap from '../../components/WalkMap.jsx';
import { Timeline } from '../owner/Live.jsx';

export default function WalkerWalk() {
  const { walker, notify } = useSession();
  const { id } = useParams();
  const nav = useNavigate();
  const [bookings] = useData(`/bookings?walkerId=${walker.id}`, [], 6000);
  const bid = id || bookings?.find((b) => b.status === 'in_progress')?.id || bookings?.filter((b) => b.status === 'accepted').sort((a, b) => a.start_at.localeCompare(b.start_at))[0]?.id;
  const [b, reload] = useData(bid ? `/bookings/${bid}` : null);
  const [live, reloadLive] = useData(bid ? `/bookings/${bid}/live` : null, [], 3000);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState({});

  if (bookings && !bid) return (<><PageHead eyebrow="On-walk care update" title="散步現況回報" /><Empty icon="🦮">目前沒有進行中的散步。<br /><Link className="btn primary sm mt" to="/walker/schedule">查看行程</Link></Empty></>);
  if (!b) return <div className="loading">載入中…</div>;
  const running = b.status === 'in_progress';
  const trail = live?.gps?.map((p) => [p.lat, p.lng]);

  const submit = async (alert = false) => {
    if (!note.trim() && !photo) return notify('請輸入現況說明或附上照片。');
    setBusy(true);
    const fd = new FormData();
    fd.append('text', note.trim() || (alert ? '遛狗者標記異常狀況，請飼主確認。' : ''));
    if (photo) fd.append('photo', photo);
    if (alert) fd.append('alert', '1');
    const r = await api.post(`/bookings/${b.id}/updates`, fd);
    setBusy(false); setNote(''); setPhoto(null); reloadLive();
    notify(r.label ? `已回報！AI 判讀：${r.label}${r.flag ? '（已提醒飼主關注）' : ''}` : alert ? '已送出異常回報，飼主端會顯示警示。' : '現況已同步到飼主端。');
  };
  const start = async () => { await api.post(`/bookings/${b.id}/start`); reload(); reloadLive(); notify('散步開始！GPS 模擬追蹤中。'); };
  const finish = async () => { if (!window.confirm(`確定已將 ${b.pet.name} 安全交還飼主？`)) return; await api.post(`/bookings/${b.id}/finish`); notify('散步完成！系統已通知飼主查看照護報告。'); nav('/walker/earnings'); };
  const care = [b.pet.medical && `醫療注意：${b.pet.medical}`, b.notes && `飼主備註：${b.notes}`, `牽繩方式：${b.pet.leash}`, b.pet.social !== '可友善互動' && `互動：${b.pet.social}，避開其他犬隻`, '散步中補充水分'].filter(Boolean);

  return (
    <>
      <PageHead eyebrow="On-walk care update" title="散步現況回報" sub="你回傳的照片與文字會即時出現在飼主的守護頁；照片會由本機 AI 協助判讀狀態。" />
      <div className="grid split">
        <div className="stack">
          <Card className="pad">
            <SectionHead title={`🐕 ${b.pet.name}・散步任務`} sub={`${b.route.name} · ${b.duration} 分鐘`} action={<StatusBadge status={b.status} />} />
            <WalkMap routes={[b.route]} selectedId={b.route.id} trail={running ? trail : null} current={running ? trail?.[trail.length - 1] : null} dog={petEmoji(b.pet)} alert={!!live?.off_route} height={300} />
            {running && (<>
              <div className="row mt"><b className="small">進度 {Math.round((live?.progress || 0) * 100)}%</b><span className="spacer" /><span className="small muted">{((live?.distance || 0) / 1000).toFixed(2)} km · {utcClock(b.started_at)} 開始</span></div>
              <div className="progress mt-s"><i style={{ width: `${(live?.progress || 0) * 100}%` }} /></div>
            </>)}
            <div className="row mt">
              {b.status === 'accepted' && <button className="btn primary wide" onClick={start}>▶ 已接到毛孩，開始散步</button>}
              {running && <button className="btn gold wide" onClick={finish}><Icon name="check" size={16} />結束散步並交還毛孩</button>}
              {b.status === 'completed' && <div className="notice green" style={{ width: '100%' }}><Icon name="check" size={15} /><span>本次散步已完成，等待飼主評價結單。</span></div>}
            </div>
          </Card>
          <Card className="pad">
            <SectionHead title="📷 回傳毛孩現況" sub={b.photo_interval ? `飼主希望每 ${b.photo_interval} 分鐘回報一次` : ''} />
            <label className="upload">
              <input type="file" accept="image/*" disabled={!running} onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              {photo ? <img src={URL.createObjectURL(photo)} alt="預覽" /> : <div style={{ fontSize: 30 }}>📸</div>}
              <div className="small strong mt-s">{photo ? photo.name : running ? '點此拍照或選擇照片' : '開始散步後即可回報'}</div>
            </label>
            <label className="field mt"><span>現況說明</span><textarea value={note} disabled={!running} onChange={(e) => setNote(e.target.value)} placeholder="例如：剛喝完水，精神很好，正在草地上嗅聞。" /></label>
            <div className="row mt">
              <button className="btn primary" disabled={!running || busy} onClick={() => submit(false)}>{busy ? 'AI 判讀中…' : '送出現況回報'}</button>
              <button className="btn danger" disabled={!running || busy} onClick={() => submit(true)}><Icon name="alert" size={15} />回報異常</button>
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card className="pad">
            <SectionHead title="📋 飼主要求的照護事項" />
            <div className="stack" style={{ gap: 8 }}>
              {care.map((c) => <label key={c} className="option" style={{ gridTemplateColumns: 'auto 1fr' }}><input type="checkbox" checked={!!checked[c]} onChange={(e) => setChecked({ ...checked, [c]: e.target.checked })} /><div><b style={{ fontWeight: 600 }}>{c}</b></div></label>)}
            </div>
          </Card>
          <Card className="pad">
            <SectionHead title="🚨 緊急聯絡" />
            <div className="pill-box"><PetAvatar pet={b.pet} size={44} /><div><b>{b.owner.name}</b><div className="tiny muted">{b.owner.phone}</div></div></div>
            <div className="small mt-s">備援聯絡人：{b.pet.emergency || '未提供'}<br />常去醫院：{b.pet.clinic || '未提供'}</div>
            <Link className="btn soft sm mt" to={`/walker/chat/${b.owner_id}`}><Icon name="chat" size={14} />傳訊息給飼主</Link>
          </Card>
          <Card className="pad">
            <SectionHead title="🕒 已送出的回報" />
            <Timeline updates={live?.updates} />
          </Card>
        </div>
      </div>
    </>
  );
}
