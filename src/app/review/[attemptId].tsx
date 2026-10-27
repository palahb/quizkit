import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Segmented, Screen, T } from '@/components/ui';
import type { Attempt } from '@/domain/types';
import { showError } from '@/features/library/flows';
import { ReviewView } from '@/features/results/ReviewView';
import { useT } from '@/hooks/useT';
import { useHistoryStore } from '@/stores';

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ attemptId: string; onlyWrong?: string }>();
  const t = useT();
  const loadAttempt = useHistoryStore((s) => s.loadAttempt);
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);
  const [filter, setFilter] = useState<'wrong' | 'all'>(params.onlyWrong === '1' ? 'wrong' : 'all');

  useEffect(() => {
    loadAttempt(params.attemptId).then(setAttempt, (e) => {
      showError(e);
      setAttempt(null);
    });
  }, [params.attemptId, loadAttempt]);

  if (attempt === undefined) return <Screen><ActivityIndicator /></Screen>;
  if (attempt === null) return <Screen><T variant="muted">{t('results.notFound')}</T></Screen>;

  return (
    <Screen>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('review.all') },
          { value: 'wrong', label: t('review.onlyWrong') },
        ]}
      />
      <ReviewView attempt={attempt} onlyWrong={filter === 'wrong'} />
    </Screen>
  );
}
