/** Web only: ask the browser not to evict our storage (Safari clears unused sites' data). Never throws. */
export async function persistStorage(): Promise<'persisted' | 'denied' | 'unsupported'> {
  try {
    const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
    if (!storage || typeof storage.persist !== 'function') return 'unsupported';
    return (await storage.persist()) ? 'persisted' : 'denied';
  } catch {
    return 'denied';
  }
}
