// Visual tokens lifted from the product (web/src/styles.css) — the film re-skins every card with these.
import { loadFont } from '@remotion/google-fonts/NotoSansTC';
import { Easing } from 'remotion';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '700', '900'], ignoreTooManyRequestsWarning: true });
export const FONT = `${fontFamily}, "Microsoft JhengHei", sans-serif`;

export const C = {
  bg: '#fbfaf6',
  surface: '#ffffff',
  ink: '#2f3f4a',
  ink2: '#536674',
  muted: '#8b9aa3',
  line: '#e8ecec',
  blue: '#88a8bc',
  blueD: '#5f86a0',
  blueL: '#eaf2f6',
  gold: '#d9c589',
  goldD: '#b29a58',
  goldL: '#f8f3e4',
  goldDeep: '#9a7f3e', // gold that holds 4.5:1 on the warm white (accent words)
  green: '#6f9a82',
  red: '#c77e73',
};
export const HERO_BG = 'linear-gradient(105deg, #ecf4f7 0%, #f6f8f3 58%, #faf2e2 100%)';

// motion personality: 親和友好 preset (≈26f, gentle overshoot 1.04)
export const EASE_IN = Easing.bezier(0.25, 0.46, 0.45, 0.94);
export const EASE_LAND = Easing.bezier(0.34, 1.4, 0.44, 1); // landing metaphors: y1 > 1
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
