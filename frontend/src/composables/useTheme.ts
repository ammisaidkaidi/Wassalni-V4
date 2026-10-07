import { storeToRefs } from 'pinia';
import { useThemeStore } from '../stores/theme';
import type { Theme } from '../stores/theme';

/** Thin composable wrapper mirroring the original React `useTheme()` hook
 *  shape: `const { theme, setTheme, toggleTheme } = useTheme()`. */
export function useTheme() {
  const store = useThemeStore();
  const { theme } = storeToRefs(store);
  return {
    theme,
    setTheme: (next: Theme) => store.setTheme(next),
    toggleTheme: () => store.toggleTheme(),
  };
}

export type { Theme };
