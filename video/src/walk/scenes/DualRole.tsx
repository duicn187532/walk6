// S8b segmented-thumb-hero (demos/interaction/segmented-thumb-hero/SegmentedThumbHero.tsx), re-skinned as the
// app's own role switch (sidebar `.role-switch`: #f2f5f6 track, white thumb, gold dot on the active side).
// Kept (命门): spring float-in 0–18 from +200px; oversized outlined arrow cursor glides in 20–44 (out-cubic);
// press at 48 (scale −14%); thumb slides 52→60 (~8f out-cubic); new icon springs in at 60 while the old icon
// collapses by WIDTH and scale together (no ghost gap); click ripple above the thumb, locked to the click point.
// Icons = the app's corgi (owner) and German Shepherd (walker) mascots — the "reward" half of the beat.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { CorgiCover, ShepherdCover } from '../Covers';
import { C, FONT, HERO_BG, clamp } from '../tokens';

export const DUAL_DEFAULTS = { left: '我是飼主', right: '我是遛狗者', who: '小晴 · 同一個帳號' };

const CW = 1240, CH = 240, PAD = 18;
const SEGW = (CW - PAD * 2) / 2;
const ICON = 150;

const Cursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg width={130} height={150} viewBox="0 0 26 30" style={{ position: 'absolute', left: x, top: y, transform: `scale(${1 - press * 0.14})`, transformOrigin: '15% 10%', filter: 'drop-shadow(0 8px 16px rgba(47,63,74,0.25))' }}>
    <path d="M4 2 L4 24 L9.5 18.5 L13 27 L16.8 25.4 L13.3 17 L21 17 Z" fill="#fff" stroke={C.ink} strokeWidth={1.8} strokeLinejoin="round" />
  </svg>
);

export const DualRole: React.FC<Partial<typeof DUAL_DEFAULTS>> = (p) => {
  const o = { ...DUAL_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const CLICK = 48, SLIDE = 52, SLIDE_END = 60;
  const floatT = spring({ frame, fps, config: { damping: 14, stiffness: 120, mass: 0.9 } });
  const ctrlY = interpolate(floatT, [0, 1], [200, 0]);
  const curT = interpolate(frame, [20, 44], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ctrlLeft = (1920 - CW) / 2, ctrlTop = 540 - CH / 2 + 40;
  // click lands at the segment's lower-right so the cursor never covers the new label
  const CLICK_DX = SEGW * 1.5 + 200, CLICK_DY = CH / 2 + 46;
  const clickX = ctrlLeft + PAD + CLICK_DX - PAD, clickY = ctrlTop + CLICK_DY;
  // cursor svg tip sits at ≈(20px, 12px) of its box
  const curX = interpolate(curT, [0, 1], [1800, clickX - 20]);
  const curY = interpolate(curT, [0, 1], [1080, clickY - 12]);
  const press = interpolate(frame, [CLICK, CLICK + 3, CLICK + 7], [0, 1, 0], clamp);
  const thumbT = interpolate(frame, [SLIDE, SLIDE_END], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const iconIn = frame >= SLIDE_END ? spring({ frame: frame - SLIDE_END, fps, config: { damping: 10, stiffness: 220, mass: 0.6 } }) : 0;
  const leftIcon = interpolate(frame, [SLIDE, SLIDE + 6], [1, 0], { ...clamp, easing: Easing.in(Easing.cubic) });
  const ripple = interpolate(frame, [CLICK, CLICK + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const rightActive = thumbT >= 0.5;
  const whoIn = interpolate(frame, [6, 20], [0, 1], { ...clamp, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) });

  const label = (active: boolean): React.CSSProperties => ({
    width: SEGW, height: CH - PAD * 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
    fontFamily: FONT, fontWeight: 900, fontSize: 70, color: active ? C.ink : '#9aabb5', position: 'relative', zIndex: 2,
  });
  const dot = (active: boolean) => <span style={{ width: 18, height: 18, borderRadius: 9, background: active ? C.goldD : '#c9d5dc', flex: 'none' }} />;

  return (
    <AbsoluteFill style={{ background: HERO_BG }}>
      <AbsoluteFill style={{ background: 'radial-gradient(1000px 640px at 50% 52%, rgba(255,255,255,0.8), transparent 72%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: ctrlTop - 120, display: 'flex', justifyContent: 'center', opacity: whoIn, transform: `translateY(${(1 - whoIn) * 16}px)` }}>
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: C.ink2, background: C.goldL, border: '2px solid #f0e6c6', borderRadius: 999, padding: '10px 30px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: C.goldD }} />{o.who}
        </div>
      </div>
      <div style={{ position: 'absolute', left: ctrlLeft, top: ctrlTop, width: CW, height: CH, borderRadius: CH / 2, background: '#f2f5f6', border: '3px solid #e4eaec', boxShadow: `0 ${26 - floatT * 12}px ${72 - floatT * 20}px rgba(47,63,74,0.18)`, transform: `translateY(${ctrlY}px)`, opacity: Math.min(1, floatT * 1.5), display: 'flex', alignItems: 'center', padding: PAD, boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', left: PAD + thumbT * SEGW, top: PAD, width: SEGW, height: CH - PAD * 2, borderRadius: (CH - PAD * 2) / 2, background: '#fff', boxShadow: '0 6px 20px rgba(47,63,74,0.14)', zIndex: 1 }} />
        {ripple > 0 && ripple < 1 ? <div style={{ position: 'absolute', left: CLICK_DX - 140 * ripple, top: CLICK_DY - 140 * ripple, width: 280 * ripple, height: 280 * ripple, borderRadius: '50%', border: `4px solid ${C.goldD}`, opacity: 1 - ripple, zIndex: 3 }} /> : null}
        <div style={label(!rightActive)}>
          <span style={{ display: 'inline-flex', width: leftIcon < 0.05 ? 0 : ICON, height: ICON, transform: `scale(${leftIcon})` }}><CorgiCover style={{ width: ICON, height: ICON * 0.875 }} /></span>
          {dot(!rightActive)}{o.left}
        </div>
        <div style={label(rightActive)}>
          <span style={{ display: 'inline-flex', width: iconIn < 0.05 ? 0 : ICON, height: ICON, transform: `scale(${iconIn})` }}><ShepherdCover style={{ width: ICON, height: ICON * 0.875 }} /></span>
          {dot(rightActive)}{o.right}
        </div>
      </div>
      <Cursor x={curX} y={curY} press={press} />
    </AbsoluteFill>
  );
};
