// S6 custom shot (no matching card — recorded in docs/design-spec.md §5): live GPS on the REAL /owner/live map.
// The real trail/marker were hidden at capture; the planned route polyline was sampled into page coords
// (layout.live.route, 161 pts via getPointAtLength·getScreenCTM). The film draws the walked trail along that
// exact path with a moving dog marker, under a slow push borrowed from tension-camera-moves/slow-push-in
// (zoom ×1.14, Easing.in(quad)) but WITHOUT its darkening vignette — this beat should feel reassuring, not tense.
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from '../PageCam';
import layout from '../layout.json';
import { C, clamp } from '../tokens';

export const LIVE_DEFAULTS = { dog: '🐕', trailColor: '#d1a94a', endProgress: 0.92 };

const L = layout.live;
const MAP = L.mapBox;
const ROUTE = L.route as [number, number][];
const KEYS: CamKey[] = [
  { frame: 0, cx: 820, cy: 500, zoom: 1.6 },
  { frame: 150, cx: 830, cy: 505, zoom: 1.6 * 1.14 },
];

// cumulative arc length → point at fraction p
const SEG = ROUTE.slice(1).map((q, i) => Math.hypot(q[0] - ROUTE[i][0], q[1] - ROUTE[i][1]));
const TOTAL_LEN = SEG.reduce((a, b) => a + b, 0);
function pathTo(p: number) {
  let left = TOTAL_LEN * p;
  const pts: [number, number][] = [ROUTE[0]];
  for (let i = 0; i < SEG.length; i++) {
    if (left <= SEG[i]) {
      const f = SEG[i] ? left / SEG[i] : 0;
      pts.push([ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * f, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * f]);
      return pts;
    }
    left -= SEG[i];
    pts.push(ROUTE[i + 1]);
  }
  return pts;
}

export const LiveTrail: React.FC<Partial<typeof LIVE_DEFAULTS>> = (p) => {
  const o = { ...LIVE_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 6], [0, 1], clamp);
  const prog = interpolate(frame, [12, 132], [0, o.endProgress], { ...clamp, easing: Easing.bezier(0.45, 0, 0.55, 1) });
  const pts = pathTo(prog);
  const head = pts[pts.length - 1];
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${(q[0] - MAP.x).toFixed(1)} ${(q[1] - MAP.y).toFixed(1)}`).join(' ');
  const markerIn = interpolate(frame, [8, 16], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.4, 0.44, 1) });
  const pulse = (frame % 30) / 30;

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fadeIn }}>
      <PageCam src="textures/live/live-full.png" pageH={L.pageH} keys={KEYS} ease={Easing.in(Easing.quad)}>
        <div style={{ position: 'absolute', left: MAP.x, top: MAP.y, width: MAP.w, height: MAP.h, overflow: 'hidden', borderRadius: 16 }}>
          <svg width={MAP.w} height={MAP.h} style={{ position: 'absolute', inset: 0 }}>
            <path d={d} fill="none" stroke="rgba(209,169,74,0.35)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke={o.trailColor} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ position: 'absolute', left: head[0] - MAP.x, top: head[1] - MAP.y, transform: `translate(-50%,-50%) scale(${markerIn})` }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 36 + 30 * pulse, height: 36 + 30 * pulse, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `rgba(217,197,137,${0.45 * (1 - pulse)})` }} />
            <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 12px rgba(47,63,74,.3)', display: 'grid', placeItems: 'center', fontSize: 20 }}>{o.dog}</div>
          </div>
        </div>
      </PageCam>
    </AbsoluteFill>
  );
};
