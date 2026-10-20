// S2 spotlight-hero-card (demos/opening/spotlight-hero-card/SpotlightHeroCard.tsx) on the real /owner/match page.
// Kept (命门): roving spotlight → lock (pool collapse + lock pulse + vignette) by f32; 16f oblique push-in
// (rotY-dominant left view + slight rotX); rise 48→58 with POP overshoot, sin-bob hover, reseat 112→130 with a
// micro press; two perimeter-beam laps (60→74 fast/bright, 80→100 slower/weaker) clipped to the card radius;
// 4x hero texture crossfades in 32→38 (Q2); 3D page-space annotation with marker highlight during the hover.
// Adapted: card is the wide TOP-1 walker row (814×105) → zoom 1.75 / rotY 24°; warm-gold brand light; the
// annotation floats above the card (the sidebar occupies the space to its left).
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from '../PageCam';
import { SidebarExtend } from './common';
import layout from '../layout.json';
import { C, FONT, clamp } from '../tokens';

export const HERO_DEFAULTS = { noteLine1: '一張卡，', noteLine2: '一位對的夥伴。' };

const PAGE_H = layout.match.pageH;
const CARD = layout.match.items[0];
const MCX = CARD.x + CARD.w / 2;
const MCY = CARD.y + CARD.h / 2;
const RADIUS = 16;
const GOLD_GLOW = 'rgba(217,197,137,0.9)';

const CAM_KEYS: CamKey[] = [
  { frame: 0, cx: 960, cy: 540, zoom: 0.78, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: 32, cx: 960, cy: 540, zoom: 0.78, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: 48, cx: MCX - 40, cy: MCY - 18, zoom: 1.75, rotX: 6, rotY: 24, rotZ: 1.5, persp: 1200 },
  { frame: 400, cx: MCX - 40, cy: MCY - 18, zoom: 1.75, rotX: 6, rotY: 24, rotZ: 1.5, persp: 1200 },
];
const PUSH_EASE = Easing.bezier(0.35, 0, 0.2, 1);
const POP_EASE = Easing.bezier(0.2, 1.25, 0.3, 1);
const RESEAT_EASE = Easing.bezier(0.4, 0, 0.3, 1.05);

// spotlight waypoints in screen % of the straight-on view; final lock = card centre (44%, 49%)
const LOCK_X = ((960 + (MCX - 960) * 0.78) / 1920) * 100;
const LOCK_Y = ((540 + (MCY - 540) * 0.78) / 1080) * 100;

export const HeroCard: React.FC<Partial<typeof HERO_DEFAULTS>> = (p) => {
  const o = { ...HERO_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const macroIn = interpolate(frame, [0, 8], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const spotEase = Easing.bezier(0.4, 0, 0.3, 1);
  const spotX = interpolate(frame, [4, 8, 16, 22, 28, 48], [25, 25, 70, 38, LOCK_X, 50], { ...clamp, easing: spotEase });
  const spotY = interpolate(frame, [4, 8, 16, 22, 28, 48], [30, 30, 62, 66, LOCK_Y, 50], { ...clamp, easing: spotEase });
  const spotOn = interpolate(frame, [2, 10], [0, 1], clamp);
  const poolBase = interpolate(frame, [22, 32, 48], [620, 420, 520], { ...clamp, easing: Easing.bezier(0.4, 0, 0.3, 1) });
  const poolPulse = interpolate(frame, [32, 36, 41], [0, 0.06, 0], clamp);
  const poolRx = poolBase * 1.5 * (1 + poolPulse);
  const poolRy = poolBase * 0.62 * (1 + poolPulse);
  const vignette = interpolate(frame, [22, 32, 48], [0.08, 0.16, 0.12], clamp); // brand light scene: keep the dim gentle

  const rise = interpolate(frame, [48, 58], [0, 1], { ...clamp, easing: POP_EASE });
  const reseat = interpolate(frame, [112, 130], [0, 1], { ...clamp, easing: RESEAT_EASE });
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((frame - 58) / 40) * Math.PI * 2) * 4 * lift;
  const z = 90 * lift + bob;
  const landed = frame >= 130;
  const press = interpolate(frame, [126, 129, 130], [1, 0.997, 1], clamp);
  const shadow = `0 ${8 * lift}px ${10 + 12 * lift}px rgba(47,63,74,${0.16 * lift}), 0 ${40 * lift}px ${80 * lift}px rgba(47,63,74,${0.2 * lift})`;
  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = interpolate(frame, [126, 130, 134], [0, 1, 0], clamp);
  const slotEdge = Math.min(1, 0.4 * (1 - reseat)) + landPulse * 0.6;

  const beam1Prog = interpolate(frame, [60, 74], [0, 1], clamp);
  const beam1On = frame >= 59 && frame <= 75;
  const beam2Prog = interpolate(frame, [80, 100], [0, 1], { ...clamp, easing: Easing.bezier(0.4, 0, 0.4, 1) });
  const beam2On = frame >= 79 && frame <= 101;
  const beamTrail = interpolate(frame, [100, 112], [0.35, 0], clamp);
  const bw = CARD.w + 6, bh = CARD.h + 6;
  const hiresIn = interpolate(frame, [32, 38], [0, 1], clamp);

  const noteIn = interpolate(frame, [60, 70], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.75, 0.3, 1) });
  const noteOut = interpolate(frame, [116, 126], [1, 0], clamp);
  const noteVis = noteIn * noteOut;
  const noteZ = 80 + Math.sin(((frame - 60) / 44) * Math.PI * 2) * 3;
  const hl = interpolate(frame, [74, 86], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill style={{ opacity: macroIn }}>
        <PageCam src="textures/live/match-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={PUSH_EASE}>
          <SidebarExtend pageH={PAGE_H} />
          <div style={{ transformStyle: 'preserve-3d' }}>
            {slotVis > 0.02 ? (
              <div style={{ position: 'absolute', left: CARD.x - 2, top: CARD.y - 2, width: CARD.w + 4, height: CARD.h + 4, background: '#f6f7f4', borderRadius: RADIUS, boxShadow: `inset 0 0 26px rgba(178,154,88,${0.14 * slotEdge})`, opacity: slotVis }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, border: `1.5px solid ${C.gold}`, opacity: slotEdge }} />
              </div>
            ) : null}
            <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, transform: `translateZ(${z}px) scale(${press})`, transformStyle: 'preserve-3d' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, overflow: 'hidden', boxShadow: landed ? 'none' : shadow }}>
                <Img src={staticFile('textures/live/match-item1.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <Img src={staticFile('textures/live/match-item1-hires.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: hiresIn }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.45), transparent 40%)', opacity: lift }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.7 * lift})` }} />
              {(beam1On || beam2On) && lift > 0.4 ? (
                <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} style={{ position: 'absolute', left: -3, top: -3, overflow: 'visible', opacity: beam1On ? 1 : 0.62, filter: `drop-shadow(0 0 6px ${C.goldD}) drop-shadow(0 0 18px ${GOLD_GLOW})` }}>
                  <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke={C.goldD} strokeWidth={beam1On ? 5 : 3.5} strokeLinecap="round" pathLength={1} strokeDasharray="0.14 1" strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)} />
                  <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke="rgba(255,250,236,0.98)" strokeWidth={beam1On ? 2.5 : 1.75} strokeLinecap="round" pathLength={1} strokeDasharray="0.14 1" strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)} />
                </svg>
              ) : null}
              {beamTrail > 0.01 ? <div style={{ position: 'absolute', inset: -3, borderRadius: RADIUS + 3, border: `1.5px solid ${C.goldD}`, opacity: beamTrail }} /> : null}
            </div>
          </div>
          {noteVis > 0.01 ? (
            <div style={{ transformStyle: 'preserve-3d', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 440, top: 452, width: 300, height: 40, transform: 'translateZ(2px)', background: 'radial-gradient(ellipse at 50% 50%, rgba(47,63,74,0.28), transparent 70%)', filter: 'blur(12px)', opacity: 0.5 * noteVis }} />
              <div style={{ position: 'absolute', left: 410, top: 352, transform: `translateZ(${noteZ}px) translateY(${(1 - noteIn) * 26}px)`, opacity: noteVis, filter: `blur(${(1 - noteIn) * 4}px)`, fontFamily: FONT, fontSize: 40, fontWeight: 900, color: C.ink, lineHeight: 1.18, display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap', padding: '14px 24px', borderRadius: 18, background: 'rgba(255,255,255,0.94)', boxShadow: '0 18px 40px rgba(47,63,74,0.16), inset 0 0 0 1px rgba(232,236,236,0.9)' }}>
                <span>{o.noteLine1}</span>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{ position: 'absolute', left: -5, top: '18%', bottom: '2%', width: `calc(${hl} * (100% + 10px))`, background: '#f2e2a8', borderRadius: 4 }} />
                  <span style={{ position: 'relative' }}>{o.noteLine2}</span>
                </span>
              </div>
            </div>
          ) : null}
        </PageCam>
        <AbsoluteFill style={{ background: `radial-gradient(${poolRx}px ${poolRy}px at ${spotX}% ${spotY}%, rgba(255,250,232,0.4), rgba(255,250,232,0.08) 45%, rgba(47,63,74,${vignette * spotOn}) 100%)`, opacity: spotOn, pointerEvents: 'none' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
