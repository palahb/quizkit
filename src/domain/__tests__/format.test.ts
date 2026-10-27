import { formatDuration } from '../format';

describe('formatDuration', () => {
  it('formats seconds as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_400)).toBe('1:05');
  });
  it('adds hours when needed', () => {
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });
});
