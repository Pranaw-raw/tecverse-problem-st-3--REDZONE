import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('reservehub_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and check current user profile
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      } else {
        // Auto demo-login as Student for first-time immediate exploration
        try {
          const res = await api.demoLogin('student');
          localStorage.setItem('reservehub_token', res.token);
          setToken(res.token);
          setUser(res.user);
        } catch (e) {
          console.error('Failed auto demo login:', e);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('reservehub_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('reservehub_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const switchRole = async (roleName) => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin(roleName);
      localStorage.setItem('reservehub_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('reservehub_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    role: user?.role || 'guest',
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    switchRole,
    logout,
    refreshUser: async () => {
      if (token) {
        const res = await api.getMe();
        setUser(res.user);
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
