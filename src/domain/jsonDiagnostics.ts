// Locating and explaining JSON syntax errors ourselves, because the iPhone's JavaScript
// engine (Hermes) reports no position in JSON.parse errors.

export type JsonErrorHint = 'trailing_comma' | 'missing_comma' | 'inner_quote' | 'truncated' | 'missing_quote' | 'unknown';

export interface JsonError {
  index: number;
  hint: JsonErrorHint;
}

const WS = new Set([' ', '\t', '\n', '\r']);
const isWs = (c: string | undefined) => c !== undefined && WS.has(c);

class Fail extends Error {
  constructor(
    public index: number,
    public hint: JsonErrorHint,
  ) {
    super(hint);
  }
}

/**
 * Validates JSON and returns the first error position with a likely cause, or null.
 * Lenient about backslash escapes (LaTeX like \frac is repaired in a later step).
 */
export function findJsonError(text: string): JsonError | null {
  let i = 0;
  const n = text.length;

  const skipWs = () => {
    while (isWs(text[i])) i++;
  };
  const expectMore = () => {
    if (i >= n) throw new Fail(n, 'truncated');
  };

  const parseString = () => {
    i++; // opening quote
    while (i < n) {
      const c = text[i];
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        return;
      }
      if (c === '\n') throw new Fail(i, 'missing_quote');
      i++;
    }
    throw new Fail(n, 'truncated');
  };

  /** After a value inside an object/array, explains whatever stands where `,` or a closer belongs. */
  const afterValue = (valueWasString: boolean): never => {
    const c = text[i];
    if (c === '"') throw new Fail(i, valueWasString && !isWs(text[i - 1]) ? 'inner_quote' : 'missing_comma');
    if (c === '{' || c === '[') throw new Fail(i, 'missing_comma');
    // Text continuing right after a string's closing quote: that quote belonged to the text.
    throw new Fail(i, valueWasString ? 'inner_quote' : 'unknown');
  };

  const parseValue = (): boolean => {
    skipWs();
    expectMore();
    const c = text[i];
    if (c === '{') {
      parseObject();
      return false;
    }
    if (c === '[') {
      parseArray();
      return false;
    }
    if (c === '"') {
      parseString();
      return true;
    }
    const literal = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i, i + 64));
    if (literal) {
      i += literal[0].length;
      return false;
    }
    throw new Fail(i, 'unknown');
  };

  const parseObject = () => {
    i++;
    skipWs();
    expectMore();
    if (text[i] === '}') {
      i++;
      return;
    }
    for (;;) {
      skipWs();
      expectMore();
      if (text[i] !== '"') throw new Fail(i, text[i] === '}' ? 'trailing_comma' : 'missing_quote');
      parseString();
      skipWs();
      expectMore();
      if (text[i] !== ':') throw new Fail(i, text[i] === '"' ? 'inner_quote' : 'unknown');
      i++;
      const wasString = parseValue();
      skipWs();
      expectMore();
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === '}') {
        i++;
        return;
      }
      afterValue(wasString);
    }
  };

  const parseArray = () => {
    i++;
    skipWs();
    expectMore();
    if (text[i] === ']') {
      i++;
      return;
    }
    for (;;) {
      skipWs();
      expectMore();
      if (text[i] === ']') throw new Fail(i, 'trailing_comma');
      const wasString = parseValue();
      skipWs();
      expectMore();
      if (text[i] === ',') {
        i++;
        continue;
      }
      if (text[i] === ']') {
        i++;
        return;
      }
      afterValue(wasString);
    }
  };

  try {
    parseValue();
    skipWs();
    return i < n ? { index: i, hint: 'unknown' } : null;
  } catch (e) {
    if (e instanceof Fail) return { index: e.index, hint: e.hint };
    throw e;
  }
}

/**
 * Inside a JSON string, a `"` that is not followed by `,` `}` `]` `:` (or the end) cannot be the
 * end of the string: it is a quotation mark the AI forgot to escape. It becomes “ or ”.
 * Only meant for text that already failed to parse.
 */
export function repairInnerQuotes(json: string): { json: string; fixed: number } {
  let out = '';
  let fixed = 0;
  let inString = false;
  let openQuote = false; // inner quotes alternate: “ then ”
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (!inString) {
      if (c === '"') {
        inString = true;
        openQuote = false;
      }
      out += c;
      continue;
    }
    if (c === '\\') {
      out += c + (json[i + 1] ?? '');
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (isWs(json[j])) j++;
      const next = json[j];
      const closes = next === undefined || next === ',' || next === '}' || next === ']' || next === ':';
      if (closes) {
        inString = false;
        out += c;
        continue;
      }
      openQuote = !openQuote;
      out += openQuote ? '“' : '”';
      fixed++;
      continue;
    }
    out += c;
  }
  return { json: out, fixed };
}

/** Which question (1-based, by counting "question" keys) and which key the position falls in. */
export function errorContext(json: string, index: number): { question?: number; field?: string } {
  const stack: ('{' | '[')[] = [];
  let lastKey: string | undefined;
  let question = 0;
  let prevSignificant = '';
  for (let i = 0; i < Math.min(index, json.length); i++) {
    const c = json[i];
    if (c === '"') {
      const start = i + 1;
      i++;
      while (i < json.length && json[i] !== '"') i += json[i] === '\\' ? 2 : 1;
      const isKey = stack[stack.length - 1] === '{' && (prevSignificant === '{' || prevSignificant === ',');
      if (isKey && i <= index) {
        lastKey = json.slice(start, i);
        if (lastKey === 'question') question++;
      }
      prevSignificant = '"';
      continue;
    }
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
    if (!isWs(c)) prevSignificant = c;
  }
  return question > 0 ? { question, field: lastKey } : {};
}
