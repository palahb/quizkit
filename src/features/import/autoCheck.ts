import { useEffect, useState } from 'react';

/** A paste, or deleting most of the text, as opposed to typing a few characters. */
export function isBulkChange(prev: string, next: string): boolean {
  return Math.abs(next.length - prev.length) > 20;
}

/**
 * Runs `parse` on the text once it has stopped changing for `delayMs`.
 * Returns null while the box is empty or before the first check.
 */
export function useAutoCheck<R>(text: string, parse: (s: string) => R, delayMs: number): R | null {
  const [result, setResult] = useState<R | null>(null);
  const empty = text.trim() === '';
  useEffect(() => {
    setResult(null);
    if (empty) return;
    const id = setTimeout(() => setResult(parse(text)), delayMs);
    return () => clearTimeout(id);
  }, [text, empty, parse, delayMs]);
  return empty ? null : result;
}
