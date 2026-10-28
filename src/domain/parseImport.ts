import { MAX_REPORTED_ISSUES, schemaVersionSchema } from './importSchema';
import { prepareJson, validateQuiz } from './parseQuizJson';
import type { ImportIssue, ImportResult, ImportWarning } from './types';

export const MAX_COLLECTION_QUIZZES = 500;
export const MAX_FOLDER_DEPTH = 8;
const MAX_FOLDER_NAME = 120;

/** One quiz inside a collection: where it goes (folder names from the top) and its validation result. */
export interface BatchEntry {
  path: string[];
  title: string;
  result: ImportResult;
}

export interface ParsedCollection {
  /** Every folder path declared, parents before children, without duplicates. */
  folderPaths: string[][];
  entries: BatchEntry[];
  /** Repairs that applied to the whole text (backslashes, quotes). */
  warnings: ImportWarning[];
}

export type CollectionResult = { ok: true; collection: ParsedCollection } | Extract<ImportResult, { ok: false }>;

export type ImportOutcome = { kind: 'quiz'; result: ImportResult } | { kind: 'collection'; result: CollectionResult };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

function schemaFailure(issues: ImportIssue[]): Extract<ImportResult, { ok: false }> {
  return {
    ok: false,
    kind: 'schema',
    issues: issues.slice(0, MAX_REPORTED_ISSUES),
    moreCount: Math.max(0, issues.length - MAX_REPORTED_ISSUES),
  };
}

/**
 * Reads pasted text as either a single quiz (has "questions") or a collection of folders
 * and quizzes (has "folders" or "quizzes"). Never throws.
 */
export function parseImport(raw: string): ImportOutcome {
  const prepared = prepareJson(raw);
  if (!prepared.ok) return { kind: 'quiz', result: prepared.result };
  const data = prepared.data;
  const isCollection = !('questions' in data) && ('folders' in data || 'quizzes' in data);
  if (!isCollection) {
    const result = validateQuiz(data, { requireSchemaVersion: true });
    return { kind: 'quiz', result: result.ok ? { ...result, warnings: [...prepared.repairWarnings, ...result.warnings] } : result };
  }
  return { kind: 'collection', result: parseCollection(data, prepared.repairWarnings) };
}

function parseCollection(data: Obj, warnings: ImportWarning[]): CollectionResult {
  if (!schemaVersionSchema.safeParse(data.schemaVersion).success) {
    return schemaFailure([{ code: 'schema_version_unsupported', params: { found: String(data.schemaVersion) } }]);
  }

  const folderPaths: string[][] = [];
  const seenPaths = new Set<string>();
  const rawQuizzes: { path: string[]; value: unknown; position: number }[] = [];
  const issues: ImportIssue[] = [];
  let position = 0;

  const collectQuizzes = (list: unknown, path: string[]) => {
    if (!Array.isArray(list)) return;
    for (const value of list) rawQuizzes.push({ path, value, position: ++position });
  };

  const walk = (folders: unknown, parent: string[], displayParent: string[]) => {
    if (!Array.isArray(folders)) return;
    folders.forEach((f, i) => {
      const name = isObj(f) && typeof f.name === 'string' ? f.name.trim() : '';
      const display = [...displayParent, name || `#${i + 1}`];
      if (!name || name.length > MAX_FOLDER_NAME) {
        issues.push({ code: 'folder_name_invalid', params: { path: display.join(' / ') } });
        return;
      }
      const path = [...parent, name];
      if (path.length > MAX_FOLDER_DEPTH) {
        if (!issues.some((x) => x.code === 'folders_too_deep')) issues.push({ code: 'folders_too_deep', params: { max: MAX_FOLDER_DEPTH } });
        return;
      }
      const key = path.join('\u0000');
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        folderPaths.push(path);
      }
      const folder = f as Obj;
      collectQuizzes(folder.quizzes, path);
      walk(folder.folders, path, display);
    });
  };

  walk(data.folders, [], []);
  collectQuizzes(data.quizzes, []);
  if (issues.length > 0) return schemaFailure(issues);
  if (rawQuizzes.length === 0) return schemaFailure([{ code: 'collection_empty', params: {} }]);
  if (rawQuizzes.length > MAX_COLLECTION_QUIZZES) {
    return schemaFailure([{ code: 'collection_too_many', params: { max: MAX_COLLECTION_QUIZZES, count: rawQuizzes.length } }]);
  }

  // Folder paths came out depth-first; entries keep folder quizzes before top-level ones.
  const entries: BatchEntry[] = rawQuizzes.map(({ path, value, position: n }) => {
    const obj = isObj(value) ? value : {};
    const result = validateQuiz(obj, { requireSchemaVersion: false });
    const rawTitle = typeof obj.title === 'string' ? obj.title.trim() : '';
    return { path, title: result.ok ? result.quiz.title : rawTitle || `#${n}`, result };
  });
  return { ok: true, collection: { folderPaths, entries, warnings } };
}
