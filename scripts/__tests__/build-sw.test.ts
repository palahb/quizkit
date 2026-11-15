/** @jest-environment node */
import { buildSw, computeBuildId } from '../build-sw';

const SCOPE = 'https://example.com/quizkit/';
const FILES = ['', 'index.html', 'manifest.webmanifest', '_expo/static/js/web/entry-1.js'];

type Handler = (event: any) => void;

function makeEnv(opts: { failPath?: string; caches?: Record<string, Map<string, any>> } = {}) {
  const handlers: Record<string, Handler> = {};
  const stores: Record<string, Map<string, any>> = opts.caches ?? {};
  const calls = { skipWaiting: 0, claim: 0 };
  const cachesApi = {
    open: async (name: string) => {
      const store = (stores[name] ??= new Map());
      return {
        put: async (req: any, res: any) => {
          store.set(typeof req === 'string' ? req : req.url, res);
        },
        match: async (req: any, o?: { ignoreSearch?: boolean }) => {
          const k = typeof req === 'string' ? req : req.url;
          if (!o?.ignoreSearch) return store.get(k);
          for (const [sk, v] of store) if (sk.split('?')[0] === k.split('?')[0]) return v;
          return undefined;
        },
      };
    },
    keys: async () => Object.keys(stores),
    delete: async (name: string) => delete stores[name],
    match: async () => undefined,
  };
  const fetchCalls: Array<{ url: string; init: any }> = [];
  const fetchFake = async (req: any, init?: any) => {
    const url = typeof req === 'string' ? req : req.url;
    fetchCalls.push({ url, init });
    if (opts.failPath && url.endsWith(opts.failPath)) return { ok: false, status: 500, url };
    return { ok: true, status: 200, url, body: `body:${url}` };
  };
  const self: any = {
    addEventListener: (type: string, fn: Handler) => (handlers[type] = fn),
    registration: { scope: SCOPE },
    skipWaiting: async () => void calls.skipWaiting++,
    clients: { claim: async () => void calls.claim++ },
    location: { origin: 'https://example.com' },
  };
  return { handlers, stores, calls, fetchCalls, run: (src: string) => {
    new Function('self', 'caches', 'fetch', 'URL', src)(self, cachesApi, fetchFake, URL);
  } };
}

async function lifecycle(handler: Handler) {
  let p: Promise<unknown> = Promise.resolve();
  await handler({ waitUntil: (x: Promise<unknown>) => (p = x) });
  await p;
}

function fetchEvent(url: string, method = 'GET', mode = 'cors') {
  let responded: Promise<any> | undefined;
  let intercepted = false;
  const event = {
    request: { url, method, mode },
    respondWith: (p: any) => { intercepted = true; responded = Promise.resolve(p); },
  };
  return { event, intercepted: () => intercepted, response: () => responded };
}

describe('computeBuildId', () => {
  it('is deterministic and order independent', () => {
    const a = computeBuildId([{ path: 'a', size: 1 }, { path: 'b', size: 2 }]);
    const b = computeBuildId([{ path: 'b', size: 2 }, { path: 'a', size: 1 }]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8,}$/);
  });
  it('changes when a file or size changes', () => {
    const base = computeBuildId([{ path: 'a', size: 1 }]);
    expect(computeBuildId([{ path: 'a', size: 2 }])).not.toBe(base);
    expect(computeBuildId([{ path: 'c', size: 1 }])).not.toBe(base);
  });
});

describe('buildSw source', () => {
  it('contains every file path and the build id', () => {
    const src = buildSw(FILES, 'abc123', 100);
    for (const f of FILES) expect(src).toContain(JSON.stringify(f));
    expect(src).toContain('quizkit-100-abc123');
    expect(src).not.toContain('"sw.js"');
  });
});

describe('generated service worker', () => {
  it('precaches everything with cache: reload then skipWaiting', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1', 200));
    await lifecycle(env.handlers.install);
    expect(env.calls.skipWaiting).toBe(1);
    expect(env.fetchCalls).toHaveLength(FILES.length);
    for (const c of env.fetchCalls) expect(c.init).toEqual({ cache: 'reload' });
    expect(env.fetchCalls.map((c) => c.url)).toContain(SCOPE + 'index.html');
    expect(env.fetchCalls.map((c) => c.url)).toContain(SCOPE);
    expect(Object.keys(env.stores)).toEqual(['quizkit-200-b1']);
  });

  it('fails install and does not skipWaiting if one fetch is not ok', async () => {
    const env = makeEnv({ failPath: 'manifest.webmanifest' });
    env.run(buildSw(FILES, 'b1', 200));
    await expect(lifecycle(env.handlers.install)).rejects.toThrow();
    expect(env.calls.skipWaiting).toBe(0);
  });

  it('answers navigations from cached index.html', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1', 200));
    await lifecycle(env.handlers.install);
    const f = fetchEvent('https://example.com/quizkit/quiz/x', 'GET', 'navigate');
    env.handlers.fetch(f.event);
    expect(f.intercepted()).toBe(true);
    const res = await f.response();
    expect(res.url).toBe(SCOPE + 'index.html');
  });

  it('serves other precached files cache-first and falls through on miss', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1', 200));
    await lifecycle(env.handlers.install);
    const before = env.fetchCalls.length;
    const hit = fetchEvent(SCOPE + 'manifest.webmanifest');
    env.handlers.fetch(hit.event);
    expect((await hit.response()).url).toBe(SCOPE + 'manifest.webmanifest');
    expect(env.fetchCalls.length).toBe(before);
    const miss = fetchEvent(SCOPE + 'unknown.png');
    env.handlers.fetch(miss.event);
    expect((await miss.response()).url).toBe(SCOPE + 'unknown.png');
    expect(env.fetchCalls.length).toBe(before + 1);
    expect(env.stores['quizkit-200-b1'].has(SCOPE + 'unknown.png')).toBe(false);
  });

  it('does not intercept POST, cross-origin, or out-of-scope requests', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1', 200));
    await lifecycle(env.handlers.install);
    for (const f of [
      fetchEvent(SCOPE + 'quiz/x', 'POST', 'navigate'),
      fetchEvent('https://other.com/quizkit/a.js'),
      fetchEvent('https://example.com/elsewhere/a.js'),
    ]) {
      env.handlers.fetch(f.event);
      expect(f.intercepted()).toBe(false);
    }
  });

  it('activate keeps current + previous, ignores foreign caches, then claims', async () => {
    const env = makeEnv({ caches: { 'quizkit-100-old': new Map(), 'quizkit-200-b1': new Map(), other: new Map() } });
    env.run(buildSw(FILES, 'b1', 200));
    await lifecycle(env.handlers.activate);
    expect(Object.keys(env.stores).sort()).toEqual(['other', 'quizkit-100-old', 'quizkit-200-b1']);
    expect(env.calls.claim).toBe(1);
  });
});

describe('previous build fallback', () => {
  const OLD_CHUNK = SCOPE + '_expo/static/js/web/old-chunk-1.js';

  it('answers an old-build chunk from the previous cache without network', async () => {
    const prev = new Map<string, any>([[OLD_CHUNK, { ok: true, url: OLD_CHUNK }]]);
    const env = makeEnv({ caches: { 'quizkit-100-a': prev } });
    env.run(buildSw(FILES, 'b2', 200));
    await lifecycle(env.handlers.install);
    await lifecycle(env.handlers.activate);
    const before = env.fetchCalls.length;
    const f = fetchEvent(OLD_CHUNK);
    env.handlers.fetch(f.event);
    expect((await f.response()).url).toBe(OLD_CHUNK);
    expect(env.fetchCalls.length).toBe(before);
  });

  it('activate keeps only current + newest previous of several older caches', async () => {
    const env = makeEnv({
      caches: { 'quizkit-50-a': new Map(), 'quizkit-90-b': new Map(), 'quizkit-100-c': new Map(), 'quizkit-200-b1': new Map() },
    });
    env.run(buildSw(FILES, 'b1', 200));
    await lifecycle(env.handlers.activate);
    expect(Object.keys(env.stores).sort()).toEqual(['quizkit-100-c', 'quizkit-200-b1']);
  });

  it('a clock-skewed older build keeps its own cache while two newer caches exist', async () => {
    const env = makeEnv({
      caches: { 'quizkit-100-z': new Map(), 'quizkit-300-x': new Map(), 'quizkit-400-y': new Map() },
    });
    env.run(buildSw(FILES, 'z', 100));
    await lifecycle(env.handlers.activate);
    expect(Object.keys(env.stores).sort()).toEqual(['quizkit-100-z', 'quizkit-400-y']);
  });

  it('orders builds numerically, not lexically', async () => {
    const env = makeEnv({
      caches: { 'quizkit-9-a': new Map(), 'quizkit-100-b': new Map(), 'quizkit-1000-c': new Map() },
    });
    env.run(buildSw(FILES, 'c', 1000));
    await lifecycle(env.handlers.activate);
    expect(Object.keys(env.stores).sort()).toEqual(['quizkit-100-b', 'quizkit-1000-c']);
  });

  it('ignores the query string for cache hits', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1', 200));
    await lifecycle(env.handlers.install);
    const before = env.fetchCalls.length;
    const f = fetchEvent(SCOPE + 'manifest.webmanifest?v=1');
    env.handlers.fetch(f.event);
    expect((await f.response()).url).toBe(SCOPE + 'manifest.webmanifest');
    expect(env.fetchCalls.length).toBe(before);
  });

  it('failed install leaves no new cache behind', async () => {
    const env = makeEnv({ failPath: 'manifest.webmanifest', caches: { 'quizkit-100-a': new Map() } });
    env.run(buildSw(FILES, 'b2', 200));
    await expect(lifecycle(env.handlers.install)).rejects.toThrow();
    expect(Object.keys(env.stores)).toEqual(['quizkit-100-a']);
  });
});
