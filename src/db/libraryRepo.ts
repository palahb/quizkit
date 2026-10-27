import { newId } from '@/domain/ids';
import type { Folder, Id, ParsedQuiz, Question, QuestionRef, QuizSummary } from '@/domain/types';

import type { SqlDb } from './sqlDb';

export interface LibraryRepo {
  listFolders(): Promise<Folder[]>;
  listQuizSummaries(): Promise<QuizSummary[]>;
  createFolder(name: string, parentId: Id | null): Promise<Folder>;
  renameFolder(id: Id, name: string): Promise<void>;
  /** Throws Error('FOLDER_CYCLE') if newParentId is the folder itself or one of its descendants. */
  moveFolder(id: Id, newParentId: Id | null): Promise<void>;
  /** Removes the folder, its subfolders and every quiz inside them. Attempts are kept. */
  deleteFolder(id: Id): Promise<void>;
  saveQuiz(quiz: ParsedQuiz, folderId: Id | null): Promise<QuizSummary>;
  renameQuiz(id: Id, title: string): Promise<void>;
  moveQuiz(id: Id, folderId: Id | null): Promise<void>;
  deleteQuiz(id: Id): Promise<void>;
  getQuestions(quizId: Id): Promise<Question[]>;
  /** Questions in ref order; refs whose question no longer exists are skipped. */
  getQuestionsByRefs(refs: QuestionRef[]): Promise<Question[]>;
  findQuizByHash(hash: string): Promise<QuizSummary | null>;
}

interface FolderRow {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: number;
}
interface QuizRow {
  id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  language: string | null;
  question_count: number;
  created_at: number;
  source_hash: string;
  last_score: number | null;
  last_total: number | null;
  last_finished: number | null;
}

const QUIZ_SELECT = `
  SELECT q.*, a.correct_count AS last_score, a.total AS last_total, a.finished_at AS last_finished
  FROM quizzes q
  LEFT JOIN attempts a ON a.id = (
    SELECT id FROM attempts WHERE quiz_id = q.id ORDER BY finished_at DESC LIMIT 1
  )`;

const toFolder = (r: FolderRow): Folder => ({ id: r.id, parentId: r.parent_id, name: r.name, createdAt: r.created_at });

function toSummary(r: QuizRow): QuizSummary {
  const s: QuizSummary = {
    id: r.id,
    folderId: r.folder_id,
    title: r.title,
    questionCount: r.question_count,
    createdAt: r.created_at,
    sourceHash: r.source_hash,
  };
  if (r.description !== null) s.description = r.description;
  if (r.language !== null) s.language = r.language;
  if (r.last_finished !== null) s.lastAttempt = { score: r.last_score!, total: r.last_total!, finishedAt: r.last_finished };
  return s;
}

const SQL_BATCH = 500;

export function createLibraryRepo(db: SqlDb): LibraryRepo {
  async function getSummary(id: Id): Promise<QuizSummary> {
    const row = await db.getFirst<QuizRow>(`${QUIZ_SELECT} WHERE q.id = ?`, [id]);
    if (!row) throw new Error('QUIZ_NOT_FOUND');
    return toSummary(row);
  }

  return {
    async listFolders() {
      return (await db.getAll<FolderRow>('SELECT * FROM folders ORDER BY created_at')).map(toFolder);
    },

    async listQuizSummaries() {
      return (await db.getAll<QuizRow>(`${QUIZ_SELECT} ORDER BY q.created_at`)).map(toSummary);
    },

    async createFolder(name, parentId) {
      const folder: Folder = { id: newId(), parentId, name: name.trim(), createdAt: Date.now() };
      await db.run('INSERT INTO folders (id, parent_id, name, created_at) VALUES (?, ?, ?, ?)', [
        folder.id,
        parentId,
        folder.name,
        folder.createdAt,
      ]);
      return folder;
    },

    async renameFolder(id, name) {
      await db.run('UPDATE folders SET name = ? WHERE id = ?', [name.trim(), id]);
    },

    async moveFolder(id, newParentId) {
      // Walk up from the target; meeting `id` means the target is inside the folder being moved.
      let cursor = newParentId;
      while (cursor !== null) {
        if (cursor === id) throw new Error('FOLDER_CYCLE');
        const row = await db.getFirst<{ parent_id: string | null }>('SELECT parent_id FROM folders WHERE id = ?', [cursor]);
        cursor = row?.parent_id ?? null;
      }
      await db.run('UPDATE folders SET parent_id = ? WHERE id = ?', [newParentId, id]);
    },

    async deleteFolder(id) {
      // ON DELETE CASCADE removes subfolders, their quizzes and questions.
      await db.run('DELETE FROM folders WHERE id = ?', [id]);
    },

    async saveQuiz(quiz, folderId) {
      const id = newId();
      await db.transaction(async () => {
        await db.run(
          `INSERT INTO quizzes (id, folder_id, title, description, language, question_count, created_at, source_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, folderId, quiz.title, quiz.description ?? null, quiz.language ?? null, quiz.questions.length, Date.now(), quiz.sourceHash],
        );
        for (let start = 0; start < quiz.questions.length; start += SQL_BATCH) {
          const batch = quiz.questions.slice(start, start + SQL_BATCH);
          const placeholders = batch.map(() => '(?, ?, ?, ?)').join(', ');
          const params = batch.flatMap((q, i) => [q.id, id, start + i, JSON.stringify(q)]);
          await db.run(`INSERT INTO questions (id, quiz_id, position, payload) VALUES ${placeholders}`, params);
        }
      });
      return getSummary(id);
    },

    async renameQuiz(id, title) {
      await db.run('UPDATE quizzes SET title = ? WHERE id = ?', [title.trim(), id]);
    },

    async moveQuiz(id, folderId) {
      await db.run('UPDATE quizzes SET folder_id = ? WHERE id = ?', [folderId, id]);
    },

    async deleteQuiz(id) {
      await db.run('DELETE FROM quizzes WHERE id = ?', [id]);
    },

    async getQuestions(quizId) {
      const rows = await db.getAll<{ payload: string }>('SELECT payload FROM questions WHERE quiz_id = ? ORDER BY position', [quizId]);
      return rows.map((r) => JSON.parse(r.payload) as Question);
    },

    async getQuestionsByRefs(refs) {
      const byId = new Map<string, Question>();
      for (let start = 0; start < refs.length; start += SQL_BATCH) {
        const ids = refs.slice(start, start + SQL_BATCH).map((r) => r.questionId);
        const rows = await db.getAll<{ id: string; payload: string }>(
          `SELECT id, payload FROM questions WHERE id IN (${ids.map(() => '?').join(', ')})`,
          ids,
        );
        for (const r of rows) byId.set(r.id, JSON.parse(r.payload) as Question);
      }
      return refs.map((r) => byId.get(r.questionId)).filter((q): q is Question => q !== undefined);
    },

    async findQuizByHash(hash) {
      const row = await db.getFirst<QuizRow>(`${QUIZ_SELECT} WHERE q.source_hash = ? LIMIT 1`, [hash]);
      return row ? toSummary(row) : null;
    },
  };
}
