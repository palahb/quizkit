import { createAttemptRepo } from '@/db/attemptRepo';
import { createLibraryRepo } from '@/db/libraryRepo';
import { migrate } from '@/db/migrations';
import { createSessionRepo } from '@/db/sessionRepo';
import { createBetterSqliteDb } from '@/db/testing/betterSqliteDb';
import { makeQuiz } from '@/db/testing/fixtures';
import { createLibraryStore } from '@/stores/libraryStore';
import { createSessionStore } from '@/stores/sessionStore';

import { mulberry32 } from '../rng';
import { createSession, elapsedMs } from '../sessionEngine';

describe('performance', () => {
  it('creates a shuffled 5000-question session in under 200 ms', () => {
    const quiz = makeQuiz(5000);
    const t0 = Date.now();
    createSession({
      id: 's',
      now: 0,
      mode: 'exam',
      scope: { kind: 'quiz', quizId: 'q' },
      items: quiz.questions.map((question) => ({ quizId: 'q', question })),
      shuffleQuestions: true,
      shuffleOptions: true,
      rng: mulberry32(3),
    });
    expect(Date.now() - t0).toBeLessThan(200);
  });

  it('hydrates 100 quizzes and resumes a 5000-question session in under 1 s', async () => {
    const db = createBetterSqliteDb();
    await migrate(db);
    const library = createLibraryRepo(db);
    const attempts = createAttemptRepo(db);
    const sessions = createSessionRepo(db);
    for (let i = 0; i < 99; i++) await library.saveQuiz(makeQuiz(5), null);
    const big = await library.saveQuiz(makeQuiz(5000), null);
    const first = createSessionStore({ library, attempts, sessions, now: () => 0, rng: mulberry32(1) });
    await first.getState().start({ scope: { kind: 'quiz', quizId: big.id }, mode: 'exam', shuffleQuestions: true, shuffleOptions: true });
    await new Promise((r) => setTimeout(r, 0));

    const t0 = Date.now();
    const libStore = createLibraryStore(library, { getActiveSession: () => sessions.load(), discardActiveSession: async () => {} });
    await libStore.getState().hydrate();
    const fresh = createSessionStore({ library, attempts, sessions, now: () => 10, rng: mulberry32(2) });
    await fresh.getState().hydrate();
    expect(await fresh.getState().resume()).toBe(true);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(libStore.getState().quizzes).toHaveLength(100);
    expect(fresh.getState().questions).toHaveLength(5000);
  });
});

describe('background time', () => {
  it('does not advance the stopwatch while the app is in the background', async () => {
    const db = createBetterSqliteDb();
    await migrate(db);
    const library = createLibraryRepo(db);
    let clock = 1000;
    const store = createSessionStore({
      library,
      attempts: createAttemptRepo(db),
      sessions: createSessionRepo(db),
      now: () => clock,
      rng: mulberry32(1),
    });
    const quiz = await library.saveQuiz(makeQuiz(3), null);
    await store.getState().start({ scope: { kind: 'quiz', quizId: quiz.id }, mode: 'exam', shuffleQuestions: false, shuffleOptions: false });
    clock = 11_000;
    store.getState().pause();
    const before = elapsedMs(store.getState().session!, clock);
    clock = 71_000;
    store.getState().resumeClock();
    expect(elapsedMs(store.getState().session!, clock)).toBe(before);
    expect(before).toBe(10_000);
  });
});
