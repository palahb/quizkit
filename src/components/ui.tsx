// Small themed building blocks shared by every screen.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export function Screen({
  children,
  scroll = true,
  edges = ['left', 'right'],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
}) {
  const t = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'body' | 'title' | 'heading' | 'muted' | 'small';

export function T({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const t = useTheme();
  const base = {
    body: { fontSize: 16, color: t.text },
    title: { fontSize: 26, fontWeight: '700' as const, color: t.text },
    heading: { fontSize: 18, fontWeight: '600' as const, color: t.text },
    muted: { fontSize: 15, color: t.textMuted },
    small: { fontSize: 13, color: t.textMuted },
  }[variant];
  return <Text {...rest} style={[base, style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.surface, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.lg }, style]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.primary : kind === 'danger' ? t.danger : t.surfaceAlt;
  const fg = kind === 'secondary' ? t.text : t.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }]}
    >
      <Text style={{ color: fg, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({
  value,
  options,
  onChange,
}: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
}) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.segmented, { backgroundColor: t.surfaceAlt }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: t.surface }]}
          >
            <Text style={{ color: active ? t.text : t.textMuted, fontWeight: active ? '600' : '400', fontSize: 15 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  left,
  right,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}: {
  testID?: string;
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.surfaceAlt : t.surface, borderColor: t.border }]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: '500' }}>{title}</Text>
        {subtitle ? <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  button: { paddingVertical: 14, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  segmented: { flexDirection: 'row', borderRadius: radius.sm, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm - 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
