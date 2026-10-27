import { Alert } from 'react-native';

import type { TFunction } from '@/i18n';

export function confirmAsync(title: string, message: string, confirmLabel: string, t: TFunction, destructive = true): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

export function showError(e: unknown) {
  Alert.alert('', e instanceof Error ? e.message : String(e));
}

/**
 * Runs a delete; if it touches the unfinished quiz, asks before discarding it.
 * Returns true when something was deleted.
 */
export async function deleteWithGuard(run: (discardActiveSession: boolean) => Promise<void>, t: TFunction): Promise<boolean> {
  try {
    await run(false);
    return true;
  } catch (e) {
    if (!(e instanceof Error) || e.message !== 'QUIZ_IN_ACTIVE_SESSION') {
      showError(e);
      return false;
    }
  }
  const ok = await confirmAsync(t('library.resumeTitle'), t('library.activeSessionConfirm'), t('common.delete'), t);
  if (!ok) return false;
  try {
    await run(true);
    return true;
  } catch (e) {
    showError(e);
    return false;
  }
}
