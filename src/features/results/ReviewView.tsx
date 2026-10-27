import { View } from 'react-native';

import { T } from '@/components/ui';
import type { Attempt } from '@/domain/types';
import { wrongQuestions } from '@/engine/sessionEngine';
import { useT } from '@/hooks/useT';

import { QuestionView } from '../session/QuestionView';

/** Every question (or only wrong ones) with the user's pick, the correct answer and the explanation. */
export function ReviewView({ attempt, onlyWrong }: { attempt: Attempt; onlyWrong: boolean }) {
  const t = useT();
  const wrongIds = new Set(wrongQuestions(attempt).map((q) => q.id));
  return (
    <View style={{ gap: 20 }}>
      {attempt.questions.map((q, i) => {
        if (onlyWrong && !wrongIds.has(q.id)) return null;
        const picked = attempt.answers[q.id];
        return (
          <View key={q.id} style={{ gap: 8 }}>
            <T variant="small">{t('results.questionN', { n: i + 1 })}</T>
            {picked === undefined ? <T variant="muted">{t('review.notAnswered')}</T> : null}
            <QuestionView question={q} mode={attempt.mode} pickedOptionId={picked} onPick={() => {}} reveal />
          </View>
        );
      })}
    </View>
  );
}
