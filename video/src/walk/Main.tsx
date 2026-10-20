// Walk 我可遛 promo — composition. All timing comes from timeline.ts (single source of truth).
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { SHOTS, TOTAL, TITLE_CARDS, CAPTIONS, SFX, sfxDuration, OUTRO_IMPACT } from './timeline';
import { C } from './tokens';
import { Caption } from './Caption';
import { TitleCard } from './TitleCard';
import { BrandOpen } from './scenes/BrandOpen';
import { HeroCard } from './scenes/HeroCard';
import { AiStream } from './scenes/AiStream';
import { BookFlyover } from './scenes/BookFlyover';
import { LiveTrail } from './scenes/LiveTrail';
import { RowsEmbed } from './scenes/RowsEmbed';
import { DualRole } from './scenes/DualRole';
import { ReportWrite } from './scenes/ReportWrite';
import { Outro } from './scenes/Outro';

export const BGM_VOLUME = 0.28;
export const bgmVolume = (f: number) => interpolate(f, [0, 12, TOTAL - 50, TOTAL], [0, BGM_VOLUME, BGM_VOLUME, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const WalkMain: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  const S = SHOTS;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* bgm-film.wav = bgm.mp3 cut at BGM_START_FROM/30 s (=51.2s, source beat 104) so the workbench plays the same audio */}
      {bgm ? <Audio src={staticFile('audio/bgm-film.wav')} volume={bgmVolume} /> : null}
      {SFX.map((s, i) => (
        <Sequence key={`sfx-${i}`} from={s.from} durationInFrames={sfxDuration(s)}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}
      <Sequence from={S.open.from} durationInFrames={S.open.duration}><BrandOpen duration={S.open.duration} /></Sequence>
      <Sequence from={S.hero.from} durationInFrames={S.hero.duration}><HeroCard /></Sequence>
      <Sequence from={S.stream.from} durationInFrames={S.stream.duration}><AiStream /></Sequence>
      <Sequence from={S.book.from} durationInFrames={S.book.duration}><BookFlyover duration={S.book.duration} /></Sequence>
      <Sequence from={S.cardLive.from} durationInFrames={S.cardLive.duration}><TitleCard text={TITLE_CARDS.cardLive.text} duration={S.cardLive.duration} /></Sequence>
      <Sequence from={S.live.from} durationInFrames={S.live.duration}><LiveTrail /></Sequence>
      <Sequence from={S.rows.from} durationInFrames={S.rows.duration}><RowsEmbed /></Sequence>
      <Sequence from={S.cardDual.from} durationInFrames={S.cardDual.duration}><TitleCard text={TITLE_CARDS.cardDual.text} duration={S.cardDual.duration} /></Sequence>
      <Sequence from={S.dual.from} durationInFrames={S.dual.duration}><DualRole /></Sequence>
      <Sequence from={S.report.from} durationInFrames={S.report.duration}><ReportWrite /></Sequence>
      <Sequence from={S.outro.from} durationInFrames={S.outro.duration}><Outro duration={S.outro.duration} impact={OUTRO_IMPACT} /></Sequence>
      {CAPTIONS.map((c) => (
        <Sequence key={c.from} from={c.from} durationInFrames={c.duration}><Caption text={c.text} duration={c.duration} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
