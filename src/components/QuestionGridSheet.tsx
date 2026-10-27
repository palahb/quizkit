import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Id } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Button, T } from './ui';

/** Exam overview: jump to any question, see which are answered, submit. */
export function QuestionGridSheet({
  visible,
  questionIds,
  answers,
  current,
  onJump,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  questionIds: Id[];
  answers: Record<Id, Id>;
  current: number;
  onJump(index: number): void;
  onSubmit(): void;
  onClose(): void;
}) {
  const t = useT();
  const theme = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ padding: spacing.lg }}>
          <T variant="heading">{t('session.grid')}</T>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {questionIds.map((id, i) => {
            const answered = id in answers;
            const isCurrent = i === current;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`${t('results.questionN', { n: i + 1 })}${answered ? '' : `, ${t('results.notAnswered')}`}`}
                onPress={() => {
                  onJump(i);
                  onClose();
                }}
                style={[
                  styles.cell,
                  {
                    backgroundColor: answered ? theme.selectedBg : theme.surface,
                    borderColor: isCurrent ? theme.primary : theme.border,
                    borderWidth: isCurrent ? 2 : 1,
                  },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: answered ? '700' : '400' }}>{i + 1}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Button
            label={t('session.submit')}
            onPress={() => {
              onClose();
              onSubmit();
            }}
          />
          <Button label={t('common.close')} kind="secondary" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  cell: { width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
