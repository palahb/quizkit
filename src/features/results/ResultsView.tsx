import { View } from 'react-native';

import { Button, Card, Row, T } from '@/components/ui';
import { formatDuration } from '@/domain/format';
import type { Attempt } from '@/domain/types';
import { wrongQuestions } from '@/engine/sessionEngine';
import { useT } from '@/hooks/useT';

export interface ResultsViewProps {
  attempt: Attempt;
  onRedoWrong(): void;
  onRetakeAll(): void;
  onReview(onlyWrong: boolean): void;
  onBack(): void;
}

export function ResultsView({ attempt, onRedoWrong, onRetakeAll, onReview, onBack }: ResultsViewProps) {
  const t = useT();
  const wrong = wrongQuestions(attempt);
  const wrongIds = new Set(wrong.map((q) => q.id));
  const percent = attempt.total > 0 ? Math.round((attempt.correctCount / attempt.total) * 100) : 0;
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ alignItems: 'center', gap: 4 }}>
        <T variant="muted">{attempt.title}</T>
        <T style={{ fontSize: 40, fontWeight: '700' }} accessibilityLabel={`${attempt.correctCount} / ${attempt.total}, ${percent}%`}>
          {`${attempt.correctCount} / ${attempt.total}`}
        </T>
        <T variant="muted">{`${percent}% · ${t(`mode.${attempt.mode}`)}`}</T>
        <T variant="muted">{t('results.time', { time: formatDuration(attempt.durationMs) })}</T>
      </Card>

      {wrong.length > 0 ? <Button label={t('results.redoWrong', { n: wrong.length })} onPress={onRedoWrong} /> : null}
      <Button label={t('results.retakeAll')} kind="secondary" onPress={onRetakeAll} />
      <Button label={t('results.review')} kind="secondary" onPress={() => onReview(false)} />

      <T variant="heading" style={{ marginTop: 8 }}>
        {t('results.wrongList')}
      </T>
      {wrong.length === 0 ? <T variant="muted">{t('results.allCorrect')}</T> : null}
      {attempt.questions.map((q, i) =>
        wrongIds.has(q.id) ? (
          <Row
            key={q.id}
            title={t('results.questionN', { n: i + 1 })}
            subtitle={attempt.answers[q.id] === undefined ? t('results.notAnswered') : undefined}
            onPress={() => onReview(true)}
          />
        ) : null,
      )}

      <Button label={t('results.backToLibrary')} kind="secondary" onPress={onBack} />
    </View>
  );
}
