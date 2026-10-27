import { Screen, T } from '@/components/ui';
import { useT } from '@/hooks/useT';

// Placeholder until Task 14 builds the history list.
export default function HistoryScreen() {
  const t = useT();
  return (
    <Screen>
      <T variant="muted">{t('history.empty')}</T>
    </Screen>
  );
}
