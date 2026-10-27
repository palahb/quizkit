import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button, Screen, T } from '@/components/ui';
import { translate } from '@/i18n';
import { deviceLanguage, initStores, resetDatabaseFile } from '@/stores';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

function AppStack() {
  const theme = useTheme();
  const t = useT();
  const navTheme = theme.dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: theme.bg, card: theme.surface, text: theme.text, border: theme.border, primary: theme.primary },
      }}
    >
      <ErrorBoundary
        onReset={() => {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/');
        }}
      >
        <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="import" options={{ presentation: 'modal', title: t('import.title') }} />
          <Stack.Screen name="move" options={{ presentation: 'modal' }} />
          <Stack.Screen name="start" options={{ presentation: 'modal' }} />
          <Stack.Screen name="session" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="results/[attemptId]" options={{ title: t('results.title'), headerBackVisible: false, gestureEnabled: false }} />
          <Stack.Screen name="review/[attemptId]" options={{ title: t('review.title') }} />
        </Stack>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

/** Shown when the database cannot be opened. Uses the device language because settings are unavailable. */
function LoadError({ onRetry }: { onRetry: () => void }) {
  const lang = deviceLanguage();
  const tr = (k: string) => translate(lang, k);
  const reset = () =>
    Alert.alert(tr('app.resetData'), tr('app.resetConfirm'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('app.resetData'),
        style: 'destructive',
        onPress: async () => {
          try {
            await resetDatabaseFile();
          } catch (e) {
            Alert.alert(tr('app.loadError'), e instanceof Error ? e.message : String(e));
            return;
          }
          onRetry();
        },
      },
    ]);
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <T variant="heading">{tr('app.loadError')}</T>
      <Button label={tr('app.retry')} onPress={onRetry} />
      <Button label={tr('app.resetData')} kind="danger" onPress={reset} />
    </Screen>
  );
}

export default function RootLayout() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    setStatus('loading');
    initStores()
      .then(() => setStatus('ready'))
      .catch((e) => {
        console.warn('initStores failed', e);
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (status === 'error') return <LoadError onRetry={load} />;
  return <AppStack />;
}
