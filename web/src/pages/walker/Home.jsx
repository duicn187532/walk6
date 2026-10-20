import { Link } from 'react-router-dom';
import { useSession, useData, fmt, when, endTime } from '../../lib.jsx';
import { api } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, StatusBadge, Meter, Empty } from '../../components/ui.jsx';
import { ShepherdCover } from '../../components/Covers.jsx';
import { Stat } from '../owner/Home.jsx';

export default function WalkerHome() {
  const { walker, notify } = useSession();
  const [me, reloadMe] = useData(`/users/${walker.id}`);
  const [bookings, reload] = useData(`/bookings?walkerId=${walker.id}`, [], 6000);
  const [earn] = useData(`/walkers/${walker.id}/earnings`);
  const invites = (bookings || []).filter((b) => b.status === 'requested');
  const upcoming = (bookings || []).filter((b) => ['accepted', 'in_progress'].includes(b.status)).sort((a, b) => a.start_at.localeCompare(b.start_at));
  const live = upcoming.find((b) => b.status === 'in_progress');
  const available = !!me?.profile?.available;

  const toggle = async () => { await api.post(`/walkers/${walker.id}/availability`, { available: !available }); reloadMe(); notify(!available ? '已開放接單。' : '已暫停接單，飼主搜尋時會看到「暫停接單」。'); };
  const act = async (b, action) => { await api.post(`/bookings/${b.id}/${action}`, { walkerId: walker.id }); reload(); notify(action === 'accept' ? `已接受 ${b.pet_name} 的散步任務！` : '已婉拒邀請。'); };

  return (
    <>
      <PageHead eyebrow="Walker workspace" title={`${walker.name}，今天也辛苦了 👋`} sub="管理媒合邀請、今日行程與你的照護服務品質。">
        <div className="row"><span className="small strong" style={{ color: available ? 'var(--green)' : 'var(--muted)' }}>● {available ? '開放接單' : '暫停接單'}</span><button className={`toggle ${available ? 'on' : ''}`} onClick={toggle} aria-pressed={available} aria-label="切換接單狀態" /></div>
      </PageHead>

      <section className="hero walker">
        <div className="hero-copy">
          <div className="hero-kicker">🐕‍🦺 YOUR DAILY JOURNEY</div>
          <h2>每一步的用心，<br />都能成為<em>值得信賴的紀錄。</em></h2>
          <p>提前了解毛孩需求、安心接單，散步中主動回報，完成後自動產生照護報告，累積你的公開信任履歷。</p>
          <Link className="btn primary" to="/walker/jobs">查看媒合邀請 <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="hero-art">
          <ShepherdCover className="hero-dog" />
          <div className="art-tag t1">🛡️ 已核驗 {me?.profile?.verified?.length ?? 0} 項</div>
          <div className="art-tag t2"><i /> 準時率 {me?.stats?.onTime ?? '–'}%</div>
        </div>
      </section>

      {live && <Link to={`/walker/walk/${live.id}`} className="notice green" style={{ marginBottom: 18 }}><Icon name="camera" size={16} /><span>你正在陪 <b>{live.pet_name}</b> 散步，記得按時回報照片與狀況 →</span></Link>}

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Stat icon="wallet" label="本月實收" value={earn ? new Intl.NumberFormat('zh-TW').format(earn.month.net) : '–'} unit="元" />
        <Stat icon="users" gold label="待回覆邀請" value={invites.length} unit="筆" />
        <Stat icon="check" label="累積完成" value={me?.stats?.completed ?? '–'} unit="趟" />
        <Stat icon="star" gold label="平均評分" value={me?.stats?.avgStars ?? '–'} unit="/5" />
      </div>

      <div className="grid split">
        <Card className="pad">
          <SectionHead title="📩 最新接單邀請" action={<Link className="link-btn" to="/walker/jobs">全部任務 <Icon name="arrow" size={14} /></Link>} />
          {invites.length === 0 && <Empty icon="📭">目前沒有新的指定邀請，可以到「媒合接單」看看公開任務。</Empty>}
          <div className="list">
            {invites.map((b) => (
              <div className="item" key={b.id} style={{ alignItems: 'flex-start' }}>
                <div className="pet-avatar" style={{ width: 48, height: 48, fontSize: 26 }}>🐕</div>
                <div className="item-main">
                  <div className="item-title">{b.pet_name}<span className="tiny muted">{b.pet_breed} · 飼主 {b.owner_name}</span></div>
                  <div className="item-sub">{when(b.start_at)}－{endTime(b.start_at, b.duration)} · {b.district} · {b.mode === 'free' ? '免費互助' : `實收 ${fmt(b.bill?.net)}`}</div>
                  {b.notes && <div className="tiny mt-s" style={{ color: '#8f7b4e' }}>📝 {b.notes}</div>}
                  <div className="row mt-s"><button className="btn primary sm" onClick={() => act(b, 'accept')}>接受任務</button><button className="btn ghost sm" onClick={() => act(b, 'decline')}>婉拒</button><Link className="btn soft sm" to={`/walker/chat/${b.owner_id}`}>先問問飼主</Link></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack">
          <Card className="pad">
            <SectionHead title="📆 接下來的行程" action={<Link className="link-btn" to="/walker/schedule">行程表</Link>} />
            {upcoming.length === 0 && <div className="small muted">尚無已確認行程。</div>}
            <div className="list">
              {upcoming.slice(0, 3).map((b) => (
                <Link className="item" key={b.id} to={b.status === 'in_progress' ? `/walker/walk/${b.id}` : '/walker/schedule'}>
                  <div className="item-main"><div className="item-title">{b.pet_name} <StatusBadge status={b.status} /></div><div className="item-sub">{when(b.start_at)} · {b.duration} 分 · {b.district}</div></div>
                  <Icon name="arrow" size={16} />
                </Link>
              ))}
            </div>
          </Card>
          <Card className="pad">
            <SectionHead title="🛡️ 你的信任履歷" action={<Link className="link-btn" to="/walker/profile">編輯</Link>} />
            {me?.stats && <div className="stack" style={{ gap: 10 }}>
              <Meter label="安全照護" value={Math.round((me.stats.breakdown.safety || 0) * 20)} />
              <Meter label="準時交接" value={me.stats.onTime} />
              <Meter label="回報品質" value={Math.round((me.stats.breakdown.updates || 0) * 20)} />
              <Meter label="照護細心度" value={Math.round((me.stats.breakdown.care || 0) * 20)} />
            </div>}
          </Card>
        </div>
      </div>
    </>
  );
}
