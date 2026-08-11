// Entry point: node src/main.js — env-configured like PHP src/config.php.
import { createCollabServer } from './server.js';

const db = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'assignment_mgmt',
};

const server = await createCollabServer({ db, quiet: false });
console.log(`[collab] WebSocket server on :${server.wsPort}, internal API on :${server.internalPort}`);
