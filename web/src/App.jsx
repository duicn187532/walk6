import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useSession, canAct, ROLE_LABEL } from './lib.jsx';
import { api } from './api.js';
import { Icon } from './components/ui.jsx';
import OwnerHome from './pages/owner/Home.jsx';
import OwnerPets from './pages/owner/Pets.jsx';
import OwnerMatch from './pages/owner/Match.jsx';
import OwnerBook from './pages/owner/Book.jsx';
import OwnerLive from './pages/owner/Live.jsx';
import OwnerReport from './pages/owner/Report.jsx';
import WalkerHome from './pages/walker/Home.jsx';
import WalkerProfile from './pages/walker/Profile.jsx';
import WalkerJobs from './pages/walker/Jobs.jsx';
import WalkerSchedule from './pages/walker/Schedule.jsx';
import WalkerWalk from './pages/walker/Walk.jsx';
import WalkerEarnings from './pages/walker/Earnings.jsx';
import Chat from './pages/Chat.jsx';
import Auth from './pages/Auth.jsx';

const NAV = {
  owner: [
    ['/owner', 'home', '總覽首頁'], ['/owner/pets', 'paw', '我的毛孩'], ['/owner/match', 'users', 'AI 信任媒合'],
    ['/owner/book', 'calendar', '預約與路線'], ['/owner/live', 'map', '散步即時守護'], ['/owner/report', 'heart', '照護報告與評價'], ['/owner/chat', 'chat', '面談訊息'],
  ],
  walker: [
    ['/walker', 'home', '我的工作台'], ['/walker/profile', 'shield', '信任履歷'], ['/walker/jobs', 'users', '媒合接單'],
    ['/walker/schedule', 'calendar', '行程與交接'], ['/walker/walk', 'camera', '散步現況回報'], ['/walker/earnings', 'wallet', '收益與評價'], ['/walker/chat', 'chat', '飼主訊息'],
  ],
};

export default function App() {
  const s = useSession();
  const loc = useLocation();
  const nav = useNavigate();
  const role = loc.pathname.startsWith('/walker') ? 'walker' : 'owner';
  const me = s.me;
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [loc.pathname]);
  // A single-role account landing on the other side goes back to the side it has.
  useEffect(() => { if (me && !canAct(me, role)) nav(`/${me.role}`, { replace: true }); }, [me, role, nav]);
  if (s.entry === undefined || !s.usersLoaded) return <div className="loading">載入中…</div>;
  if (!me) return <><Auth /><div className={`toast ${s.toast ? 'show' : ''}`} role="status">{s.toast}</div></>;
  const logout = () => { s.signOut(); s.notify('已登出。'); nav('/', { replace: true }); };

  const switchRole = async (target) => {
    if (target === role) return;
    if (!canAct(me, target)) {
      if (!window.confirm(target === 'walker' ? `${me.name} 要同時開通「遛狗者」身分嗎？\n開通後可在信任履歷補充資料並開始接單。` : `${me.name} 要同時開通「飼主」身分嗎？\n開通後可建立毛孩檔案並發起散步任務。`)) return;
      await api.post(`/users/${me.id}/roles`, { add: target });
      s.refresh();
      s.notify(target === 'walker' ? '已開通遛狗者身分！先到「信任履歷」補齊資料吧。' : '已開通飼主身分！先建立毛孩檔案吧。');
      nav(target === 'walker' ? '/walker/profile' : '/owner/pets');
      return;
    }
    nav(`/${target}`);
  };
  const title = NAV[role].find(([p]) => p === loc.pathname || (p !== `/${role}` && loc.pathname.startsWith(p)))?.[2] || NAV[role][0][2];

  const reset = async () => {
    if (!window.confirm('要把資料庫重置回預設的模擬資料嗎？\n所有自行註冊的帳號與新資料都會被清除。')) return;
    await api.post('/admin/reset');
    s.refresh();
    s.notify('已重置模擬資料。');
    nav(`/${role}`);
  };

  return (
    <div className={`app role-${role}`}>
      <div className={`overlay ${menu ? 'show' : ''}`} onClick={() => setMenu(false)} />
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Icon name="paw" size={28} /></div>
          <div><div className="brand-name">Walk <span>我可遛</span></div><div className="brand-sub">WALK WITH TRUST</div></div>
        </div>
        {s.entry && <div className="role-lock"><span className="dot" />{s.entry} · {me?.name}<small>同一個帳號可兼任飼主與遛狗者</small></div>}
        <div className="role-switch" role="group" aria-label="切換身分">
          {['owner', 'walker'].map((r) => (
            <button key={r} className={role === r ? 'active' : ''} onClick={() => switchRole(r)} title={canAct(me, r) ? '' : `尚未開通，點擊即可兼任${ROLE_LABEL[r]}`}>
              <span className="dot" />我是{ROLE_LABEL[r]}{!canAct(me, r) && <small className="role-add">＋</small>}
            </button>
          ))}
        </div>
        <nav className="nav">
          {NAV[role].map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === `/${role}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon name={icon} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`ai-status ${s.meta?.ai?.ok ? 'on' : ''}`}>
            <span className="dot" />{s.meta?.ai?.ok ? `AI 已連線 · ${s.meta.ai.model}` : 'AI 未連線（使用規則模板）'}
          </div>
          {!s.entry && <button className="link-btn" onClick={reset}><Icon name="refresh" size={14} />重置模擬資料</button>}
          <div className="version">Walk 我可遛 · MVP 0.1</div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn mobile-only" onClick={() => setMenu(true)} aria-label="開啟選單"><Icon name="menu" /></button>
            <div className="crumb">Walk 我可遛 / <b>{title}</b></div>
          </div>
          <div className="top-right">
            <span className="demo-pill">MVP 體驗版</span>
            <div className="profile">
              <div className="profile-photo">{me.avatar}</div>
              <div className="profile-meta">
                <b>{me.name}</b>
                <span>{ROLE_LABEL[me.role]} · 目前以{ROLE_LABEL[role]}身分</span>
              </div>
              <button className="btn ghost sm" onClick={logout}>登出</button>
            </div>
          </div>
        </header>
        <main className="content" key={`${role}-${me?.id}`}>
          {!me ? <div className="loading">載入中…</div> : (
            <Routes>
              <Route path="/" element={<Navigate to="/owner" replace />} />
              <Route path="/owner" element={<OwnerHome />} />
              <Route path="/owner/pets" element={<OwnerPets />} />
              <Route path="/owner/match" element={<OwnerMatch />} />
              <Route path="/owner/book" element={<OwnerBook />} />
              <Route path="/owner/live/:id?" element={<OwnerLive />} />
              <Route path="/owner/report/:id?" element={<OwnerReport />} />
              <Route path="/owner/chat/:otherId?" element={<Chat role="owner" />} />
              <Route path="/walker" element={<WalkerHome />} />
              <Route path="/walker/profile" element={<WalkerProfile />} />
              <Route path="/walker/jobs" element={<WalkerJobs />} />
              <Route path="/walker/schedule" element={<WalkerSchedule />} />
              <Route path="/walker/walk/:id?" element={<WalkerWalk />} />
              <Route path="/walker/earnings" element={<WalkerEarnings />} />
              <Route path="/walker/chat/:otherId?" element={<Chat role="walker" />} />
              <Route path="*" element={<Navigate to="/owner" replace />} />
            </Routes>
          )}
        </main>
      </div>
      <div className={`toast ${s.toast ? 'show' : ''}`} role="status">{s.toast}</div>
    </div>
  );
}
