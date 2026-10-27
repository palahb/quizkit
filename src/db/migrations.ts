import type { SqlDb } from './sqlDb';

// Append-only. Each entry runs once, in order, inside a transaction.
const MIGRATIONS: string[] = [
  `CREATE TABLE folders (
     id TEXT PRIMARY KEY,
     parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE quizzes (
     id TEXT PRIMARY KEY,
     folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     description TEXT,
     language TEXT,
     question_count INTEGER NOT NULL,
     created_at INTEGER NOT NULL,
     source_hash TEXT NOT NULL
   );
   CREATE INDEX quizzes_hash ON quizzes(source_hash);
   CREATE TABLE questions (
     id TEXT PRIMARY KEY,
     quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
     position INTEGER NOT NULL,
     payload TEXT NOT NULL
   );
   CREATE INDEX questions_quiz ON questions(quiz_id, position);
   -- No foreign key to quizzes: attempts outlive the quiz they came from.
   CREATE TABLE attempts (
     id TEXT PRIMARY KEY,
     quiz_id TEXT,
     title TEXT NOT NULL,
     mode TEXT NOT NULL,
     scope TEXT NOT NULL,
     started_at INTEGER NOT NULL,
     finished_at INTEGER NOT NULL,
     duration_ms INTEGER NOT NULL,
     correct_count INTEGER NOT NULL,
     total INTEGER NOT NULL,
     payload TEXT NOT NULL
   );
   CREATE INDEX attempts_finished ON attempts(finished_at);
   CREATE INDEX attempts_quiz ON attempts(quiz_id, finished_at);
   CREATE TABLE active_session (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     payload TEXT NOT NULL
   );`,
];

export async function migrate(db: SqlDb): Promise<void> {
  await db.run('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const row = await db.getFirst<{ v: number | null }>('SELECT MAX(version) AS v FROM schema_migrations');
  const current = row?.v ?? 0;
  for (let version = current + 1; version <= MIGRATIONS.length; version++) {
    await db.transaction(async () => {
      await db.run(MIGRATIONS[version - 1]);
      await db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [version, Date.now()]);
    });
  }
}
