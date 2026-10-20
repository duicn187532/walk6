// S7 row-embed (demos/ui-entrance/row-embed/RowEmbed.tsx) on the REAL live-walk update timeline.
// Kept (命门): 12f flight with perspective translateY(−120·air) + rotateX(16°·air) +
// scale 1.06→0.995 then press back to 1; empty-slot patch until 2f after landing; 2px accent seam opening from
// the centre on touchdown, clipped inside the card; camera pans steadily down. Flyers are texture crops (Q1).
// Adapted: the off-route alert row gets one red focus ring after it lands (the shot's key information).
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import React from 'react';
import { PageCam, CamKey } from '../PageCam';
import layout from '../layout.json';
import { C, clamp } from '../tokens';
import { ROW_CUES } from '../timeline';

const L = layout.live;
const rows = L.rows;
const TL = L.timelineCard;
const SRC = staticFile('textures/live/live-full.png');
const ALERT = 1;
const KEYS: CamKey[] = [
  { frame: 0, cx: 1500, cy: 700, zoom: 2.25 },
  { frame: 68, cx: 1500, cy: 762, zoom: 2.2 },
  { frame: 120, cx: 1500, cy: 766, zoom: 2.17 },
];
const FLY_EASE = Easing.bezier(0.3, 0, 0.25, 1);

export const RowsEmbed: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 6], [0, 1], clamp);
  const a = rows[ALERT];
  const alertLand = ROW_CUES[ALERT] + 12;
  const ring = interpolate(frame, [alertLand + 4, alertLand + 14, alertLand + 40, alertLand + 60], [0, 1, 1, 0.35], clamp);
  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fadeIn }}>
      <PageCam src="textures/live/live-full.png" pageH={L.pageH} keys={KEYS} ease={Easing.linear}>
        {rows.map((r, i) => {
          const cue = ROW_CUES[i]; // accelerating drops (R2)
          const land = cue + 12;
          const patch = interpolate(frame, [land, land + 2], [1, 0], clamp);
          let flyer: React.ReactNode = null;
          if (frame >= cue && frame < cue + 16) {
            const p = interpolate(frame, [cue, cue + 12], [0, 1], { ...clamp, easing: FLY_EASE });
            const appear = interpolate(frame, [cue, cue + 3], [0, 1], clamp);
            const scale = frame < land ? 1.06 - 0.065 * p : interpolate(frame, [land, land + 4], [0.995, 1], { ...clamp, easing: Easing.out(Easing.quad) });
            const air = 1 - p;
            flyer = (
              <div style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 10, backgroundColor: '#fff', backgroundImage: `url(${SRC})`, backgroundSize: `1920px ${L.pageH}px`, backgroundPosition: `-${r.x}px -${r.y}px`, opacity: appear, transform: `perspective(900px) translateY(${-120 * air}px) rotateX(${16 * air}deg) scale(${scale})`, boxShadow: `0 ${30 * air}px ${60 * air}px rgba(47,63,74,${0.2 * air}), 0 ${8 * air}px ${16 * air}px rgba(47,63,74,${0.1 * air})` }} />
            );
          }
          let seam: React.ReactNode = null;
          if (frame >= land && frame < land + 8) {
            const spread = interpolate(frame, [land, land + 5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
            const op = interpolate(frame, [land, land + 2, land + 8], [1, 1, 0], clamp);
            seam = <div style={{ position: 'absolute', left: r.x + (r.w * (1 - spread)) / 2, top: r.y + r.h - 2, width: r.w * spread, height: 2, background: i === ALERT ? C.red : C.gold, boxShadow: `0 0 6px ${i === ALERT ? 'rgba(199,126,115,.4)' : 'rgba(178,154,88,.35)'}`, opacity: op }} />;
          }
          return (
            <React.Fragment key={i}>
              {patch > 0 ? <div style={{ position: 'absolute', left: r.x - 6, top: r.y - 2, width: Math.min(r.w + 16, TL.x + TL.w - r.x + 4), height: r.h + 4, background: '#fff', opacity: patch }} /> : null}
              {flyer}
              {seam}
            </React.Fragment>
          );
        })}
        {ring > 0 ? <div style={{ position: 'absolute', left: a.x - 8, top: a.y - 2, width: a.w + 14, height: a.h + 2, borderRadius: 12, boxShadow: `0 0 0 2px rgba(199,126,115,${0.85 * ring}), 0 0 22px rgba(199,126,115,${0.35 * ring})`, background: `rgba(251,239,236,${0.35 * ring})`, mixBlendMode: 'multiply' }} /> : null}
      </PageCam>
    </AbsoluteFill>
  );
};
