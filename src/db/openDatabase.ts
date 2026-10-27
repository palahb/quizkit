import type { SqlDb } from './sqlDb';

/** Opens and migrates; if migration fails the handle is closed so the file can be deleted. */
export async function openMigrated(open: () => Promise<SqlDb>, migrate: (db: SqlDb) => Promise<void>): Promise<SqlDb> {
  const db = await open();
  try {
    await migrate(db);
    return db;
  } catch (e) {
    await db.close().catch(() => undefined);
    throw e;
  }
}
