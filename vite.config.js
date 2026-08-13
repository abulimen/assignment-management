import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API server's static host mounts the SPA build at /assets/* (public/ is
// its doc root and the build writes into public/assets). In PRODUCTION builds
// the base is therefore /assets/ so index.html + hashed chunks resolve against
// the API server. In dev (Vite on :3000) the base stays / and Vite proxies
// /api + /collab + /track to the services.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/assets/' : '/',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8001',
      '/collab': { target: 'ws://localhost:8003', ws: true },
      '/track': { target: 'ws://localhost:8005', ws: true },
    },
  },
  publicDir: false,
  build: {
    outDir: 'public/assets',
    emptyOutDir: true,
    assetsDir: '.',
  },
}));