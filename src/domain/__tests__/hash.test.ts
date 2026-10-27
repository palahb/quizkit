import { hashString } from '../hash';

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('quiz')).toBe(hashString('quiz'));
  });
  it('differs for different input', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });
  it('returns a 13-14 char hex string', () => {
    expect(hashString('some longer text')).toMatch(/^[0-9a-f]{13,14}$/);
  });
});
