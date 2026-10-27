import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { FolderPicker } from '@/components/FolderPicker';
import { Screen } from '@/components/ui';
import { buildLlmPrompt } from '@/domain/llmPrompt';
import { parseQuizJson } from '@/domain/parseQuizJson';
import type { Id, ImportResult } from '@/domain/types';
import { readPickedFile, saveImport } from '@/features/import/importActions';
import { ImportPanel } from '@/features/import/ImportPanel';
import { confirmAsync, showError } from '@/features/library/flows';
import { useT } from '@/hooks/useT';
import { getStores, useLibraryStore } from '@/stores';

const MAX_SHOWN = 20_000;

export default function ImportScreen() {
  const params = useLocalSearchParams<{ folderId?: string }>();
  const t = useT();
  const folders = useLibraryStore((s) => s.folders);
  const importQuiz = useLibraryStore((s) => s.importQuiz);

  // `source` is what gets parsed; `text` is what the box shows (huge pastes are shown shortened
  // so the text box stays responsive).
  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [folderId, setFolderId] = useState<Id | null>(params.folderId ?? null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  const check = (raw: string) => {
    setSource(raw);
    setText(raw.length > MAX_SHOWN ? `${raw.slice(0, MAX_SHOWN)}\n…` : raw);
    setResult(parseQuizJson(raw));
  };

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (!clip.trim()) {
      Alert.alert('', t('import.clipboardEmpty'));
      return;
    }
    check(clip);
  };

  const pickFile = async () => {
    const r = await readPickedFile(
      () => DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true }),
      (uri) => new File(uri).text(),
    );
    if (r.kind === 'ok') check(r.text);
    else if (r.kind === 'too-large') Alert.alert('', t('import.fileTooLarge'));
    else if (r.kind === 'error') Alert.alert('', t('import.fileReadError'));
  };

  const copyPrompt = async () => {
    await Clipboard.setStringAsync(buildLlmPrompt());
    Alert.alert('', t('import.promptCopied'));
  };

  const save = async () => {
    if (!result?.ok) return;
    setSaving(true);
    try {
      const outcome = await saveImport({
        quiz: result.quiz,
        folderId,
        findQuizByHash: async (hash) => getStores().library.getState().quizzes.find((q) => q.sourceHash === hash) ?? null,
        importQuiz,
        confirmDuplicate: (existing) =>
          confirmAsync(t('import.duplicateTitle'), t('import.duplicateBody', { title: existing.title }), t('import.importAnyway'), t, false),
      });
      if (outcome === 'saved') router.back();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const folderLabel = folderId ? (folders.find((f) => f.id === folderId)?.name ?? t('common.root')) : t('common.root');

  return (
    <Screen>
      <ImportPanel
        text={text}
        result={result}
        folderLabel={folderLabel}
        saving={saving}
        onChangeText={(v) => {
          setText(v);
          setSource(v);
          setResult(null);
        }}
        onCheck={() => check(source)}
        onPaste={paste}
        onPickFile={pickFile}
        onCopyPrompt={copyPrompt}
        onChooseFolder={() => setPicking(true)}
        onSave={save}
      />
      <FolderPicker visible={picking} folders={folders} selected={folderId} onSelect={setFolderId} onClose={() => setPicking(false)} />
    </Screen>
  );
}
