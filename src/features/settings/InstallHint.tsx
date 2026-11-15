import { Card, T } from '@/components/ui';
import { useT } from '@/hooks/useT';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/** Web only: explain how to install the PWA (also protects the data from Safari's storage clearing). Hidden once installed. */
export function InstallHint() {
  const t = useT();
  if (isStandalone()) return null;
  return (
    <Card style={{ gap: 6 }}>
      <T variant="heading">{t('settings.install.title')}</T>
      <T>{t('settings.install.body')}</T>
      <T variant="small">{t('settings.install.steps')}</T>
    </Card>
  );
}
