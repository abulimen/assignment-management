import { createContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { api, refreshSession } from '../api';
import { setAccessToken, clearAccessToken } from '../session';

export const AuthContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { user: action.user, token: action.token, loading: false };
    case 'LOGOUT':
      return { user: null, token: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    token: null,
    loading: true,
  });

  // Restore the session on boot: the HttpOnly refresh cookie is sent
  // automatically (same-origin) → access token → /api/me → profile.
  // refreshSession() is single-flight, so even a StrictMode double-mount
  // (or a concurrent 401 retry) shares ONE /api/refresh request — the
  // rotating refresh token is never presented twice in parallel, which
  // would trip reuse-detection and revoke the whole family.
  // On failure the user is anonymous; nothing is persisted client-side.
  //
  // Fast-path for genuinely anonymous boots: when the API's plain `am_session`
  // marker cookie is absent there is no refresh cookie worth probing, so skip
  // the /api/refresh round-trip entirely. This kills the 401 console error
  // (Lighthouse best-practices "browser errors logged to console") and speeds
  // up every logged-out first paint.
  useEffect(() => {
    let cancelled = false;
    const hasSession = document.cookie.split(';').some((c) => c.trim().startsWith('am_session=1'));
    if (!hasSession) {
      clearAccessToken();
      dispatch({ type: 'LOGOUT' });
      return;
    }
    (async () => {
      clearAccessToken();
      try {
        const accessToken = await refreshSession();
        if (cancelled) return;
        setAccessToken(accessToken);
        const me = await api.get('me');
        if (cancelled) return;
        dispatch({ type: 'LOGIN', user: me.user, token: accessToken });
      } catch {
        clearAccessToken();
        if (!cancelled) dispatch({ type: 'LOGOUT' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // login(accessToken, user) — called after a successful /api/login.
  const login = useCallback((accessToken, user) => {
    setAccessToken(accessToken);
    dispatch({ type: 'LOGIN', user, token: accessToken });
  }, []);

  // logout() — revoke the refresh-token family at the server (best-effort),
  // then drop the in-memory session.
  const logout = useCallback(() => {
    api.post('logout').catch(() => {});
    clearAccessToken();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}