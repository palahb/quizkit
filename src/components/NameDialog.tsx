import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Button, T } from './ui';

/** Text prompt for folder/quiz names (Alert.prompt is iOS-only). */
export function NameDialog({
  visible,
  title,
  initial = '',
  placeholder,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  placeholder?: string;
  onSubmit(name: string): void;
  onClose(): void;
}) {
  const t = useT();
  const theme = useTheme();
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);
  const trimmed = value.trim();
  const submit = () => {
    if (!trimmed) return;
    onClose();
    onSubmit(trimmed);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <T variant="heading">{title}</T>
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={submit}
            returnKeyType="done"
            maxLength={120}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button label={t('common.cancel')} kind="secondary" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('common.save')} onPress={submit} disabled={!trimmed} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16 },
});
