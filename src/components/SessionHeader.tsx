import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export function SessionHeader({
  index,
  total,
  onQuit,
  right,
}: {
  index: number;
  total: number;
  onQuit(): void;
  /** Extra content on the right, e.g. the exam stopwatch and question grid button. */
  right?: React.ReactNode;
}) {
  const t = useT();
  const theme = useTheme();
  const progress = total > 0 ? (index + 1) / total : 0;
  return (
    <View style={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={onQuit}>
          <Text style={{ color: theme.primary, fontSize: 16 }}>{t('session.quit')}</Text>
        </Pressable>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }} accessibilityRole="text">
          {t('session.progress', { i: index + 1, n: total })}
        </Text>
        <View style={{ minWidth: 60, alignItems: 'flex-end' }}>{right}</View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
