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
    const candidate = end === -1 ? s.slice(i).trimEnd() : s.slice(i, end);
    if (candidate.includes('"questions"')) return candidate;
    if (end === -1) break;
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

function restoreString(s: string): { value: string; fixed: number } {
  let out = '';
  let fixed = 0;
  let inMath = false;
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
    if (c === '\\' && s[i + 1] === '$') {
      out += '\\$';
      i++;
      continue;
    }
    if (c === '$') {
      if (s[i + 1] === '$') {
        out += '$$';
        i++;
      } else {
        out += '$';
      }
      inMath = !inMath;
      continue;
    }
    const ctrl = CONTROL_TO_LETTER[c];
    if (ctrl && inMath) {
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
