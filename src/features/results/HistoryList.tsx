import { View } from 'react-native';

import { Row, T } from '@/components/ui';
import type { AttemptSummary, Id } from '@/domain/types';
import { useT } from '@/hooks/useT';

export function HistoryList({ items, language, onOpen }: { items: AttemptSummary[]; language: string; onOpen(id: Id): void }) {
  const t = useT();
  if (items.length === 0) return <T variant="muted">{t('history.empty')}</T>;
  return (
    <View style={{ gap: 8 }}>
      {items.map((a) => {
        const score = `${a.correctCount} / ${a.total}`;
        return (
          <Row
            key={a.id}
            testID="history-row"
            accessibilityLabel={`${a.title}, ${score}`}
            title={a.title}
            subtitle={`${score} · ${t(`mode.${a.mode}`)} · ${new Date(a.finishedAt).toLocaleString(language)}`}
            onPress={() => onOpen(a.id)}
          />
        );
      })}
    </View>
  );
}
