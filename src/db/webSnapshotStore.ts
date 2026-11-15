export interface SnapshotStore {
  load(): Promise<Uint8Array | null>;
  save(bytes: Uint8Array): Promise<void>;
  delete(): Promise<void>;
}

const STORE = 'snapshots';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** One IndexedDB database (named `dbName`) with a single `snapshots` store keyed by `dbName`. */
export function createIdbSnapshotStore(dbName: string): SnapshotStore {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(dbName, 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });

  async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const idb = await open();
    try {
      const tx = idb.transaction(STORE, mode);
      const done = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      const result = await req(fn(tx.objectStore(STORE)));
      await done;
      return result;
    } finally {
      idb.close();
    }
  }

  return {
    async load() {
      const v = await withStore<unknown>('readonly', (s) => s.get(dbName));
      return v instanceof Uint8Array ? v : v ? new Uint8Array(v as ArrayBuffer) : null;
    },
    async save(bytes) {
      await withStore('readwrite', (s) => s.put(bytes, dbName));
    },
    async delete() {
      await withStore('readwrite', (s) => s.delete(dbName));
    },
  };
}
