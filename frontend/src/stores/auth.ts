import { defineStore } from 'pinia';
import { ApiError, api, getSessionToken, setSessionToken } from '../api';
import type { User } from '../types';

/** Replaces React's `auth.tsx` AuthProvider/useAuth Context with a Pinia
 *  store — same state shape, same refresh()/logout() behavior, including the
 *  401-with-stored-token edge case (drop the dead token so it isn't resent). */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: true,
  }),
  actions: {
    async refresh(): Promise<void> {
      try {
        const r = await api<{ user: User }>('/api/auth/me');
        this.user = r.user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && getSessionToken()) setSessionToken(null);
        this.user = null;
      } finally {
        this.loading = false;
      }
    },
    async logout(): Promise<void> {
      await api('/api/auth/logout', { method: 'POST', body: {} }).catch(() => undefined);
      setSessionToken(null);
      this.user = null;
    },
  },
});
