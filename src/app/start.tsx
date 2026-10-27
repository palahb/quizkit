import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Card, Segmented, Screen, T } from '@/components/ui';
import type { Mode } from '@/domain/types';
import { confirmAsync, showError } from '@/features/library/flows';
import { useT } from '@/hooks/useT';
import { useLibraryStore, useSessionStore } from '@/stores';
import { folderSubtree } from '@/stores/libraryStore';

export default function StartScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: 'quiz' | 'folder'; id: string }>();
  const t = useT();
  const folders = useLibraryStore((s) => s.folders);
  const quizzes = useLibraryStore((s) => s.quizzes);
  const activeSession = useSessionStore((s) => s.session);
  const start = useSessionStore((s) => s.start);
  const abandon = useSessionStore((s) => s.abandon);

  const [mode, setMode] = useState<Mode>('practice');
  const [shuffleQuestions, setShuffleQuestions] = useState(kind === 'folder');
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [busy, setBusy] = useState(false);

  const { title, count } = useMemo(() => {
    if (kind === 'quiz') {
      const q = quizzes.find((x) => x.id === id);
      return { title: q?.title ?? '', count: q?.questionCount ?? 0 };
    }
    const subtree = folderSubtree(folders, id);
    const total = quizzes.filter((q) => q.folderId !== null && subtree.has(q.folderId)).reduce((n, q) => n + q.questionCount, 0);
    return { title: folders.find((f) => f.id === id)?.name ?? '', count: total };
  }, [kind, id, folders, quizzes]);

  const go = async () => {
    if (activeSession) {
      const ok = await confirmAsync(t('library.resumeTitle'), t('library.discardConfirm'), t('library.discard'), t);
      if (!ok) return;
      await abandon();
    }
    setBusy(true);
    try {
      await start({
        scope: kind === 'quiz' ? { kind: 'quiz', quizId: id } : { kind: 'folder', folderId: id },
        mode,
        shuffleQuestions,
        shuffleOptions,
      });
      router.dismissTo('/');
      router.push('/session');
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('start.title') }} />
      <T variant="title">{title}</T>
      <T variant="muted">{t('library.quizCount', { n: count })}</T>
      {count === 0 ? (
        <T variant="muted">{t('start.noQuestions')}</T>
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <T variant="heading">{t('start.mode')}</T>
            <Segmented<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'practice', label: t('mode.practice') },
                { value: 'exam', label: t('mode.exam') },
              ]}
            />
            <T variant="small">{mode === 'practice' ? t('start.practiceHint') : t('start.examHint')}</T>
          </Card>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T>{t('start.shuffleQuestions')}</T>
              <Switch value={shuffleQuestions} onValueChange={setShuffleQuestions} accessibilityLabel={t('start.shuffleQuestions')} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T>{t('start.shuffleOptions')}</T>
              <Switch value={shuffleOptions} onValueChange={setShuffleOptions} accessibilityLabel={t('start.shuffleOptions')} />
            </View>
            <T variant="small">{t('start.shuffleOptionsHint')}</T>
          </Card>
          <Button label={t('start.go')} onPress={go} disabled={busy} />
        </>
      )}
    </Screen>
  );
}
