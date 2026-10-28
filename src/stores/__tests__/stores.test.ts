import { createAttemptRepo } from '@/db/attemptRepo';
import { createLibraryRepo, type LibraryRepo } from '@/db/libraryRepo';
import { migrate } from '@/db/migrations';
import { createSessionRepo, type SessionRepo } from '@/db/sessionRepo';
import { createBetterSqliteDb } from '@/db/testing/betterSqliteDb';
import { makeQuiz } from '@/db/testing/fixtures';
import { mulberry32 } from '@/engine/rng';
import { planCollection } from '@/domain/collectionPlan';
import { parseImport } from '@/domain/parseImport';

import { createHistoryStore } from '../historyStore';
import { createLibraryStore } from '../libraryStore';
import { createSessionStore } from '../sessionStore';
import { createSettingsStore, type KeyValue } from '../settingsStore';

const flush = () => new Promise((r) => setTimeout(r, 0));

async function setup() {
  const db = createBetterSqliteDb();
  await migrate(db);
  const library = createLibraryRepo(db);
  const attempts = createAttemptRepo(db);
  const realSessions = createSessionRepo(db);
  const saves: unknown[] = [];
  const sessions: SessionRepo = {
    ...realSessions,
    save: async (s) => {
      saves.push(s);
      await realSessions.save(s);
    },
  };
  let clock = 1000;
  const sessionStore = createSessionStore({ library, attempts, sessions, now: () => clock, rng: mulberry32(1) });
  const libraryStore = createLibraryStore(library, {
    getActiveSession: () => sessions.load(),
    discardActiveSession: () => sessionStore.getState().abandon(),
  });
  return {
    db,
    library,
    attempts,
    sessions,
    saves,
    sessionStore,
    libraryStore,
    setClock: (t: number) => {
      clock = t;
    },
  };
}

describe('libraryStore', () => {
  it('hydrates folders and quiz summaries', async () => {
    const { library, libraryStore } = await setup();
    await library.createFolder('F', null);
    await library.saveQuiz(makeQuiz(), null);
    await libraryStore.getState().hydrate();
    const s = libraryStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.folders).toHaveLength(1);
    expect(s.quizzes).toHaveLength(1);
  });

  it('imports a quiz and lists it', async () => {
    const { libraryStore } = await setup();
    const summary = await libraryStore.getState().importQuiz(makeQuiz(2), null);
    expect(libraryStore.getState().quizzes.map((q) => q.id)).toEqual([summary.id]);
  });

  it('leaves state unchanged and sets error when storage fails', async () => {
    const { library } = await setup();
    const failing: LibraryRepo = { ...library, saveQuiz: () => Promise.reject(new Error('disk full')) };
    const store = createLibraryStore(failing, { getActiveSession: async () => null, discardActiveSession: async () => {} });
    await store.getState().hydrate();
    await expect(store.getState().importQuiz(makeQuiz(), null)).rejects.toThrow('disk full');
    expect(store.getState().quizzes).toEqual([]);
    expect(store.getState().error).toBe('disk full');
  });

  it('creates, renames, moves and deletes folders', async () => {
    const { libraryStore } = await setup();
    const st = () => libraryStore.getState();
    const a = await st().createFolder('A', null);
    const b = await st().createFolder('B', null);
    await st().renameFolder(a.id, 'AA');
    await st().moveFolder(b.id, a.id);
    expect(st().folders.find((f) => f.id === b.id)?.parentId).toBe(a.id);
    expect(st().folders.find((f) => f.id === a.id)?.name).toBe('AA');
    await st().deleteFolder(a.id);
    expect(st().folders).toEqual([]);
  });

  it('refuses to delete a quiz used by the active session unless told to discard it', async () => {
    const { libraryStore, sessionStore, sessions } = await setup();
    const quiz = await libraryStore.getState().importQuiz(makeQuiz(2), null);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'practice', shuffleQuestions: false, shuffleOptions: false });
    await flush();
    await expect(libraryStore.getState().deleteQuiz(quiz.id)).rejects.toThrow('QUIZ_IN_ACTIVE_SESSION');
    expect(libraryStore.getState().quizzes).toHaveLength(1);

    await libraryStore.getState().deleteQuiz(quiz.id, { discardActiveSession: true });
    expect(libraryStore.getState().quizzes).toEqual([]);
    expect(sessionStore.getState().session).toBeNull();
    expect(await sessions.load()).toBeNull();
  });

  it('refuses to delete a folder holding a quiz used by the active session', async () => {
    const { libraryStore, sessionStore } = await setup();
    const f = await libraryStore.getState().createFolder('F', null);
    const quiz = await libraryStore.getState().importQuiz(makeQuiz(2), f.id);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'practice', shuffleQuestions: false, shuffleOptions: false });
    await flush();
    await expect(libraryStore.getState().deleteFolder(f.id)).rejects.toThrow('QUIZ_IN_ACTIVE_SESSION');
  });
});

describe('libraryStore.importCollection', () => {
  const q = (t: string) => ({ question: t, options: ['a', 'b'], answer: 'A' });
  const raw = JSON.stringify({
    schemaVersion: 1,
    folders: [{ name: 'Course', quizzes: [{ title: 'Unit 1', questions: [q('1')] }] }],
    quizzes: [{ title: 'Broken', questions: [] }],
  });
  function plan(store: ReturnType<typeof createLibraryStore>) {
    const r = parseImport(raw);
    if (r.kind !== 'collection' || !r.result.ok) throw new Error('fixture');
    const { folders, quizzes } = store.getState();
    return planCollection(folders, quizzes, null, r.result.collection);
  }

  it('saves the new quizzes and folders and refreshes the library', async () => {
    const { libraryStore } = await setup();
    await libraryStore.getState().hydrate();
    const result = await libraryStore.getState().importCollection(null, plan(libraryStore));
    expect(result).toEqual({ createdFolders: 1, importedQuizzes: 1 });
    expect(libraryStore.getState().folders.map((f) => f.name)).toEqual(['Course']);
    expect(libraryStore.getState().quizzes.map((x) => x.title)).toEqual(['Unit 1']);
  });

  it('leaves the library unchanged and records the error when saving fails', async () => {
    const { library } = await setup();
    const failing: LibraryRepo = { ...library, importCollection: () => Promise.reject(new Error('disk full')) };
    const store = createLibraryStore(failing, { getActiveSession: async () => null, discardActiveSession: async () => {} });
    await store.getState().hydrate();
    await expect(store.getState().importCollection(null, plan(store))).rejects.toThrow('disk full');
    expect(store.getState().folders).toEqual([]);
    expect(store.getState().error).toBe('disk full');
  });
});

describe('sessionStore', () => {
  it('starts a quiz session with resolved questions', async () => {
    const { library, sessionStore } = await setup();
    const parsed = makeQuiz(3);
    const quiz = await library.saveQuiz(parsed, null);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    const s = sessionStore.getState();
    expect(s.session?.mode).toBe('exam');
    expect(s.questions?.map((q) => q.id)).toEqual(parsed.questions.map((q) => q.id));
  });

  it('starts a folder session with every question in the folder and its subfolders', async () => {
    const { library, sessionStore } = await setup();
    const f = await library.createFolder('F', null);
    const sub = await library.createFolder('Sub', f.id);
    await library.saveQuiz(makeQuiz(2), f.id);
    await library.saveQuiz(makeQuiz(3), sub.id);
    await library.saveQuiz(makeQuiz(4), null);
    await sessionStore.getState().start({ scope: { kind: 'folder', folderId: f.id }, mode: 'practice', shuffleQuestions: true, shuffleOptions: false });
    expect(sessionStore.getState().questions).toHaveLength(5);
  });

  it('coalesces several answers in one tick into one save', async () => {
    const { library, sessionStore, saves } = await setup();
    const parsed = makeQuiz(3);
    const quiz = await library.saveQuiz(parsed, null);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    await flush();
    saves.length = 0;
    const st = sessionStore.getState();
    parsed.questions.forEach((q) => st.answer(q.id, q.options[0].id));
    await flush();
    expect(saves).toHaveLength(1);
  });

  it('goTo twice to the same index leaves it there', async () => {
    const { library, sessionStore } = await setup();
    const quiz = await library.saveQuiz(makeQuiz(5), null);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'practice', shuffleQuestions: false, shuffleOptions: false });
    sessionStore.getState().goTo(3);
    sessionStore.getState().goTo(3);
    expect(sessionStore.getState().session?.currentIndex).toBe(3);
  });

  it('submit writes one attempt, clears the active session and returns it', async () => {
    const { library, attempts, sessions, sessionStore, setClock } = await setup();
    const parsed = makeQuiz(2, 'My quiz');
    const quiz = await library.saveQuiz(parsed, null);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    const q0 = parsed.questions[0];
    sessionStore.getState().answer(q0.id, q0.correctOptionId);
    setClock(4000);
    const attempt = await sessionStore.getState().submit();
    expect(attempt.correctCount).toBe(1);
    expect(attempt.total).toBe(2);
    expect(attempt.title).toBe('My quiz');
    expect(attempt.quizId).toBe(quiz.id);
    expect(attempt.durationMs).toBe(3000);
    expect(await attempts.list(10, 0)).toHaveLength(1);
    await flush();
    expect(await sessions.load()).toBeNull();
    expect(sessionStore.getState().session).toBeNull();
  });

  it('abandon clears without writing an attempt', async () => {
    const { library, attempts, sessions, sessionStore } = await setup();
    const quiz = await library.saveQuiz(makeQuiz(2), null);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    await sessionStore.getState().abandon();
    await flush();
    expect(await sessions.load()).toBeNull();
    expect(await attempts.list(10, 0)).toEqual([]);
  });

  it('hydrate loads a saved session paused, and resume rebuilds questions from refs', async () => {
    const env = await setup();
    const parsed = makeQuiz(3);
    const quiz = await env.library.saveQuiz(parsed, null);
    await env.sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: true });
    env.sessionStore.getState().answer(parsed.questions[0].id, parsed.questions[0].options[0].id);
    env.setClock(6000);
    env.sessionStore.getState().goTo(1);
    await flush();
    const shownOrder = env.sessionStore.getState().questions!.map((q) => q.options.map((o) => o.id));

    // Simulate a cold start: a fresh store over the same database.
    const fresh = createSessionStore({ library: env.library, attempts: env.attempts, sessions: env.sessions, now: () => 9000, rng: mulberry32(2) });
    await fresh.getState().hydrate();
    expect(fresh.getState().session?.resumedAt).toBeNull();
    expect(fresh.getState().session?.activeMs).toBe(5000);
    expect(fresh.getState().questions).toBeNull();

    await fresh.getState().resume();
    expect(fresh.getState().session?.resumedAt).toBe(9000);
    expect(fresh.getState().session?.currentIndex).toBe(1);
    expect(fresh.getState().questions!.map((q) => q.options.map((o) => o.id))).toEqual(shownOrder);
  });

  it('startRetry returns false when nothing was wrong, and uses the snapshot otherwise', async () => {
    const { library, sessionStore } = await setup();
    const parsed = makeQuiz(2);
    const quiz = await library.saveQuiz(parsed, null);
    const st = () => sessionStore.getState();
    await st().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    parsed.questions.forEach((q) => st().answer(q.id, q.correctOptionId));
    const perfect = await st().submit();
    expect(await st().startRetry(perfect.id, 'practice')).toBe(false);
    expect(st().session).toBeNull();

    await st().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    const flawed = await st().submit();
    await library.deleteQuiz(quiz.id);
    expect(await st().startRetry(flawed.id, 'practice')).toBe(true);
    expect(st().questions).toHaveLength(2);
    expect(st().session?.scope).toEqual({ kind: 'retry-wrong', parentAttemptId: flawed.id });
  });

  it('startRetake replays every question from the attempt', async () => {
    const { library, sessionStore } = await setup();
    const quiz = await library.saveQuiz(makeQuiz(3), null);
    const st = () => sessionStore.getState();
    await st().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    const a = await st().submit();
    await st().startRetake(a.id, 'exam');
    expect(st().questions).toHaveLength(3);
  });
});

describe('historyStore', () => {
  it('loads recent attempts and one attempt, and clears', async () => {
    const { library, attempts, sessionStore } = await setup();
    const quiz = await library.saveQuiz(makeQuiz(2), null);
    await sessionStore.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    const a = await sessionStore.getState().submit();
    const history = createHistoryStore(attempts);
    await history.getState().loadRecent(20);
    expect(history.getState().recent.map((r) => r.id)).toEqual([a.id]);
    expect((await history.getState().loadAttempt(a.id))?.questions).toHaveLength(2);
    await history.getState().clear();
    expect(history.getState().recent).toEqual([]);
  });
});

describe('settingsStore', () => {
  function memoryKv(): KeyValue {
    const m = new Map<string, string>();
    return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v) };
  }

  it('uses the default language until set, and persists changes', async () => {
    const kv = memoryKv();
    const a = createSettingsStore(kv, 'tr');
    await a.getState().hydrate();
    expect(a.getState().language).toBe('tr');
    expect(a.getState().theme).toBe('system');
    await a.getState().setLanguage('en');
    await a.getState().setTheme('dark');

    const b = createSettingsStore(kv, 'tr');
    await b.getState().hydrate();
    expect(b.getState().language).toBe('en');
    expect(b.getState().theme).toBe('dark');
  });
});
