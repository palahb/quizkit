import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { MathText } from './math/MathText';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed';

/** One answer option. State is shown with color and a ✓/✗ mark, never color alone. */
export function OptionRow({
  letter,
  text,
  state,
  onPress,
  disabled,
}: {
  letter: string;
  text: string;
  state: OptionState;
  onPress(): void;
  disabled?: boolean;
}) {
  const t = useT();
  const theme = useTheme();
  const look = {
    idle: { border: theme.border, bg: theme.surface, mark: '' },
    selected: { border: theme.selected, bg: theme.selectedBg, mark: '●' },
    correct: { border: theme.correct, bg: theme.correctBg, mark: '✓' },
    wrong: { border: theme.wrong, bg: theme.wrongBg, mark: '✗' },
    missed: { border: theme.correct, bg: theme.surface, mark: '✓' },
  }[state];
  const markColor = state === 'wrong' ? theme.wrong : state === 'selected' ? theme.selected : theme.correct;
  const stateWord = state === 'idle' ? '' : `, ${t(`option.${state}`)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('option.label', { letter })}${stateWord}: ${text}`}
      accessibilityState={{ selected: state === 'selected', disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: look.border, backgroundColor: look.bg, borderWidth: state === 'idle' ? 1 : 2, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.letter, { borderColor: look.border }]}>
        <Text style={{ color: theme.text, fontWeight: '600' }}>{letter}</Text>
      </View>
      <View style={{ flex: 1 }} pointerEvents="none">
        <MathText text={text} />
      </View>
      {look.mark ? <Text style={{ color: markColor, fontSize: 18, fontWeight: '700' }}>{look.mark}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  letter: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
