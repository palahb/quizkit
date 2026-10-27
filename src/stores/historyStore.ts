import { createStore } from 'zustand/vanilla';

import type { AttemptRepo } from '@/db/attemptRepo';
import type { Attempt, AttemptSummary, Id } from '@/domain/types';

export interface HistoryState {
  recent: AttemptSummary[];
  loadRecent(limit: number): Promise<void>;
  loadAttempt(id: Id): Promise<Attempt | null>;
  listForQuiz(quizId: Id): Promise<AttemptSummary[]>;
  clear(): Promise<void>;
}

export function createHistoryStore(repo: AttemptRepo) {
  return createStore<HistoryState>()((set) => ({
    recent: [],
    async loadRecent(limit) {
      set({ recent: await repo.list(limit, 0) });
    },
    loadAttempt: (id) => repo.get(id),
    listForQuiz: (quizId) => repo.listForQuiz(quizId),
    async clear() {
      await repo.deleteAll();
      set({ recent: [] });
    },
  }));
}
