// S3 ai-stream-response (demos/interaction/ai-stream-response/StreamResponse.tsx) played on the REAL trust
// panel of /owner/match instead of a synthetic dark panel (Q1: no hand-made replica of an existing page).
// Kept: summary lands as one semantic block 18→30f (clip reveal + 10px rise); evidence rows on cues
// 42/53/63/72/80, each body 12f (rise 18px + blur 6→0) with its status icon trailing by 3f (2–4f layering);
// completion 110→120 with a border pulse; camera settles 1.04→1 over 100f. Rows land in their real slots.
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from '../PageCam';
import { Crop, SidebarExtend } from './common';
import layout from '../layout.json';
import { C, FONT, clamp } from '../tokens';

export const STREAM_DEFAULTS = { doneText: '已核對 5 項依據 · 推薦完成' };

const M = layout.match;
const SRC = 'textures/live/match-full.png';
import { STREAM_CUES as ROW_CUES, STREAM_DONE } from '../timeline';
const ease = Easing.bezier(0.2, 0.75, 0.25, 1);
const ROWS = [...M.meters, M.trustStats];
const Z = 2.15; // panel text ~14px CSS → ≥30px on screen
const CX = 1920 - 960 / Z; // keep the page's right edge on screen
const KEYS: CamKey[] = [
  { frame: 0, cx: CX, cy: 700, zoom: Z * 1.04 },
  { frame: 102, cx: CX, cy: 712, zoom: Z },
  { frame: 122, cx: CX, cy: 748, zoom: Z }, // tilt down so the completion pill clears the frame edge
];

const Check: React.FC<{ p: number; x: number; y: number }> = ({ p, x, y }) => {
  const ring = interpolate(p, [0, 0.45, 0.75], [0.36, 1, 0], clamp);
  const fill = interpolate(p, [0.62, 1], [0, 1], clamp);
  const s = interpolate(p, [0.62, 1], [0.72, 1], { ...clamp, easing: ease });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 17, height: 17 }}>
      <div style={{ position: 'absolute', inset: 1, borderRadius: 99, border: `1.5px solid ${C.line}`, borderTopColor: C.gold, opacity: ring, transform: `rotate(${p * 100}deg)` }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 99, background: C.green, opacity: fill, transform: `scale(${s})`, display: 'grid', placeItems: 'center' }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3.4 8.3 6.6 11l6-6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
};

export const AiStream: React.FC<Partial<typeof STREAM_DEFAULTS>> = (p) => {
  const o = { ...STREAM_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const summary = interpolate(frame, [18, 30], [0, 1], { ...clamp, easing: ease });
  const pulse = interpolate(frame, [STREAM_DONE, STREAM_DONE + 5, STREAM_DONE + 10], [0, 1, 0.35], clamp);
  const complete = interpolate(frame, [STREAM_DONE, STREAM_DONE + 10], [0, 1], { ...clamp, easing: ease });
  const R = M.reason;
  const fadeIn = interpolate(frame, [0, 6], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fadeIn }}>
      <PageCam src={SRC} pageH={M.pageH} keys={KEYS} ease={ease}>
        <SidebarExtend pageH={M.pageH} />
        {/* summary: one semantic block, revealed left→right */}
        <div style={{ position: 'absolute', left: R.x - 2, top: R.y - 2, width: R.w + 4, height: R.h + 4, background: '#fff' }} />
        <div style={{ opacity: summary, transform: `translateY(${10 * (1 - summary)}px)`, clipPath: `inset(0 ${100 * (1 - summary)}% 0 0)`, position: 'absolute', inset: 0 }}>
          <Crop src={SRC} pageH={M.pageH} box={R} style={{ borderRadius: 14 }} />
        </div>
        {/* evidence rows: empty slot → row streams in → status icon resolves */}
        {ROWS.map((r, i) => {
          const cue = ROW_CUES[i];
          const body = interpolate(frame, [cue, cue + 12], [0, 1], { ...clamp, easing: ease });
          const status = interpolate(frame, [cue + 3, cue + 11], [0, 1], { ...clamp, easing: ease });
          return (
            <div key={i}>
              <div style={{ position: 'absolute', left: r.x - 4, top: r.y - 4, width: r.w + 8, height: r.h + 8, background: '#fff' }} />
              <div style={{ position: 'absolute', inset: 0, opacity: body, transform: `translateY(${18 * (1 - body)}px)`, filter: `blur(${6 * (1 - body)}px)` }}>
                <Crop src={SRC} pageH={M.pageH} box={r} />
              </div>
              {i < 4 ? <Check p={status} x={M.panel.x + 3} y={r.y + 1} /> : null}
            </div>
          );
        })}
        {/* completion: border pulse + done pill under the evidence */}
        <div style={{ position: 'absolute', left: M.panel.x, top: M.panel.y, width: M.panel.w, height: M.panel.h, borderRadius: 22, boxShadow: `0 0 0 ${2 + pulse * 2}px rgba(217,197,137,${0.25 + pulse * 0.6}), 0 0 ${30 * pulse}px rgba(217,197,137,${0.5 * pulse})` }} />
        <div style={{ position: 'absolute', left: M.panel.x + 12, top: 938, width: M.panel.w - 24, height: 40, background: '#fff', opacity: complete }} />
        <div style={{ position: 'absolute', left: 1267, top: 942, display: 'flex', alignItems: 'center', gap: 8, opacity: complete, transform: `translateY(${5 * (1 - complete)}px)`, fontFamily: FONT }}>
          <div style={{ width: 20, height: 20, borderRadius: 99, background: C.green, display: 'grid', placeItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3.4 8.3 6.6 11l6-6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.green }}>{o.doneText}</span>
        </div>
      </PageCam>
    </AbsoluteFill>
  );
};
