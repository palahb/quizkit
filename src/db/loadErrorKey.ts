import { DatabaseLockedError, StorageUnavailableError } from './errors';

/** Which i18n key explains why the database could not be opened. */
export function loadErrorKey(e: unknown): 'app.openElsewhere' | 'app.storageUnavailable' | 'app.loadError' {
  if (e instanceof DatabaseLockedError) return 'app.openElsewhere';
  if (e instanceof StorageUnavailableError) return 'app.storageUnavailable';
  return 'app.loadError';
}
