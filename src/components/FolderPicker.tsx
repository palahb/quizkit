import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Folder, Id } from '@/domain/types';
import { moveTargets } from '@/features/library/libraryModel';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { Icon } from './Icon';
import { Button, Row } from './ui';

/** Full-screen list of folders (top level first) to choose a destination. */
export function FolderPicker({
  visible,
  folders,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  folders: Folder[];
  selected: Id | null;
  onSelect(id: Id | null): void;
  onClose(): void;
}) {
  const t = useT();
  const theme = useTheme();
  const targets = moveTargets(folders, { kind: 'quiz', id: '' });
  const check = (id: Id | null) => (selected === id ? <Icon name={{ ios: 'checkmark', android: 'check' }} color={theme.primary} /> : undefined);
  const choose = (id: Id | null) => {
    onSelect(id);
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
          <Row title={t('common.root')} onPress={() => choose(null)} right={check(null)} />
          {targets.map(({ folder, depth }) => (
            <Row key={folder.id} title={`${'    '.repeat(depth)}${folder.name}`} onPress={() => choose(folder.id)} right={check(folder.id)} />
          ))}
        </ScrollView>
        <View style={{ padding: spacing.lg }}>
          <Button label={t('common.close')} kind="secondary" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
