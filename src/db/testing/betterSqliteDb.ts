import Database from 'better-sqlite3';

import type { SqlDb } from '../sqlDb';

/** In-memory SQLite for Node tests. */
export function createBetterSqliteDb(): SqlDb {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return {
    async run(sql, params = []) {
      if (params.length === 0) db.exec(sql);
      else db.prepare(sql).run(...(params as never[]));
    },
    async getAll<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async getFirst<T>(sql: string, params: unknown[] = []) {
      return (db.prepare(sql).get(...(params as never[])) as T | undefined) ?? null;
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        const result = await fn();
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
