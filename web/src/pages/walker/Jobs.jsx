import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession, useData, fmt, when, endTime, petAge } from '../../lib.jsx';
import { api } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, Modal, Badge, Empty } from '../../components/ui.jsx';

const COND = { large: '大型犬', reactive: '敏感犬', senior: '高齡照護', extraPet: '多隻寵物' };

export default function WalkerJobs() {
  const { walker, meta, notify } = useSession();
  const [mine, reloadMine] = useData(`/bookings?walkerId=${walker.id}`, [], 6000);
  const [open, reloadOpen] = useData(`/bookings?open=1&excludeOwner=${walker.id}`, [], 6000);
  const [me] = useData(`/users/${walker.id}`);
  const [filter, setFilter] = useState({ district: '', mode: '' });
  const [detail, setDetail] = useState(null);
  const invites = (mine || []).filter((b) => b.status === 'requested');
  const market = (open || []).filter((b) => (!filter.district || b.district === filter.district) && (!filter.mode || b.mode === filter.mode));

  const act = async (b, action) => {
    await api.post(`/bookings/${b.id}/${action}`, { walkerId: walker.id });
    setDetail(null); reloadMine(); reloadOpen();
    notify(action === 'accept' ? `已接下 ${b.pet_name} 的任務，已加入你的行程。` : '已婉拒邀請。');
  };
  const myNet = (b) => {
    if (b.mode === 'free') return 0;
    const p = me?.profile; if (!p) return b.bill?.net;
    const sub = (p.base_rates?.[b.duration] || 0) + (b.extras?.photo ? 50 : 0) + (b.extras?.care ? 80 : 0) + Object.entries(b.conditions || {}).reduce((s, [k, v]) => s + (v ? p.rates?.[k] || 0 : 0), 0);
    return sub - Math.round(sub * 0.1);
  };

  return (
    <>
      <PageHead eyebrow="Matching requests" title="媒合與接單邀請" sub="先看清楚照護需求與實收金額，再決定是否接單。" />
      <Card className="pad" style={{ marginBottom: 18 }}>
        <SectionHead title="📩 指定給你的邀請" sub={`${invites.length} 筆待回覆`} />
        {invites.length === 0 ? <Empty icon="📭">目前沒有待回覆的指定邀請。</Empty> : (
          <div className="grid g2">{invites.map((b) => <JobCard key={b.id} b={b} net={b.bill?.net} onOpen={() => setDetail(b)} onAccept={() => act(b, 'accept')} invited />)}</div>
        )}
      </Card>
      <Card className="pad">
        <SectionHead title="🐕 公開任務探索" sub="飼主沒有指定遛狗者的任務，先接先贏" action={
          <div className="row">
            <select className="input" value={filter.district} onChange={(e) => setFilter({ ...filter, district: e.target.value })}><option value="">全部地區</option>{(meta?.districts || []).map((d) => <option key={d}>{d}</option>)}</select>
            <select className="input" value={filter.mode} onChange={(e) => setFilter({ ...filter, mode: e.target.value })}><option value="">全部模式</option><option value="paid">付費</option><option value="free">免費互助</option></select>
          </div>} />
        {market.length === 0 ? <Empty icon="🔍">目前沒有符合條件的公開任務。</Empty> : (
          <div className="grid g2">{market.map((b) => <JobCard key={b.id} b={b} net={myNet(b)} onOpen={() => setDetail(b)} onAccept={() => act(b, 'accept')} areaOk={me?.profile?.areas?.includes(b.district)} />)}</div>
        )}
      </Card>
      <JobDetail b={detail} onClose={() => setDetail(null)} onAccept={act} net={detail ? (detail.walker_id ? detail.bill?.net : myNet(detail)) : 0} />
    </>
  );
}

function JobCard({ b, net, onOpen, onAccept, invited, areaOk = true }) {
  return (
    <div className="item" style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
      <div className="row" style={{ width: '100%' }}>
        <div className="pet-avatar" style={{ width: 44, height: 44, fontSize: 24 }}>🐕</div>
        <div className="item-main"><div className="item-title">{b.pet_name} <span className="tiny muted">{b.pet_breed}</span></div><div className="item-sub">飼主 {b.owner_name} · {b.district}</div></div>
        <Badge tone={invited ? 'gold' : 'blue'}>{invited ? '指定邀請' : '公開任務'}</Badge>
      </div>
      <div className="kv" style={{ width: '100%' }}>
        <div>時間<b>{when(b.start_at)}</b></div>
        <div>時長<b>{b.duration} 分鐘</b></div>
        <div>{b.mode === 'free' ? '模式' : '你的實收'}<b>{b.mode === 'free' ? '🤝 免費互助' : fmt(net)}</b></div>
      </div>
      <div className="chips">{Object.entries(b.conditions || {}).filter(([, v]) => v).map(([k]) => <span key={k} className="chip gold">{COND[k]}</span>)}{b.extras?.photo && <span className="chip">照片回報</span>}{!areaOk && <span className="chip red">非你的服務地區</span>}</div>
      <div className="row" style={{ width: '100%' }}>
        <button className="btn ghost sm" onClick={onOpen}>查看照護需求</button><span className="spacer" />
        <button className="btn primary sm" onClick={onAccept}>{invited ? '接受任務' : '我要接單'}</button>
      </div>
    </div>
  );
}

function JobDetail({ b, onClose, onAccept, net }) {
  const [full] = useData(b ? `/bookings/${b.id}` : null);
  const p = full?.pet;
  return (
    <Modal open={!!b} onClose={onClose} title={b ? `${b.pet_name} 的照護需求` : ''} wide>
      {p && (
        <>
          <div className="kv">
            <div>品種／年齡<b>{p.breed} · {petAge(p)}</b></div><div>體重<b>{p.weight} kg</b></div><div>活動量<b>{p.energy}</b></div>
            <div>互動<b>{p.social}</b></div><div>牽繩<b>{p.leash}</b></div><div>疫苗<b>{p.vaccine}</b></div>
          </div>
          <div className="notice blue mt"><Icon name="info" size={15} /><span><b>個性：</b>{p.intro || '未填'}<br /><b>醫療與禁忌：</b>{p.medical || '無'}</span></div>
          {full.notes && <div className="notice mt-s"><Icon name="chat" size={15} /><span><b>飼主備註：</b>{full.notes}</span></div>}
          <div className="info mt"><Icon name="clock" size={16} /><b>{when(full.start_at)}－{endTime(full.start_at, full.duration)}</b></div>
          <div className="info"><Icon name="pin" size={16} />{full.address} · 路線：{full.route.name}</div>
          <div className="price-box mt">
            <div className="price-total" style={{ border: 0, margin: 0, padding: 0 }}><span className="strong">{full.mode === 'free' ? '免費互助任務' : '你的實收（已扣 10% 平台抽成）'}</span><b>{fmt(net)}</b></div>
          </div>
          <div className="row mt">
            <Link className="btn ghost" to={`/walker/chat/${full.owner_id}`}>先問問飼主</Link><span className="spacer" />
            {full.status === 'requested' && <button className="btn danger" onClick={() => onAccept(b, 'decline')}>婉拒</button>}
            <button className="btn primary" onClick={() => onAccept(b, 'accept')}>接受任務</button>
          </div>
        </>
      )}
    </Modal>
  );
}
