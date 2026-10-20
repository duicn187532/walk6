// S9 document-typewriter-reveal (demos/ui-entrance/document-typewriter-reveal/DocumentTypewriterReveal.tsx)
// on the REAL /owner/report page — the AI care report "writes itself".
// Kept: every block wipes in behind a single accent caret riding the reveal edge (only one pen tip); a side
// rail is revealed by a page-colour patch shrinking downward with an accent inner line that grows then fades.
// Adapted (review fixes Q10 + Q11 together): the camera OPENS wide on the complete layout (page title, report
// card, right rail being revealed), then pushes in to the report body (zoom 2.25 → ~32px effective text) and
// the six report lines write there at REPORT_CUE(i)=40+i·7 over 10f. No screen-space kicker (it overlapped
// the page's own controls).
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { PageCam, CamKey } from '../PageCam';
import { SidebarExtend } from './common';
import layout from '../layout.json';
import { C, clamp } from '../tokens';
import { REPORT_CUE, REPORT_WIPE } from '../timeline';

const R = layout.report;
const lines = R.lines as { x: number; y: number; w: number; h: number }[];
const PANEL = '#f9fbfb'; // .report-text background
const TX = R.reportText.x + R.reportText.w / 2;
const TY = R.reportText.y + R.reportText.h / 2;
const KEYS: CamKey[] = [
  { frame: 0, cx: 1000, cy: 560, zoom: 1.15 },
  { frame: 22, cx: 1000, cy: 560, zoom: 1.16 },
  { frame: 38, cx: TX, cy: TY, zoom: 2.36 },
  { frame: 150, cx: TX + 4, cy: TY + 4, zoom: 2.4 },
];
const REVEAL = Easing.bezier(0.4, 0, 0.6, 1);

export const ReportWrite: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 6], [0, 1], clamp);
  let caretIdx = -1;
  lines.forEach((_, i) => { if (frame >= REPORT_CUE(i) && frame <= REPORT_CUE(i) + REPORT_WIPE + 2) caretIdx = i; });
  const rail = R.rightRail;
  const railT = interpolate(frame, [6, 18], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const railLine = interpolate(frame, [18, 32], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fadeIn }}>
      <PageCam src="textures/live/report-full.png" pageH={R.pageH} keys={KEYS}>
        <SidebarExtend pageH={R.pageH} />
        {lines.map((l, i) => {
          const cue = REPORT_CUE(i);
          const cover = interpolate(frame, [cue, cue + REPORT_WIPE], [1, 0], { ...clamp, easing: REVEAL });
          const bx = l.x - 4, bw = l.w + 12;
          const caretX = bx + bw * (1 - cover);
          return (
            <div key={i}>
              {cover > 0 ? (
                <div style={{ position: 'absolute', left: bx, top: l.y - 4, width: bw, height: l.h + 10, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${cover * 100}%`, background: PANEL }} />
                </div>
              ) : null}
              {i === caretIdx ? <div style={{ position: 'absolute', left: caretX, top: l.y, width: 2, height: 21, background: C.goldD, opacity: cover > 0 ? 1 : interpolate(frame, [cue + REPORT_WIPE, cue + REPORT_WIPE + 2], [1, 0], clamp) }} /> : null}
            </div>
          );
        })}
        {railT < 1 ? <div style={{ position: 'absolute', left: rail.x - 6, top: rail.y + rail.h * railT, width: rail.w + 12, height: rail.h * (1 - railT) + 6, background: C.bg }} /> : null}
        {frame >= 6 && railLine > 0 ? <div style={{ position: 'absolute', left: rail.x - 10, top: rail.y, width: 2, height: rail.h * railT, background: C.gold, opacity: railLine }} /> : null}
      </PageCam>
    </AbsoluteFill>
  );
};
