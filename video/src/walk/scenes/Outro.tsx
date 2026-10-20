// S10 outro-group-photo-launch (demos/outro/outro-group-photo-launch/OutroGroupPhotoLaunch.tsx).
// Kept: elements from every shown feature fly in from all sides (cue 4 + 3f steps, 12f flights, FLY_EASE with a
// real overshoot y1>1, later arrivals stack on top, ghost trail, landing glow 0.35→0); the group recedes
// (−12% opacity / −8% saturation) when the wordmark arrives; crane camera rotateX 4°→0 + scale settle then a
// slow push; launch kit = opening light sweep, stage light behind the wordmark, 20 deterministic dust motes;
// background page blurred to 14px; rule grows with extension lines; ≥1s sign-off hold; outro stays caption-free.
// Adapted: the wordmark lands exactly on film beat 90 (`impact` prop = strongest kick) — the film's single
// full-frame slam (R4): one 1.5% group bump + stage-light peak. The app's corgi & shepherd pop in on that beat.
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam } from '../PageCam';
import { CorgiCover, ShepherdCover } from '../Covers';
import layout from '../layout.json';
import { C, FONT, EASE_LAND, clamp } from '../tokens';

export const OUTRO_DEFAULTS = { wordmark: 'Walk 我可遛', accentFrom: 5, tagline: '讓每一次出門，都是一段放心的旅程。' };

const FLY_EASE = Easing.bezier(0.34, 1.4, 0.44, 1);
const CRANE_EASE = Easing.bezier(0.3, 0, 0.2, 1);
type El = { key: string; file: string; w: number; h: number; cx: number; cy: number; scale: number; rot: number; dx: number; dy: number; radius: number; cue: number };
const ELS: El[] = [
  { key: 'hero', file: 'match-item1-hires.png', w: 814, h: 105, cx: 960, cy: 168, scale: 0.66, rot: -1, dx: 0, dy: -240, radius: 16, cue: 4 },
  { key: 'panel', file: 'match-panel.png', w: 512, h: 963, cx: 250, cy: 470, scale: 0.38, rot: -4, dx: -520, dy: 0, radius: 22, cue: 7 },
  { key: 'map', file: 'book-map.png', w: 466, h: 240, cx: 1650, cy: 300, scale: 0.72, rot: 4, dx: 520, dy: 0, radius: 16, cue: 10 },
  { key: 'live', file: 'live-map.png', w: 768, h: 380, cx: 340, cy: 860, scale: 0.44, rot: 3, dx: -420, dy: 300, radius: 16, cue: 13 },
  { key: 'price', file: 'book-price.png', w: 466, h: 235, cx: 1620, cy: 740, scale: 0.7, rot: -3, dx: 450, dy: 260, radius: 16, cue: 16 },
  { key: 'report', file: 'report-card.png', w: 814, h: 342, cx: 720, cy: 955, scale: 0.4, rot: 2, dx: 0, dy: 320, radius: 22, cue: 19 },
  { key: 'alert', file: 'live-row-alert.png', w: 466, h: 80, cx: 1230, cy: 950, scale: 0.9, rot: -1.5, dx: 380, dy: 300, radius: 12, cue: 22 },
];
const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 439 + 137) % 1920, y0: (i * 613 + 271) % 1080, rise: 0.3 + (i % 5) * 0.11, swayAmp: 9 + (i % 4) * 5,
  swayFreq: 0.022 + (i % 3) * 0.008, phase: (i * 0.83) % (Math.PI * 2), size: 3 + (i % 3) * 0.8, opacity: 0.2 + ((i * 7) % 5) * 0.06,
  color: i % 3 === 0 ? C.blue : C.gold,
}));

export const Outro: React.FC<{ duration: number; impact: number } & Partial<typeof OUTRO_DEFAULTS>> = ({ duration, impact, ...p }) => {
  const o = { ...OUTRO_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const I = impact; // wordmark fully set / slam frame
  const letters = o.wordmark.split('');
  const letterDelay = (i: number) => Math.round(I - 22 + i * 1.6);
  const blur = interpolate(frame, [0, 24], [0, 14], { ...clamp, easing: Easing.bezier(0.4, 0, 0.4, 1) });
  const recede = interpolate(frame, [I - 17, I - 9], [0, 1], clamp);
  const rule = interpolate(frame, [I + 1, I + 13], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const ruleExt = interpolate(frame, [I + 1, I + 9], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const ruleExtFade = interpolate(frame, [I + 9, I + 15], [1, 0], clamp);
  const tag = interpolate(frame, [I + 9, I + 21], [0, 1], clamp);
  const fadeOut = interpolate(frame, [duration - 12, duration], [1, 0], clamp);
  const craneT = interpolate(frame, [0, 40], [0, 1], { ...clamp, easing: CRANE_EASE });
  const pushT = interpolate(frame, [40, duration], [0, 1], clamp);
  const bump = interpolate(frame, [I, I + 2, I + 9], [0, 1, 0], clamp);
  const camScale = (1.06 - 0.06 * craneT + 0.035 * pushT) * (1 + 0.015 * bump);
  const camTilt = 4 * (1 - craneT);
  const sweepX = interpolate(frame, [2, 14], [-700, 2020], { ...clamp, easing: Easing.bezier(0.4, 0, 0.6, 1) });
  const sweepOp = interpolate(frame, [2, 5, 11, 14], [0, 0.14, 0.14, 0], clamp);
  const stage = interpolate(frame, [I - 11, I, I + 11], [0, 0.6, 0.28], clamp);
  const vignette = interpolate(frame, [I - 17, I - 5], [0, 0.08], clamp);
  const spacing = interpolate(frame, [I + 3, I + 7], [-0.02, -0.005], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const pop = interpolate(frame, [I - 2, I + 8], [0, 1], { ...clamp, easing: EASE_LAND });

  return (
    <AbsoluteFill style={{ opacity: fadeOut, background: C.bg }}>
      <AbsoluteFill style={{ transform: `perspective(1400px) rotateX(${camTilt}deg) scale(${camScale})`, transformOrigin: '50% 45%' }}>
        <PageCam src="textures/live/match-full.png" pageH={layout.match.pageH} keys={[{ frame: 0, cx: 960, cy: 700, zoom: 0.75 }]} blur={blur} />
        <AbsoluteFill style={{ background: 'radial-gradient(1200px 800px at 50% 46%, rgba(251,250,246,0.9), rgba(251,250,246,0.62) 60%, rgba(236,244,247,0.45))' }} />
        {ELS.map((el) => {
          if (frame < el.cue) return null;
          const t = interpolate(frame, [el.cue, el.cue + 12], [0, 1], { ...clamp, easing: FLY_EASE });
          const lin = interpolate(frame, [el.cue, el.cue + 12], [0, 1], clamp);
          const op = interpolate(frame, [el.cue, el.cue + 3], [0, 1], clamp);
          const x = el.dx * (1 - t), y = el.dy * (1 - t), rot = el.rot * (2 - t), scale = el.scale * (1.12 - 0.12 * t);
          const air = Math.max(0, 1 - t);
          const shadow = `0 ${10 + 26 * air}px ${24 + 46 * air}px rgba(47,63,74,${0.14 + 0.1 * air}), 0 2px 6px rgba(47,63,74,.08)`;
          const glow = interpolate(frame, [el.cue + 12, el.cue + 18], [0.35, 0], clamp);
          const gr = el.w * el.scale * 0.5;
          const box = (extra: React.CSSProperties) => ({ position: 'absolute' as const, left: el.cx - el.w / 2, top: el.cy - el.h / 2, width: el.w, height: el.h, transformOrigin: 'center center', borderRadius: el.radius, overflow: 'hidden' as const, ...extra });
          return (
            <div key={el.key}>
              {lin > 0.05 && lin < 0.95 ? (
                <div style={box({ transform: `translate(${x + el.dx * 0.08}px, ${y + el.dy * 0.08}px) rotate(${rot}deg) scale(${scale})`, opacity: 0.2 * (1 - lin), filter: 'blur(8px)' })}>
                  <Img src={staticFile(`textures/live/${el.file}`)} style={{ width: el.w, height: el.h }} />
                </div>
              ) : null}
              <div style={box({ transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`, boxShadow: shadow, opacity: op * (1 - 0.12 * recede), filter: `saturate(${1 - 0.08 * recede})` })}>
                <Img src={staticFile(`textures/live/${el.file}`)} style={{ width: el.w, height: el.h }} />
              </div>
              {frame >= el.cue + 12 && frame < el.cue + 18 ? <div style={{ position: 'absolute', left: el.cx - gr, top: el.cy - gr, width: gr * 2, height: gr * 2, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,197,137,0.9), rgba(217,197,137,0) 70%)', opacity: glow, mixBlendMode: 'multiply' }} /> : null}
            </div>
          );
        })}
        {/* mascots spring up on the slam beat */}
        <div style={{ position: 'absolute', left: 760 - 115, top: 730 - 100, width: 230, transform: `translateY(${(1 - pop) * 90}px) scale(${0.6 + 0.4 * pop})`, opacity: Math.min(1, pop * 2), transformOrigin: '50% 100%' }}><CorgiCover style={{ width: 230, height: 201 }} /></div>
        <div style={{ position: 'absolute', left: 1160 - 115, top: 730 - 100, width: 230, transform: `translateY(${(1 - pop) * 90}px) scale(${0.6 + 0.4 * pop})`, opacity: Math.min(1, pop * 2), transformOrigin: '50% 100%' }}><ShepherdCover style={{ width: 230, height: 201 }} /></div>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {DUST.map((d, i) => {
          const y = (((d.y0 - frame * d.rise) % 1080) + 1080) % 1080;
          const x = d.x + Math.sin(frame * d.swayFreq + d.phase) * d.swayAmp;
          return <div key={i} style={{ position: 'absolute', left: x, top: y, width: d.size, height: d.size, borderRadius: '50%', background: d.color, opacity: d.opacity }} />;
        })}
      </AbsoluteFill>
      {sweepOp > 0 ? (
        <AbsoluteFill style={{ mixBlendMode: 'overlay' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: sweepX - 300, width: 600, background: 'linear-gradient(90deg, rgba(255,248,230,0), rgba(255,248,230,1) 50%, rgba(255,248,230,0))', opacity: sweepOp }} />
        </AbsoluteFill>
      ) : null}
      {stage > 0 ? <AbsoluteFill style={{ background: 'radial-gradient(760px 340px at 960px 420px, rgba(255,250,236,0.98), rgba(255,250,236,0.4) 55%, rgba(255,250,236,0) 75%)', opacity: stage }} /> : null}
      {vignette > 0 ? <AbsoluteFill style={{ background: 'radial-gradient(1400px 900px at 50% 50%, rgba(47,63,74,0) 55%, rgba(47,63,74,0.7) 100%)', opacity: vignette }} /> : null}

      <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 168, fontWeight: 900, color: C.ink, letterSpacing: `${spacing}em`, display: 'inline-flex', lineHeight: 1 }}>
          {letters.map((ch, i) => {
            const d = letterDelay(i);
            const t = interpolate(frame, [d, d + 8], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.75, 0.3, 1) });
            return <span key={i} style={{ opacity: t, transform: `translateY(${(1 - t) * 28}px) scale(${1.35 - 0.35 * t})`, filter: `blur(${(1 - t) * 8}px)`, display: 'inline-block', whiteSpace: 'pre', color: i >= o.accentFrom ? C.blueD : C.ink }}>{ch}</span>;
          })}
        </div>
        <div style={{ position: 'relative', height: 8, width: 280, margin: '38px auto 0' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: C.gold, transform: `scaleX(${rule})` }} />
          {ruleExt > 0 && ruleExtFade > 0 ? (
            <>
              <div style={{ position: 'absolute', top: 3.5, height: 1.5, right: '100%', width: 200 * ruleExt, background: C.gold, opacity: ruleExtFade }} />
              <div style={{ position: 'absolute', top: 3.5, height: 1.5, left: '100%', width: 200 * ruleExt, background: C.gold, opacity: ruleExtFade }} />
            </>
          ) : null}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 700, color: C.ink2, marginTop: 30, opacity: tag, letterSpacing: '0.04em' }}>{o.tagline}</div>
      </div>
    </AbsoluteFill>
  );
};
