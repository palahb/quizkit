import { openMigrated } from '../openDatabase';
import type { SqlDb } from '../sqlDb';

function fakeDb(): SqlDb & { closed: boolean } {
  const db = {
    closed: false,
    run: async () => {},
    getAll: async () => [],
    getFirst: async () => null,
    transaction: async <T,>(fn: () => Promise<T>) => fn(),
    close: async () => {
      db.closed = true;
    },
  };
  return db;
}

describe('openMigrated', () => {
  it('closes the database when migration fails so the file can be deleted', async () => {
    const db = fakeDb();
    await expect(
      openMigrated(
        async () => db,
        async () => {
          throw new Error('file is not a database');
        },
      ),
    ).rejects.toThrow('file is not a database');
    expect(db.closed).toBe(true);
  });

  it('returns the open database when migration succeeds', async () => {
    const db = fakeDb();
    expect(await openMigrated(async () => db, async () => {})).toBe(db);
    expect(db.closed).toBe(false);
  });
});
