import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Supported UI languages (Task 15.1 / 15.2). French is the historical source
 *  language the app was written in; Arabic and English are the two
 *  translations required by the task brief. */
export type Lang = 'fr' | 'ar' | 'en';

export const LANGS: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

/** A translation dictionary is an arbitrarily-nested tree of strings, looked
 *  up with dotted keys (e.g. `t('nav.search')`). Using a loose recursive type
 *  (rather than forcing the exact same shape on all three dictionaries)
 *  keeps the three locale files independently editable while `t()` still
 *  falls back safely (to French, then to the raw key) if a translation is
 *  momentarily missing while new keys are being added. */
export type Dict = { [key: string]: string | Dict };

const STORAGE_KEY = 'wassalni_lang';

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'ar' || stored === 'en') return stored;
  } catch {
    /* localStorage unavailable (SSR/sandbox) — fall through to default */
  }
  return 'fr';
}

function lookup(dict: Dict, path: string[]): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const segment of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

interface I18nState {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nState | null>(null);

export function createI18nProvider(dictionaries: Record<Lang, Dict>) {
  function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(detectInitialLang);

    const setLang = useCallback((next: Lang) => {
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore persistence failure */
      }
    }, []);

    const dir = useMemo<'ltr' | 'rtl'>(() => (lang === 'ar' ? 'rtl' : 'ltr'), [lang]);

    useEffect(() => {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }, [lang, dir]);

    const t = useCallback(
      (key: string, vars?: Record<string, string | number>) => {
        const path = key.split('.');
        const value = lookup(dictionaries[lang], path) ?? lookup(dictionaries.fr, path);
        if (value === undefined) {
          if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
          return key;
        }
        return interpolate(value, vars);
      },
      [lang],
    );

    const value = useMemo<I18nState>(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
  }
  return I18nProvider;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n() must be used within <I18nProvider>');
  return ctx;
}
