import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { getPrompts } from '@/domain/prompts';
import { copyPrompt } from '@/features/prompts/copyPrompt';
import { PromptList } from '@/features/prompts/PromptList';
import { useT } from '@/hooks/useT';
import { useSettingsStore } from '@/stores';

export default function PromptsScreen() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  return (
    <Screen>
      <PromptList
        prompts={getPrompts(language)}
        onOpen={(id) => router.push({ pathname: '/prompt/[id]', params: { id } })}
        onCopy={(p) => void copyPrompt(p, t)}
      />
    </Screen>
  );
}
