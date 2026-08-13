// WebSocket URL of the Hocuspocus collaboration server.
// Dev: the Vite proxy forwards /collab → ws://localhost:8003 (vite.config.js).
// Prod: set VITE_COLLAB_URL (wss://...).
import { getAccessToken } from './session';

export function collabUrl() {
  if (import.meta.env.VITE_COLLAB_URL) return import.meta.env.VITE_COLLAB_URL;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/collab`;
}

// The collab WS authenticates with the short-lived access JWT (?token=...).
// It lives ONLY in the in-memory session store (never localStorage), so the
// session must have been restored (AuthProvider boot / login) before any WS
// is opened — ProtectedRoute's loading gate guarantees this for GroupEditor.
export function authToken() {
  return getAccessToken();
}

// WebSocket URL of the event-tracking intake (collab service, :8005).
// Dev: Vite proxies /track → ws://localhost:8005. Prod: VITE_TRACK_URL.
export function trackingUrl(token) {
  const base = import.meta.env.VITE_TRACK_URL
    || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/track`;
  return `${base}?token=${encodeURIComponent(token)}`;
}