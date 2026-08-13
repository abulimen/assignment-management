import { createContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
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
  // On failure the user is anonymous; nothing is persisted client-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      clearAccessToken();
      try {
        const data = await api.post('refresh');
        if (cancelled) return;
        const me = await api.get('me');
        if (cancelled) return;
        dispatch({ type: 'LOGIN', user: me.user, token: data.accessToken });
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