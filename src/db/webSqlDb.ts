import initSqlJs, { type Database } from 'sql.js';

import type { SqlDb } from './sqlDb';
import type { SnapshotStore } from './webSnapshotStore';

export class DatabaseLockedError extends Error {
  constructor(name: string) {
    super(`Database "${name}" is open in another tab or window`);
    this.name = 'DatabaseLockedError';
  }
}

export interface WebLock {
  acquire(name: string): Promise<boolean>;
  release?(): void;
}

/** Holds a Web Lock until released; treated as acquired when navigator.locks is unavailable. */
function defaultLock(): WebLock {
  let release: (() => void) | undefined;
  return {
    async acquire(name) {
      const locks = (globalThis as { navigator?: { locks?: LockManager } }).navigator?.locks;
      if (!locks) return true;
      return new Promise<boolean>((resolve) => {
        void locks.request(`quizkit-db:${name}`, { ifAvailable: true }, (lock) => {
          if (!lock) {
            resolve(false);
            return undefined;
          }
          resolve(true);
          return new Promise<void>((r) => {
            release = r;
          });
        });
      });
    },
    release() {
      release?.();
    },
  };
}

export async function openWebDb(opts: {
  name: string;
  snapshots: SnapshotStore;
  locateWasm: (file: string) => string;
  lock?: { acquire(name: string): Promise<boolean> };
}): Promise<SqlDb> {
  const lock: WebLock = opts.lock ?? defaultLock();
  if (!(await lock.acquire(opts.name))) throw new DatabaseLockedError(opts.name);

  let db: Database;
  try {
    const SQL = await initSqlJs({ locateFile: opts.locateWasm });
    const bytes = await opts.snapshots.load();
    db = new SQL.Database(bytes ?? undefined);
    db.run('PRAGMA foreign_keys = ON');
  } catch (e) {
    lock.release?.();
    throw e;
  }

  // Coalescing save queue: one in flight, one pending; callers share the outcome of the save they wait on.
  let inflight: Promise<void> | null = null;
  let pending: Promise<void> | null = null;
  const doSave = async () => {
    const bytes = db.export();
    db.run('PRAGMA foreign_keys = ON'); // export() resets connection pragmas
    await opts.snapshots.save(bytes);
  };
  const requestSave = (): Promise<void> => {
    if (!inflight) {
      const p: Promise<void> = doSave().finally(() => {
        if (inflight === p) inflight = null;
      });
      inflight = p;
      return p;
    }
    if (!pending) {
      const prev = inflight;
      const p: Promise<void> = prev
        .catch(() => undefined)
        .then(() => {
          pending = null;
          return requestSave();
        });
      pending = p;
    }
    return pending;
  };

  let txDepth = 0;
  let chain: Promise<unknown> = Promise.resolve();
  let closed = false;

  const exec = (sql: string, params: unknown[]) => {
    if (params.length === 0) db.run(sql);
    else db.run(sql, params as never[]);
  };

  return {
    async run(sql, params = []) {
      exec(sql, params);
      if (txDepth === 0) await requestSave();
    },
    async getAll<T>(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql);
      try {
        if (params.length) stmt.bind(params as never[]);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async getFirst<T>(sql: string, params: unknown[] = []) {
      const stmt = db.prepare(sql);
      try {
        if (params.length) stmt.bind(params as never[]);
        return stmt.step() ? (stmt.getAsObject() as T) : null;
      } finally {
        stmt.free();
      }
    },
    transaction<T>(fn: () => Promise<T>): Promise<T> {
      const run = async (): Promise<T> => {
        db.run('BEGIN');
        txDepth++;
        let result: T;
        try {
          result = await fn();
        } catch (e) {
          txDepth--;
          db.run('ROLLBACK');
          throw e;
        }
        txDepth--;
        db.run('COMMIT');
        await requestSave();
        return result;
      };
      const next = chain.then(run, run);
      chain = next.catch(() => undefined);
      return next;
    },
    async close() {
      if (closed) return;
      closed = true;
      await chain.catch(() => undefined);
      await (inflight ?? Promise.resolve()).catch(() => undefined);
      db.close();
      lock.release?.();
    },
  };
}
