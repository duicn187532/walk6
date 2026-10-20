// Motion workbench manifest (skill references/workbench.md §2–3). Every table is imported from
// walk/timeline.ts + walk/Main.tsx — no second copy of the timing.
import { createElement, type FC } from 'react';
import { WalkMain, BGM_VOLUME } from './walk/Main';
import { SHOTS, TOTAL, TITLE_CARDS, CAPTIONS, SFX, sfxDuration, OUTRO_IMPACT } from './walk/timeline';
import { C } from './walk/tokens';
import { TitleCard, TITLE_DEFAULTS } from './walk/TitleCard';
import { Caption, CAPTION_DEFAULTS } from './walk/Caption';
import { BrandOpen, BRAND_DEFAULTS } from './walk/scenes/BrandOpen';
import { HeroCard, HERO_DEFAULTS } from './walk/scenes/HeroCard';
import { AiStream, STREAM_DEFAULTS } from './walk/scenes/AiStream';
import { BookFlyover } from './walk/scenes/BookFlyover';
import { LiveTrail, LIVE_DEFAULTS } from './walk/scenes/LiveTrail';
import { RowsEmbed } from './walk/scenes/RowsEmbed';
import { DualRole, DUAL_DEFAULTS } from './walk/scenes/DualRole';
import { ReportWrite } from './walk/scenes/ReportWrite';
import { Outro, OUTRO_DEFAULTS } from './walk/scenes/Outro';

type Field = Record<string, unknown> & { type: string; key: string; label: string; default: unknown };
const text = (key: string, label: string, def: string): Field => ({ type: 'text', key, label, default: def });
const color = (key: string, label: string, def: string): Field => ({ type: 'color', key, label, default: def });
const size = (key: string, label: string, def: number, min: number, max: number): Field => ({ type: 'slider', key, label, default: def, min, max, step: 1, unit: 'px' });
type Comp = FC<Record<string, unknown>>;

export const TitleUnit: FC<Partial<typeof TITLE_DEFAULTS> & { text?: string; duration?: number }> = ({ text = '', duration = 59, ...s }) => createElement(TitleCard, { text, duration, ...s });
TitleUnit.displayName = 'WalkTitleCard';
export const CaptionUnit: FC<Partial<typeof CAPTION_DEFAULTS> & { text?: string; duration?: number }> = ({ text = '', duration = 60, ...s }) => createElement(Caption, { text, duration, ...s });
CaptionUnit.displayName = 'WalkCaption';

const shot = (id: keyof typeof SHOTS, label: string, component: unknown, props: Record<string, unknown> = {}, schema: Field[] = [], durationProp?: string) => ({
  id, label, from: SHOTS[id].from, duration: SHOTS[id].duration, component: component as Comp, props, schema, ...(durationProp ? { durationProp } : {}),
});
const title = (id: keyof typeof TITLE_CARDS, label: string) => ({
  ...shot(id, label, TitleUnit, { text: TITLE_CARDS[id].text, ...TITLE_DEFAULTS }, [
    { type: 'textarea', key: 'text', label: '文案（*詞* = 金色強調）', default: '' },
    size('fontSize', '字號', TITLE_DEFAULTS.fontSize, 60, 160), color('color', '文字色', TITLE_DEFAULTS.color), color('accent', '強調色', TITLE_DEFAULTS.accent), color('rule', '底線色', TITLE_DEFAULTS.rule),
  ], 'duration'),
  cardId: 'walk-title-card', cardName: '字卡 · Walk 我可遛',
});

export const WORKBENCH = {
  name: 'Walk 我可遛 · promo',
  fps: 30,
  width: 1920,
  height: 1080,
  total: TOTAL,
  background: C.bg,
  shots: [
    shot('open', 'S1 品牌開場', BrandOpen, { ...BRAND_DEFAULTS, duration: SHOTS.open.duration }, [text('wordmark', '字標', BRAND_DEFAULTS.wordmark), text('kicker', '副標（打字機）', BRAND_DEFAULTS.kicker), size('fontSize', '字標字號', BRAND_DEFAULTS.fontSize, 80, 220)], 'duration'),
    shot('hero', 'S2 AI 推薦主角', HeroCard, { ...HERO_DEFAULTS }, [text('noteLine1', '懸浮注記 · 前半', HERO_DEFAULTS.noteLine1), text('noteLine2', '懸浮注記 · 螢光筆', HERO_DEFAULTS.noteLine2)]),
    shot('stream', 'S3 推薦理由串流', AiStream, { ...STREAM_DEFAULTS }, [text('doneText', '完成態文字', STREAM_DEFAULTS.doneText)]),
    shot('book', 'S4 預約巡覽', BookFlyover, { duration: SHOTS.book.duration }, [], 'duration'),
    title('cardLive', '字卡① 看得見'),
    shot('live', 'S6 即時 GPS 軌跡', LiveTrail, { ...LIVE_DEFAULTS }, [text('dog', '標記圖示', LIVE_DEFAULTS.dog), color('trailColor', '軌跡色', LIVE_DEFAULTS.trailColor)]),
    shot('rows', 'S7 回報嵌入', RowsEmbed),
    title('cardDual', '字卡② 兼任'),
    shot('dual', 'S8 飼主 ⇄ 遛狗者', DualRole, { ...DUAL_DEFAULTS }, [text('left', '左段', DUAL_DEFAULTS.left), text('right', '右段', DUAL_DEFAULTS.right), text('who', '上方標籤', DUAL_DEFAULTS.who)]),
    shot('report', 'S9 AI 照護報告', ReportWrite),
    shot('outro', 'S10 發布會收尾', Outro, { ...OUTRO_DEFAULTS, duration: SHOTS.outro.duration, impact: OUTRO_IMPACT }, [text('wordmark', '字標', OUTRO_DEFAULTS.wordmark), text('tagline', '標語', OUTRO_DEFAULTS.tagline)], 'duration'),
  ],
  captions: CAPTIONS.map((c, i) => ({
    id: `cap${i + 1}`, label: `字幕 ${i + 1}`, from: c.from, duration: c.duration, component: CaptionUnit as Comp,
    props: { text: c.text, ...CAPTION_DEFAULTS }, durationProp: 'duration', cardId: 'walk-caption', cardName: '解說字幕',
    schema: [text('text', '字幕', ''), size('fontSize', '字號', CAPTION_DEFAULTS.fontSize, 40, 80), size('bottom', '底距', CAPTION_DEFAULTS.bottom, 20, 400), color('color', '文字色', CAPTION_DEFAULTS.color), color('accent', '圓點色', CAPTION_DEFAULTS.accent)],
  })),
  sfx: SFX.map((s) => ({ from: s.from, duration: sfxDuration(s), src: `audio/${s.src}`, volume: s.volume, label: s.note })),
  bgm: [{ from: 0, duration: TOTAL, src: 'audio/bgm-film.wav', volume: BGM_VOLUME, label: 'house-vibez（源拍 104 起）' }],
  order: ['captions'] as ('transitions' | 'captions' | 'overlays')[],
  original: WalkMain as Comp,
};
