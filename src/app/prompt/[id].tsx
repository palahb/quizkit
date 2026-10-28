import { Stack, useLocalSearchParams } from 'expo-router';

import { Screen, T } from '@/components/ui';
import { getPrompts, type PromptId } from '@/domain/prompts';
import { copyPrompt } from '@/features/prompts/copyPrompt';
import { PromptDetail } from '@/features/prompts/PromptDetail';
import { useT } from '@/hooks/useT';
import { useSettingsStore } from '@/stores';

export default function PromptScreen() {
  const { id } = useLocalSearchParams<{ id: PromptId }>();
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const prompt = getPrompts(language).find((p) => p.id === id);
  if (!prompt) return <Screen><T variant="muted">—</T></Screen>;
  return (
    <Screen>
      <Stack.Screen options={{ title: prompt.title }} />
      <PromptDetail prompt={prompt} onCopy={(p) => void copyPrompt(p, t)} />
    </Screen>
  );
}
