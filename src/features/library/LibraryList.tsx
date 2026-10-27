import { View } from 'react-native';

import { FolderRow } from '@/components/FolderRow';
import { QuizRow } from '@/components/QuizRow';
import { Button, Card, T } from '@/components/ui';
import type { Folder, Id, QuizSummary } from '@/domain/types';
import { useT } from '@/hooks/useT';

export interface LibraryListProps {
  folders: Folder[];
  quizzes: QuizSummary[];
  itemCounts: Record<Id, number>;
  /** Present when an unfinished quiz exists (shown at the top level only). */
  resume: { answered: number; total: number } | null;
  isRoot: boolean;
  onOpenFolder(id: Id): void;
  onOpenQuiz(id: Id): void;
  onFolderActions(folder: Folder): void;
  onQuizActions(quiz: QuizSummary): void;
  onImport(): void;
  onResume(): void;
  onDiscard(): void;
}

export function LibraryList(p: LibraryListProps) {
  const t = useT();
  const empty = p.folders.length === 0 && p.quizzes.length === 0;
  return (
    <View style={{ gap: 10 }}>
      {p.resume && p.isRoot ? (
        <Card style={{ gap: 8 }}>
          <T variant="heading">{t('library.resumeTitle')}</T>
          <T variant="muted">{t('library.resumeBody', p.resume)}</T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label={t('library.resume')} onPress={p.onResume} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('library.discard')} kind="secondary" onPress={p.onDiscard} />
            </View>
          </View>
        </Card>
      ) : null}

      {p.folders.map((f) => (
        <FolderRow
          key={f.id}
          folder={f}
          count={p.itemCounts[f.id] ?? 0}
          onPress={() => p.onOpenFolder(f.id)}
          onActions={() => p.onFolderActions(f)}
        />
      ))}
      {p.quizzes.map((q) => (
        <QuizRow key={q.id} quiz={q} onPress={() => p.onOpenQuiz(q.id)} onActions={() => p.onQuizActions(q)} />
      ))}

      {empty ? (
        <Card style={{ gap: 12 }}>
          <T variant="heading">{p.isRoot ? t('library.empty') : t('library.emptyFolder')}</T>
          {p.isRoot ? <T variant="muted">{t('library.emptyHint')}</T> : null}
          <Button label={t('library.importQuiz')} onPress={p.onImport} />
        </Card>
      ) : null}
    </View>
  );
}
