import { View } from 'react-native';

import { ImportIssuesList } from '@/components/ImportIssuesList';
import { Button, Card, Row, T } from '@/components/ui';
import type { CollectionPlan } from '@/domain/collectionPlan';
import type { ImportWarning } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

const samePath = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const isChildOf = (path: string[], parent: string[]) => path.length === parent.length + 1 && samePath(path.slice(0, -1), parent);

/** Preview of a collection: summary, folder tree with what happens to each item, and errors. */
export function CollectionPreview({
  plan,
  warnings,
  folderLabel,
  saving,
  onChooseFolder,
  onSave,
}: {
  plan: CollectionPlan;
  warnings: ImportWarning[];
  folderLabel: string;
  saving: boolean;
  onChooseFolder(): void;
  onSave(): void;
}) {
  const t = useT();
  const theme = useTheme();
  const totalQuestions = plan.quizzes.reduce((n, q) => n + (q.entry.result.ok ? q.entry.result.quiz.questions.length : 0), 0);

  const quizLine = (q: CollectionPlan['quizzes'][number]) => {
    const r = q.entry.result;
    if (q.status === 'invalid') return { text: `${q.entry.title} · ${t('import.collection.quizInvalid')}`, color: theme.wrong };
    if (q.status === 'duplicate') return { text: `${q.entry.title} · ${t('import.collection.quizDuplicate')}`, color: theme.textMuted };
    const parts = [q.entry.title, t('import.collection.questions', { n: r.ok ? r.quiz.questions.length : 0 })];
    if (r.ok && r.warnings.length > 0) parts.push(t('import.collection.quizWarnings', { n: r.warnings.length }));
    return { text: parts.join(' · '), color: theme.text };
  };

  // Folders first, then the quizzes at that level, recursively.
  const renderLevel = (parent: string[], depth: number): React.ReactNode[] => [
    ...plan.folders
      .filter((f) => isChildOf(f.path, parent))
      .flatMap((f) => [
        <T key={`f:${f.path.join('/')}`} style={{ marginLeft: depth * 16, fontWeight: '600' }}>
          {`${f.path[f.path.length - 1]} · ${t(f.status === 'new' ? 'import.collection.folderNew' : 'import.collection.folderExisting')}`}
        </T>,
        ...renderLevel(f.path, depth + 1),
      ]),
    ...plan.quizzes
      .filter((q) => samePath(q.entry.path, parent))
      .map((q, i) => {
        const line = quizLine(q);
        return (
          <T key={`q:${parent.join('/')}:${i}`} style={{ marginLeft: depth * 16, color: line.color }}>
            {line.text}
          </T>
        );
      }),
  ];

  const invalid = plan.quizzes.filter((q) => q.status === 'invalid');
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 6 }}>
        <T variant="small">{t('import.previewTitle')}</T>
        <T variant="muted">
          {t('import.collection.summary', { folders: plan.folders.length, quizzes: plan.quizzes.length, questions: totalQuestions })}
        </T>
        <View style={{ gap: 4, marginTop: 6 }}>{renderLevel([], 0)}</View>
      </Card>

      {invalid.map(({ entry }, i) =>
        entry.result.ok ? null : (
          <Card key={`e:${i}`} style={{ gap: 8, borderColor: theme.wrong }}>
            <T variant="heading">{entry.title}</T>
            <ImportIssuesList items={entry.result.issues} kind="issue" />
            {entry.result.moreCount > 0 ? <T variant="muted">{t('import.more', { n: entry.result.moreCount })}</T> : null}
          </Card>
        ),
      )}

      {warnings.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <T variant="heading">{t('import.warningsTitle')}</T>
          <ImportIssuesList items={warnings} kind="warning" />
        </Card>
      ) : null}

      <Row title={t('import.saveTo')} subtitle={folderLabel} onPress={onChooseFolder} />
      {plan.counts.newQuizzes > 0 ? (
        <Button label={t('import.collection.save', { n: plan.counts.newQuizzes })} onPress={onSave} disabled={saving} />
      ) : (
        <T variant="muted">{t('import.collection.nothingToSave')}</T>
      )}
    </View>
  );
}
