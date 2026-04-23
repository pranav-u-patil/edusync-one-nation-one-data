import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('edusync_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('edusync_token') || '');

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('edusync_user', JSON.stringify(user));
      localStorage.setItem('edusync_token', token);
    } else {
      localStorage.removeItem('edusync_user');
      localStorage.removeItem('edusync_token');
    }
  }, [user, token]);

  const login = async (email, password) => {
    const { data } = await client.post('/login', { email, password });
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken('');
  };

  const value = useMemo(() => ({ user, token, login, logout, setUser }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
