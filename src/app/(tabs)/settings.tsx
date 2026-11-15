import { Platform } from 'react-native';
import { showAlert } from '@/components/alert';

import { Button, Card, Segmented, Screen, T } from '@/components/ui';
import { BackupSection } from '@/features/settings/BackupSection';
import { InstallHint } from '@/features/settings/InstallHint';
import { useT } from '@/hooks/useT';
import { lastPaddingDebug } from '@/web/standalonePadding';
import { deleteAllData, useSettingsStore } from '@/stores';
import type { Language, ThemeSetting } from '@/stores/settingsStore';

export default function SettingsScreen() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const theme = useSettingsStore((s) => s.theme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const confirmDeleteAll = () =>
    showAlert(t('settings.deleteAll'), t('settings.deleteAllConfirm'), [
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
      {Platform.OS === 'web' ? <InstallHint /> : null}
      {Platform.OS === 'web' ? <BackupSection /> : null}
      <T variant="small">{t('settings.about')}</T>
      {Platform.OS === 'web' ? <T variant="small">{`Quizkit web · ${(process.env.EXPO_PUBLIC_BUILD_ID ?? 'dev').slice(0, 7)}\n${lastPaddingDebug}`}</T> : null}
    </Screen>
  );
}
