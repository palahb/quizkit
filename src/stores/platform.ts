import { deleteDatabaseAsync } from 'expo-sqlite';
import KvStorage from 'expo-sqlite/kv-store';

import { openExpoDb } from '@/db/expoSqlDb';
import type { SqlDb } from '@/db/sqlDb';

import type { KeyValue } from './settingsStore';

const DB_NAME = 'quizkit.db';

export function openPlatformDb(): Promise<SqlDb> {
  return openExpoDb(DB_NAME);
}

export function deletePlatformDb(): Promise<void> {
  return deleteDatabaseAsync(DB_NAME);
}

export const kv: KeyValue = KvStorage;
