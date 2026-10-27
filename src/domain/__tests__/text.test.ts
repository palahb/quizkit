import { compareNames } from '../text';

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
