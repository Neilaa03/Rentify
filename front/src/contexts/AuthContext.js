import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import storage from '../utils/storage';

const AuthContext = createContext(null);

const TOKEN_KEY = 'userToken';
const PROFILE_KEY = 'userProfile';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      setBootstrapping(true);
      const storedToken = await storage.getItemAsync(TOKEN_KEY);
      const rawProfile = await storage.getItemAsync(PROFILE_KEY);
      let storedUser = null;
      if (rawProfile) {
        try {
          storedUser = JSON.parse(rawProfile);
        } catch (_err) {
          storedUser = null;
        }
      }
      setToken(storedToken || null);
      setUser(storedUser || null);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const setSession = useCallback(async ({ token: nextToken, user: nextUser }) => {
    setToken(nextToken || null);
    setUser(nextUser || null);

    if (nextToken) await storage.setItemAsync(TOKEN_KEY, nextToken);
    else await storage.deleteItemAsync(TOKEN_KEY);

    if (nextUser) await storage.setItemAsync(PROFILE_KEY, JSON.stringify(nextUser));
    else await storage.deleteItemAsync(PROFILE_KEY);
  }, []);

  const clearSession = useCallback(async () => {
    await setSession({ token: null, user: null });
  }, [setSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      bootstrapping,
      isAuthenticated: Boolean(token),
      bootstrap,
      setSession,
      clearSession,
    }),
    [bootstrap, bootstrapping, clearSession, setSession, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

