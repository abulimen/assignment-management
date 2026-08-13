import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startApi, buildTestDb } from './helpers/harness.js';

// The API server doubles as the SPA host (replacing Apache + index.php).
describe('static SPA serving', () => {
  let api;
  let dir;

  beforeAll(async () => {
    await buildTestDb();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spa-'));
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'assets', 'index.html'), '<html>app shell</html>');
    fs.writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log(1);');
    fs.writeFileSync(path.join(dir, 'assets', 'style.css'), 'body{}');
    fs.writeFileSync(path.join(dir, 'sw.js'), 'self.skipWaiting();');
    fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify({ name: 'Assignment Manager', short_name: 'Assignment', start_url: '/', display: 'standalone' }));
    fs.writeFileSync(path.join(dir, 'icon-192.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    api = await startApi({ staticDir: dir });
  });

  afterAll(async () => {
    await api.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('serves the SPA shell at /', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('app shell');
  });

  it('serves built assets with correct types', async () => {
    const js = await fetch(`http://127.0.0.1:${api.port}/assets/app.js`);
    expect(js.status).toBe(200);
    expect(js.headers.get('content-type')).toContain('javascript');
    const css = await fetch(`http://127.0.0.1:${api.port}/assets/style.css`);
    expect(css.headers.get('content-type')).toContain('text/css');
  });

  it('falls back to the SPA shell for client-side routes', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/review/44`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('app shell');
  });

  it('does not serve files outside the static dir (traversal guard)', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/assets/../../etc/passwd`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('app shell');
  });

  it('serves root-level PWA files with correct types and SW scope header', async () => {
    const swRes = await fetch(`http://127.0.0.1:${api.port}/sw.js`);
    expect(swRes.status).toBe(200);
    expect(swRes.headers.get('content-type')).toContain('javascript');
    expect(swRes.headers.get('service-worker-allowed')).toBe('/');
    expect(await swRes.text()).toContain('self.skipWaiting');

    const manifestRes = await fetch(`http://127.0.0.1:${api.port}/manifest.webmanifest`);
    expect(manifestRes.status).toBe(200);
    expect(manifestRes.headers.get('content-type')).toBe('application/manifest+json');
    const manifest = await manifestRes.json();
    expect(manifest.name).toBe('Assignment Manager');
    expect(manifest.display).toBe('standalone');

    const iconRes = await fetch(`http://127.0.0.1:${api.port}/icon-192.png`);
    expect(iconRes.status).toBe(200);
    expect(iconRes.headers.get('content-type')).toContain('image/png');
  });
});
