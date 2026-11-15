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
        match: async (req: any) => store.get(typeof req === 'string' ? req : req.url),
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
    const src = buildSw(FILES, 'abc123');
    for (const f of FILES) expect(src).toContain(JSON.stringify(f));
    expect(src).toContain('quizkit-abc123');
    expect(src).not.toContain('"sw.js"');
  });
});

describe('generated service worker', () => {
  it('precaches everything with cache: reload then skipWaiting', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1'));
    await lifecycle(env.handlers.install);
    expect(env.calls.skipWaiting).toBe(1);
    expect(env.fetchCalls).toHaveLength(FILES.length);
    for (const c of env.fetchCalls) expect(c.init).toEqual({ cache: 'reload' });
    expect(env.fetchCalls.map((c) => c.url)).toContain(SCOPE + 'index.html');
    expect(env.fetchCalls.map((c) => c.url)).toContain(SCOPE);
    expect(Object.keys(env.stores)).toEqual(['quizkit-b1']);
  });

  it('fails install and does not skipWaiting if one fetch is not ok', async () => {
    const env = makeEnv({ failPath: 'manifest.webmanifest' });
    env.run(buildSw(FILES, 'b1'));
    await expect(lifecycle(env.handlers.install)).rejects.toThrow();
    expect(env.calls.skipWaiting).toBe(0);
  });

  it('answers navigations from cached index.html', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1'));
    await lifecycle(env.handlers.install);
    const f = fetchEvent('https://example.com/quizkit/quiz/x', 'GET', 'navigate');
    env.handlers.fetch(f.event);
    expect(f.intercepted()).toBe(true);
    const res = await f.response();
    expect(res.url).toBe(SCOPE + 'index.html');
  });

  it('serves other precached files cache-first and falls through on miss', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1'));
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
    expect(env.stores['quizkit-b1'].has(SCOPE + 'unknown.png')).toBe(false);
  });

  it('does not intercept POST, cross-origin, or out-of-scope requests', async () => {
    const env = makeEnv();
    env.run(buildSw(FILES, 'b1'));
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

  it('activate deletes older quizkit-* caches, keeps current and foreign ones, then claims', async () => {
    const env = makeEnv({ caches: { 'quizkit-old': new Map(), 'quizkit-b1': new Map(), other: new Map() } });
    env.run(buildSw(FILES, 'b1'));
    await lifecycle(env.handlers.activate);
    expect(Object.keys(env.stores).sort()).toEqual(['other', 'quizkit-b1']);
    expect(env.calls.claim).toBe(1);
  });
});
