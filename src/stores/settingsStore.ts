import { createStore } from 'zustand/vanilla';

export type Language = 'en' | 'tr';
export type ThemeSetting = 'system' | 'light' | 'dark';

export interface KeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface SettingsState {
  language: Language;
  theme: ThemeSetting;
  hydrated: boolean;
  hydrate(): Promise<void>;
  setLanguage(lang: Language): Promise<void>;
  setTheme(theme: ThemeSetting): Promise<void>;
}

const LANG_KEY = 'settings.language';
const THEME_KEY = 'settings.theme';

export function createSettingsStore(kv: KeyValue, defaultLanguage: Language) {
  return createStore<SettingsState>()((set) => ({
    language: defaultLanguage,
    theme: 'system',
    hydrated: false,
    async hydrate() {
      const [lang, theme] = await Promise.all([kv.getItem(LANG_KEY), kv.getItem(THEME_KEY)]);
      set({
        language: lang === 'en' || lang === 'tr' ? lang : defaultLanguage,
        theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
        hydrated: true,
      });
    },
    async setLanguage(language) {
      set({ language });
      await kv.setItem(LANG_KEY, language);
    },
    async setTheme(theme) {
      set({ theme });
      await kv.setItem(THEME_KEY, theme);
    },
  }));
}
