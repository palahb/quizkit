import { Pressable, TextInput, View } from 'react-native';

import { ImportIssuesList } from '@/components/ImportIssuesList';
import { MathText } from '@/components/math/MathText';
import { Button, Card, Row, T } from '@/components/ui';
import type { CollectionPlan } from '@/domain/collectionPlan';
import type { ImportOutcome } from '@/domain/parseImport';
import type { ImportResult } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { CollectionPreview } from './CollectionPreview';

export interface ImportPanelProps {
  text: string;
  outcome: ImportOutcome | null;
  /** Present for a readable collection: what saving it would do. */
  plan: CollectionPlan | null;
  onShowPrompts(): void;
  folderLabel: string;
  saving: boolean;
  onChangeText(text: string): void;
  onClear(): void;
  /** Y position of the error list / preview inside the panel, for scrolling to it. */
  onResultLayout?(y: number): void;
  onPaste(): void;
  onPickFile(): void;
  onCopyPrompt(): void;
  onChooseFolder(): void;
  onSave(): void;
}

export function ImportPanel(p: ImportPanelProps) {
  const t = useT();
  const theme = useTheme();
  const failure = failureOf(p.outcome);
  const quiz = p.outcome?.kind === 'quiz' && p.outcome.result.ok ? p.outcome.result : null;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 2 }}>
          <Button label={t('import.copyPrompt')} kind="secondary" onPress={p.onCopyPrompt} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('import.allPrompts')} kind="secondary" onPress={p.onShowPrompts} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={t('import.pasteFromClipboard')} kind="secondary" onPress={p.onPaste} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('import.pickFile')} kind="secondary" onPress={p.onPickFile} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="heading">{t('import.pasteLabel')}</T>
        {p.text !== '' ? (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={p.onClear}>
            <T style={{ color: theme.primary }}>{t('import.clear')}</T>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        multiline
        value={p.text}
        onChangeText={p.onChangeText}
        placeholder={t('import.pastePlaceholder')}
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
        accessibilityLabel={t('import.pasteLabel')}
        style={{
          minHeight: 140,
          maxHeight: 260,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: radius.sm,
          padding: 10,
          color: theme.text,
          backgroundColor: theme.surface,
          fontFamily: 'Menlo',
          fontSize: 13,
        }}
      />
      <View testID="import-result" style={{ gap: 12 }} onLayout={(e) => p.onResultLayout?.(e.nativeEvent.layout.y)}>
      {failure ? (
        <Card style={{ gap: 10, borderColor: theme.wrong }}>
          <T variant="heading">{t('import.errorsTitle')}</T>
          <ImportIssuesList items={failure.issues} kind="issue" />
          {failure.moreCount > 0 ? <T variant="muted">{t('import.more', { n: failure.moreCount })}</T> : null}
        </Card>
      ) : null}

      {quiz ? (
        <>
          <Card style={{ gap: 6 }}>
            <T variant="small">{t('import.previewTitle')}</T>
            <T variant="title">{quiz.quiz.title}</T>
            <T variant="muted">{t('import.previewCount', { n: quiz.quiz.questions.length })}</T>
            <T variant="small" style={{ marginTop: 6 }}>
              {t('import.firstQuestion')}
            </T>
            <MathText text={quiz.quiz.questions[0].text} />
          </Card>
          {quiz.warnings.length > 0 ? (
            <Card style={{ gap: 10 }}>
              <T variant="heading">{t('import.warningsTitle')}</T>
              <ImportIssuesList items={quiz.warnings} kind="warning" />
            </Card>
          ) : null}
          <Row title={t('import.saveTo')} subtitle={p.folderLabel} onPress={p.onChooseFolder} />
          <Button label={t('import.save')} onPress={p.onSave} disabled={p.saving} />
        </>
      ) : null}

      {p.outcome?.kind === 'collection' && p.outcome.result.ok && p.plan ? (
        <CollectionPreview
          plan={p.plan}
          warnings={p.outcome.result.collection.warnings}
          folderLabel={p.folderLabel}
          saving={p.saving}
          onChooseFolder={p.onChooseFolder}
          onSave={p.onSave}
        />
      ) : null}
      </View>
    </View>
  );
}

/** The failure to show, whether it came from a single quiz or a whole collection. */
function failureOf(outcome: ImportOutcome | null): Extract<ImportResult, { ok: false }> | null {
  if (!outcome) return null;
  return outcome.result.ok ? null : outcome.result;
}
