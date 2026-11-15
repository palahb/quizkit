import { DatabaseLockedError } from './errors';

/** Which i18n key explains why the database could not be opened. */
export function loadErrorKey(e: unknown): 'app.openElsewhere' | 'app.loadError' {
  return e instanceof DatabaseLockedError ? 'app.openElsewhere' : 'app.loadError';
}
