import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    // Collab tests bind ports and share one test DB — keep them serial.
    fileParallelism: false,
  },
});
