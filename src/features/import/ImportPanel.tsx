import { Pressable, TextInput, View } from 'react-native';

import { ImportIssuesList } from '@/components/ImportIssuesList';
import { MathText } from '@/components/math/MathText';
import { Button, Card, Row, T } from '@/components/ui';
import type { ImportResult } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface ImportPanelProps {
  text: string;
  result: ImportResult | null;
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
  const r = p.result;
  return (
    <View style={{ gap: 12 }}>
      <Button label={t('import.copyPrompt')} kind="secondary" onPress={p.onCopyPrompt} />
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
      {r && !r.ok ? (
        <Card style={{ gap: 10, borderColor: theme.wrong }}>
          <T variant="heading">{t('import.errorsTitle')}</T>
          <ImportIssuesList items={r.issues} kind="issue" />
          {r.moreCount > 0 ? <T variant="muted">{t('import.more', { n: r.moreCount })}</T> : null}
        </Card>
      ) : null}

      {r && r.ok ? (
        <>
          <Card style={{ gap: 6 }}>
            <T variant="small">{t('import.previewTitle')}</T>
            <T variant="title">{r.quiz.title}</T>
            <T variant="muted">{t('import.previewCount', { n: r.quiz.questions.length })}</T>
            <T variant="small" style={{ marginTop: 6 }}>
              {t('import.firstQuestion')}
            </T>
            <MathText text={r.quiz.questions[0].text} />
          </Card>
          {r.warnings.length > 0 ? (
            <Card style={{ gap: 10 }}>
              <T variant="heading">{t('import.warningsTitle')}</T>
              <ImportIssuesList items={r.warnings} kind="warning" />
            </Card>
          ) : null}
          <Row title={t('import.saveTo')} subtitle={p.folderLabel} onPress={p.onChooseFolder} />
          <Button label={t('import.save')} onPress={p.onSave} disabled={p.saving} />
        </>
      ) : null}
      </View>
    </View>
  );
}
