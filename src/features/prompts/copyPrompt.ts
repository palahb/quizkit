import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';

import type { PromptDef } from '@/domain/prompts';
import type { TFunction } from '@/i18n';

export async function copyPrompt(prompt: PromptDef, t: TFunction) {
  await Clipboard.setStringAsync(prompt.body);
  Alert.alert(prompt.title, t('prompts.copied'));
}
