import { Pressable } from 'react-native';

import type { QuizSummary } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { Row } from './ui';

export function QuizRow({ quiz, onPress, onActions }: { quiz: QuizSummary; onPress: () => void; onActions: () => void }) {
  const t = useT();
  const theme = useTheme();
  const parts = [t('library.quizCount', { n: quiz.questionCount })];
  if (quiz.lastAttempt) parts.push(t('library.lastScore', { score: quiz.lastAttempt.score, total: quiz.lastAttempt.total }));
  return (
    <Row
      testID="quiz-row"
      accessibilityLabel={quiz.title}
      title={quiz.title}
      subtitle={parts.join(' · ')}
      onPress={onPress}
      onLongPress={onActions}
      left={<Icon name={{ ios: 'doc.text', android: 'description' }} color={theme.textMuted} />}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel={t('library.actions')} hitSlop={12} onPress={onActions}>
          <Icon name={{ ios: 'ellipsis', android: 'more_horiz' }} color={theme.textMuted} />
        </Pressable>
      }
    />
  );
}
