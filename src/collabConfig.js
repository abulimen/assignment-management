// WebSocket URL of the Hocuspocus collaboration server.
// Dev: the Vite proxy forwards /collab → ws://localhost:8003 (vite.config.js).
// Prod: set VITE_COLLAB_URL (wss://...).
export function collabUrl() {
  if (import.meta.env.VITE_COLLAB_URL) return import.meta.env.VITE_COLLAB_URL;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/collab`;
}
