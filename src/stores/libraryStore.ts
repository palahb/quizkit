import { createStore } from 'zustand/vanilla';

import type { LibraryRepo } from '@/db/libraryRepo';
import type { Folder, Id, ParsedQuiz, QuizSummary, Session } from '@/domain/types';

export interface LibraryState {
  folders: Folder[];
  quizzes: QuizSummary[];
  error: string | null;
  hydrated: boolean;
  hydrate(): Promise<void>;
  createFolder(name: string, parentId: Id | null): Promise<Folder>;
  renameFolder(id: Id, name: string): Promise<void>;
  moveFolder(id: Id, newParentId: Id | null): Promise<void>;
  /** Rejects with QUIZ_IN_ACTIVE_SESSION unless discardActiveSession is set. */
  deleteFolder(id: Id, opts?: { discardActiveSession?: boolean }): Promise<void>;
  importQuiz(quiz: ParsedQuiz, folderId: Id | null): Promise<QuizSummary>;
  renameQuiz(id: Id, title: string): Promise<void>;
  moveQuiz(id: Id, folderId: Id | null): Promise<void>;
  /** Rejects with QUIZ_IN_ACTIVE_SESSION unless discardActiveSession is set. */
  deleteQuiz(id: Id, opts?: { discardActiveSession?: boolean }): Promise<void>;
  clearError(): void;
}

export interface LibraryStoreDeps {
  getActiveSession(): Promise<Session | null>;
  discardActiveSession(): Promise<void>;
}

/** Ids of the folder and every folder below it. */
export function folderSubtree(folders: Folder[], rootId: Id): Set<Id> {
  const ids = new Set<Id>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId !== null && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}

function sessionUsesAny(session: Session, quizIds: Set<Id>): boolean {
  if (session.scope.kind === 'quiz' && quizIds.has(session.scope.quizId)) return true;
  return session.questionRefs.some((r) => r.quizId !== null && quizIds.has(r.quizId));
}

export function createLibraryStore(repo: LibraryRepo, deps: LibraryStoreDeps) {
  return createStore<LibraryState>()((set, get) => {
    async function refresh() {
      const [folders, quizzes] = await Promise.all([repo.listFolders(), repo.listQuizSummaries()]);
      set({ folders, quizzes });
    }

    /** Runs a write, refreshes state; on failure keeps state, records the error and rethrows. */
    async function mutate<T>(fn: () => Promise<T>): Promise<T> {
      try {
        const result = await fn();
        await refresh();
        set({ error: null });
        return result;
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
        throw e;
      }
    }

    async function guardActiveSession(quizIds: Set<Id>, discard: boolean | undefined) {
      const session = await deps.getActiveSession();
      if (!session || !sessionUsesAny(session, quizIds)) return;
      if (!discard) throw new Error('QUIZ_IN_ACTIVE_SESSION');
      await deps.discardActiveSession();
    }

    return {
      folders: [],
      quizzes: [],
      error: null,
      hydrated: false,
      async hydrate() {
        await refresh();
        set({ hydrated: true });
      },
      createFolder: (name, parentId) => mutate(() => repo.createFolder(name, parentId)),
      renameFolder: (id, name) => mutate(() => repo.renameFolder(id, name)),
      moveFolder: (id, newParentId) => mutate(() => repo.moveFolder(id, newParentId)),
      async deleteFolder(id, opts) {
        const subtree = folderSubtree(get().folders, id);
        const quizIds = new Set(get().quizzes.filter((q) => q.folderId !== null && subtree.has(q.folderId)).map((q) => q.id));
        await guardActiveSession(quizIds, opts?.discardActiveSession);
        await mutate(() => repo.deleteFolder(id));
      },
      importQuiz: (quiz, folderId) => mutate(() => repo.saveQuiz(quiz, folderId)),
      renameQuiz: (id, title) => mutate(() => repo.renameQuiz(id, title)),
      moveQuiz: (id, folderId) => mutate(() => repo.moveQuiz(id, folderId)),
      async deleteQuiz(id, opts) {
        await guardActiveSession(new Set([id]), opts?.discardActiveSession);
        await mutate(() => repo.deleteQuiz(id));
      },
      clearError: () => set({ error: null }),
    };
  });
}
