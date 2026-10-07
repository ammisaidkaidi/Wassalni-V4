import { defineStore } from 'pinia';

/** Task 15.4 — Dark mode. Two themes, persisted, defaulting to the OS/browser
 *  preference (prefers-color-scheme) the first time a visitor shows up.
 *  Replaces React's `theme.tsx` ThemeProvider/useTheme Context. */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'wassalni_theme';

function detectInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage unavailable — fall through */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: detectInitialTheme() as Theme,
  }),
  actions: {
    setTheme(next: Theme): void {
      this.theme = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore persistence failure */
      }
      this.applyToDom();
    },
    toggleTheme(): void {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    },
    /** Mirrors the React version's `useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])`. */
    applyToDom(): void {
      document.documentElement.dataset.theme = this.theme;
    },
  },
});
