import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Each Node service owns its suite: npm test --prefix collab|api|analyzer-node.
    exclude: ['collab/**', 'api/**', 'analyzer-node/**', 'shared/**', 'node_modules/**'],
  },
});