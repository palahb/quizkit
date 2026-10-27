import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionHeader } from '@/components/SessionHeader';
import { Button } from '@/components/ui';
import { confirmAsync, showError } from '@/features/library/flows';
import { QuestionView } from '@/features/session/QuestionView';
import { useT } from '@/hooks/useT';
import { useSessionStore } from '@/stores';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function SessionScreen() {
  const t = useT();
  const theme = useTheme();
  const session = useSessionStore((s) => s.session);
  const questions = useSessionStore((s) => s.questions);
  const store = useSessionStore((s) => s);
  const [submitting, setSubmitting] = useState(false);

  // Entering the screen (fresh start or "Resume") loads questions if needed and starts the clock.
  useEffect(() => {
    store.resume().then((ok) => {
      if (!ok) {
        Alert.alert('', t('session.cannotResume'));
        router.back();
      }
    }, showError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session || !questions) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  const index = session.currentIndex;
  const question = questions[index];
  const next = questions[index + 1];
  const isLast = index === questions.length - 1;

  const quit = async () => {
    if (await confirmAsync(t('session.leaveTitle'), t('session.leaveBody'), t('session.leave'), t, false)) {
      store.pause();
      router.back();
    }
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      const attempt = await store.submit();
      router.replace({ pathname: '/results/[attemptId]', params: { attemptId: attempt.id } });
    } catch (e) {
      showError(e);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <SessionHeader index={index} total={questions.length} onQuit={quit} />
      <ScrollView key={question.id} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <QuestionView
          question={question}
          mode={session.mode}
          pickedOptionId={session.answers[question.id]}
          onPick={(optionId) => store.answer(question.id, optionId)}
        />
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <Button label={t('session.prev')} kind="secondary" disabled={index === 0} onPress={() => store.goTo(index - 1)} />
        </View>
        <View style={{ flex: 2 }}>
          {isLast ? (
            <Button label={t('session.finish')} onPress={finish} disabled={submitting} />
          ) : (
            <Button label={t('session.next')} onPress={() => store.goTo(index + 1)} />
          )}
        </View>
      </View>
      {/* Pre-renders the next question invisibly, at the same width, so its math appears without a size jump. */}
      {next ? (
        <View
          style={{ position: 'absolute', left: 0, right: 0, top: 0, opacity: 0, zIndex: -1, padding: spacing.lg }}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <QuestionView question={next} mode={session.mode} pickedOptionId={undefined} onPick={() => {}} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
