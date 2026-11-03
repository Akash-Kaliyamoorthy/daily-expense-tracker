import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

/**
 * Holds the logged-in user. On first load it asks the server who is logged in
 * (the session lives in an httpOnly cookie that JavaScript cannot read).
 *  - `loading`   true until that first check finishes
 *  - `bootError` set when the server could not be reached (e.g. a free-tier
 *                service still waking up), so the app can offer "Try again"
 *                instead of wrongly sending a logged-in user to the login page.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setBootError(null);
    authApi
      .fetchMe()
      .then((data) => alive && setUser(data.user))
      .catch((err) => {
        if (!alive) return;
        setUser(null);
        if (err.network || err.status >= 500) setBootError(err);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [attempt]);

  // Any later 401 (session expired) logs the user out; ProtectedRoute redirects.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const data = await authApi.register(details);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null); // even if the request failed, leave the screens
    }
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo(
    () => ({ user, loading, bootError, login, register, logout, retry }),
    [user, loading, bootError, login, register, logout, retry],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
