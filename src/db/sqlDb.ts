/** The minimal SQL surface the repositories need. Implemented over expo-sqlite in the app and better-sqlite3 in tests. */
export interface SqlDb {
  run(sql: string, params?: unknown[]): Promise<void>;
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: unknown[]): Promise<T | null>;
  /**
   * Runs fn in a transaction. fn receives a handle to issue its statements on; use it (not the outer db)
   * inside the callback, because adapters may make outer statements wait for the transaction to finish.
   * Calling tx.transaction() reuses the open transaction.
   */
  transaction<T>(fn: (tx: SqlDb) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
