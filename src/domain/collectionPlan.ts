import type { BatchEntry, ParsedCollection } from './parseImport';
import { sameName } from './text';
import type { Folder, Id, QuizSummary } from './types';

export interface CollectionPlan {
  folders: { path: string[]; status: 'new' | 'existing' }[];
  quizzes: { entry: BatchEntry; status: 'new' | 'duplicate' | 'invalid' }[];
  counts: { newFolders: number; newQuizzes: number; duplicates: number; invalid: number; questions: number };
}

/** The existing child folder of `parentId` with this name, if any. */
export function findChildFolder(folders: Folder[], parentId: Id | null, name: string): Folder | undefined {
  return folders.find((f) => f.parentId === parentId && sameName(f.name, name));
}

/**
 * What importing a collection into `targetId` would do: which folders already exist (matched by
 * name under the target), and which quizzes are new, already in the library, repeated, or invalid.
 * The repository applies the same folder rule when saving.
 */
export function planCollection(folders: Folder[], quizzes: QuizSummary[], targetId: Id | null, collection: ParsedCollection): CollectionPlan {
  const resolved = new Map<string, Id | null>(); // path key -> existing folder id, or null when new
  const folderPlan = collection.folderPaths.map((path) => {
    const isTopLevel = path.length === 1;
    const parentId = isTopLevel ? targetId : resolved.get(path.slice(0, -1).join('\u0000'))!;
    // Inside a folder that is itself new, nothing can exist yet.
    const parentIsNew = !isTopLevel && parentId === null;
    const existing = parentIsNew ? undefined : findChildFolder(folders, parentId, path[path.length - 1]);
    resolved.set(path.join('\u0000'), existing?.id ?? null);
    return { path, status: existing ? ('existing' as const) : ('new' as const) };
  });

  const knownHashes = new Set(quizzes.map((q) => q.sourceHash));
  const quizPlan = collection.entries.map((entry) => {
    if (!entry.result.ok) return { entry, status: 'invalid' as const };
    const hash = entry.result.quiz.sourceHash;
    if (knownHashes.has(hash)) return { entry, status: 'duplicate' as const };
    knownHashes.add(hash);
    return { entry, status: 'new' as const };
  });

  const newQuizzes = quizPlan.filter((q) => q.status === 'new');
  return {
    folders: folderPlan,
    quizzes: quizPlan,
    counts: {
      newFolders: folderPlan.filter((f) => f.status === 'new').length,
      newQuizzes: newQuizzes.length,
      duplicates: quizPlan.filter((q) => q.status === 'duplicate').length,
      invalid: quizPlan.filter((q) => q.status === 'invalid').length,
      questions: newQuizzes.reduce((n, q) => n + (q.entry.result.ok ? q.entry.result.quiz.questions.length : 0), 0),
    },
  };
}
