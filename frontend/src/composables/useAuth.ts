import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

/** Thin composable wrapper mirroring the original React `useAuth()` hook
 *  shape: `const { user, loading, refresh, logout } = useAuth()`. */
export function useAuth() {
  const store = useAuthStore();
  const { user, loading } = storeToRefs(store);
  return {
    user,
    loading,
    refresh: () => store.refresh(),
    logout: () => store.logout(),
  };
}
