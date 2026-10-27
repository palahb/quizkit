import { MAX_INPUT_BYTES } from '@/domain/importSchema';
import type { Id, ParsedQuiz, QuizSummary } from '@/domain/types';

/** The parts of expo-document-picker's result this flow needs. */
export interface PickResult {
  canceled: boolean;
  assets: { uri: string; size?: number }[] | null;
}

export type ReadResult = { kind: 'cancelled' } | { kind: 'too-large' } | { kind: 'error' } | { kind: 'ok'; text: string };

/** Picks a file and reads it as text, refusing files over 10 MB before reading them. */
export async function readPickedFile(pick: () => Promise<PickResult>, read: (uri: string) => Promise<string>): Promise<ReadResult> {
  let picked: PickResult;
  try {
    picked = await pick();
  } catch {
    return { kind: 'error' };
  }
  const asset = picked.assets?.[0];
  if (picked.canceled || !asset) return { kind: 'cancelled' };
  if (asset.size !== undefined && asset.size > MAX_INPUT_BYTES) return { kind: 'too-large' };
  try {
    return { kind: 'ok', text: await read(asset.uri) };
  } catch {
    return { kind: 'error' };
  }
}

/** Saves a parsed quiz, asking first when the same content was imported before. */
export async function saveImport(args: {
  quiz: ParsedQuiz;
  folderId: Id | null;
  findQuizByHash(hash: string): Promise<QuizSummary | null>;
  importQuiz(quiz: ParsedQuiz, folderId: Id | null): Promise<QuizSummary>;
  confirmDuplicate(existing: QuizSummary): Promise<boolean>;
}): Promise<'saved' | 'cancelled'> {
  const existing = await args.findQuizByHash(args.quiz.sourceHash);
  if (existing && !(await args.confirmDuplicate(existing))) return 'cancelled';
  await args.importQuiz(args.quiz, args.folderId);
  return 'saved';
}
