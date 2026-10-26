import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://localhost:${process.env.API_PORT || 4100}`;

export default defineConfig(({ command }) => ({
  root: 'web',
  // Built assets are requested under /walk/ (shared ngrok gateway); the server also answers them at the root.
  base: command === 'build' ? '/walk/' : '/',
  plugins: [react()],
  server: { port: 5180, strictPort: true, proxy: { '/api': API, '/uploads': API } },
  build: { outDir: '../dist', emptyOutDir: true },
}));
