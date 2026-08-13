import { getAccessToken, setAccessToken } from './session';

const API_BASE = '/api';

// Auth endpoints that must NOT trigger an auto-refresh on 401 (login 401 =
// wrong credentials; the refresh would mask the real error).
const NO_REFRESH = new Set([
  'login',
  'register',
  'refresh',
  'forgot-password',
  'reset-password',
  'resend-verification',
]);

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function tryJson(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// Single-flight access-token refresh. The HttpOnly refresh cookie travels
// same-origin automatically; on success the new access token is stashed in
// the session store and returned. Concurrent 401s share one request.
let refreshPromise = null;
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await tryJson(res);
          throw new ApiError((body && body.error) || 'Session expired', res.status, body && body.code);
        }
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request(path, options = {}) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/${path}`, { ...options, headers });

  if (res.status === 401 && !options._retried && !NO_REFRESH.has(path)) {
    try {
      const fresh = await refreshSession(); // throws ApiError on failure
      const retried = await fetch(`${API_BASE}/${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${fresh}` },
        _retried: true,
      });
      const body = await tryJson(retried);
      if (!retried.ok) {
        throw new ApiError((body && body.error) || `Request failed: ${retried.status}`, retried.status, body && body.code);
      }
      return body;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Not authenticated', 401, 'SESSION_EXPIRED');
    }
  }

  const body = await tryJson(res);
  if (!res.ok) {
    throw new ApiError((body && body.error) || `Request failed: ${res.status}`, res.status, body && body.code);
  }
  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: (path, body) => request(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: (path) => request(path, { method: 'DELETE' }),
};