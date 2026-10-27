import type { Attempt, AttemptSummary, Id, Mode, Scope } from '@/domain/types';

import type { SqlDb } from './sqlDb';

export interface AttemptRepo {
  save(a: Attempt): Promise<void>;
  /** Null when missing or when the stored row is corrupted. */
  get(id: Id): Promise<Attempt | null>;
  /** Newest first. Corrupted rows are skipped. */
  list(limit: number, offset: number): Promise<AttemptSummary[]>;
  listForQuiz(quizId: Id): Promise<AttemptSummary[]>;
  deleteAll(): Promise<void>;
}

interface AttemptRow {
  id: string;
  quiz_id: string | null;
  title: string;
  mode: string;
  scope: string;
  started_at: number;
  finished_at: number;
  duration_ms: number;
  correct_count: number;
  total: number;
}

const SUMMARY_COLUMNS = 'id, quiz_id, title, mode, scope, started_at, finished_at, duration_ms, correct_count, total';

function toSummary(r: AttemptRow): AttemptSummary | null {
  let scope: Scope;
  try {
    scope = JSON.parse(r.scope) as Scope;
  } catch {
    console.warn(`Skipping corrupted attempt row ${r.id}`);
    return null;
  }
  return {
    id: r.id,
    quizId: r.quiz_id,
    title: r.title,
    mode: r.mode as Mode,
    scope,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    durationMs: r.duration_ms,
    correctCount: r.correct_count,
    total: r.total,
  };
}

const summaries = (rows: AttemptRow[]) => rows.map(toSummary).filter((s): s is AttemptSummary => s !== null);

export function createAttemptRepo(db: SqlDb): AttemptRepo {
  return {
    async save(a) {
      await db.run(
        `INSERT OR REPLACE INTO attempts (${SUMMARY_COLUMNS}, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id,
          a.quizId,
          a.title,
          a.mode,
          JSON.stringify(a.scope),
          a.startedAt,
          a.finishedAt,
          a.durationMs,
          a.correctCount,
          a.total,
          JSON.stringify({ questions: a.questions, answers: a.answers }),
        ],
      );
    },

    async get(id) {
      const row = await db.getFirst<AttemptRow & { payload: string }>('SELECT * FROM attempts WHERE id = ?', [id]);
      if (!row) return null;
      const summary = toSummary(row);
      if (!summary) return null;
      try {
        const { questions, answers } = JSON.parse(row.payload) as Pick<Attempt, 'questions' | 'answers'>;
        return { ...summary, questions, answers };
      } catch {
        console.warn(`Corrupted attempt payload ${id}`);
        return null;
      }
    },

    async list(limit, offset) {
      return summaries(
        await db.getAll<AttemptRow>(`SELECT ${SUMMARY_COLUMNS} FROM attempts ORDER BY finished_at DESC LIMIT ? OFFSET ?`, [
          limit,
          offset,
        ]),
      );
    },

    async listForQuiz(quizId) {
      return summaries(
        await db.getAll<AttemptRow>(`SELECT ${SUMMARY_COLUMNS} FROM attempts WHERE quiz_id = ? ORDER BY finished_at DESC`, [
          quizId,
        ]),
      );
    },

    async deleteAll() {
      await db.run('DELETE FROM attempts');
    },
  };
}
