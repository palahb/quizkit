import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { ActionMenu, type MenuAction } from '@/components/ActionMenu';
import { Icon } from '@/components/Icon';
import { NameDialog } from '@/components/NameDialog';
import { Button, Screen } from '@/components/ui';
import type { Folder, Id, QuizSummary } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useLibraryStore, useSessionStore } from '@/stores';
import { useTheme } from '@/theme/useTheme';

import { confirmAsync, deleteWithGuard, showError } from './flows';
import { childrenOf, itemCounts } from './libraryModel';
import { LibraryList } from './LibraryList';

type Dialog = { kind: 'new-folder' } | { kind: 'rename-folder'; folder: Folder } | { kind: 'rename-quiz'; quiz: QuizSummary };

/** Lists one folder level (null = top level) with all folder/quiz actions. */
export function LibraryBrowser({ parentId }: { parentId: Id | null }) {
  const t = useT();
  const theme = useTheme();
  const navigation = useNavigation();
  const allFolders = useLibraryStore((s) => s.folders);
  const allQuizzes = useLibraryStore((s) => s.quizzes);
  const lib = useLibraryStore((s) => s);
  const session = useSessionStore((s) => s.session);
  const abandon = useSessionStore((s) => s.abandon);

  const [menu, setMenu] = useState<{ title?: string; actions: MenuAction[] } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const { folders, quizzes } = useMemo(() => childrenOf(allFolders, allQuizzes, parentId), [allFolders, allQuizzes, parentId]);
  const counts = useMemo(() => itemCounts(allFolders, allQuizzes), [allFolders, allQuizzes]);

  const openImport = () => router.push({ pathname: '/import', params: parentId ? { folderId: parentId } : {} });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('library.actions')}
          hitSlop={12}
          style={{ paddingHorizontal: 8 }}
          onPress={() =>
            setMenu({
              actions: [
                { label: t('library.newFolder'), onPress: () => setDialog({ kind: 'new-folder' }) },
                { label: t('library.importQuiz'), onPress: openImport },
              ],
            })
          }
        >
          <Icon name={{ ios: 'plus', android: 'add' }} color={theme.primary} size={24} />
        </Pressable>
      ),
    });
  });

  const folderActions = (folder: Folder) =>
    setMenu({
      title: folder.name,
      actions: [
        { label: t('library.playAll'), onPress: () => router.push({ pathname: '/start', params: { kind: 'folder', id: folder.id } }) },
        { label: t('common.rename'), onPress: () => setDialog({ kind: 'rename-folder', folder }) },
        { label: t('library.moveTo'), onPress: () => router.push({ pathname: '/move', params: { kind: 'folder', id: folder.id } }) },
        {
          label: t('common.delete'),
          destructive: true,
          onPress: async () => {
            const ok = await confirmAsync(t('common.delete'), t('library.deleteFolderConfirm', { name: folder.name }), t('common.delete'), t);
            if (ok) await deleteWithGuard((discard) => lib.deleteFolder(folder.id, { discardActiveSession: discard }), t);
          },
        },
      ],
    });

  const quizActions = (quiz: QuizSummary) =>
    setMenu({
      title: quiz.title,
      actions: [
        { label: t('common.rename'), onPress: () => setDialog({ kind: 'rename-quiz', quiz }) },
        { label: t('library.moveTo'), onPress: () => router.push({ pathname: '/move', params: { kind: 'quiz', id: quiz.id } }) },
        {
          label: t('common.delete'),
          destructive: true,
          onPress: async () => {
            const ok = await confirmAsync(t('common.delete'), t('library.deleteQuizConfirm', { name: quiz.title }), t('common.delete'), t);
            if (ok) await deleteWithGuard((discard) => lib.deleteQuiz(quiz.id, { discardActiveSession: discard }), t);
          },
        },
      ],
    });

  const discard = async () => {
    if (await confirmAsync(t('library.resumeTitle'), t('library.discardConfirm'), t('library.discard'), t)) await abandon();
  };

  const submitName = (name: string) => {
    if (!dialog) return;
    const run =
      dialog.kind === 'new-folder'
        ? lib.createFolder(name, parentId)
        : dialog.kind === 'rename-folder'
          ? lib.renameFolder(dialog.folder.id, name)
          : lib.renameQuiz(dialog.quiz.id, name);
    run.catch(showError);
  };

  return (
    <Screen>
      {parentId !== null && (folders.length > 0 || quizzes.length > 0) ? (
        <Button label={t('library.playAll')} onPress={() => router.push({ pathname: '/start', params: { kind: 'folder', id: parentId } })} />
      ) : null}
      <LibraryList
        folders={folders}
        quizzes={quizzes}
        itemCounts={counts}
        resume={session ? { answered: Object.keys(session.answers).length, total: session.questionRefs.length } : null}
        isRoot={parentId === null}
        onOpenFolder={(id) => router.push({ pathname: '/folder/[id]', params: { id } })}
        onOpenQuiz={(id) => router.push({ pathname: '/quiz/[id]', params: { id } })}
        onFolderActions={folderActions}
        onQuizActions={quizActions}
        onImport={openImport}
        onResume={() => router.push('/session')}
        onDiscard={discard}
      />
      <ActionMenu title={menu?.title} actions={menu?.actions ?? null} onClose={() => setMenu(null)} />
      <NameDialog
        visible={dialog !== null}
        title={
          dialog?.kind === 'rename-folder' ? t('library.renameFolder') : dialog?.kind === 'rename-quiz' ? t('library.renameQuiz') : t('library.newFolder')
        }
        initial={dialog?.kind === 'rename-folder' ? dialog.folder.name : dialog?.kind === 'rename-quiz' ? dialog.quiz.title : ''}
        placeholder={t('library.folderName')}
        onSubmit={submitName}
        onClose={() => setDialog(null)}
      />
    </Screen>
  );
}
