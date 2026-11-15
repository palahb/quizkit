import { BackupInvalidError, exportBackup, restoreBackup } from '../backupRepo';
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
  return { db, library: createLibraryRepo(db), attempts: createAttemptRepo(db), sessions: createSessionRepo(db) };
}

async function seed(s: Awaited<ReturnType<typeof setup>>) {
  const a = await s.library.createFolder('A', null);
  const b = await s.library.createFolder('B', a.id);
  await s.library.saveQuiz(makeQuiz(3, 'In B'), b.id);
  await s.library.saveQuiz(makeQuiz(2, 'Root'), null);
  await s.attempts.save(makeAttempt());
}

async function dump(db: SqlDb) {
  const out: Record<string, unknown[]> = {};
  for (const t of ['folders', 'quizzes', 'questions', 'attempts', 'active_session']) {
    out[t] = await db.getAll(`SELECT * FROM ${t} ORDER BY id`);
  }
  return out;
}

describe('backup', () => {
  it('round-trips into a fresh db with identical rows', async () => {
    const src = await setup();
    await seed(src);
    const file = JSON.parse(JSON.stringify(await exportBackup(src.db)));
    const dst = await setup();
    const counts = await restoreBackup(dst.db, file);
    expect(counts).toEqual({ quizzes: 2, attempts: 1 });
    expect(await dump(dst.db)).toEqual(await dump(src.db));
  });

  it('does not include the active session and clears it on restore', async () => {
    const src = await setup();
    await seed(src);
    await src.sessions.save(makeSession());
    const file = await exportBackup(src.db);
    expect(Object.keys(file)).not.toContain('active_session');
    await restoreBackup(src.db, file);
    expect(await src.db.getAll('SELECT * FROM active_session')).toEqual([]);
  });

  it('replaces existing data', async () => {
    const src = await setup();
    await seed(src);
    const file = await exportBackup(src.db);
    const dst = await setup();
    await dst.library.saveQuiz(makeQuiz(1, 'Old'), null);
    await restoreBackup(dst.db, file);
    expect(await dump(dst.db)).toEqual(await dump(src.db));
  });

  describe('invalid files leave data untouched', () => {
    const cases: [string, (f: any) => unknown][] = [
      ['wrong app', () => ({ app: 'other' })],
      ['non-object', () => 'nope'],
      ['null', () => null],
      ['missing table', (f) => { delete f.attempts; return f; }],
      ['extra top-level key', (f) => ({ ...f, evil: 1 })],
      ['extra column', (f) => { f.quizzes[0].extra = 'x'; return f; }],
      ['missing column', (f) => { delete f.quizzes[0].title; return f; }],
      ['non-string id', (f) => { f.quizzes[0].id = 5; return f; }],
      ['non-integer number', (f) => { f.quizzes[0].created_at = 1.5; return f; }],
      ['__proto__ key', (f) => JSON.parse(JSON.stringify(f).replace('"title"', '"__proto__"'))],
      ['nested junk', (f) => { f.quizzes[0].title = { a: { b: [[[]]] } }; return f; }],
      ['bad folder ref', (f) => { f.quizzes[0].folder_id = 'ghost'; return f; }],
      ['bad quiz ref', (f) => { f.questions[0].quiz_id = 'ghost'; return f; }],
      ['bad parent ref', (f) => { f.folders[0].parent_id = 'ghost'; return f; }],
      ['folder cycle', (f) => { f.folders[0].parent_id = f.folders[1].id; f.folders[1].parent_id = f.folders[0].id; return f; }],
      ['duplicate ids', (f) => { f.quizzes.push({ ...f.quizzes[0] }); return f; }],
    ];
    it.each(cases)('%s', async (_n, mutate) => {
      const src = await setup();
      await seed(src);
      const file = JSON.parse(JSON.stringify(await exportBackup(src.db)));
      const before = await dump(src.db);
      await expect(restoreBackup(src.db, mutate(file))).rejects.toBeInstanceOf(BackupInvalidError);
      expect(await dump(src.db)).toEqual(before);
    });
  });

  it('is one transaction: a failure on the last insert changes nothing', async () => {
    const src = await setup();
    await seed(src);
    const file = await exportBackup(src.db);
    const before = await dump(src.db);
    const failing: SqlDb = {
      ...src.db,
      transaction: (fn) =>
        src.db.transaction((tx) =>
          fn({
            ...tx,
            run: async (sql, params) => {
              if (sql.startsWith('INSERT INTO attempts')) throw new Error('boom');
              return tx.run(sql, params);
            },
          }),
        ),
    };
    await expect(restoreBackup(failing, file)).rejects.toThrow('boom');
    expect(await dump(src.db)).toEqual(before);
  });

  it('round-trips a 5000-question quiz quickly', async () => {
    const src = await setup();
    await src.library.saveQuiz(makeQuiz(5000, 'Big'), null);
    const file = JSON.parse(JSON.stringify(await exportBackup(src.db)));
    const dst = await setup();
    const t0 = Date.now();
    await restoreBackup(dst.db, file);
    expect(Date.now() - t0).toBeLessThan(2000);
    const row = await dst.db.getFirst<{ n: number }>('SELECT COUNT(*) AS n FROM questions');
    expect(row?.n).toBe(5000);
  });
});
