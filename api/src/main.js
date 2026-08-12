// Entrypoint: env-config via @am/core loadConfig() + ANALYZER_URL +
// COLLAB_INTERNAL_URL. Starts the API server on port 8001 (env API_PORT).
import { loadConfig } from '@am/core';
import { createApiServer } from './index.js';

const base = loadConfig();
const config = {
  ...base,
  analyzerUrl: process.env.ANALYZER_URL || 'http://127.0.0.1:8002',
  collabUrl: process.env.COLLAB_INTERNAL_URL || 'http://127.0.0.1:8004',
};

const port = Number(process.env.API_PORT || 8001);

const { port: actual, close } = await createApiServer({ port, config });
// eslint-disable-next-line no-console
console.log(`[api] listening on http://127.0.0.1:${actual} (db=${config.db.database})`);

process.on('SIGINT', async () => { await close(); process.exit(0); });
process.on('SIGTERM', async () => { await close(); process.exit(0); });