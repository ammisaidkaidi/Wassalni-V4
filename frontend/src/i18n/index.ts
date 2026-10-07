import ar from './ar';
import en from './en';
import fr from './fr';
import type { Dict, Lang } from './engine';

export const dictionaries: Record<Lang, Dict> = { fr, ar, en };
export { LANGS } from './engine';
export type { Lang };
