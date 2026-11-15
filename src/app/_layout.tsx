import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadError } from '@/components/LoadError';
import { initStores } from '@/stores';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';
import { persistStorage } from '@/web/persistStorage';
import { applyStandalonePadding } from '@/web/standalonePadding';
import { registerServiceWorker } from '@/web/registerServiceWorker';

function AppStack() {
  const theme = useTheme();
  const t = useT();
  const navTheme = theme.dark ? DarkTheme : DefaultTheme;
  // On web the page behind the app (status bar and home-indicator areas) follows the in-app theme.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = theme.bg;
      document.body.style.backgroundColor = theme.bg;
    }
  }, [theme.bg]);
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

export default function RootLayout() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    setStatus('loading');
    initStores()
      .then(() => setStatus('ready'))
      .catch((e) => {
        console.warn('initStores failed', e);
        setError(e);
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      void persistStorage();
      registerServiceWorker();
      applyStandalonePadding();
    }
  }, []);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (status === 'error') return <LoadError onRetry={load} error={error} />;
  return <AppStack />;
}
