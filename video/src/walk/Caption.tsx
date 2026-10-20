// Bottom narration strip (template Caption grammar, re-skinned): frosted white pill, 58px Noto Sans TC
// (Q11: narration ≥56px effective height), gentle push in/out.
import { interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, EASE_IN, clamp } from './tokens';

export const CAPTION_DEFAULTS = { fontSize: 58, color: C.ink, accent: C.goldD, bottom: 64 };

export const Caption: React.FC<{ text: string; duration: number } & Partial<typeof CAPTION_DEFAULTS>> = ({ text, duration, ...p }) => {
  const o = { ...CAPTION_DEFAULTS, ...p };
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: EASE_IN });
  const out = interpolate(frame, [duration - 8, duration], [1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: o.bottom, display: 'flex', justifyContent: 'center', opacity: inT * out, transform: `translateY(${(1 - inT) * 18 + (1 - out) * -8}px)`, pointerEvents: 'none' }}>
      <div
        style={{
          fontFamily: FONT, fontSize: o.fontSize, fontWeight: 700, color: o.color, letterSpacing: '0.02em', lineHeight: 1.25,
          padding: '18px 44px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.9)',
          boxShadow: '0 12px 40px rgba(47,63,74,0.16), inset 0 0 0 1px rgba(232,236,236,0.9)',
          display: 'flex', alignItems: 'center', gap: 22,
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 7, background: o.accent, flex: 'none' }} />
        {text}
      </div>
    </div>
  );
};
