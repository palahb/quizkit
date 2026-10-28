import { createAttemptRepo } from '../attemptRepo';
import { createLibraryRepo } from '../libraryRepo';
import { migrate } from '../migrations';
import { createSessionRepo } from '../sessionRepo';
import type { SqlDb } from '../sqlDb';
import { createBetterSqliteDb } from '../testing/betterSqliteDb';
import { makeAttempt, makeQuiz, makeSession } from '../testing/fixtures';

async function setup() {
  const db = createBetterSqliteDb();
  await migrate(db);
  return {
    db,
    library: createLibraryRepo(db),
    attempts: createAttemptRepo(db),
    sessions: createSessionRepo(db),
  };
}

describe('migrate', () => {
  it('runs twice without error and records the version', async () => {
    const db: SqlDb = createBetterSqliteDb();
    await migrate(db);
    await migrate(db);
    const row = await db.getFirst<{ v: number }>('SELECT MAX(version) AS v FROM schema_migrations');
    expect(row?.v).toBeGreaterThanOrEqual(1);
  });
});

describe('LibraryRepo folders', () => {
  it('creates and lists folders', async () => {
    const { library } = await setup();
    const a = await library.createFolder('A', null);
    await library.createFolder('B', a.id);
    const folders = await library.listFolders();
    expect(folders.map((f) => f.name).sort()).toEqual(['A', 'B']);
    expect(folders.find((f) => f.name === 'B')?.parentId).toBe(a.id);
  });

  it('renames a folder', async () => {
    const { library } = await setup();
    const a = await library.createFolder('A', null);
    await library.renameFolder(a.id, 'Z');
    expect((await library.listFolders())[0].name).toBe('Z');
  });

  it('rejects moving a folder into its own descendant', async () => {
    const { library } = await setup();
    const a = await library.createFolder('A', null);
    const b = await library.createFolder('B', a.id);
    const c = await library.createFolder('C', b.id);
    await expect(library.moveFolder(a.id, c.id)).rejects.toThrow('FOLDER_CYCLE');
    await expect(library.moveFolder(a.id, a.id)).rejects.toThrow('FOLDER_CYCLE');
  });

  it('moves a folder to the root', async () => {
    const { library } = await setup();
    const a = await library.createFolder('A', null);
    const b = await library.createFolder('B', a.id);
    await library.moveFolder(b.id, null);
    expect((await library.listFolders()).find((f) => f.id === b.id)?.parentId).toBeNull();
  });

  it('deletes nested folders and their quizzes but keeps attempts', async () => {
    const { library, attempts } = await setup();
    const a = await library.createFolder('A', null);
    const b = await library.createFolder('B', a.id);
    const quiz = await library.saveQuiz(makeQuiz(), b.id);
    const att = makeAttempt({ quizId: quiz.id });
    await attempts.save(att);

    await library.deleteFolder(a.id);

    expect(await library.listFolders()).toEqual([]);
    expect(await library.listQuizSummaries()).toEqual([]);
    expect(await library.getQuestions(quiz.id)).toEqual([]);
    expect((await attempts.get(att.id))?.id).toBe(att.id);
  });
});

describe('LibraryRepo quizzes', () => {
  it('saves a quiz and returns questions in order with the same option ids', async () => {
    const { library } = await setup();
    const parsed = makeQuiz(4);
    const summary = await library.saveQuiz(parsed, null);
    expect(summary.questionCount).toBe(4);
    expect(await library.getQuestions(summary.id)).toEqual(parsed.questions);
  });

  it('returns questions by refs in ref order across quizzes', async () => {
    const { library } = await setup();
    const p1 = makeQuiz(2);
    const p2 = makeQuiz(2);
    const s1 = await library.saveQuiz(p1, null);
    const s2 = await library.saveQuiz(p2, null);
    const refs = [
      { quizId: s2.id, questionId: p2.questions[1].id },
      { quizId: s1.id, questionId: p1.questions[0].id },
      { quizId: s2.id, questionId: p2.questions[0].id },
    ];
    const got = await library.getQuestionsByRefs(refs);
    expect(got.map((q) => q.id)).toEqual(refs.map((r) => r.questionId));
  });

  it('finds a quiz by source hash', async () => {
    const { library } = await setup();
    const parsed = makeQuiz();
    const s = await library.saveQuiz(parsed, null);
    expect((await library.findQuizByHash(parsed.sourceHash))?.id).toBe(s.id);
    expect(await library.findQuizByHash('nope')).toBeNull();
  });

  it('renames, moves and deletes a quiz', async () => {
    const { library } = await setup();
    const f = await library.createFolder('F', null);
    const s = await library.saveQuiz(makeQuiz(), null);
    await library.renameQuiz(s.id, 'New');
    await library.moveQuiz(s.id, f.id);
    let [got] = await library.listQuizSummaries();
    expect(got.title).toBe('New');
    expect(got.folderId).toBe(f.id);
    await library.deleteQuiz(s.id);
    expect(await library.listQuizSummaries()).toEqual([]);
    expect(await library.getQuestions(s.id)).toEqual([]);
  });

  it('includes the newest attempt as lastAttempt', async () => {
    const { library, attempts } = await setup();
    const s = await library.saveQuiz(makeQuiz(), null);
    await attempts.save(makeAttempt({ quizId: s.id, finishedAt: 10, correctCount: 1, total: 2 }));
    await attempts.save(makeAttempt({ quizId: s.id, finishedAt: 20, correctCount: 2, total: 2 }));
    const [summary] = await library.listQuizSummaries();
    expect(summary.lastAttempt).toEqual({ score: 2, total: 2, finishedAt: 20 });
  });

  it('saves and reads a 5000-question quiz in under 2 seconds', async () => {
    const { library } = await setup();
    const t0 = Date.now();
    const s = await library.saveQuiz(makeQuiz(5000), null);
    expect(await library.getQuestions(s.id)).toHaveLength(5000);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

describe('LibraryRepo.importCollection', () => {
  it('creates nested folders, reuses existing ones by name, and places quizzes', async () => {
    const { library } = await setup();
    const target = await library.createFolder('Target', null);
    const existing = await library.createFolder('AÖF', target.id);
    const r = await library.importCollection(
      target.id,
      [['aöf'], ['aöf', 'İktisat'], ['Empty']],
      [
        { path: ['aöf', 'İktisat'], quiz: makeQuiz(2, 'Ara') },
        { path: [], quiz: makeQuiz(1, 'Top') },
      ],
    );
    expect(r).toEqual({ createdFolders: 2, importedQuizzes: 2 });

    const folders = await library.listFolders();
    const byName = (n: string) => folders.find((f) => f.name === n)!;
    expect(folders.filter((f) => f.name.toLocaleLowerCase('tr') === 'aöf')).toHaveLength(1);
    expect(byName('İktisat').parentId).toBe(existing.id);
    expect(byName('Empty').parentId).toBe(target.id);

    const quizzes = await library.listQuizSummaries();
    expect(quizzes.find((q) => q.title === 'Ara')?.folderId).toBe(byName('İktisat').id);
    expect(quizzes.find((q) => q.title === 'Top')?.folderId).toBe(target.id);
  });

  it('saves nothing when any part fails', async () => {
    const { library } = await setup();
    const same = makeQuiz(1, 'Clash');
    // The same question ids twice violate the primary key on the second insert.
    await expect(
      library.importCollection(null, [['New']], [
        { path: ['New'], quiz: same },
        { path: [], quiz: same },
      ]),
    ).rejects.toThrow();
    expect(await library.listFolders()).toEqual([]);
    expect(await library.listQuizSummaries()).toEqual([]);
  });
});

describe('AttemptRepo', () => {
  it('lists newest first and gets full attempts', async () => {
    const { attempts } = await setup();
    const old = makeAttempt({ finishedAt: 1 });
    const recent = makeAttempt({ finishedAt: 2 });
    await attempts.save(old);
    await attempts.save(recent);
    const list = await attempts.list(10, 0);
    expect(list.map((a) => a.id)).toEqual([recent.id, old.id]);
    expect('questions' in list[0]).toBe(false);
    expect(await attempts.get(old.id)).toEqual(old);
  });

  it('lists attempts for one quiz', async () => {
    const { attempts } = await setup();
    await attempts.save(makeAttempt({ quizId: 'q1' }));
    await attempts.save(makeAttempt({ quizId: 'q2' }));
    expect(await attempts.listForQuiz('q1')).toHaveLength(1);
  });

  it('skips a corrupted row instead of failing', async () => {
    const { db, attempts } = await setup();
    const good = makeAttempt();
    await attempts.save(good);
    await db.run(
      `INSERT INTO attempts (id, quiz_id, title, mode, scope, started_at, finished_at, duration_ms, correct_count, total, payload)
       VALUES ('bad', NULL, 't', 'exam', '{not json', 0, 99, 0, 0, 0, '{not json')`,
    );
    const list = await attempts.list(10, 0);
    expect(list.map((a) => a.id)).toEqual([good.id]);
    expect(await attempts.get('bad')).toBeNull();
  });

  it('deletes all attempts', async () => {
    const { attempts } = await setup();
    await attempts.save(makeAttempt());
    await attempts.deleteAll();
    expect(await attempts.list(10, 0)).toEqual([]);
  });
});

describe('SessionRepo', () => {
  it('round-trips the active session and clears it', async () => {
    const { sessions } = await setup();
    expect(await sessions.load()).toBeNull();
    const s = makeSession();
    await sessions.save(s);
    await sessions.save({ ...s, currentIndex: 1 });
    expect(await sessions.load()).toEqual({ ...s, currentIndex: 1 });
    await sessions.clear();
    expect(await sessions.load()).toBeNull();
  });
});
