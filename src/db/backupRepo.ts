import { z } from 'zod';

import type { SqlDb } from './sqlDb';

export type Row = Record<string, string | number | null>;

export interface BackupFile {
  app: 'quizkit';
  backupVersion: 1;
  exportedAt: number;
  folders: Row[];
  quizzes: Row[];
  questions: Row[];
  attempts: Row[];
}

export class BackupInvalidError extends Error {
  constructor(message = 'Not a valid Quizkit backup') {
    super(message);
    this.name = 'BackupInvalidError';
  }
}

// Column allowlists. Table and column names in SQL come only from these constants, never from file content.
const COLUMNS = {
  folders: ['id', 'parent_id', 'name', 'created_at'],
  quizzes: ['id', 'folder_id', 'title', 'description', 'language', 'question_count', 'created_at', 'source_hash'],
  questions: ['id', 'quiz_id', 'position', 'payload'],
  attempts: [
    'id', 'quiz_id', 'title', 'mode', 'scope', 'started_at', 'finished_at',
    'duration_ms', 'correct_count', 'total', 'payload',
  ],
} as const;
type Table = keyof typeof COLUMNS;
const TABLES: Table[] = ['folders', 'quizzes', 'questions', 'attempts'];

const str = z.string();
const nstr = z.string().nullable();
const int = z.number().int();

const folderRow = z.strictObject({ id: str, parent_id: nstr, name: str, created_at: int });
const quizRow = z.strictObject({
  id: str, folder_id: nstr, title: str, description: nstr, language: nstr,
  question_count: int, created_at: int, source_hash: str,
});
const questionRow = z.strictObject({ id: str, quiz_id: str, position: int, payload: str });
const attemptRow = z.strictObject({
  id: str, quiz_id: nstr, title: str, mode: str, scope: str, started_at: int, finished_at: int,
  duration_ms: int, correct_count: int, total: int, payload: str,
});

const backupSchema = z.strictObject({
  app: z.literal('quizkit'),
  backupVersion: z.literal(1),
  exportedAt: z.number(),
  folders: z.array(folderRow),
  quizzes: z.array(quizRow),
  questions: z.array(questionRow),
  attempts: z.array(attemptRow),
});

const CHUNK_VARS = 900;

export async function exportBackup(db: SqlDb): Promise<BackupFile> {
  // One transaction so the four reads see a single consistent snapshot.
  return db.transaction(async (tx) => {
    const sel = (table: Table, order: string) =>
      tx.getAll<Row>(`SELECT ${COLUMNS[table].join(', ')} FROM ${table} ORDER BY ${order}`);
    return {
      app: 'quizkit' as const,
      backupVersion: 1 as const,
      exportedAt: Date.now(),
      folders: await sel('folders', 'created_at, id'),
      quizzes: await sel('quizzes', 'created_at, id'),
      questions: await sel('questions', 'quiz_id, position, id'),
      attempts: await sel('attempts', 'finished_at, id'),
    };
  });
}

/** Orders folders parents-first; throws on dangling parents or cycles. */
function orderFolders(folders: Row[]): Row[] {
  const ids = new Set(folders.map((f) => f.id as string));
  const done = new Set<string>();
  const out: Row[] = [];
  let pending = folders;
  while (pending.length > 0) {
    const next: Row[] = [];
    for (const f of pending) {
      const parent = f.parent_id as string | null;
      if (parent !== null && !ids.has(parent)) throw new BackupInvalidError('Folder parent is missing');
      if (parent === null || done.has(parent)) {
        out.push(f);
        done.add(f.id as string);
      } else next.push(f);
    }
    if (next.length === pending.length) throw new BackupInvalidError('Folder cycle');
    pending = next;
  }
  return out;
}

function validate(raw: unknown): BackupFile {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new BackupInvalidError();
  const file = parsed.data as BackupFile;

  const unique = (rows: Row[]) => {
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.id as string)) throw new BackupInvalidError('Duplicate id');
      seen.add(r.id as string);
    }
    return seen;
  };
  unique(file.folders);
  const quizIds = unique(file.quizzes);
  unique(file.questions);
  unique(file.attempts);
  const folderIds = new Set(file.folders.map((f) => f.id as string));

  for (const q of file.quizzes) {
    if (q.folder_id !== null && !folderIds.has(q.folder_id as string)) throw new BackupInvalidError('Quiz folder is missing');
  }
  for (const q of file.questions) {
    if (!quizIds.has(q.quiz_id as string)) throw new BackupInvalidError('Question quiz is missing');
  }
  return { ...file, folders: orderFolders(file.folders) };
}

async function insertRows(tx: SqlDb, table: Table, rows: Row[]): Promise<void> {
  const cols = COLUMNS[table];
  const perChunk = Math.max(1, Math.floor(CHUNK_VARS / cols.length));
  const one = `(${cols.map(() => '?').join(', ')})`;
  for (let i = 0; i < rows.length; i += perChunk) {
    const chunk = rows.slice(i, i + perChunk);
    const params: unknown[] = [];
    for (const r of chunk) for (const c of cols) params.push(r[c]);
    await tx.run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES ${chunk.map(() => one).join(', ')}`, params);
  }
}

/** Replaces the whole library with the backup. Validates everything first; applies all-or-nothing. */
export async function restoreBackup(db: SqlDb, raw: unknown): Promise<{ quizzes: number; attempts: number }> {
  const file = validate(raw);
  await db.transaction(async (tx) => {
    // Order matters: children before parents when deleting.
    for (const table of ['attempts', 'questions', 'quizzes', 'folders'] as const) await tx.run(`DELETE FROM ${table}`);
    // An unfinished quiz may reference questions that no longer exist.
    await tx.run('DELETE FROM active_session');
    for (const table of TABLES) await insertRows(tx, table, file[table]);
  });
  return { quizzes: file.quizzes.length, attempts: file.attempts.length };
}
