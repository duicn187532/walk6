// Shared bits for the real-page scenes.
import { Img, staticFile } from 'remotion';
import { C } from '../tokens';

// The app sidebar is position:fixed, so a full-page screenshot only paints it for the first 1080 CSS px.
// Extend its white surface down the rest of the page so wide shots don't show a blank strip.
export const SidebarExtend: React.FC<{ pageH: number }> = ({ pageH }) =>
  pageH > 1080 ? <div style={{ position: 'absolute', left: 0, top: 1080, width: 248, height: pageH - 1080, background: '#fff', borderRight: `1px solid ${C.line}` }} /> : null;

// A crop of a full-page texture placed at its own page coordinates (Q1: crops never redraw content).
export const Crop: React.FC<{ src: string; pageH: number; box: { x: number; y: number; w: number; h: number }; style?: React.CSSProperties }> = ({ src, pageH, box, style }) => (
  <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', ...style }}>
    <Img src={staticFile(src)} style={{ position: 'absolute', left: -box.x, top: -box.y, width: 1920, height: pageH, maxWidth: 'none' }} />
  </div>
);
