/** Thrown when another window or tab already holds the web database. Dependency-free so native code can import it. */
export class DatabaseLockedError extends Error {
  constructor(name: string) {
    super(`Database "${name}" is open in another tab or window`);
    this.name = 'DatabaseLockedError';
  }
}
