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
    // Source maps keep the Lighthouse "valid source maps" best-practice audit
    // green for the large first-party bundles; maps live next to the hashed
    // chunks under /assets/* and are served by the API static host.
    sourcemap: true,
    // Performance: split node_modules into stable vendor chunks so the
    // critical first-paint bundle stays small and the heavyweight editor/
    // chart/vendor code loads only on the routes that need it (the lazy pages
    // are wired in src/App.jsx).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(@tiptap|prosemirror-[a-z0-9]+|yjs|@hocuspocus|lib0|isomorphic\.js)\//.test(id)) return 'editor-vendor';
          if (/node_modules\/(recharts|victory-vendor|d3-[a-z0-9]+|@reduxjs|react-redux|reselect|immer|redux|use-sync-external-store|es-toolkit|decimal\.js-light|eventemitter3)\//.test(id)) return 'charts';
          if (/node_modules\/lucide-react\//.test(id)) return 'icons';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
}));