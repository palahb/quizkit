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
    try {
      db.run('PRAGMA foreign_keys = ON');
    } catch (e) {
      db.close();
      throw e;
    }
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

  // Transactions serialize through `chain`. `active` counts queued + running transactions; statements issued on
  // the outer handle wait until it is zero, while statements on the tx handle run immediately.
  let active = 0;
  let chain: Promise<unknown> = Promise.resolve();
  let closed = false;

  const exec = (sql: string, params: unknown[]) => {
    if (params.length === 0) db.run(sql);
    else db.run(sql, params as never[]);
  };
  const all = <T,>(sql: string, params: unknown[]): T[] => {
    const stmt = db.prepare(sql);
    try {
      if (params.length) stmt.bind(params as never[]);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };
  const first = <T,>(sql: string, params: unknown[]): T | null => {
    const stmt = db.prepare(sql);
    try {
      if (params.length) stmt.bind(params as never[]);
      return stmt.step() ? (stmt.getAsObject() as T) : null;
    } finally {
      stmt.free();
    }
  };
  const idle = async () => {
    while (active > 0) await chain.catch(() => undefined);
  };

  // Handle given to a transaction callback: immediate execution, no per-statement saves, nested = reuse.
  const txHandle: SqlDb = {
    async run(sql, params = []) {
      exec(sql, params);
    },
    async getAll<T>(sql: string, params: unknown[] = []) {
      return all<T>(sql, params);
    },
    async getFirst<T>(sql: string, params: unknown[] = []) {
      return first<T>(sql, params);
    },
    transaction: (fn) => fn(txHandle),
    close: () => Promise.reject(new Error('Cannot close the database inside a transaction')),
  };

  const outer: SqlDb = {
    async run(sql, params = []) {
      await idle();
      exec(sql, params);
      await requestSave();
    },
    async getAll<T>(sql: string, params: unknown[] = []) {
      await idle();
      return all<T>(sql, params);
    },
    async getFirst<T>(sql: string, params: unknown[] = []) {
      await idle();
      return first<T>(sql, params);
    },
    transaction<T>(fn: (tx: SqlDb) => Promise<T>): Promise<T> {
      active++;
      const run = async (): Promise<T> => {
        try {
          db.run('BEGIN');
          let result: T;
          try {
            result = await fn(txHandle);
            db.run('COMMIT');
          } catch (e) {
            try {
              db.run('ROLLBACK');
            } catch {
              // no open transaction, or already rolled back; keep the original error
            }
            throw e;
          }
          // Decrement before saving so the save is not blocked by our own gate.
          return result;
        } finally {
          active--;
        }
      };
      const next = chain.then(run, run).then(async (r) => {
        await requestSave();
        return r;
      });
      chain = next.catch(() => undefined);
      return next;
    },
    async close() {
      if (closed) return;
      closed = true;
      await idle();
      while (inflight || pending) await Promise.allSettled([inflight, pending]);
      db.close();
      lock.release?.();
    },
  };
  return outer;
}
