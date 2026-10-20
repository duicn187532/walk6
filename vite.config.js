import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://localhost:${process.env.API_PORT || 4100}`;

export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: { port: 5180, strictPort: true, proxy: { '/api': API, '/uploads': API } },
  build: { outDir: '../dist', emptyOutDir: true },
});
