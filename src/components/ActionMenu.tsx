import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/hooks/useT';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface MenuAction {
  label: string;
  destructive?: boolean;
  onPress(): void;
}

/** Cross-platform bottom action sheet (Android alerts allow only three buttons). */
export function ActionMenu({ title, actions, onClose }: { title?: string; actions: MenuAction[] | null; onClose(): void }) {
  const t = useT();
  const theme = useTheme();
  return (
    <Modal visible={actions !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')}>
        <SafeAreaView edges={['bottom']} style={{ width: '100%' }}>
          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
            {title ? <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', padding: spacing.md }}>{title}</Text> : null}
            {(actions ?? []).map((a) => (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  a.onPress();
                }}
                style={({ pressed }) => [styles.item, { borderTopColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : 'transparent' }]}
              >
                <Text style={{ color: a.destructive ? theme.danger : theme.primary, fontSize: 17, textAlign: 'center' }}>{a.label}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={onClose} style={[styles.item, { borderTopColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)', padding: spacing.md },
  sheet: { borderRadius: radius.md, overflow: 'hidden' },
  item: { paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
