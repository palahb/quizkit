import { loadErrorKey } from '../loadErrorKey';
import { DatabaseLockedError } from '../webSqlDb';

describe('loadErrorKey', () => {
  it('explains a database open in another window', () => {
    expect(loadErrorKey(new DatabaseLockedError('quizkit'))).toBe('app.openElsewhere');
  });
  it('falls back to the generic message', () => {
    expect(loadErrorKey(new Error('boom'))).toBe('app.loadError');
  });
});
