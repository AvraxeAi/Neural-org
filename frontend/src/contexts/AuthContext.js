import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('openclaw_token');
    const storedUser = localStorage.getItem('openclaw_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('openclaw_token', token);
    localStorage.setItem('openclaw_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await authAPI.register({ email, password, name });
    const { token, user: u } = res.data;
    localStorage.setItem('openclaw_token', token);
    localStorage.setItem('openclaw_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('openclaw_token');
    localStorage.removeItem('openclaw_user');
    localStorage.removeItem('openclaw_org');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('openclaw_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
