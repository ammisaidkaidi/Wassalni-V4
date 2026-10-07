import { defineStore } from 'pinia';
import { detectInitialLang, interpolate, lookup, STORAGE_KEY, type Lang } from '../i18n/engine';
import { dictionaries } from '../i18n';

/** Replaces React's `i18n/engine.tsx` + `i18n/index.tsx` I18nProvider/useI18n
 *  Context with a Pinia store. Same dotted-key lookup, same French fallback,
 *  same RTL flag, same persisted language choice. */
export const useI18nStore = defineStore('i18n', {
  state: () => ({
    lang: detectInitialLang() as Lang,
  }),
  getters: {
    dir: (state): 'ltr' | 'rtl' => (state.lang === 'ar' ? 'rtl' : 'ltr'),
  },
  actions: {
    setLang(next: Lang): void {
      this.lang = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore persistence failure */
      }
      this.applyToDom();
    },
    /** Mirrors the React version's `useEffect` syncing `<html lang>`/`<html dir>`. */
    applyToDom(): void {
      document.documentElement.lang = this.lang;
      document.documentElement.dir = this.dir;
    },
    t(key: string, vars?: Record<string, string | number>): string {
      const path = key.split('.');
      const value = lookup(dictionaries[this.lang], path) ?? lookup(dictionaries.fr, path);
      if (value === undefined) {
        if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      return interpolate(value, vars);
    },
  },
});
