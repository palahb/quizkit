import type { Session } from '@/domain/types';

import type { SqlDb } from './sqlDb';

/** Stores the single active (unfinished) session. */
export interface SessionRepo {
  save(s: Session): Promise<void>;
  load(): Promise<Session | null>;
  clear(): Promise<void>;
}

export function createSessionRepo(db: SqlDb): SessionRepo {
  return {
    async save(s) {
      await db.run('INSERT OR REPLACE INTO active_session (id, payload) VALUES (1, ?)', [JSON.stringify(s)]);
    },
    async load() {
      const row = await db.getFirst<{ payload: string }>('SELECT payload FROM active_session WHERE id = 1');
      if (!row) return null;
      try {
        return JSON.parse(row.payload) as Session;
      } catch {
        console.warn('Corrupted active session discarded');
        return null;
      }
    },
    async clear() {
      await db.run('DELETE FROM active_session');
    },
  };
}
