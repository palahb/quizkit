import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { Icon } from '@/components/Icon';
import { Row, Screen } from '@/components/ui';
import type { Id } from '@/domain/types';
import { showError } from '@/features/library/flows';
import { moveTargets } from '@/features/library/libraryModel';
import { useT } from '@/hooks/useT';
import { useLibraryStore } from '@/stores';
import { useTheme } from '@/theme/useTheme';

export default function MoveScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: 'folder' | 'quiz'; id: string }>();
  const t = useT();
  const theme = useTheme();
  const folders = useLibraryStore((s) => s.folders);
  const quizzes = useLibraryStore((s) => s.quizzes);
  const moveFolder = useLibraryStore((s) => s.moveFolder);
  const moveQuiz = useLibraryStore((s) => s.moveQuiz);

  const targets = useMemo(() => moveTargets(folders, { kind, id }), [folders, kind, id]);
  const current = kind === 'folder' ? folders.find((f) => f.id === id)?.parentId : quizzes.find((q) => q.id === id)?.folderId;

  const moveTo = async (target: Id | null) => {
    try {
      if (kind === 'folder') await moveFolder(id, target);
      else await moveQuiz(id, target);
      router.back();
    } catch (e) {
      showError(e);
    }
  };

  const check = (target: Id | null) =>
    current === target ? <Icon name={{ ios: 'checkmark', android: 'check' }} color={theme.primary} /> : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('library.moveTo') }} />
      <Row title={t('common.root')} onPress={() => moveTo(null)} right={check(null)} />
      {targets.map(({ folder, depth }) => (
        <Row
          key={folder.id}
          title={`${'    '.repeat(depth)}${folder.name}`}
          onPress={() => moveTo(folder.id)}
          right={check(folder.id)}
          left={<Icon name={{ ios: 'folder', android: 'folder' }} color={theme.textMuted} />}
        />
      ))}
    </Screen>
  );
}
