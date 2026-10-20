// paper-title-card (demos/typography/paper-title-card) re-skinned to the product: hero gradient instead of
// paper, Noto Sans TC 900, gold accent word, gold rule. Timing kept from the demo: word i delay 4+i·4 over
// 9f with scale 1.28→1 + blur 7→0; rule 16→34f; fade the last 8f.
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, FONT, HERO_BG, clamp } from './tokens';

export const TITLE_DEFAULTS = { fontSize: 104, color: C.ink, accent: C.goldDeep, rule: C.gold };

// `*詞*` marks the accent word; CJK copy is split into short phrase chunks at punctuation/spaces.
export const parseWords = (text: string) =>
  text.split(/\s+/).filter(Boolean).flatMap((w) => {
    const m = w.match(/^\*(.+)\*(.*)$/);
    if (m) return [{ text: m[1], accent: true }, ...(m[2] ? [{ text: m[2] }] : [])];
    return w.split(/(?<=[，、。])/).filter(Boolean).map((t) => ({ text: t }));
  });

export const TitleCard: React.FC<{ text: string; duration: number } & Partial<typeof TITLE_DEFAULTS>> = ({ text, duration, ...p }) => {
  const o = { ...TITLE_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const words = parseWords(text);
  const fadeOut = interpolate(frame, [duration - 8, duration], [1, 0], clamp);
  const rule = interpolate(frame, [16, 34], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  return (
    <AbsoluteFill style={{ background: HERO_BG, justifyContent: 'center', alignItems: 'center', opacity: fadeOut }}>
      <AbsoluteFill style={{ background: 'radial-gradient(1100px 700px at 50% 44%, rgba(255,255,255,0.75), transparent 70%)' }} />
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{ fontFamily: FONT, fontSize: o.fontSize, fontWeight: 900, lineHeight: 1.2, color: o.color, letterSpacing: '0.01em', display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
          {words.map((w, i) => {
            const delay = 4 + i * 4;
            const t = interpolate(frame, [delay, delay + 9], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.75, 0.3, 1) });
            return (
              <span key={i} style={{ display: 'inline-block', opacity: t, transform: `scale(${1.28 - 0.28 * t})`, filter: `blur(${(1 - t) * 7}px)`, color: w.accent ? o.accent : undefined, whiteSpace: 'pre' }}>
                {w.text}
              </span>
            );
          })}
        </div>
        <div style={{ height: 8, width: 240, margin: '40px auto 0', borderRadius: 4, background: o.rule, transform: `scaleX(${rule})` }} />
      </div>
    </AbsoluteFill>
  );
};
