import { readPickedFile } from '../importActions';
import { readTextFile } from '../readFile.web';

describe('readTextFile (web)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('reads text from a File', async () => {
    const file = { text: async () => 'from file' } as unknown as File;
    await expect(readTextFile({ uri: 'blob:x', file })).resolves.toBe('from file');
  });

  it('falls back to fetch on the uri', async () => {
    globalThis.fetch = jest.fn(async () => ({ text: async () => 'from fetch' })) as unknown as typeof fetch;
    await expect(readTextFile({ uri: 'blob:x' })).resolves.toBe('from fetch');
  });

  it('rejects when there is no file and fetch fails, so readPickedFile reports an error', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('nope');
    }) as unknown as typeof fetch;
    await expect(readTextFile({ uri: 'blob:x' })).rejects.toThrow();
    const r = await readPickedFile(
      async () => ({ canceled: false, assets: [{ uri: 'blob:x' }] }),
      (_uri, asset) => readTextFile(asset),
    );
    expect(r).toEqual({ kind: 'error' });
  });
});
