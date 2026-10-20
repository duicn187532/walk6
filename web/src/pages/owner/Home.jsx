import { Link } from 'react-router-dom';
import { useSession, useData, when, endTime, petAge } from '../../lib.jsx';
import { qs } from '../../api.js';
import { Card, Icon, PageHead, SectionHead, Avatar, PetAvatar, StatusBadge } from '../../components/ui.jsx';
import { CorgiCover } from '../../components/Covers.jsx';

export default function OwnerHome() {
  const { owner } = useSession();
  const [pets] = useData(`/owners/${owner.id}/pets`);
  const [bookings] = useData(`/bookings?ownerId=${owner.id}`, [], 8000);
  const pet = pets?.[0];
  const [walkers] = useData(pet ? '/walkers' + qs({ petId: pet.id, district: owner.district, excludeId: owner.id }) : null);

  const live = bookings?.find((b) => b.status === 'in_progress');
  const upcoming = (bookings || []).filter((b) => ['requested', 'accepted', 'open'].includes(b.status)).sort((a, b) => a.start_at.localeCompare(b.start_at));
  const toReview = bookings?.find((b) => b.status === 'completed');
  const next = live || upcoming[0];
  const done = (bookings || []).filter((b) => b.status === 'settled').length;
  const hour = new Date().getHours();
  const hi = hour < 11 ? '早安' : hour < 18 ? '午安' : '晚安';

  return (
    <>
      <PageHead eyebrow="Good day, pet parent" title={`${hi}，${owner.name}！`} sub="今天也一起讓毛孩的每段出門時光，安全又開心。">
        <Link className="btn ghost" to="/owner/pets"><Icon name="paw" size={16} />管理毛孩</Link>
        <Link className="btn primary" to="/owner/book"><Icon name="calendar" size={16} />預約散步</Link>
      </PageHead>

      <section className="hero owner">
        <div className="hero-copy">
          <div className="hero-kicker">🐾 WALK WITH TRUST</div>
          <h2>每一次出門，<br />都是一段<em>放心的旅程。</em></h2>
          <p>AI 依毛孩個性與照護需求推薦遛狗夥伴；從面談、預約到即時 GPS 守護與照護報告，每一步都看得見。</p>
          <Link className="btn primary" to="/owner/match">尋找我的遛狗夥伴 <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="hero-art">
          <CorgiCover className="hero-dog" />
          {walkers?.[0] && <div className="art-tag t1">⭐ 最高適配 {walkers[0].match.score}%</div>}
          <div className="art-tag t2"><i /> {live ? `${live.pet_name} 散步中` : '安心散步守護'}</div>
        </div>
      </section>

      {live && (
        <Link to={`/owner/live/${live.id}`} className="notice green" style={{ marginBottom: 18 }}>
          <Icon name="map" size={16} /><span><b>{live.pet_name}</b> 正在和 {live.walker_name} 散步中，點此查看即時 GPS 與照片回報 →</span>
        </Link>
      )}
      {toReview && (
        <Link to={`/owner/report/${toReview.id}`} className="notice" style={{ marginBottom: 18 }}>
          <Icon name="heart" size={16} /><span><b>{toReview.pet_name}</b> 的散步已完成，查看 AI 照護報告並完成評價與結單 →</span>
        </Link>
      )}

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Stat icon="heart" label="已完成散步" value={done} unit="次" />
        <Stat icon="calendar" gold label="待執行預約" value={upcoming.length} unit="筆" />
        <Stat icon="paw" label="我的毛孩" value={pets?.length ?? '–'} unit="隻" />
        <Stat icon="star" gold label="推薦最高適配" value={walkers?.[0]?.match.score ?? '–'} unit="%" />
      </div>

      <div className="grid split">
        <Card className="pad">
          <SectionHead title="✨ AI 為你推薦的遛狗夥伴" sub={pet ? `依「${pet.name}」的照護需求與 ${owner.district} 排序` : '先建立毛孩檔案就能看到推薦'}
            action={<Link className="link-btn" to="/owner/match">查看全部 <Icon name="arrow" size={14} /></Link>} />
          <div className="list">
            {(walkers || []).slice(0, 3).map((w, i) => (
              <div className="item" key={w.id}>
                <Avatar user={w} tone={i} />
                <div className="item-main">
                  <div className="item-title">{w.name} {i === 0 && <span className="rank">TOP 1</span>}</div>
                  <div className="item-sub">★ {w.stats.avgStars ?? '–'} · {w.stats.completed} 趟 · {w.profile.qualification}</div>
                </div>
                <div className="score"><strong>{w.match.score}%</strong><small>適配分數</small></div>
                <Link className="btn soft sm" to={`/owner/match?walker=${w.id}`}>看履歷</Link>
              </div>
            ))}
          </div>
          <p className="tiny muted mt">＊分數由平台規則依真實訂單評價、準時率、放鳥紀錄與毛孩特性計算；最後選擇由飼主決定。</p>
        </Card>

        <Card className="pad" style={{ background: 'linear-gradient(150deg,#fff,#fffdf6)' }}>
          <SectionHead title="📅 下一趟散步" action={next && <StatusBadge status={next.status} />} />
          {next ? (
            <>
              <div className="pill-box">
                <PetAvatar pet={pets?.find((p) => p.id === next.pet_id)} size={48} />
                <div><b>{next.pet_name}</b><div className="tiny muted">{next.pet_breed} · {petAge(pets?.find((p) => p.id === next.pet_id))}</div></div>
              </div>
              <div className="info"><Icon name="clock" size={16} /><b>{when(next.start_at)}－{endTime(next.start_at, next.duration)}</b></div>
              <div className="info"><Icon name="pin" size={16} />{next.address}</div>
              <div className="info"><Icon name="users" size={16} />遛狗者：<b>{next.walker_name || '公開徵求中'}</b></div>
              <Link className="btn primary wide mt" to={next.status === 'in_progress' ? `/owner/live/${next.id}` : '/owner/live'}>
                {next.status === 'in_progress' ? '查看即時動態' : '查看行程'} <Icon name="arrow" size={16} />
              </Link>
            </>
          ) : <div className="empty">目前沒有預約<br /><Link className="btn primary sm mt" to="/owner/book">立即預約</Link></div>}
        </Card>
      </div>

      <div className="steps">
        {[['認識 & 建立信任', 'AI 媒合、聊天面談'], ['預約 & 規劃行程', '交接點、路線、透明收費'], ['安心 & 即時守護', 'GPS、照片與異常提醒'], ['回報 & 完成結單', 'AI 照護報告與評價']].map(([t, s], i) => (
          <div className="step" key={t}><div className="step-no">0{i + 1}</div><div><strong>{t}</strong><span>{s}</span></div></div>
        ))}
      </div>
    </>
  );
}

export function Stat({ icon, gold, label, value, unit }) {
  return (
    <Card className="stat">
      <div className={`stat-icon ${gold ? 'gold' : ''}`}><Icon name={icon} /></div>
      <div><div className="stat-label">{label}</div><div className="stat-value">{value}<small>{unit}</small></div></div>
    </Card>
  );
}
