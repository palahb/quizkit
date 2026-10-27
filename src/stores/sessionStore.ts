import { createStore } from 'zustand/vanilla';

import type { AttemptRepo } from '@/db/attemptRepo';
import type { LibraryRepo } from '@/db/libraryRepo';
import type { SessionRepo } from '@/db/sessionRepo';
import { newId } from '@/domain/ids';
import type { Attempt, Id, Mode, Question, Scope, Session } from '@/domain/types';
import {
  answerQuestion,
  applyOptionOrder,
  buildRetakeSession,
  buildRetrySession,
  createSession,
  finishSession,
  goTo,
  pauseClock,
  resumeClock,
} from '@/engine/sessionEngine';

import { folderSubtree } from './libraryStore';

export interface StartArgs {
  scope: Scope;
  mode: Mode;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface SessionState {
  session: Session | null;
  /** The session's questions in order, option order applied. Null until loaded. */
  questions: Question[] | null;
  /** Loads a saved session (paused, questions not loaded) so the UI can offer "Resume". */
  hydrate(): Promise<void>;
  start(args: StartArgs): Promise<void>;
  /** Loads questions for the saved session if needed and restarts the clock. False if it cannot be restored. */
  resume(): Promise<boolean>;
  answer(questionId: Id, optionId: Id): void;
  goTo(index: number): void;
  pause(): void;
  resumeClock(): void;
  submit(): Promise<Attempt>;
  abandon(): Promise<void>;
  /** False (and no session) when the attempt had nothing wrong. */
  startRetry(attemptId: Id, mode: Mode): Promise<boolean>;
  startRetake(attemptId: Id, mode: Mode): Promise<void>;
}

export interface SessionStoreDeps {
  library: LibraryRepo;
  attempts: AttemptRepo;
  sessions: SessionRepo;
  now: () => number;
  rng: () => number;
}

export function createSessionStore(deps: SessionStoreDeps) {
  const { library, attempts, sessions, now, rng } = deps;

  return createStore<SessionState>()((set, get) => {
    // Writes are serialized; mutations within one tick collapse into a single save.
    let writeChain: Promise<unknown> = Promise.resolve();
    let saveScheduled = false;

    const enqueue = (op: () => Promise<unknown>) => {
      writeChain = writeChain.then(op).catch((e) => console.warn('Session write failed', e));
      return writeChain;
    };

    function scheduleSave() {
      if (saveScheduled) return;
      saveScheduled = true;
      queueMicrotask(() => {
        saveScheduled = false;
        const s = get().session;
        if (!s) return;
        // Persist with the running time folded into activeMs, so a crash loses at most
        // the time since the last save.
        const t = now();
        const persisted = s.resumedAt === null ? s : resumeClock(pauseClock(s, t), t);
        void enqueue(() => sessions.save(persisted));
      });
    }

    function update(fn: (s: Session) => Session) {
      const s = get().session;
      if (!s) return;
      const next = fn(s);
      if (next === s) return;
      set({ session: next });
      scheduleSave();
    }

    async function loadQuestions(s: Session): Promise<Question[] | null> {
      const base = s.snapshot ?? (await library.getQuestionsByRefs(s.questionRefs));
      if (base.length !== s.questionRefs.length) return null;
      return base.map((q, i) => applyOptionOrder(q, s.questionRefs[i].optionOrder));
    }

    async function itemsFor(scope: Scope) {
      if (scope.kind === 'quiz') {
        return (await library.getQuestions(scope.quizId)).map((question) => ({ quizId: scope.quizId, question }));
      }
      if (scope.kind === 'folder') {
        const [folders, quizzes] = await Promise.all([library.listFolders(), library.listQuizSummaries()]);
        const subtree = folderSubtree(folders, scope.folderId);
        const inFolder = quizzes.filter((q) => q.folderId !== null && subtree.has(q.folderId));
        const lists = await Promise.all(
          inFolder.map(async (q) => (await library.getQuestions(q.id)).map((question) => ({ quizId: q.id, question }))),
        );
        return lists.flat();
      }
      throw new Error('Use startRetry/startRetake for attempt-based scopes');
    }

    async function titleFor(s: Session): Promise<{ title: string; quizId: Id | null }> {
      const scope = s.scope;
      if (scope.kind === 'quiz') {
        const quiz = (await library.listQuizSummaries()).find((q) => q.id === scope.quizId);
        return { title: quiz?.title ?? '', quizId: scope.quizId };
      }
      if (scope.kind === 'folder') {
        const folder = (await library.listFolders()).find((f) => f.id === scope.folderId);
        return { title: folder?.name ?? '', quizId: null };
      }
      const parent = await attempts.get(scope.parentAttemptId);
      return { title: parent?.title ?? '', quizId: parent?.quizId ?? null };
    }

    function begin(session: Session, questions: Question[]) {
      set({ session, questions });
      scheduleSave();
    }

    return {
      session: null,
      questions: null,

      async hydrate() {
        const saved = await sessions.load();
        set({ session: saved ? { ...saved, resumedAt: null } : null, questions: null });
      },

      async start({ scope, mode, shuffleQuestions, shuffleOptions }) {
        const items = await itemsFor(scope);
        const session = createSession({ id: newId(), now: now(), mode, scope, items, shuffleQuestions, shuffleOptions, rng });
        begin(session, items.map((it, i) => applyOptionOrder(it.question, session.questionRefs[i].optionOrder)));
      },

      async resume() {
        let s = get().session ?? (await sessions.load());
        if (!s) return false;
        const questions = get().questions ?? (await loadQuestions(s));
        if (!questions) {
          await get().abandon();
          return false;
        }
        s = resumeClock(s, now());
        set({ session: s, questions });
        scheduleSave();
        return true;
      },

      answer: (questionId, optionId) => update((s) => answerQuestion(s, questionId, optionId)),
      goTo: (index) => update((s) => goTo(s, index)),
      pause: () => update((s) => pauseClock(s, now())),
      resumeClock: () => update((s) => resumeClock(s, now())),

      async submit() {
        const s = get().session;
        const questions = get().questions;
        if (!s || !questions) throw new Error('NO_ACTIVE_SESSION');
        const { title, quizId } = await titleFor(s);
        const attempt = finishSession(s, questions, title, quizId, now());
        await attempts.save(attempt);
        set({ session: null, questions: null });
        await enqueue(() => sessions.clear());
        return attempt;
      },

      async abandon() {
        set({ session: null, questions: null });
        await enqueue(() => sessions.clear());
      },

      async startRetry(attemptId, mode) {
        const parent = await attempts.get(attemptId);
        const session = parent ? buildRetrySession(parent, mode, newId(), now()) : null;
        if (!session) return false;
        begin(session, session.snapshot!);
        return true;
      },

      async startRetake(attemptId, mode) {
        const parent = await attempts.get(attemptId);
        if (!parent) throw new Error('ATTEMPT_NOT_FOUND');
        const session = buildRetakeSession(parent, mode, newId(), now());
        begin(session, session.snapshot!);
      },
    };
  });
}
