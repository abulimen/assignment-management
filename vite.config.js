import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/assets/',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  publicDir: false,
  build: {
    outDir: 'public/assets',
    assetsDir: '',
    emptyOutDir: false,
  },
});