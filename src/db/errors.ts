/** Thrown when another window or tab already holds the web database. Dependency-free so native code can import it. */
export class DatabaseLockedError extends Error {
  constructor(name: string) {
    super(`Database "${name}" is open in another tab or window`);
    this.name = 'DatabaseLockedError';
  }
}

/** Web only: the storage backend (wasm engine or IndexedDB snapshot) could not be loaded, so nothing was opened or damaged. */
export class StorageUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`Storage unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'StorageUnavailableError';
  }
}

/** Web only: a transaction committed in memory but writing the snapshot to storage failed. */
export class SnapshotSaveError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'SnapshotSaveError';
  }
}
