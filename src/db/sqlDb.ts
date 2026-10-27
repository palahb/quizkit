/** The minimal SQL surface the repositories need. Implemented over expo-sqlite in the app and better-sqlite3 in tests. */
export interface SqlDb {
  run(sql: string, params?: unknown[]): Promise<void>;
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: unknown[]): Promise<T | null>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
