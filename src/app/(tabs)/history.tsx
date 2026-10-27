import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Screen } from '@/components/ui';
import { showError } from '@/features/library/flows';
import { HistoryList } from '@/features/results/HistoryList';
import { useHistoryStore, useSettingsStore } from '@/stores';

export default function HistoryScreen() {
  const recent = useHistoryStore((s) => s.recent);
  const loadRecent = useHistoryStore((s) => s.loadRecent);
  const language = useSettingsStore((s) => s.language);

  useFocusEffect(
    useCallback(() => {
      loadRecent(200).catch(showError);
    }, [loadRecent]),
  );

  return (
    <Screen>
      <HistoryList items={recent} language={language} onOpen={(id) => router.push({ pathname: '/results/[attemptId]', params: { attemptId: id } })} />
    </Screen>
  );
}
