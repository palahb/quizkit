import * as Clipboard from 'expo-clipboard';
import { showAlert } from '@/components/alert';

import type { PromptDef } from '@/domain/prompts';
import type { TFunction } from '@/i18n';

export async function copyPrompt(prompt: PromptDef, t: TFunction) {
  await Clipboard.setStringAsync(prompt.body);
  showAlert(prompt.title, t('prompts.copied'));
}
