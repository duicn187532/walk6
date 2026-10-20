import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession, ROLE_LABEL } from '../lib.jsx';
import { api } from '../api.js';
import { Icon } from '../components/ui.jsx';
import { CorgiCover, ShepherdCover } from '../components/Covers.jsx';

const AVATARS = ['🙂', '👩🏻', '👨🏻', '👩🏻‍🦱', '🧑🏻', '👩🏻‍🦳', '👴🏻', '🧔🏻', '👩🏻‍🎓', '🧑🏻‍💻'];
const ROLES = [
  ['owner', '🐶', '我要找人遛狗', '建立毛孩檔案、預約並即時守護散步'],
  ['walker', '🐕‍🦺', '我想當遛狗者', '建立信任履歷、接單並回報照護'],
  ['both', '🤝', '兩個都要', '自己有狗，也幫鄰居遛狗'],
];

export default function Auth() {
  const s = useSession();
  const nav = useNavigate();
  const [mode, setMode] = useState('register');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'owner', district: '大安區', phone: '', avatar: '🙂' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const done = (u, fresh) => {
    s.signIn(u);
    s.notify(fresh ? `歡迎加入，${u.name}！` : `歡迎回來，${u.name}！`);
    if (fresh) nav(u.role === 'walker' ? '/walker/profile' : '/owner/pets');
    else nav(u.role === 'walker' ? '/walker' : '/owner');
  };
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') done(await api.post('/auth/register', f), true);
      else done(await api.post('/auth/login', { email: f.email, password: f.password }), false);
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  const demo = (u) => done(u, false);
  const demoUsers = s.users.filter((u) => ['小晴', '林以安'].includes(u.name));

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="brand">
          <div className="brand-mark"><Icon name="paw" size={28} /></div>
          <div><div className="brand-name">Walk <span>我可遛</span></div><div className="brand-sub">WALK WITH TRUST</div></div>
        </div>
        <h1>讓每一次出門，<br />都是一段<em>放心的旅程。</em></h1>
        <p>找可信任的遛狗夥伴，或成為別人的遛狗夥伴。同一個帳號可以兼任飼主與遛狗者。</p>
        <div className="auth-dogs"><CorgiCover className="auth-dog" /><ShepherdCover className="auth-dog" /></div>
      </div>

      <div className="auth-panel card">
        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>註冊新帳號</button>
          <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>登入</button>
        </div>
        <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div className="field"><span>我想要…</span>
                <div className="role-pick">
                  {ROLES.map(([v, ico, t, d]) => (
                    <button type="button" key={v} className={f.role === v ? 'on' : ''} onClick={() => setF({ ...f, role: v })} aria-pressed={f.role === v}>
                      <span className="ico">{ico}</span><b>{t}</b><small>{d}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-grid">
                <label className="field"><span>名稱 *</span><input required value={f.name} onChange={set('name')} placeholder="例如：小晴" /></label>
                <label className="field"><span>常用地區</span>
                  <select value={f.district} onChange={set('district')}>{(s.meta?.districts || ['大安區']).concat(['中正區', '大同區', '其他']).map((d) => <option key={d}>{d}</option>)}</select></label>
              </div>
              <div className="field"><span>頭像</span>
                <div className="avatar-pick">{AVATARS.map((a) => <button type="button" key={a} className={f.avatar === a ? 'on' : ''} onClick={() => setF({ ...f, avatar: a })} aria-label={`頭像 ${a}`}>{a}</button>)}</div>
              </div>
            </>
          )}
          <label className="field"><span>Email *</span><input required type="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@example.com" /></label>
          <label className="field"><span>密碼 *</span><input required type="password" minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} placeholder="至少 6 碼" /></label>
          {err && <div className="notice red"><Icon name="alert" size={15} /><span>{err}</span></div>}
          <button className="btn primary wide" disabled={busy}>{mode === 'register' ? `以「${ROLE_LABEL[f.role]}」身分註冊` : '登入'} <Icon name="arrow" size={16} /></button>
          {mode === 'register' && <p className="tiny muted" style={{ margin: 0 }}>註冊後可隨時在側欄開通另一個身分。MVP 體驗版：資料存在本機伺服器，請勿使用真實密碼。</p>}
        </form>
        {demoUsers.length > 0 && (
          <>
            <div className="divider" />
            <div className="small strong">或快速體驗示範帳號</div>
            <div className="row wrap mt-s">
              {demoUsers.map((u) => <button key={u.id} className="btn ghost sm" onClick={() => demo(u)}>{u.avatar} {u.name}（{ROLE_LABEL[u.role]}）</button>)}
            </div>
            <p className="tiny muted mt-s" style={{ margin: 0 }}>所有示範帳號的密碼都是 walk1234。</p>
          </>
        )}
      </div>
    </div>
  );
}
