import { extractJson, repairBackslashes, restoreLatexEscapes } from '../normalizeInput';

const FF = '\u000c';
const BS = '\u0008';

describe('extractJson', () => {
  it('pulls the object out of LLM chatter and a code fence', () => {
    const raw = 'Here you go:\n```json\n{"questions":[]}\n```\nEnjoy';
    expect(extractJson(raw)).toBe('{"questions":[]}');
  });

  it('skips an earlier object without a questions key', () => {
    const raw = 'Example: {"a": 1}\nReal one: {"title":"T","questions":[1]}';
    expect(extractJson(raw)).toBe('{"title":"T","questions":[1]}');
  });

  it('is not fooled by braces inside strings', () => {
    const raw = '{"title":"a } b","questions":["{"]}';
    expect(extractJson(raw)).toBe(raw);
  });

  it('returns null when there is no object', () => {
    expect(extractJson('no json here')).toBeNull();
  });

  it('handles a leading BOM', () => {
    expect(extractJson('﻿{"questions":[]}')).toBe('{"questions":[]}');
  });

  it('returns the unterminated tail of a truncated object so the parser can report it', () => {
    expect(extractJson('{"questions":[{"question":"a"')).toBe('{"questions":[{"question":"a"');
  });
});

describe('repairBackslashes', () => {
  it('doubles an invalid escape like \\alpha', () => {
    const r = repairBackslashes('{"a":"\\alpha"}');
    expect(r.fixed).toBe(1);
    expect(JSON.parse(r.json).a).toBe('\\alpha');
  });

  it('doubles \\( and \\)', () => {
    const r = repairBackslashes('{"a":"\\(x\\)"}');
    expect(r.fixed).toBe(2);
    expect(JSON.parse(r.json).a).toBe('\\(x\\)');
  });

  it('doubles \\u not followed by four hex digits (\\underline)', () => {
    const r = repairBackslashes('{"a":"\\underline{x}"}');
    expect(JSON.parse(r.json).a).toBe('\\underline{x}');
  });

  it('leaves valid escapes alone', () => {
    const r = repairBackslashes('{"a":"x\\ny \\u00e7 \\\\ \\""}');
    expect(r.fixed).toBe(0);
    expect(JSON.parse(r.json).a).toBe('x\ny ç \\ "');
  });

  it('converts smart quotes outside strings but keeps them inside', () => {
    const r = repairBackslashes('{“a”: "he said “hi”"}');
    expect(JSON.parse(r.json)).toEqual({ a: 'he said “hi”' });
  });
});

describe('restoreLatexEscapes', () => {
  it('restores \\frac that JSON turned into a form feed', () => {
    const parsed = JSON.parse('{"q":"$\\frac{1}{2}$"}');
    expect(parsed.q).toContain(FF);
    const r = restoreLatexEscapes(parsed);
    expect(r.value).toEqual({ q: '$\\frac{1}{2}$' });
    expect(r.fixed).toBe(1);
  });

  it('restores \\beta from a backspace', () => {
    expect(restoreLatexEscapes({ q: `$${BS}eta$` }).value).toEqual({ q: '$\\beta$' });
  });

  it('restores \\times from a tab inside math', () => {
    expect(restoreLatexEscapes({ q: '$a \times b$' }).value).toEqual({ q: '$a \\times b$' });
  });

  it('restores \\neq from a newline inside math', () => {
    expect(restoreLatexEscapes({ q: '$a \neq b$' }).value).toEqual({ q: '$a \\neq b$' });
  });

  it('keeps a real newline outside math', () => {
    const r = restoreLatexEscapes({ q: 'line1\nline2' });
    expect(r.value).toEqual({ q: 'line1\nline2' });
    expect(r.fixed).toBe(0);
  });

  it('keeps a real tab inside math when no LaTeX command follows', () => {
    expect(restoreLatexEscapes({ q: '$a\t+ b$' }).value).toEqual({ q: '$a\t+ b$' });
  });

  it('walks nested arrays and objects', () => {
    const r = restoreLatexEscapes({ questions: [{ options: [`$${FF}rac12$`] }] });
    expect(r.value).toEqual({ questions: [{ options: ['$\\frac12$'] }] });
  });
});
