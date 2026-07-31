import { createContext, useReducer, useEffect } from 'react';

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
    token: localStorage.getItem('token'),
    loading: true,
  });

  useEffect(() => {
    if (state.token) {
      fetch('/api/assignments.php', {
        headers: { Authorization: `Bearer ${state.token}` },
      })
        .then((r) => {
          if (!r.ok) throw new Error('invalid');
          return r.json();
        })
        .then(() => {
          const payload = JSON.parse(atob(state.token.split('.')[1]));
          dispatch({
            type: 'LOGIN',
            user: { id: payload.sub, role: payload.role, name: '', email: '' },
            token: state.token,
          });
        })
        .catch(() => {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        });
    } else {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, []);

  const login = (token, user) => {
    localStorage.setItem('token', token);
    dispatch({ type: 'LOGIN', user, token });
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}