import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ActionMenu, type MenuAction } from '@/components/ActionMenu';
import { Screen, T } from '@/components/ui';
import type { Attempt, Mode } from '@/domain/types';
import { confirmAsync, showError } from '@/features/library/flows';
import { ResultsView } from '@/features/results/ResultsView';
import { useT } from '@/hooks/useT';
import { useHistoryStore, useSessionStore } from '@/stores';

export default function ResultsScreen() {
  const { attemptId, from } = useLocalSearchParams<{ attemptId: string; from?: string }>();
  const t = useT();
  const loadAttempt = useHistoryStore((s) => s.loadAttempt);
  const activeSession = useSessionStore((s) => s.session);
  const startRetry = useSessionStore((s) => s.startRetry);
  const startRetake = useSessionStore((s) => s.startRetake);
  const abandon = useSessionStore((s) => s.abandon);
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [chooser, setChooser] = useState<((mode: Mode) => Promise<void>) | null>(null);

  useEffect(() => {
    loadAttempt(attemptId).then(setAttempt, (e) => {
      showError(e);
      setAttempt(null);
    });
  }, [attemptId, loadAttempt]);

  const fromSession = from === 'session';
  const header = <Stack.Screen options={{ headerBackVisible: !fromSession, gestureEnabled: !fromSession }} />;

  if (attempt === undefined) {
    return (
      <Screen>
        {header}
        <ActivityIndicator />
      </Screen>
    );
  }
  if (attempt === null) {
    return (
      <Screen>
        {header}
        <T variant="muted">{t('results.notFound')}</T>
      </Screen>
    );
  }

  const launch = async (run: (mode: Mode) => Promise<void>, mode: Mode) => {
    if (activeSession) {
      const ok = await confirmAsync(t('library.resumeTitle'), t('library.discardConfirm'), t('library.discard'), t);
      if (!ok) return;
      await abandon();
    }
    try {
      await run(mode);
      router.dismissTo('/');
      router.push('/session');
    } catch (e) {
      showError(e);
    }
  };

  const modeActions: MenuAction[] | null = chooser
    ? (['practice', 'exam'] as Mode[]).map((m) => ({ label: t(`mode.${m}`), onPress: () => void launch(chooser, m) }))
    : null;

  return (
    <Screen>
      {header}
      <ResultsView
        attempt={attempt}
        onRedoWrong={() =>
          setChooser(() => async (mode: Mode) => {
            await startRetry(attempt.id, mode);
          })
        }
        onRetakeAll={() => setChooser(() => (mode: Mode) => startRetake(attempt.id, mode))}
        onReview={(onlyWrong) => router.push({ pathname: '/review/[attemptId]', params: { attemptId: attempt.id, onlyWrong: onlyWrong ? '1' : '0' } })}
        onBack={() => router.dismissTo('/')}
      />
      <ActionMenu title={t('results.chooseMode')} actions={modeActions} onClose={() => setChooser(null)} />
    </Screen>
  );
}
