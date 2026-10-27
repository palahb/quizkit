import { useT } from '@/hooks/useT';

import { MathText } from './math/MathText';
import { Card, T } from './ui';

export function ExplanationPanel({ text }: { text?: string }) {
  const t = useT();
  return (
    <Card style={{ gap: 6 }}>
      <T variant="heading">{t('session.explanation')}</T>
      {text ? <MathText text={text} /> : <T variant="muted">{t('session.noExplanation')}</T>}
    </Card>
  );
}
