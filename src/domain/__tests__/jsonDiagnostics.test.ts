import { errorContext, findJsonError, repairInnerQuotes } from '../jsonDiagnostics';

// The real line from an LLM-generated AÖF quiz: a quotation inside the question text.
const INNER = '{"question": ""Örgütün attığı adımlar" olarak tanımlanan kavram?", "answer": "A"}';

describe('findJsonError', () => {
  it('returns null for valid JSON', () => {
    expect(findJsonError('{"a": [1, 2.5e3, true, null, "x\\"y"], "b": {}}')).toBeNull();
  });

  it('accepts LaTeX backslashes the repair step will fix later', () => {
    expect(findJsonError('{"a": "$\\frac{1}{2}$"}')).toBeNull();
  });

  it('points at a quotation mark inside a text', () => {
    const e = findJsonError(INNER)!;
    expect(e.hint).toBe('inner_quote');
    expect(INNER[e.index]).toBe('Ö');
  });

  it('spots a trailing comma', () => {
    const json = '{"a": [1, 2,], "b": 1}';
    const e = findJsonError(json)!;
    expect(e.hint).toBe('trailing_comma');
    expect(json[e.index]).toBe(']');
  });

  it('spots a missing comma between two values', () => {
    const json = '{"a": "x"\n "b": 1}';
    const e = findJsonError(json)!;
    expect(e.hint).toBe('missing_comma');
    expect(json[e.index]).toBe('"');
  });

  it('spots output that stops early', () => {
    const json = '{"questions": [{"question": "a"';
    expect(findJsonError(json)).toEqual({ index: json.length, hint: 'truncated' });
  });
});

describe('repairInnerQuotes', () => {
  it('turns quotation marks inside a text into typographic quotes', () => {
    const r = repairInnerQuotes(INNER);
    expect(r.fixed).toBe(2);
    expect(JSON.parse(r.json).question).toBe('“Örgütün attığı adımlar” olarak tanımlanan kavram?');
  });

  it('leaves valid JSON untouched', () => {
    const json = '{"a": "plain \\"escaped\\" text", "b": ["x", "y"]}';
    expect(repairInnerQuotes(json)).toEqual({ json, fixed: 0 });
  });
});

describe('errorContext', () => {
  it('names the question number and field around a position', () => {
    const json = '{"questions": [{"question": "a", "options": ["x"]}, {"question": "b", "explanation": "oops here"}]}';
    expect(errorContext(json, json.indexOf('oops'))).toEqual({ question: 2, field: 'explanation' });
  });

  it('returns nothing before the first question', () => {
    expect(errorContext('{"title": "x"}', 5)).toEqual({});
  });
});
