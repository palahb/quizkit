import { persistStorage } from '../persistStorage';

const setNavigator = (value: unknown) => Object.defineProperty(globalThis, 'navigator', { value, configurable: true });
const original = globalThis.navigator;
afterEach(() => setNavigator(original));

describe('persistStorage', () => {
  it('returns persisted when persist() resolves true', async () => {
    setNavigator({ storage: { persist: jest.fn().mockResolvedValue(true) } });
    expect(await persistStorage()).toBe('persisted');
  });
  it('returns denied when persist() resolves false', async () => {
    setNavigator({ storage: { persist: jest.fn().mockResolvedValue(false) } });
    expect(await persistStorage()).toBe('denied');
  });
  it('returns unsupported when navigator.storage is missing', async () => {
    setNavigator({});
    expect(await persistStorage()).toBe('unsupported');
  });
  it('never throws when persist() rejects', async () => {
    setNavigator({ storage: { persist: jest.fn().mockRejectedValue(new Error('x')) } });
    expect(await persistStorage()).toBe('denied');
  });
});
