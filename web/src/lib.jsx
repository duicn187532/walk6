import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export const fmt = (n) => 'NT$ ' + new Intl.NumberFormat('zh-TW').format(Math.round(n || 0));
const pad = (n) => String(n).padStart(2, '0');
export const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

/** 'YYYY-MM-DDTHH:mm' local → 「10/21（二）16:00」 */
export function when(s, { time = true } = {}) {
  const d = new Date(s);
  if (Number.isNaN(+d)) return s || '';
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  const rel = days === 0 ? '今天' : days === 1 ? '明天' : days === 2 ? '後天' : days === -1 ? '昨天' : `${d.getMonth() + 1}/${d.getDate()}`;
  return `${rel}（${WEEK[d.getDay()]}）${time ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : ''}`;
}
export const endTime = (s, mins) => { const d = new Date(new Date(s).getTime() + mins * 60000); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** SQLite UTC 'YYYY-MM-DD HH:MM:SS' → local HH:mm */
export const utcClock = (s) => { if (!s) return ''; const d = new Date(s.replace(' ', 'T') + 'Z'); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function localInput(daysAhead = 1, hh = 16) {
  const d = new Date(); d.setDate(d.getDate() + daysAhead); d.setHours(hh, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}
export function petAge(p) {
  if (!p?.birth) return '年齡未填';
  const m = Math.max(0, (new Date().getFullYear() - +p.birth.slice(0, 4)) * 12 + new Date().getMonth() + 1 - +p.birth.slice(5, 7));
  return m < 12 ? `${m} 個月` : `${Math.floor(m / 12)} 歲`;
}
const BREED_EMOJI = { 柯基: '🐶', 柴犬: '🐕', 黃金獵犬: '🦮', 德國牧羊犬: '🐕‍🦺', 玩具貴賓: '🐩' };
export const petEmoji = (p) => (p?.type === '貓' ? '🐈' : BREED_EMOJI[p?.breed] || '🐕');

export const STATUS = {
  open: ['公開徵求中', 'gold'], requested: ['待遛狗者確認', 'gold'], accepted: ['已確認', 'blue'], declined: ['已婉拒', 'grey'],
  in_progress: ['散步中', 'green'], completed: ['待評價結單', 'gold'], settled: ['已結單', 'grey'], cancelled: ['已取消', 'grey'],
};

// ---- session (who am I in the demo) ----
const SessionCtx = createContext(null);
export function SessionProvider({ children }) {
  const read = (k, d) => { try { return Number(localStorage.getItem(k)) || d; } catch { return d; } };
  // One person per browser; owner and walker views are just two hats of the same user (role 'both').
  const [userId, setUserId] = useState(() => read('walk.user', 0));
  const [entry, setEntry] = useState(undefined); // undefined = loading
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0); // bump to make pages refetch
  const timer = useRef();
  const notify = useCallback((msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 3600); }, []);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    const as = new URLSearchParams(window.location.search).get('as');
    if (as) { try { localStorage.setItem('walk.as', as); } catch { /* ignore */ } }
    let saved = as; try { saved = as || localStorage.getItem('walk.as'); } catch { /* ignore */ }
    api.get('/config' + (saved ? `?as=${encodeURIComponent(saved)}` : '')).then((c) => {
      setEntry(c.entry);
      // A tester entry link (?as=A / per-port entry) signs in as that tester; otherwise visitors sign up or log in.
      if (as && c.defaultUserId) setUserId(c.defaultUserId);
      else if (!userId && c.defaultUserId) setUserId(c.defaultUserId);
    })
      .catch(() => setEntry(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [usersLoaded, setUsersLoaded] = useState(false);
  useEffect(() => { api.get('/users').then((u) => { setUsers(u); setUsersLoaded(true); }); api.get('/meta').then(setMeta); }, [tick]);
  useEffect(() => { try { if (userId) localStorage.setItem('walk.user', userId); else localStorage.removeItem('walk.user'); } catch { /* ignore */ } }, [userId]);
  const me = users.find((u) => u.id === userId);
  const signIn = useCallback((u) => { setUsers((list) => (list.some((x) => x.id === u.id) ? list : [...list, u])); setUserId(u.id); }, []);
  const signOut = useCallback(() => { try { localStorage.removeItem('walk.as'); } catch { /* ignore */ } setEntry(null); setUserId(0); }, []);
  // Pages read `owner` / `walker`; with dual roles both are the same person.
  const value = { userId, setUserId, users, usersLoaded, meta, notify, toast, tick, refresh, entry, me, owner: me, walker: me, signIn, signOut };
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
export const useSession = () => useContext(SessionCtx);
export const canAct = (u, role) => !!u && (u.role === 'both' || u.role === role);
export const ROLE_LABEL = { owner: '飼主', walker: '遛狗者', both: '飼主兼遛狗者' };

/** Fetch `url` (re-runs when deps / session tick change); optional polling interval. */
export function useData(url, deps = [], pollMs = 0) {
  const { tick } = useSession();
  const [data, setData] = useState(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!url) { setData(null); return; }
    let alive = true;
    const load = () => api.get(url).then((d) => alive && setData(d)).catch(() => {});
    load();
    const id = pollMs ? setInterval(load, pollMs) : null;
    return () => { alive = false; if (id) clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, n, pollMs, ...deps]);
  return [data, () => setN((x) => x + 1), setData];
}
