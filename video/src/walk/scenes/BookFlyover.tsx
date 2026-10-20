// S4 cursor-flyover (demos/camera/cursor-flyover/CursorFlyover.tsx) on the REAL /owner/book page.
// Kept: overview fade-in; four fly-to windows (timeline BOOK_WIN: 10% travel / 10% hold, last stop 20% so the price rests ≥1s) of
// the shot with easeInOutCubic and equal travel/hold; camera + cursor share one interpolation; click ripple
// on each arrival (0.055 of the shot), cursor & ripple inverse-scaled to stay screen-size; ±0.5px breathing
// during holds (card's known-pit note). Targets re-measured on the real controls (layout.json).
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { SidebarExtend } from './common';
import layout from '../layout.json';
import { C } from '../tokens';
import { BOOK_WIN, BOOK_FADE } from '../timeline';

const B = layout.book;
const ctr = (b: { x: number; y: number; w: number; h: number }) => [b.x + b.w / 2, b.y + b.h / 2];
const [selX, selY] = ctr(B.walkerSelect);
const opt = B.options[2];
const [rX, rY] = ctr(B.routes[0]);
// camera steps (page CSS px) + cursor targets
const STEPS = [
  { cx: 960, cy: B.pageH / 2 - 10, s: 0.74, px: 1100, py: 700 },
  { cx: 819, cy: 505, s: 1.6, px: selX + 60, py: selY + 4 },
  { cx: 819, cy: 985, s: 1.6, px: opt.x + 27, py: opt.y + 31 },
  { cx: 1920 - 960 / 1.7, cy: 545, s: 1.7, px: rX + 40, py: rY + 6 },
  { cx: 1920 - 960 / 1.7, cy: 1090, s: 1.7, px: B.priceBox.x + 380, py: B.priceBox.y + 176 },
];
const WIN = BOOK_WIN; // shared with the SFX table (timeline.ts)
const inOutCubic = Easing.bezier(0.65, 0, 0.35, 1);
const seg = (t: number, a: number, b: number, e = inOutCubic) => (t <= a ? 0 : t >= b ? 1 : e((t - a) / (b - a)));

export const BookFlyover: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const t = frame / duration;
  const v = { cx: STEPS[0].cx, cy: STEPS[0].cy, s: STEPS[0].s, px: STEPS[0].px, py: STEPS[0].py };
  let prev = STEPS[0];
  WIN.forEach((w, i) => {
    const u = seg(t, w[0], w[1]);
    const to = STEPS[i + 1];
    (Object.keys(v) as (keyof typeof v)[]).forEach((k) => { v[k] += u * (to[k] - prev[k]); });
    prev = to;
  });
  const fade = seg(t, 0, BOOK_FADE, Easing.out(Easing.cubic));
  let click = 0, hold = 0;
  WIN.forEach((w, i) => {
    const c = seg(t, w[1], w[1] + 0.055, Easing.out(Easing.cubic));
    if (c > 0 && c < 1) { click = c; hold = 1; }
    else if (c >= 1 && t < (WIN[i + 1] ? WIN[i + 1][0] : 1.01)) { click = 1; hold = 1; }
  });
  const breathe = hold ? Math.sin(frame / 9) * 0.5 : 0;

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1920, height: B.pageH, transformOrigin: '0 0', transform: `translate(${960 - v.cx * v.s}px, ${540 - v.cy * v.s + breathe}px) scale(${v.s})`, opacity: fade, filter: `blur(${(1 - fade) * 5}px)` }}>
        <Img src={staticFile('textures/live/book-full.png')} style={{ position: 'absolute', width: 1920, height: B.pageH }} />
        <SidebarExtend pageH={B.pageH} />
        <div style={{ position: 'absolute', left: v.px, top: v.py, width: 30, height: 30, borderRadius: '50%', border: `3px solid ${C.goldD}`, opacity: hold ? (1 - click) * 0.85 : 0, transform: `translate(-50%,-50%) scale(${(0.3 + click * 1.6) / v.s})` }} />
        <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: v.px, top: v.py, width: 34, height: 34, transformOrigin: '0 0', transform: `scale(${1 / v.s})`, filter: 'drop-shadow(0 4px 6px rgba(47,63,74,.45))' }}>
          <path d="M4 2 L4 19 L9 14.4 L12.2 21.5 L15.4 20 L12.2 13 L19 12.6 Z" fill={click > 0 && click < 0.4 ? C.goldL : '#fff'} stroke={C.ink} strokeWidth={1.3} strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
