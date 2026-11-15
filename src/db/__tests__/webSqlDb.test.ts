import 'fake-indexeddb/auto';

import path from 'path';

import { migrate } from '../migrations';
import { openMigrated } from '../openDatabase';
import type { SnapshotStore } from '../webSnapshotStore';
import { createIdbSnapshotStore } from '../webSnapshotStore';
import initSqlJs from 'sql.js';

import { SnapshotSaveError, StorageUnavailableError } from '../errors';
import { DatabaseLockedError, openWebDb } from '../webSqlDb';

const locateWasm = (file: string) => path.join(path.dirname(require.resolve('sql.js')), file);
let n = 0;
const uniq = () => `test-${++n}`;
const open = (snapshots: SnapshotStore, extra: object = {}) =>
  openWebDb({ name: 'q', snapshots, locateWasm, lock: { acquire: async () => true }, ...extra });

describe('openWebDb', () => {
  it('persists across reopen', async () => {
    const store = createIdbSnapshotStore(uniq());
    const a = await open(store);
    await a.run('CREATE TABLE t(x)');
    await a.run('INSERT INTO t VALUES (?)', [1]);
    await a.close();
    const b = await open(store);
    expect(await b.getAll('SELECT x FROM t')).toEqual([{ x: 1 }]);
    await b.close();
  });

  it('transaction rolls back on throw', async () => {
    const store = createIdbSnapshotStore(uniq());
    const db = await open(store);
    await db.run('CREATE TABLE t(x)');
    const before = await store.load();
    await expect(
      db.transaction(async (tx) => {
        await tx.run('INSERT INTO t VALUES (1)');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.getAll('SELECT x FROM t')).toEqual([]);
    expect(await store.load()).toEqual(before);
    await db.close();
  });

  it('migrations run and foreign keys are enforced', async () => {
    const store = createIdbSnapshotStore(uniq());
    const db = await openMigrated(() => open(store), migrate);
    expect(await db.getFirst('SELECT COUNT(*) AS n FROM folders')).toEqual({ n: 0 });
    await expect(
      db.run(
        "INSERT INTO quizzes (id, folder_id, title, question_count, created_at, source_hash) VALUES ('q','nope','t',0,0,'h')",
      ),
    ).rejects.toThrow();
    // still enforced after a snapshot export
    await db.run("INSERT INTO folders (id, name, created_at) VALUES ('f','n',0)");
    await expect(
      db.run(
        "INSERT INTO quizzes (id, folder_id, title, question_count, created_at, source_hash) VALUES ('q','nope','t',0,0,'h')",
      ),
    ).rejects.toThrow();
    await db.close();
  });

  it('save failure surfaces', async () => {
    const store: SnapshotStore = {
      load: async () => null,
      save: async () => {
        throw new Error('quota');
      },
      delete: async () => undefined,
    };
    const db = await open(store);
    await expect(db.run('CREATE TABLE t(x)')).rejects.toThrow('quota');
  });

  it('second opener is refused', async () => {
    await expect(open(createIdbSnapshotStore(uniq()), { lock: { acquire: async () => false } })).rejects.toBeInstanceOf(
      DatabaseLockedError,
    );
  });

  it('concurrent transactions serialize', async () => {
    const db = await open(createIdbSnapshotStore(uniq()));
    await db.run('CREATE TABLE t(x)');
    const log: string[] = [];
    const tx = (id: string) =>
      db.transaction(async (tx) => {
        log.push(`${id}:start`);
        await tx.run('INSERT INTO t VALUES (?)', [id]);
        await new Promise((r) => setTimeout(r, 10));
        log.push(`${id}:end`);
      });
    await Promise.all([tx('a'), tx('b')]);
    expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
    await db.close();
  });

  it('outside statements wait for a pending transaction and are not rolled back with it', async () => {
    const store = createIdbSnapshotStore(uniq());
    const db = await open(store);
    await db.run('CREATE TABLE t(x)');
    const tx = db.transaction(async (h) => {
      await h.run('INSERT INTO t VALUES (1)');
      await new Promise((r) => setTimeout(r, 20));
      throw new Error('boom');
    });
    const outside = db.run('INSERT INTO t VALUES (2)');
    await expect(tx).rejects.toThrow('boom');
    await outside;
    expect(await db.getAll('SELECT x FROM t')).toEqual([{ x: 2 }]);
    await db.close();
    const again = await open(store);
    expect(await again.getAll('SELECT x FROM t')).toEqual([{ x: 2 }]);
    await again.close();
  });

  it('nested transaction reuses the open one and does not hang', async () => {
    const db = await open(createIdbSnapshotStore(uniq()));
    await db.run('CREATE TABLE t(x)');
    await db.transaction(async (tx) => {
      await tx.transaction(async (inner) => {
        await inner.run('INSERT INTO t VALUES (1)');
      });
    });
    expect(await db.getAll('SELECT x FROM t')).toEqual([{ x: 1 }]);
    await db.close();
  });

  it('rolls back and recovers when COMMIT fails', async () => {
    const db = await open(createIdbSnapshotStore(uniq()));
    await db.run('CREATE TABLE p(id PRIMARY KEY)');
    await db.run('CREATE TABLE c(pid REFERENCES p(id))');
    await expect(
      db.transaction(async (tx) => {
        await tx.run('PRAGMA defer_foreign_keys = ON');
        await tx.run('INSERT INTO c VALUES (99)');
      }),
    ).rejects.toThrow();
    expect(await db.getAll('SELECT * FROM c')).toEqual([]);
    await db.transaction(async (tx) => {
      await tx.run('INSERT INTO p VALUES (1)');
    });
    expect(await db.getAll('SELECT id FROM p')).toEqual([{ id: 1 }]);
    await db.close();
  });
});

describe('openWebDb snapshots', () => {
  const spied = (inner: SnapshotStore, delayFirst = 0) => {
    const saved: Uint8Array[] = [];
    let n = 0;
    const store: SnapshotStore = {
      load: () => inner.load(),
      delete: () => inner.delete(),
      save: async (b) => {
        saved.push(b);
        if (n++ === 0 && delayFirst) await new Promise((r) => setTimeout(r, delayFirst));
        await inner.save(b);
      },
    };
    return { store, saved };
  };

  it('does not save after a transaction that changed nothing', async () => {
    const { store, saved } = spied(createIdbSnapshotStore(uniq()));
    const db = await open(store);
    await db.run('CREATE TABLE t(x)');
    const count = saved.length;
    expect(await db.transaction(async (tx) => tx.getAll('SELECT x FROM t'))).toEqual([]);
    expect(saved.length).toBe(count);
    await db.close();
  });

  it('saves after a transaction that only changed the schema or rows', async () => {
    const { store, saved } = spied(createIdbSnapshotStore(uniq()));
    const db = await open(store);
    await db.transaction(async (tx) => tx.run('CREATE TABLE t(x)'));
    expect(saved.length).toBe(1);
    await db.transaction(async (tx) => tx.run('INSERT INTO t VALUES (1)'));
    expect(saved.length).toBe(2);
    await db.close();
  });

  it('wraps a failing post-commit save in SnapshotSaveError, data stays in memory', async () => {
    let fail = false;
    const inner = createIdbSnapshotStore(uniq());
    const store: SnapshotStore = {
      load: () => inner.load(),
      delete: () => inner.delete(),
      save: async (b) => {
        if (fail) throw new Error('quota');
        await inner.save(b);
      },
    };
    const db = await open(store);
    await db.run('CREATE TABLE t(x)');
    fail = true;
    await expect(db.transaction(async (tx) => tx.run('INSERT INTO t VALUES (1)'))).rejects.toBeInstanceOf(
      SnapshotSaveError,
    );
    expect(await db.getAll('SELECT x FROM t')).toEqual([{ x: 1 }]);
    fail = false;
    await db.close();
  });

  it('a queued save never exports during an open transaction', async () => {
    const { store, saved } = spied(createIdbSnapshotStore(uniq()), 30);
    const db = await open(store);
    await db.run('CREATE TABLE t(x)');
    saved.length = 0;
    const p1 = db.run('INSERT INTO t VALUES (1)'); // first save is slow
    await new Promise((r) => setTimeout(r, 0));
    const p2 = db.run('INSERT INTO t VALUES (2)'); // queues a pending save behind it
    await new Promise((r) => setTimeout(r, 0));
    const tx = db.transaction(async (h) => {
      await h.run('INSERT INTO t VALUES (99)');
      await new Promise((r) => setTimeout(r, 80)); // the pending save becomes due meanwhile
      throw new Error('rollback');
    });
    await expect(tx).rejects.toThrow('rollback');
    await Promise.all([p1, p2]);
    await db.close();
    const SQL = await initSqlJs({ locateFile: locateWasm });
    for (const bytes of saved) {
      const snap = new SQL.Database(bytes);
      const rows = snap.exec('SELECT x FROM t')[0]?.values.flat() ?? [];
      expect(rows).not.toContain(99);
      snap.close();
    }
  });
});

describe('openWebDb storage failures', () => {
  it('reports StorageUnavailableError when the snapshot cannot be loaded, and releases the lock', async () => {
    const release = jest.fn();
    const store: SnapshotStore = {
      load: async () => {
        throw new Error('idb blocked');
      },
      save: async () => undefined,
      delete: async () => undefined,
    };
    await expect(open(store, { lock: { acquire: async () => true, release } })).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    expect(release).toHaveBeenCalled();
  });

  it('reports StorageUnavailableError when the wasm cannot be loaded', async () => {
    const store = createIdbSnapshotStore(uniq());
    let fresh!: typeof import('../webSqlDb');
    let FreshErr!: typeof import('../errors');
    jest.isolateModules(() => {
      jest.doMock('sql.js', () => ({ __esModule: true, default: () => Promise.reject(new Error('wasm 404')) }));
      fresh = require('../webSqlDb');
      FreshErr = require('../errors');
    });
    await expect(
      fresh.openWebDb({
        name: 'q',
        snapshots: store,
        locateWasm,
        lock: { acquire: async () => true },
      }),
    ).rejects.toBeInstanceOf(FreshErr.StorageUnavailableError);
    jest.dontMock('sql.js');
  });

  it('a corrupt snapshot is not a StorageUnavailableError', async () => {
    const store: SnapshotStore = {
      load: async () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
      save: async () => undefined,
      delete: async () => undefined,
    };
    const err = await open(store).then(
      () => null,
      (e) => e,
    );
    // Either opens lazily (no error) or fails as a plain error; never "storage unavailable".
    if (err) expect(err).not.toBeInstanceOf(StorageUnavailableError);
  });
});

describe('createIdbSnapshotStore errors', () => {
  it('save rejects once when the write fails, with no unhandled rejection', async () => {
    const seen: unknown[] = [];
    const onUnhandled = (e: unknown) => seen.push(e);
    process.on('unhandledRejection', onUnhandled);
    const store = createIdbSnapshotStore(uniq());
    const spy = jest.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore) {
      this.transaction.abort();
      throw new DOMException('quota', 'QuotaExceededError');
    });
    try {
      await expect(store.save(new Uint8Array([1]))).rejects.toBeDefined();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      spy.mockRestore();
      process.off('unhandledRejection', onUnhandled);
    }
    expect(seen).toEqual([]);
  });
});
