import { View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import type { PromptDef } from '@/domain/prompts';
import { useT } from '@/hooks/useT';

export function PromptDetail({ prompt, onCopy }: { prompt: PromptDef; onCopy(prompt: PromptDef): void }) {
  const t = useT();
  return (
    <View style={{ gap: 12 }}>
      <T variant="muted">{prompt.description}</T>
      <Button label={t('prompts.copy')} onPress={() => onCopy(prompt)} />
      <Card>
        <T selectable style={{ fontFamily: 'Menlo', fontSize: 12, lineHeight: 17 }}>
          {prompt.body}
        </T>
      </Card>
    </View>
  );
}
