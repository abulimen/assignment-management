import { createAnalyzerServer } from './server.js';

const server = await createAnalyzerServer({});
console.log(`[analyzer] verdict engine listening on 127.0.0.1:${server.port}`);
