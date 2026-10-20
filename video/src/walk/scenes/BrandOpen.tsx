// S1 brand-ink-open (demos/typography/brand-ink-open/BrandInkOpen.tsx) re-skinned.
// Kept: crosshair draw (v 0→9f, h 8→18f, fade 24→34f); glyph letterpress delay 10+i·3 over 12f with
// scale 1.6→1 + blur 6→0 + under-glint; kicker typewriter 0.7f/char; full ≥1s hold of the complete lockup;
// 7f lift+shrink+fade exit. Changed: Noto Sans TC 900 wordmark (我可遛 in brand blue), gold strokes, hero bg.
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, FONT, HERO_BG, clamp } from '../tokens';

export const BRAND_DEFAULTS = { wordmark: 'Walk 我可遛', accentFrom: 5, kicker: 'WALK WITH TRUST · 可信任的遛狗夥伴', fontSize: 168 };

export const BrandOpen: React.FC<{ duration: number } & Partial<typeof BRAND_DEFAULTS>> = ({ duration, ...p }) => {
  const o = { ...BRAND_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const vDraw = interpolate(frame, [0, 9], [100, 0], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const hDraw = interpolate(frame, [8, 18], [100, 0], clamp);
  const crossFade = interpolate(frame, [24, 34], [1, 0], clamp);

  const chars = o.wordmark.split('');
  const kickStart = 28, perChar = 0.7;
  const kickChars = Math.floor(Math.max(0, frame - kickStart) / perChar);
  const kickDone = kickStart + o.kicker.length * perChar;
  const cursorOn = frame >= kickStart && (frame < kickDone || (frame < duration - 10 && Math.floor((frame - kickDone) / 2) % 2 === 0));

  // exit = last 7f (lockup is complete by ~46f → hold ≈ duration−53 ≥ 30f)
  const out = interpolate(frame, [duration - 7, duration], [0, 1], { ...clamp, easing: Easing.bezier(0.4, 0, 0.5, 1) });

  return (
    <AbsoluteFill style={{ background: HERO_BG, justifyContent: 'center', alignItems: 'center' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(900px 600px at 50% 46%, rgba(255,255,255,0.8), transparent 70%)' }} />
      <div style={{ textAlign: 'center', opacity: 1 - out, transform: `translateY(${-out * 40}px) scale(${1 - out * 0.12})`, position: 'relative' }}>
        <svg width={72} height={72} viewBox="0 0 64 64" style={{ display: 'block', margin: '0 auto 30px', opacity: crossFade }}>
          <line x1={32} y1={2} x2={32} y2={62} stroke={C.gold} strokeWidth={5} strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={vDraw} />
          <line x1={2} y1={32} x2={62} y2={32} stroke={C.gold} strokeWidth={5} strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={hDraw} />
        </svg>
        <div style={{ fontFamily: FONT, fontSize: o.fontSize, fontWeight: 900, color: C.ink, letterSpacing: '-0.02em', lineHeight: 1, display: 'inline-flex', alignItems: 'flex-end', whiteSpace: 'pre' }}>
          {chars.map((ch, i) => {
            const delay = 10 + i * 3;
            const t = interpolate(frame, [delay, delay + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.7, 0.25, 1) });
            const g = interpolate(frame, [delay + 8, delay + 12, delay + 16], [0, 1, 0], clamp);
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', opacity: t, transform: `scale(${1.6 - 0.6 * t})`, transformOrigin: 'center bottom', filter: `blur(${(1 - t) * 6}px)`, color: i >= o.accentFrom ? C.blueD : C.ink }}>
                {ch}
                <span style={{ position: 'absolute', left: '50%', bottom: -10, transform: 'translateX(-50%)', width: `${g * 100}%`, height: 4, background: C.gold, opacity: g, borderRadius: 2 }} />
              </span>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, letterSpacing: '0.16em', color: C.ink2, marginTop: 40, height: 44, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ whiteSpace: 'pre' }}>{o.kicker.slice(0, kickChars)}</span>
          <span style={{ display: 'inline-block', width: 16, height: 32, marginLeft: 6, background: C.gold, opacity: cursorOn ? 0.9 : 0 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
