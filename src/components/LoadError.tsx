import { showAlert } from '@/components/alert';
import { Button, Screen, T } from '@/components/ui';
import { loadErrorKey } from '@/db/loadErrorKey';
import { translate } from '@/i18n';
import { deviceLanguage, resetDatabaseFile } from '@/stores';

/** Shown when the database cannot be opened. Uses the device language because settings are unavailable. */
export function LoadError({ onRetry, error }: { onRetry: () => void; error: unknown }) {
  const lang = deviceLanguage();
  const tr = (k: string) => translate(lang, k);
  const reset = () =>
    showAlert(tr('app.resetData'), tr('app.resetConfirm'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('app.resetData'),
        style: 'destructive',
        onPress: async () => {
          try {
            await resetDatabaseFile();
          } catch (e) {
            showAlert(tr('app.loadError'), e instanceof Error ? e.message : String(e));
            return;
          }
          onRetry();
        },
      },
    ]);
  // Never offer to delete data that is merely locked by another window or that could not be loaded at all.
  const key = loadErrorKey(error);
  const canReset = key === 'app.loadError';
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <T variant="heading">{tr(key)}</T>
      <Button label={tr('app.retry')} onPress={onRetry} />
      {canReset ? <Button label={tr('app.resetData')} kind="danger" onPress={reset} /> : null}
    </Screen>
  );
}
