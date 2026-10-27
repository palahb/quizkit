import { useCallback } from 'react';

import { translate, type TFunction } from '@/i18n';
import { useSettingsStore } from '@/stores';

/** Translation function bound to the current UI language; re-renders on language change. */
export function useT(): TFunction {
  const lang = useSettingsStore((s) => s.language);
  return useCallback((key, params) => translate(lang, key, params), [lang]);
}
