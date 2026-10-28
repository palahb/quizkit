import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, type ScrollView } from 'react-native';

import { FolderPicker } from '@/components/FolderPicker';
import { Screen } from '@/components/ui';
import { planCollection } from '@/domain/collectionPlan';
import { parseImport } from '@/domain/parseImport';
import { getPrompt } from '@/domain/prompts';
import type { Id } from '@/domain/types';
import { isBulkChange, useAutoCheck } from '@/features/import/autoCheck';
import { readPickedFile, saveImport } from '@/features/import/importActions';
import { ImportPanel } from '@/features/import/ImportPanel';
import { confirmAsync, showError } from '@/features/library/flows';
import { copyPrompt as copyPromptToClipboard } from '@/features/prompts/copyPrompt';
import { useT } from '@/hooks/useT';
import { getStores, useLibraryStore, useSettingsStore } from '@/stores';

const MAX_SHOWN = 20_000;
const CHECK_DELAY_MS = 500;
/** Matches the Screen content padding, so scrolling lands exactly on the result. */
const CONTENT_PADDING = 16;

export default function ImportScreen() {
  const params = useLocalSearchParams<{ folderId?: string }>();
  const t = useT();
  const folders = useLibraryStore((s) => s.folders);
  const quizzes = useLibraryStore((s) => s.quizzes);
  const importQuiz = useLibraryStore((s) => s.importQuiz);
  const importCollection = useLibraryStore((s) => s.importCollection);
  const language = useSettingsStore((s) => s.language);

  // `source` is what gets parsed; `text` is what the box shows (huge pastes are shown shortened
  // so the text box stays responsive).
  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const outcome = useAutoCheck(source, parseImport, CHECK_DELAY_MS);
  const [folderId, setFolderId] = useState<Id | null>(params.folderId ?? null);
  const plan = useMemo(
    () =>
      outcome?.kind === 'collection' && outcome.result.ok
        ? planCollection(folders, quizzes, folderId, outcome.result.collection)
        : null,
    [outcome, folders, quizzes, folderId],
  );
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  // After a paste or file load, close the keyboard and scroll to the result once it is ready.
  // (Not while typing: jumping away from the cursor would be annoying.)
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const resultY = useRef(0);
  const scrollPending = useRef(false);
  useEffect(() => {
    if (outcome && scrollPending.current) {
      scrollPending.current = false;
      scrollRef.current?.scrollTo({ y: Math.max(0, resultY.current + CONTENT_PADDING - 8), animated: true });
    }
  }, [outcome]);

  const load = (raw: string) => {
    Keyboard.dismiss();
    scrollPending.current = true;
    setSource(raw);
    setText(raw.length > MAX_SHOWN ? `${raw.slice(0, MAX_SHOWN)}\n…` : raw);
  };

  const clear = () => {
    scrollPending.current = false;
    setSource('');
    setText('');
  };

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (!clip.trim()) {
      Alert.alert('', t('import.clipboardEmpty'));
      return;
    }
    load(clip);
  };

  const pickFile = async () => {
    const r = await readPickedFile(
      () => DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true }),
      (uri) => new File(uri).text(),
    );
    if (r.kind === 'ok') load(r.text);
    else if (r.kind === 'too-large') Alert.alert('', t('import.fileTooLarge'));
    else if (r.kind === 'error') Alert.alert('', t('import.fileReadError'));
  };

  const saveCollection = async () => {
    if (!plan) return;
    const { createdFolders, importedQuizzes } = await importCollection(folderId, plan);
    const skipped = plan.counts.duplicates + plan.counts.invalid;
    const lines = [t('import.collection.saved', { quizzes: importedQuizzes, folders: createdFolders })];
    if (skipped > 0) lines.push(t('import.collection.skipped', { n: skipped }));
    Alert.alert(t('import.collection.savedTitle'), lines.join('\n'));
    router.back();
  };

  const save = async () => {
    if (!outcome?.result.ok) return;
    setSaving(true);
    try {
      if (outcome.kind === 'collection') {
        await saveCollection();
        return;
      }
      const saved = await saveImport({
        quiz: outcome.result.quiz,
        folderId,
        findQuizByHash: async (hash) => getStores().library.getState().quizzes.find((q) => q.sourceHash === hash) ?? null,
        importQuiz,
        confirmDuplicate: (existing) =>
          confirmAsync(t('import.duplicateTitle'), t('import.duplicateBody', { title: existing.title }), t('import.importAnyway'), t, false),
      });
      if (saved === 'saved') router.back();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const folderLabel = folderId ? (folders.find((f) => f.id === folderId)?.name ?? t('common.root')) : t('common.root');

  return (
    <Screen scrollRef={scrollRef}>
      <ImportPanel
        text={text}
        outcome={outcome}
        plan={plan}
        onShowPrompts={() => router.push('/prompts')}
        folderLabel={folderLabel}
        saving={saving}
        onChangeText={(v) => {
          if (isBulkChange(text, v)) {
            Keyboard.dismiss();
            scrollPending.current = true;
          }
          setText(v);
          setSource(v);
        }}
        onClear={clear}
        onResultLayout={(y) => {
          resultY.current = y;
        }}
        onPaste={paste}
        onPickFile={pickFile}
        onCopyPrompt={() => void copyPromptToClipboard(getPrompt('notes', language), t)}
        onChooseFolder={() => setPicking(true)}
        onSave={save}
      />
      <FolderPicker visible={picking} folders={folders} selected={folderId} onSelect={setFolderId} onClose={() => setPicking(false)} />
    </Screen>
  );
}
