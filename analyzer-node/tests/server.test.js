import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAnalyzerServer } from '../src/server.js';
import { genGenuineWriter, genPurePaster } from './fixtures.js';

let server;

beforeAll(async () => {
  server = await createAnalyzerServer({ port: 0 });
});

afterAll(async () => {
  await server.close();
});

const post = (path, body) => fetch(`http://127.0.0.1:${server.port}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

describe('analyzer HTTP service', () => {
  it('answers /health', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('analyzes a genuine session with the verdict shape', async () => {
    const { events, stats } = genGenuineWriter();
    const res = await post('/analyze', { events, stats });
    expect(res.status).toBe(200);
    const v = await res.json();
    expect(typeof v.overall_score).toBe('number');
    expect(v.factors.paste_integrity).toBeTruthy();
    expect(Array.isArray(v.risk_flags)).toBe(true);
  });

  it('distinguishes the pure paster over the wire too', async () => {
    const res = await post('/analyze', genPurePaster());
    const v = await res.json();
    expect(v.overall_score).toBeLessThanOrEqual(45);
  });

  it('rejects a malformed body without crashing', async () => {
    const res = await post('/analyze', { nope: true });
    expect(res.status).toBe(400);
    const after = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(after.status).toBe(200);
  });

  it('treats empty events as No Data, not an error', async () => {
    const res = await post('/analyze', { events: [], stats: {} });
    expect(res.status).toBe(200);
    const v = await res.json();
    expect(v.verdict).toBe('No Data');
  });
});
