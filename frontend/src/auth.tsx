import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, api, getSessionToken, setSessionToken } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User }>('/api/auth/me');
      setUser(r.user);
    } catch (err) {
      // 401 with a stored token means the session expired/was revoked server-side —
      // drop the dead token so we don't keep sending it on every request.
      if (err instanceof ApiError && err.status === 401 && getSessionToken()) setSessionToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => undefined);
    setSessionToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => useContext(AuthContext);
