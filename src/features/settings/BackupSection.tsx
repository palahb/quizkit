import * as DocumentPicker from 'expo-document-picker';

import { showAlert } from '@/components/alert';
import { Button, Card, T } from '@/components/ui';
import { BackupInvalidError, exportBackup, restoreBackup } from '@/db/backupRepo';
import { readTextFile } from '@/features/import/readFile';
import { useT } from '@/hooks/useT';
import { getStores } from '@/stores';

function backupFileName(): string {
  return `quizkit-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Web only: export the whole library as a JSON file, or replace it from one. */
export function BackupSection() {
  const t = useT();

  const backUp = async () => {
    try {
      const backup = await exportBackup(getStores().db);
      const name = backupFileName();
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch (e) {
          if ((e as { name?: string }).name !== 'AbortError') throw e;
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showAlert('', t('settings.backup.exportError'));
    }
  };

  const applyRestore = async (raw: unknown) => {
    try {
      await restoreBackup(getStores().db, raw);
      const s = getStores();
      await Promise.all([s.library.getState().hydrate(), s.history.getState().loadRecent(50), s.session.getState().hydrate()]);
      showAlert('', t('settings.backup.restored'));
    } catch (e) {
      showAlert('', e instanceof BackupInvalidError ? t('settings.backup.invalid') : t('settings.backup.restoreError'));
    }
  };

  const restore = async () => {
    let raw: unknown;
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      const asset = picked.assets?.[0];
      if (picked.canceled || !asset) return;
      raw = JSON.parse(await readTextFile(asset));
    } catch {
      showAlert('', t('settings.backup.invalid'));
      return;
    }
    const o = raw as { quizzes?: unknown; attempts?: unknown } | null;
    const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
    showAlert(
      t('settings.backup.restore'),
      t('settings.backup.restoreConfirm', { quizzes: count(o?.quizzes), attempts: count(o?.attempts) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.backup.restore'), style: 'destructive', onPress: () => void applyRestore(raw) },
      ],
    );
  };

  return (
    <Card style={{ gap: 10 }}>
      <T variant="heading">{t('settings.backup.title')}</T>
      <T variant="small">{t('settings.backup.hint')}</T>
      <Button label={t('settings.backup.export')} onPress={() => void backUp()} />
      <Button label={t('settings.backup.restore')} kind="danger" onPress={() => void restore()} />
    </Card>
  );
}
