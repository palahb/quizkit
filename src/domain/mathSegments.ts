import type { Segment } from './types';

const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);
const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';

/**
 * Splits text into plain text, inline math ($...$) and display math ($$...$$).
 *
 * Inline rule (keeps prices like "$5 and $10" as text): the char after the opening `$`
 * and before the closing `$` must not be whitespace, and the closing `$` must not be
 * followed by a digit. `\$` is a literal dollar. Unmatched `$` stay text and are counted
 * (except a `$` directly followed by a digit, which is treated as a price).
 *
 * Runs in linear time: valid closing positions are collected once up front and consumed
 * with forward-only pointers.
 */
export function segment(text: string): { segments: Segment[]; unmatchedDollars: number } {
  const n = text.length;
  const inlineClosers: number[] = [];
  const displayClosers: number[] = [];
  for (let j = 0; j < n; j++) {
    if (text[j] !== '$' || text[j - 1] === '\\') continue;
    if (text[j + 1] === '$') {
      displayClosers.push(j);
      j++;
      continue;
    }
    if (text[j - 1] !== '$' && !isSpace(text[j - 1]) && !isDigit(text[j + 1])) inlineClosers.push(j);
  }

  const segments: Segment[] = [];
  let buf = '';
  let unmatchedDollars = 0;
  let ip = 0;
  let dp = 0;
  const flush = () => {
    if (buf) segments.push({ kind: 'text', value: buf });
    buf = '';
  };

  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (c === '\\' && text[i + 1] === '$') {
      buf += '$';
      i++;
      continue;
    }
    if (c !== '$') {
      buf += c;
      continue;
    }

    if (text[i + 1] === '$') {
      while (dp < displayClosers.length && displayClosers[dp] < i + 2) dp++;
      if (dp < displayClosers.length) {
        const end = displayClosers[dp];
        flush();
        segments.push({ kind: 'display', value: text.slice(i + 2, end).trim() });
        i = end + 1;
        dp++;
      } else {
        buf += '$$';
        unmatchedDollars++;
        i++;
      }
      continue;
    }

    if (!isSpace(text[i + 1])) {
      while (ip < inlineClosers.length && inlineClosers[ip] <= i + 1) ip++;
      // A closer is only usable if no display delimiter starts before it.
      while (dp < displayClosers.length && displayClosers[dp] < i) dp++;
      const nextDisplay = dp < displayClosers.length ? displayClosers[dp] : Infinity;
      if (ip < inlineClosers.length && inlineClosers[ip] < nextDisplay) {
        const end = inlineClosers[ip];
        flush();
        segments.push({ kind: 'inline', value: text.slice(i + 1, end) });
        i = end;
        ip++;
        continue;
      }
    }
    buf += '$';
    if (!isDigit(text[i + 1])) unmatchedDollars++;
  }
  flush();
  return { segments, unmatchedDollars };
}

export function hasMath(segments: Segment[]): boolean {
  return segments.some((s) => s.kind !== 'text');
}
