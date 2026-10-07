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

export const STORAGE_KEY = 'wassalni_lang';

export function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'ar' || stored === 'en') return stored;
  } catch {
    /* localStorage unavailable (SSR/sandbox) — fall through to default */
  }
  return 'fr';
}

export function lookup(dict: Dict, path: string[]): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const segment of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
