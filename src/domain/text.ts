/** Alphabetical comparison using Turkish rules (ı before i, I/İ handled correctly). */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, 'tr', { sensitivity: 'base' });
}

/** Same folder/quiz name ignoring case and surrounding spaces, with Turkish casing (İ/i, I/ı). */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('tr') === b.trim().toLocaleLowerCase('tr');
}
