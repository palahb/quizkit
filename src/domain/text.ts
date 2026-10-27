/** Alphabetical comparison using Turkish rules (ı before i, I/İ handled correctly). */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, 'tr', { sensitivity: 'base' });
}
