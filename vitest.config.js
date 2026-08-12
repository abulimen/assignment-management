import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // The Node collab server has its own suite: `npm test --prefix collab`.
    exclude: ['collab/**', 'node_modules/**'],
  },
});