/* Draftly — app shell service worker.
 * Hand-rolled: network-first navigations (offline shell), stale-while-
 * revalidate for same-origin static assets. API JSON is never cached. */
const CACHE = 'draftly-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Only asset-like responses belong in the shell cache: the HTML shell, the
// versioned JS/CSS chunks under /assets/, and other text-ish documents.
// API /collab /track payloads are skipped on purpose.
function cacheable(request, response) {
  if (request.url.includes('/api/') ||
      request.url.includes('/collab') ||
      request.url.includes('/track')) {
    return false;
  }
  const type = (response.headers.get('Content-Type') || '').toLowerCase();
  return (
    request.url.includes('/assets/') ||
    type.includes('text/html') ||
    type.includes('text/css') ||
    type.includes('javascript')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached response for this
  // path, then the cached shell. Deep client routes map to the shell too.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && cacheable(request, response)) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match('/'));
        })
    );
    return;
  }

  // Same-origin GET others: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok && cacheable(request, response)) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })()
  );
});