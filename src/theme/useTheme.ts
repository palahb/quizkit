import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/stores';

import { dark, light, type Tokens } from './tokens';

export function useTheme(): Tokens {
  const setting = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  const isDark = setting === 'dark' || (setting === 'system' && system === 'dark');
  return isDark ? dark : light;
}
