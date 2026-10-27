// Cleans up LLM-produced quiz JSON before and after JSON.parse.
// All scanners here are single-pass state machines that track whether we are
// inside a JSON string literal, so braces/quotes inside text are never misread.

const SMART_DOUBLE = new Set(['“', '”', '„', '‟']);
const SMART_SINGLE = new Set(['‘', '’']);
const VALID_ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
const HEX4 = /^[0-9a-fA-F]{4}$/;

/** Returns the end index (exclusive) of the balanced object starting at `start`, or -1 if it never closes. */
function scanObject(s: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Finds the quiz object inside raw pasted text: strips a BOM, ignores code fences and
 * surrounding prose, and returns the first top-level `{...}` mentioning "questions".
 * A truncated object (never closes) is returned as-is so JSON.parse can report it.
 * Falls back to the first complete object, else null.
 */
export function extractJson(raw: string): string | null {
  const s = raw.replace(/^﻿/, '');
  let firstComplete: string | null = null;
  let i = s.indexOf('{');
  while (i !== -1) {
    const end = scanObject(s, i);
    if (end === -1) {
      // This brace never closes. It may be a stray "{" in text before the JSON, so look for
      // a complete quiz object further on before reporting the tail as truncated.
      const later = s.indexOf('{', i + 1);
      const rest = later === -1 ? null : extractJson(s.slice(later));
      if (rest !== null && rest.includes('"questions"') && scanObject(rest, 0) !== -1) return rest;
      const tail = s.slice(i).trimEnd();
      return tail.includes('"questions"') ? tail : (rest ?? firstComplete);
    }
    const candidate = s.slice(i, end);
    if (candidate.includes('"questions"')) return candidate;
    if (firstComplete === null) firstComplete = candidate;
    i = s.indexOf('{', end);
  }
  return firstComplete;
}

/**
 * Fixes LaTeX backslashes an LLM forgot to double: inside string literals, a `\` that does
 * not start a valid JSON escape becomes `\\`. Also turns smart quotes used as JSON syntax
 * into straight quotes (smart quotes inside text are kept).
 */
export function repairBackslashes(json: string): { json: string; fixed: number } {
  let out = '';
  let fixed = 0;
  let inString = false;
  let openedBySmart = false;
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (!inString) {
      if (c === '"' || SMART_DOUBLE.has(c)) {
        inString = true;
        openedBySmart = c !== '"';
        out += '"';
      } else if (SMART_SINGLE.has(c)) {
        out += "'";
      } else {
        out += c;
      }
      continue;
    }
    if (c === '\\') {
      const next = json[i + 1];
      const isValid =
        next !== undefined && VALID_ESCAPES.has(next) && (next !== 'u' || HEX4.test(json.slice(i + 2, i + 6)));
      if (isValid) {
        out += c + next;
        i++;
      } else {
        out += '\\\\';
        fixed++;
      }
      continue;
    }
    if (c === '"' || (openedBySmart && SMART_DOUBLE.has(c))) {
      inString = false;
      out += '"';
      continue;
    }
    out += c;
  }
  return { json: out, fixed };
}

// LaTeX commands that start with t, n or r: their backslash may have become a tab,
// newline or carriage return during JSON.parse.
const LATEX_AFTER_T = new Set(['times', 'theta', 'tau', 'text', 'textbf', 'textit', 'tan', 'tanh', 'to', 'top', 'triangle', 'tilde', 'tfrac', 'therefore']);
const LATEX_AFTER_N = new Set(['neq', 'ne', 'nu', 'nabla', 'not', 'notin', 'neg', 'nleq', 'ngeq', 'nmid', 'nearrow', 'newline']);
const LATEX_AFTER_R = new Set(['rho', 'right', 'rightarrow', 'rangle', 'rceil', 'rfloor', 'rm', 'root', 'rbrace']);
const CONTROL_TO_LETTER: Record<string, { letter: string; commands: Set<string> }> = {
  '\t': { letter: 't', commands: LATEX_AFTER_T },
  '\n': { letter: 'n', commands: LATEX_AFTER_N },
  '\r': { letter: 'r', commands: LATEX_AFTER_R },
};

/**
 * Index ranges [start, end) inside `$...$` / `$$...$$`, paired the way segment() pairs them
 * for prices: a single `$` directly followed by a digit is a price, not a delimiter, and an
 * unpaired delimiter opens nothing. (Whitespace after `$` is allowed here, because the
 * control characters being repaired are themselves whitespace.)
 */
function mathRanges(s: string): [number, number][] {
  const singles: number[] = [];
  const doubles: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '$' || s[i - 1] === '\\') continue;
    if (s[i + 1] === '$') {
      doubles.push(i);
      i++;
    } else if (!/[0-9]/.test(s[i + 1] ?? '')) {
      singles.push(i);
    }
  }
  const ranges: [number, number][] = [];
  for (let k = 0; k + 1 < doubles.length; k += 2) ranges.push([doubles[k] + 2, doubles[k + 1]]);
  for (let k = 0; k + 1 < singles.length; k += 2) ranges.push([singles[k] + 1, singles[k + 1]]);
  return ranges;
}

function restoreString(s: string): { value: string; fixed: number } {
  if (!/[\u0008\u000c\t\n\r]/.test(s)) return { value: s, fixed: 0 };
  const ranges = mathRanges(s);
  const inMath = (i: number) => ranges.some(([a, b]) => i >= a && i < b);
  let out = '';
  let fixed = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\u000c') {
      out += '\\f';
      fixed++;
      continue;
    }
    if (c === '\u0008') {
      out += '\\b';
      fixed++;
      continue;
    }
    const ctrl = CONTROL_TO_LETTER[c];
    if (ctrl && inMath(i)) {
      const word = /^[a-zA-Z]*/.exec(s.slice(i + 1))![0];
      if (ctrl.commands.has(ctrl.letter + word)) {
        out += '\\' + ctrl.letter;
        fixed++;
        continue;
      }
    }
    out += c;
  }
  return { value: out, fixed };
}

/**
 * After JSON.parse: `\frac` written with one backslash parses as form feed + "rac".
 * Form feed and backspace are restored everywhere (they never occur legitimately);
 * tab/newline/CR only inside `$...$` when followed by a known LaTeX command name.
 */
export function restoreLatexEscapes(value: unknown): { value: unknown; fixed: number } {
  let fixed = 0;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const r = restoreString(v);
      fixed += r.fixed;
      return r.value;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) o[k] = walk(val);
      return o;
    }
    return v;
  };
  return { value: walk(value), fixed };
}
