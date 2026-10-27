import type { Folder, Id, QuizSummary } from '@/domain/types';
import { compareNames } from '@/domain/text';
import { folderSubtree } from '@/stores/libraryStore';

/** Direct subfolders and quizzes of a folder (null = top level), alphabetically in Turkish order. */
export function childrenOf(folders: Folder[], quizzes: QuizSummary[], parentId: Id | null) {
  return {
    folders: folders.filter((f) => f.parentId === parentId).sort((a, b) => compareNames(a.name, b.name)),
    quizzes: quizzes.filter((q) => q.folderId === parentId).sort((a, b) => compareNames(a.title, b.title)),
  };
}

/** Number of direct children (subfolders + quizzes) per folder id. */
export function itemCounts(folders: Folder[], quizzes: QuizSummary[]): Record<Id, number> {
  const counts: Record<Id, number> = {};
  for (const f of folders) if (f.parentId) counts[f.parentId] = (counts[f.parentId] ?? 0) + 1;
  for (const q of quizzes) if (q.folderId) counts[q.folderId] = (counts[q.folderId] ?? 0) + 1;
  return counts;
}

/**
 * Folders an item may be moved into, depth-first in display order with their depth.
 * A folder cannot move into itself or anything below it.
 */
export function moveTargets(folders: Folder[], moving: { kind: 'folder' | 'quiz'; id: Id }): { folder: Folder; depth: number }[] {
  const excluded = moving.kind === 'folder' ? folderSubtree(folders, moving.id) : new Set<Id>();
  const out: { folder: Folder; depth: number }[] = [];
  const walk = (parentId: Id | null, depth: number) => {
    for (const f of childrenOf(folders, [], parentId).folders) {
      if (excluded.has(f.id)) continue;
      out.push({ folder: f, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
