import { Alert } from 'react-native';

import { Button, Card, Segmented, Screen, T } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { deleteAllData, useSettingsStore } from '@/stores';
import type { Language, ThemeSetting } from '@/stores/settingsStore';

export default function SettingsScreen() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const theme = useSettingsStore((s) => s.theme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const confirmDeleteAll = () =>
    Alert.alert(t('settings.deleteAll'), t('settings.deleteAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void deleteAllData() },
    ]);

  return (
    <Screen>
      <Card style={{ gap: 10 }}>
        <T variant="heading">{t('settings.language')}</T>
        <Segmented<Language>
          value={language}
          onChange={(v) => void setLanguage(v)}
          options={[
            { value: 'tr', label: 'Türkçe' },
            { value: 'en', label: 'English' },
          ]}
        />
      </Card>
      <Card style={{ gap: 10 }}>
        <T variant="heading">{t('settings.theme')}</T>
        <Segmented<ThemeSetting>
          value={theme}
          onChange={(v) => void setTheme(v)}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
      </Card>
      <Card style={{ gap: 10 }}>
        <T variant="heading">{t('settings.data')}</T>
        <Button label={t('settings.deleteAll')} kind="danger" onPress={confirmDeleteAll} />
      </Card>
      <T variant="small">{t('settings.about')}</T>
    </Screen>
  );
}
