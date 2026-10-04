import ar from './ar';
import { createI18nProvider, LANGS, useI18n, type Lang } from './engine';
import en from './en';
import fr from './fr';

export const I18nProvider = createI18nProvider({ fr, ar, en });
export { LANGS, useI18n };
export type { Lang };
