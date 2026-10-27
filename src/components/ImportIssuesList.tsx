import { View } from 'react-native';

import type { ImportIssue } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

import { T } from './ui';

/** Renders import issues or warnings as translated sentences. */
export function ImportIssuesList({ items, kind }: { items: ImportIssue[]; kind: 'issue' | 'warning' }) {
  const t = useT();
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {items.map((item, i) => {
        const params = { ...item.params };
        if (typeof params.field === 'string') params.field = t(`import.field.${params.field}`);
        const hint = typeof item.params.hint === 'string' ? t(`import.hint.${item.params.hint}`) : null;
        return (
          <View key={i} style={{ gap: 4 }}>
            <T style={{ color: kind === 'issue' ? theme.wrong : theme.text }}>{t(`import.${kind}.${item.code}`, params)}</T>
            {hint ? <T variant="muted">{hint}</T> : null}
            {item.code === 'syntax' && item.params.snippet ? (
              <T variant="small" style={{ fontFamily: 'Menlo' }}>
                {String(item.params.snippet)}
              </T>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
