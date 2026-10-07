import { storeToRefs } from 'pinia';
import { useI18nStore } from '../stores/i18n';
import { LANGS } from '../i18n';
import type { Lang } from '../i18n/engine';

/** Thin composable wrapper around the i18n Pinia store, mirroring the call
 *  shape of the original React `useI18n()` hook: `const { t, lang, dir,
 *  setLang } = useI18n()`. */
export function useI18n() {
  const store = useI18nStore();
  const { lang, dir } = storeToRefs(store);
  return {
    lang,
    dir,
    setLang: (next: Lang) => store.setLang(next),
    t: (key: string, vars?: Record<string, string | number>) => store.t(key, vars),
  };
}

export { LANGS };
export type { Lang };
