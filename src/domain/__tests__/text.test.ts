import { compareNames, sameName } from '../text';

describe('compareNames (Turkish locale)', () => {
  it('orders dotless ı before z-words correctly', () => {
    expect(compareNames('ılık', 'ızgara')).toBeLessThan(0);
  });
  it('orders dotless I before dotted İ', () => {
    expect(compareNames('Iğdır', 'İzmir')).toBeLessThan(0);
  });
  it('sorts a list in Turkish order', () => {
    expect(['İzmir', 'Iğdır', 'ankara'].sort(compareNames)).toEqual(['ankara', 'Iğdır', 'İzmir']);
  });
});

describe('sameName (Turkish, case-insensitive, trimmed)', () => {
  it('matches İKTİSAT and iktisat', () => {
    expect(sameName('İKTİSAT', ' iktisat ')).toBe(true);
  });
  it('matches IŞIK and ışık', () => {
    expect(sameName('IŞIK', 'ışık')).toBe(true);
  });
  it('keeps ı and i different', () => {
    expect(sameName('ılık', 'ilik')).toBe(false);
  });
});
