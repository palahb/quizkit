import * as SQLite from 'expo-sqlite';

import type { SqlDb } from './sqlDb';

type Params = SQLite.SQLiteBindParams;

export async function openExpoDb(name = 'quizkit.db'): Promise<SqlDb> {
  const db = await SQLite.openDatabaseAsync(name);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return {
    async run(sql, params = []) {
      if (params.length === 0) await db.execAsync(sql);
      else await db.runAsync(sql, params as Params);
    },
    getAll: <T>(sql: string, params: unknown[] = []) => db.getAllAsync<T>(sql, params as Params),
    getFirst: <T>(sql: string, params: unknown[] = []) => db.getFirstAsync<T>(sql, params as Params),
    async transaction(fn) {
      let result!: Awaited<ReturnType<typeof fn>>;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    },
  };
}
