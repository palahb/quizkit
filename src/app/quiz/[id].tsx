import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { NameDialog } from '@/components/NameDialog';
import { Button, Card, Row, Screen, T } from '@/components/ui';
import type { AttemptSummary } from '@/domain/types';
import { confirmAsync, deleteWithGuard, showError } from '@/features/library/flows';
import { useT } from '@/hooks/useT';
import { useHistoryStore, useLibraryStore, useSettingsStore } from '@/stores';

export default function QuizDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const lang = useSettingsStore((s) => s.language);
  const quiz = useLibraryStore((s) => s.quizzes.find((q) => q.id === id));
  const renameQuiz = useLibraryStore((s) => s.renameQuiz);
  const deleteQuiz = useLibraryStore((s) => s.deleteQuiz);
  const listForQuiz = useHistoryStore((s) => s.listForQuiz);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [renaming, setRenaming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listForQuiz(id).then(setAttempts).catch(showError);
    }, [id, listForQuiz]),
  );

  if (!quiz) {
    return (
      <Screen>
        <T variant="muted">{t('quiz.notFound')}</T>
      </Screen>
    );
  }

  const remove = async () => {
    const ok = await confirmAsync(t('common.delete'), t('library.deleteQuizConfirm', { name: quiz.title }), t('common.delete'), t);
    if (ok && (await deleteWithGuard((discard) => deleteQuiz(quiz.id, { discardActiveSession: discard }), t))) router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: quiz.title }} />
      <Card style={{ gap: 6 }}>
        <T variant="title">{quiz.title}</T>
        {quiz.description ? <T variant="muted">{quiz.description}</T> : null}
        <T variant="muted">{t('library.quizCount', { n: quiz.questionCount })}</T>
        {quiz.lastAttempt ? <T variant="muted">{t('library.lastScore', { score: quiz.lastAttempt.score, total: quiz.lastAttempt.total })}</T> : null}
      </Card>
      <Button label={t('quiz.start')} onPress={() => router.push({ pathname: '/start', params: { kind: 'quiz', id: quiz.id } })} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={t('common.rename')} kind="secondary" onPress={() => setRenaming(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('common.move')} kind="secondary" onPress={() => router.push({ pathname: '/move', params: { kind: 'quiz', id: quiz.id } })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('common.delete')} kind="danger" onPress={remove} />
        </View>
      </View>

      <T variant="heading" style={{ marginTop: 8 }}>
        {t('quiz.pastAttempts')}
      </T>
      {attempts.length === 0 ? <T variant="muted">{t('quiz.noAttempts')}</T> : null}
      {attempts.map((a) => (
        <Row
          key={a.id}
          title={`${a.correctCount} / ${a.total}`}
          subtitle={`${t(`mode.${a.mode}`)} · ${new Date(a.finishedAt).toLocaleString(lang)}`}
          onPress={() => router.push({ pathname: '/results/[attemptId]', params: { attemptId: a.id } })}
        />
      ))}

      <NameDialog
        visible={renaming}
        title={t('library.renameQuiz')}
        initial={quiz.title}
        onSubmit={(name) => renameQuiz(quiz.id, name).catch(showError)}
        onClose={() => setRenaming(false)}
      />
    </Screen>
  );
}
