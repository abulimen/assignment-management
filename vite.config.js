import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8001',
      '/collab': { target: 'ws://localhost:8003', ws: true },
    },
  },
  build: {
    outDir: 'public/assets',
    emptyOutDir: true,
  },
});