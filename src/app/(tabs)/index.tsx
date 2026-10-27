import { Screen, T } from '@/components/ui';
import { useT } from '@/hooks/useT';

// Placeholder until Task 11 builds the library.
export default function LibraryScreen() {
  const t = useT();
  return (
    <Screen>
      <T variant="muted">{t('library.empty')}</T>
    </Screen>
  );
}
