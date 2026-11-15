import { computeStandalonePadding } from '../standalonePadding';

const base = { standalone: true, envTop: 0, envBottom: 0, screenHeight: 852, innerHeight: 791 };

describe('computeStandalonePadding', () => {
  it('adds nothing outside the installed app', () => {
    expect(computeStandalonePadding({ ...base, standalone: false })).toEqual({ top: 0, bottom: 0 });
  });
  it('adds nothing when the browser already reports safe-area insets (the library applies them)', () => {
    expect(computeStandalonePadding({ ...base, envTop: 59 })).toEqual({ top: 0, bottom: 0 });
    expect(computeStandalonePadding({ ...base, envBottom: 34 })).toEqual({ top: 0, bottom: 0 });
  });
  it('uses the missing window height as the top space when insets are reported as 0', () => {
    expect(computeStandalonePadding(base)).toEqual({ top: 61, bottom: 16 });
  });
  it('falls back to 59 when the window height gives no usable hint', () => {
    expect(computeStandalonePadding({ ...base, innerHeight: 852 })).toEqual({ top: 59, bottom: 16 });
    expect(computeStandalonePadding({ ...base, innerHeight: 600 })).toEqual({ top: 59, bottom: 16 });
  });
});
