// Walk 我可遛 promo — single source of truth for timing (shots, captions, title cards, SFX).
// Music first: every shot boundary is an integer beat of the BGM grid (analysis/beat_data.json).
export const FPS = 30;

// --- beat grid (music-beat-sync §4) ---
// Source analysis (house-vibez.mp3): t0 = 0.0669047s, T = 0.4917955s (122.00 BPM). The film plays the
// track from SOURCE beat 104 via <Audio startFrom={BGM_START_FROM}>, so film beat n = source beat 104+n.
export const BEAT_INT = 0.4917954637470821;
const SOURCE_T0 = 0.0669046672577211;
export const BGM_SOURCE_BEAT = 104;
export const BGM_START_FROM = 1536; // frames into the source file (= floor((t0+104T)·30))
export const FILM_BEAT0 = SOURCE_T0 + BGM_SOURCE_BEAT * BEAT_INT - BGM_START_FROM / FPS; // ≈0.01363s
// Output-track lag measured on draft3 (analysis/check_render.py): +1.28f on 3 SFX probes (spread 0.02f) =
// AAC priming 2048 samples @48kHz. Pipeline: Remotion 4.0.484 · AAC · 48kHz · mp4. Re-measure if any of those change.
export const OUTPUT_AUDIO_OFFSET_SEC = 2048 / 48000;
export const beatT = (n: number) => FILM_BEAT0 + OUTPUT_AUDIO_OFFSET_SEC + n * BEAT_INT;
export const beatF = (n: number) => Math.round(beatT(n) * FPS);

const shot = (b0: number, b1: number) => ({ beats: [b0, b1] as const, from: beatF(b0), duration: beatF(b1) - beatF(b0) });

export const SHOTS = {
  open: shot(0, 8), //       brand-ink-open
  hero: shot(8, 20), //      spotlight-hero-card (AI 推薦主角)
  stream: shot(20, 30), //   ai-stream-response (推薦理由 + 因子)
  book: shot(30, 42), //     cursor-flyover (預約・路線・收費)
  cardLive: shot(42, 46), // title card ①
  live: shot(46, 56), //     custom live GPS trail
  rows: shot(56, 63), //     row-embed (回報 + 偏離提醒)
  cardDual: shot(63, 67), // title card ②
  dual: shot(67, 76), //     segmented-thumb-hero (飼主 ⇄ 遛狗者)
  report: shot(76, 86), //   document-typewriter-reveal (AI 照護報告)
  outro: shot(86, 98), //    outro-group-photo-launch
} as const;
export type ShotId = keyof typeof SHOTS;
export const TOTAL = SHOTS.outro.from + SHOTS.outro.duration;
// the strongest kick in the outro window — the film's single full-frame slam (R4)
export const OUTRO_IMPACT = beatF(90) - SHOTS.outro.from;

// title-card copy: `*詞*` = gold accent word (one per card, C2: names the feature)
export const TITLE_CARDS = {
  cardLive: { text: '散步途中，有 *即時守護*。' },
  cardDual: { text: '一個帳號，飼主也能當 *遛狗者*。' },
} as const;

// --- in-shot beats shared by picture and sound (single source) ---
// cursor-flyover windows (fractions of the shot): equal 10% travel / 10% hold, the last stop (price) holds 20%
// so 「收費一次看清」 rests ≥1s (R1). Overview fade over the first 8%.
export const BOOK_WIN = [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6], [0.7, 0.8]] as const;
export const BOOK_FADE = 0.08;
// row-embed: accelerating drops (R2) — gaps 10, 9, 8, 7f
export const ROW_CUES = [12, 22, 31, 39, 46];
// ai-stream evidence rows (card cues) and completion
export const STREAM_CUES = [42, 53, 63, 72, 80];
export const STREAM_DONE = 110;
// report: establishing wide (0–22), push to the text (22–38), lines write 40 + i·7 over 10f each
export const REPORT_CUE = (i: number) => 40 + i * 7;
export const REPORT_WIPE = 10;

// bottom narration strip over every feature shot (Q11: ≥56px), relative to shot starts
export const CAPTIONS = [
  { from: SHOTS.hero.from + 36, duration: SHOTS.hero.duration - 44, text: 'AI 依毛孩個性與真實評價，推薦合拍的遛狗夥伴' },
  { from: SHOTS.stream.from + 10, duration: 94, text: '推薦理由說得清楚，每個分數都有依據' },
  { from: SHOTS.book.from + 10, duration: SHOTS.book.duration - 16, text: '指定夥伴、規劃路線，收費一次看清' },
  { from: SHOTS.live.from + 12, duration: SHOTS.live.duration - 18, text: 'GPS 軌跡即時更新，狗狗走到哪都清楚' },
  { from: SHOTS.rows.from + 8, duration: SHOTS.rows.duration - 12, text: '現況回報即時同步，偏離路線立刻提醒' },
  { from: SHOTS.dual.from + 40, duration: SHOTS.dual.duration - 46, text: '今天請人遛狗，明天也能幫鄰居遛狗' },
  { from: SHOTS.report.from + 12, duration: SHOTS.report.duration - 18, text: '散步結束，AI 自動寫好照護報告' },
] as const;

// --- sound (sound-design §4.5/4.6) ---
// Every cue names the frame its PEAK must hit; from = target − per-file peak lag − measured output lag.
export const OUTPUT_AUDIO_OFFSET_F = OUTPUT_AUDIO_OFFSET_SEC * FPS;
// per-file peak lag in frames (analysis/sfx_peaks.py, RMS 5ms hop)
const PEAK_F: Record<string, number> = {
  'click-camera.mp3': 5.85, 'impact-deep-whoosh.mp3': 16.65, 'keyboard.mp3': 0, 'pop.mp3': 1.05, 'riser-cine.mp3': 30.75,
  'sparkle-touch.mp3': 14.25, 'switch-click-quick.mp3': 0.3, 'switch-tap.mp3': 0.15, 'swoosh-quick.mp3': 10.05,
  'transition-snap.mp3': 3.45, 'transition-soft.mp3': 12.9, 'typewriter-hit-soft.mp3': 4.35, 'whoosh-big.mp3': 21.45, 'whoosh-fast.mp3': 21.75,
};
export const sfxFrom = (targetPeakF: number, src: string) =>
  Math.max(0, Math.round(targetPeakF - (PEAK_F[src] ?? 0) - OUTPUT_AUDIO_OFFSET_F));

type Cue = { from: number; src: string; volume: number; duration?: number; target: number; note: string };
const cue = (target: number, src: string, volume: number, note: string, duration?: number): Cue => ({ from: sfxFrom(target, src), src, volume, note, target, ...(duration ? { duration } : {}) });
const S = SHOTS;
const bookAt = (frac: number) => S.book.from + Math.round(frac * S.book.duration);
const I = S.outro.from + OUTRO_IMPACT;
export const SFX: Cue[] = [
  cue(S.open.from + 14, 'transition-soft.mp3', 0.38, 'wordmark presses in'),
  cue(S.open.from + S.open.duration - 3, 'whoosh-fast.mp3', 0.36, 'brand lifts away → match page'),
  cue(S.hero.from + 46, 'whoosh-big.mp3', 0.42, 'oblique push-in lands + hero card lifts'),
  cue(S.hero.from + 64, 'sparkle-touch.mp3', 0.85, 'perimeter beam lap 1 (60→74)'),
  cue(S.hero.from + 130, 'transition-snap.mp3', 0.45, 'card reseats in its slot'),
  cue(S.stream.from + 4, 'transition-soft.mp3', 0.34, 'trust panel in'),
  cue(S.stream.from + 24, 'typewriter-hit-soft.mp3', 0.45, 'reason summary lands'),
  ...STREAM_CUES.map((c, i) => cue(S.stream.from + c + 12, 'pop.mp3', 0.62 - i * 0.04, `evidence row ${i + 1} settles`)),
  cue(S.stream.from + STREAM_DONE + 4, 'click-camera.mp3', 0.5, 'completion state'),
  cue(S.book.from + 4, 'transition-soft.mp3', 0.34, 'booking page overview'),
  ...BOOK_WIN.map((w, i) => cue(bookAt((w[0] + w[1]) / 2), 'swoosh-quick.mp3', 0.32, `camera flies to stop ${i + 1}`)),
  ...BOOK_WIN.map((w, i) => cue(bookAt(w[1]), 'switch-tap.mp3', 0.45, `cursor click at stop ${i + 1}`)),
  cue(S.cardLive.from + 6, 'swoosh-quick.mp3', 0.36, 'title card ①'),
  cue(S.live.from + 4, 'transition-soft.mp3', 0.34, 'live map in'),
  cue(S.live.from + 20, 'whoosh-big.mp3', 0.26, 'trail starts drawing'),
  ...ROW_CUES.map((c, i) => cue(S.rows.from + c + 12, 'pop.mp3', 0.62 - i * 0.03, `update row ${i + 1} embeds`)),
  cue(S.cardDual.from + 6, 'swoosh-quick.mp3', 0.36, 'title card ②'),
  cue(S.dual.from + 48, 'switch-click-quick.mp3', 0.6, 'cursor presses 我是遛狗者'),
  cue(S.dual.from + 63, 'sparkle-touch.mp3', 0.85, 'shepherd icon springs in'),
  cue(S.report.from + 4, 'transition-soft.mp3', 0.32, 'report page'),
  cue(S.report.from + REPORT_CUE(0), 'keyboard.mp3', 0.8, 'report writes itself (trimmed to the reveal)', REPORT_CUE(5) + REPORT_WIPE - REPORT_CUE(0)),
  cue(I, 'riser-cine.mp3', 0.42, 'riser crests into the slam', 36),
  cue(I, 'impact-deep-whoosh.mp3', 0.55, 'wordmark slam on beat 90 (strongest kick)'),
  cue(I + 13, 'sparkle-touch.mp3', 0.8, 'rule + tagline glint, within one beat of the slam'),
];
export const sfxDuration = (s: Cue) => s.duration ?? 90;
