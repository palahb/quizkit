import { getLocales } from 'expo-localization';
import KvStorage from 'expo-sqlite/kv-store';
import { deleteDatabaseAsync } from 'expo-sqlite';
import { useStore } from 'zustand';

import { createAttemptRepo } from '@/db/attemptRepo';
import { openExpoDb } from '@/db/expoSqlDb';
import { createLibraryRepo } from '@/db/libraryRepo';
import { migrate } from '@/db/migrations';
import { openMigrated } from '@/db/openDatabase';
import { createSessionRepo } from '@/db/sessionRepo';
import type { SqlDb } from '@/db/sqlDb';
import { languageFromLocale } from '@/i18n';

import { createHistoryStore, type HistoryState } from './historyStore';
import { createLibraryStore, type LibraryState } from './libraryStore';
import { createSessionStore, type SessionState } from './sessionStore';
import { createSettingsStore, type Language, type SettingsState } from './settingsStore';

function buildStores(db: SqlDb, defaultLanguage: Language) {
  const libraryRepo = createLibraryRepo(db);
  const attemptRepo = createAttemptRepo(db);
  const sessionRepo = createSessionRepo(db);
  const session = createSessionStore({
    library: libraryRepo,
    attempts: attemptRepo,
    sessions: sessionRepo,
    now: Date.now,
    rng: Math.random,
  });
  const library = createLibraryStore(libraryRepo, {
    getActiveSession: () => sessionRepo.load(),
    discardActiveSession: () => session.getState().abandon(),
  });
  const history = createHistoryStore(attemptRepo);
  const settings = createSettingsStore(KvStorage, defaultLanguage);
  return { db, library, session, history, settings };
}

export type Stores = ReturnType<typeof buildStores>;

const DB_NAME = 'quizkit.db';
let stores: Stores | null = null;

export function deviceLanguage(): Language {
  return languageFromLocale(getLocales()[0]?.languageCode);
}

/** Opens the database, runs migrations and hydrates every store. Call once from the root layout. */
export async function initStores(): Promise<Stores> {
  if (stores) return stores;
  const db = await openMigrated(() => openExpoDb(DB_NAME), migrate);
  const s = buildStores(db, deviceLanguage());
  await Promise.all([s.settings.getState().hydrate(), s.library.getState().hydrate(), s.session.getState().hydrate()]);
  stores = s;
  return s;
}

/** Removes every folder, quiz, attempt and the active session, then reloads the stores. Settings are kept. */
export async function deleteAllData(): Promise<void> {
  const s = getStores();
  await s.session.getState().abandon();
  await s.db.transaction(async () => {
    await s.db.run('DELETE FROM attempts');
    await s.db.run('DELETE FROM questions');
    await s.db.run('DELETE FROM quizzes');
    await s.db.run('DELETE FROM folders');
    await s.db.run('DELETE FROM active_session');
  });
  await Promise.all([s.library.getState().hydrate(), s.history.getState().loadRecent(50)]);
}

/** Last resort when the database cannot be opened: deletes the file so the next start begins empty. */
export async function resetDatabaseFile(): Promise<void> {
  if (stores) await stores.db.close().catch(() => undefined);
  stores = null;
  await deleteDatabaseAsync(DB_NAME);
}

export function getStores(): Stores {
  if (!stores) throw new Error('Stores used before initStores() finished');
  return stores;
}

export const useLibraryStore = <T>(selector: (s: LibraryState) => T): T => useStore(getStores().library, selector);
export const useSessionStore = <T>(selector: (s: SessionState) => T): T => useStore(getStores().session, selector);
export const useHistoryStore = <T>(selector: (s: HistoryState) => T): T => useStore(getStores().history, selector);
export const useSettingsStore = <T>(selector: (s: SettingsState) => T): T => useStore(getStores().settings, selector);
