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
    fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify({ name: 'Draftly', short_name: 'Draftly', start_url: '/', display: 'standalone' }));
    fs.writeFileSync(path.join(dir, 'icon-192.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nAllow: /');
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

  it('serves hashed /assets with long-lived immutable cache headers', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/assets/app.js`);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('serves the SPA shell with no-cache (never serve stale index.html)', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/`);
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('serves sw.js with no-cache so service-worker updates are not intercepted', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/sw.js`);
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  it('gzip-compresses compressible GET responses when negotiated and decodes exactly', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/assets/app.js`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('gzip');
    expect(res.headers.get('vary')).toContain('Accept-Encoding');
    // undici transparently decompresses gzip bodies, so the CLIENT-visible
    // body is the original text; the header above proves the wire used gzip.
    expect(await res.text()).toBe('console.log(1);');
    // When gzip is not negotiated (Accept-Encoding: identity) the body is
    // served plain. (Undici advertises gzip by default, so be explicit.)
    const plain = await fetch(`http://127.0.0.1:${api.port}/assets/app.js`, {
      headers: { 'Accept-Encoding': 'identity' },
    });
    expect(plain.headers.get('content-encoding')).toBeNull();
    expect(await plain.text()).toBe('console.log(1);');
  });

  it('does not double-compress woff2 (already compressed payload)', async () => {
    fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'fonts', 'test.woff2'), Buffer.from([0x77, 0x4f, 0x46, 0x32]));
    const res = await fetch(`http://127.0.0.1:${api.port}/fonts/test.woff2`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBeNull();
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([0x77, 0x4f, 0x46, 0x32]);
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
    expect(manifest.name).toBe('Draftly');
    expect(manifest.display).toBe('standalone');

    const iconRes = await fetch(`http://127.0.0.1:${api.port}/icon-192.png`);
    expect(iconRes.status).toBe(200);
    expect(iconRes.headers.get('content-type')).toContain('image/png');
  });

  it('serves robots.txt for SEO with the text/plain type', async () => {
    const res = await fetch(`http://127.0.0.1:${api.port}/robots.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
  });
});
