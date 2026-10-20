import { Composition } from 'remotion';
import { WalkMain } from './walk/Main';
import { TOTAL, FPS } from './walk/timeline';

export const Root: React.FC = () => (
  <Composition id="WalkPromo" component={WalkMain} defaultProps={{ bgm: true }} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
