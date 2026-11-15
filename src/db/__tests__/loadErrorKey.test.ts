import { loadErrorKey } from '../loadErrorKey';
import { DatabaseLockedError, StorageUnavailableError } from '../errors';

describe('loadErrorKey', () => {
  it('explains a database open in another window', () => {
    expect(loadErrorKey(new DatabaseLockedError('quizkit'))).toBe('app.openElsewhere');
  });
  it('explains unreachable storage', () => {
    expect(loadErrorKey(new StorageUnavailableError(new Error('x')))).toBe('app.storageUnavailable');
  });
  it('falls back to the generic message', () => {
    expect(loadErrorKey(new Error('boom'))).toBe('app.loadError');
  });
});
