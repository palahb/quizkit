import { kv } from '../platform.web';

describe('web kv', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('round-trips values', async () => {
    const store: Record<string, string> = {};
    const fake = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
    await kv.setItem('a', 'b');
    expect(await kv.getItem('a')).toBe('b');
    expect(await kv.getItem('missing')).toBeNull();
  });

  it('returns null and swallows writes when localStorage throws', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
      configurable: true,
    });
    expect(await kv.getItem('a')).toBeNull();
    await expect(kv.setItem('a', 'b')).resolves.toBeUndefined();
  });
});
