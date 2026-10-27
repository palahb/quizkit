import { Stack, useLocalSearchParams } from 'expo-router';

import { LibraryBrowser } from '@/features/library/LibraryBrowser';
import { useLibraryStore } from '@/stores';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const name = useLibraryStore((s) => s.folders.find((f) => f.id === id)?.name ?? '');
  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <LibraryBrowser parentId={id} />
    </>
  );
}
