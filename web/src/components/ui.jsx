import { useEffect } from 'react';
import { STATUS, petEmoji } from '../lib.jsx';

const PATHS = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-8h6v8" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0-1-5.8M17 14a5 5 0 0 1 4 5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
  map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" />,
  heart: <path d="M20.8 4.9a5.6 5.6 0 0 0-7.9 0L12 5.8l-.9-.9a5.6 5.6 0 0 0-7.9 7.9l.9.9L12 21l7.9-7.9.9-.9a5.6 5.6 0 0 0 0-7.3z" />,
  wallet: <><rect x="2" y="6" width="20" height="15" rx="3" /><path d="M2 10h20M6 6V3h13v3" /><circle cx="17" cy="15" r="1" /></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m4 12 5 5L20 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="2.5" /></>,
  chat: <path d="M20 11a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L3 20l1.9-4A8 8 0 1 1 20 11z" />,
  shield: <><path d="M12 2 20 5v6c0 5-3 8-8 11-5-3-8-6-8-11V5z" /><path d="m8 12 3 3 5-6" /></>,
  alert: <path d="m12 3 10 18H2zM12 9v5M12 18v.1" />,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="4" /></>,
  star: <path d="m12 2 3 6.4 7 .9-5.1 5 .9 7L12 18l-5.8 3.3.9-7-5.1-5 7-.9z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M5 5 19 19M19 5 5 19" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  paw: <><circle cx="7" cy="9" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="17" cy="9" r="2" /><path d="M7.5 17c0-3 2-5 4.5-5s4.5 2 4.5 5c0 2-2 3-4.5 2.5C9.5 20 7.5 19 7.5 17z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></>,
  refresh: <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />,
};
export function Icon({ name, size = 18, className = '' }) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}

export const Card = ({ className = '', children, ...p }) => <div className={`card ${className}`} {...p}>{children}</div>;
export const Badge = ({ tone = 'blue', children }) => <span className={`badge ${tone}`}>{children}</span>;
export function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] || [status, 'grey'];
  return <Badge tone={tone}>{label}</Badge>;
}
export function SectionHead({ title, sub, action }) {
  return <div className="section-head"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{action}</div>;
}
export function PageHead({ eyebrow, title, sub, children }) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="actions">{children}</div>}</div>;
}
export function PetAvatar({ pet, size = 52 }) {
  return (
    <div className="pet-avatar" style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {pet?.photo_url ? <img src={pet.photo_url} alt={pet.name} /> : petEmoji(pet)}
    </div>
  );
}
export const Avatar = ({ user, size = 48, tone = 0 }) => <div className={`avatar t${tone % 3}`} style={{ width: size, height: size, fontSize: size * 0.55 }}>{user?.avatar || '🙂'}</div>;
export function Stars({ value = 0, onChange, size = 26 }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} style={{ fontSize: size }} disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} 星`}>★</button>
      ))}
    </div>
  );
}
export function Modal({ title, open, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-cover" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="關閉"><Icon name="close" /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
export const Empty = ({ icon = '🐾', children }) => <div className="empty"><div className="empty-icon">{icon}</div>{children}</div>;
export function Meter({ label, value }) {
  return <div className="meter"><span>{label}</span><div className="bar"><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>;
}
export const AiTag = ({ ai }) => <span className={`ai-tag ${ai ? '' : 'off'}`} title={ai ? '由本機 Ollama 模型產生' : 'Ollama 未啟動，使用規則模板'}><Icon name="sparkle" size={12} />{ai ? 'AI 生成' : '規則模板'}</span>;
