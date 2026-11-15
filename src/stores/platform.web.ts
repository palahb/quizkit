import { createIdbSnapshotStore } from '@/db/webSnapshotStore';
import type { SqlDb } from '@/db/sqlDb';
import { openWebDb } from '@/db/webSqlDb';

import type { KeyValue } from './settingsStore';

const DB_NAME = 'quizkit';

/** Inlined by Expo's Metro config from `experiments.baseUrl` (e.g. "/quizkit"). */
const BASE_URL = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

export function openPlatformDb(): Promise<SqlDb> {
  return openWebDb({
    name: DB_NAME,
    snapshots: createIdbSnapshotStore(DB_NAME),
    locateWasm: (file) => `${BASE_URL}/${file}`,
  });
}

export async function deletePlatformDb(): Promise<void> {
  await createIdbSnapshotStore(DB_NAME).delete();
}

export const kv: KeyValue = {
  async getItem(key) {
    try {
      return globalThis.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      globalThis.localStorage.setItem(key, value);
    } catch {
      // storage blocked or full; settings just won't persist
    }
  },
};
