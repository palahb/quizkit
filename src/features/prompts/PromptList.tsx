import { Pressable, View } from 'react-native';

import { Card, T } from '@/components/ui';
import type { PromptDef, PromptId } from '@/domain/prompts';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

export function PromptList({ prompts, onOpen, onCopy }: { prompts: PromptDef[]; onOpen(id: PromptId): void; onCopy(prompt: PromptDef): void }) {
  const t = useT();
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <T variant="muted">{t('prompts.intro')}</T>
      {prompts.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" onPress={() => onOpen(p.id)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontWeight: '600' }}>{p.title}</T>
              <T variant="small">{p.description}</T>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('prompts.copy')}: ${p.title}`} hitSlop={10} onPress={() => onCopy(p)}>
              <T style={{ color: theme.primary, fontWeight: '600' }}>{t('prompts.copy')}</T>
            </Pressable>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
