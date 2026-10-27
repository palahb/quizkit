import { Pressable } from 'react-native';

import type { Folder } from '@/domain/types';
import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { Row } from './ui';

export function FolderRow({
  folder,
  count,
  onPress,
  onActions,
}: {
  folder: Folder;
  count: number;
  onPress: () => void;
  onActions: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  return (
    <Row
      testID="folder-row"
      accessibilityLabel={folder.name}
      title={folder.name}
      subtitle={t('library.itemCount', { n: count })}
      onPress={onPress}
      onLongPress={onActions}
      left={<Icon name={{ ios: 'folder.fill', android: 'folder' }} color={theme.primary} />}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel={t('library.actions')} hitSlop={12} onPress={onActions}>
          <Icon name={{ ios: 'ellipsis', android: 'more_horiz' }} color={theme.textMuted} />
        </Pressable>
      }
    />
  );
}
