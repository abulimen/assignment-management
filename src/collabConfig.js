// WebSocket URL of the Hocuspocus collaboration server.
// Dev: the Vite proxy forwards /collab → ws://localhost:8003 (vite.config.js).
// Prod: set VITE_COLLAB_URL (wss://...).
export function collabUrl() {
  if (import.meta.env.VITE_COLLAB_URL) return import.meta.env.VITE_COLLAB_URL;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/collab`;
}

// WebSocket URL of the event-tracking intake (collab service, :8005).
// Dev: Vite proxies /track → ws://localhost:8005. Prod: VITE_TRACK_URL.
export function trackingUrl(token) {
  const base = import.meta.env.VITE_TRACK_URL
    || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/track`;
  return `${base}?token=${encodeURIComponent(token)}`;
}
