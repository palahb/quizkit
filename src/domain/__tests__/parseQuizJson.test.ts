import { parseQuizJson } from '../parseQuizJson';
import type { ImportResult } from '../types';

const q = (over: Record<string, unknown> = {}) => ({
  question: 'Which is right?',
  options: ['one', 'two', 'three', 'four', 'five'],
  answer: 'B',
  ...over,
});
const quiz = (questions: unknown[], over: Record<string, unknown> = {}) =>
  JSON.stringify({ schemaVersion: 1, title: 'Test quiz', questions, ...over });

function ok(r: ImportResult) {
  if (!r.ok) throw new Error(`expected ok, got ${r.kind}: ${JSON.stringify(r.issues)}`);
  return r;
}
function fail(r: ImportResult) {
  if (r.ok) throw new Error('expected failure');
  return r;
}
const codes = (r: ImportResult) => fail(r).issues.map((i) => i.code);
const warningCodes = (r: ImportResult) => ok(r).warnings.map((w) => w.code);

describe('parseQuizJson: success', () => {
  it('parses a minimal quiz and resolves a lower-case answer letter', () => {
    const r = ok(parseQuizJson(quiz([q({ answer: 'b' })])));
    const question = r.quiz.questions[0];
    expect(question.options).toHaveLength(5);
    expect(question.correctOptionId).toBe(question.options[1].id);
    expect(question.options[1].text).toBe('two');
  });

  it('trims strings', () => {
    const r = ok(parseQuizJson(quiz([q({ question: '  Hi  ' })], { title: '  T  ' })));
    expect(r.quiz.title).toBe('T');
    expect(r.quiz.questions[0].text).toBe('Hi');
  });

  it('strips unknown fields', () => {
    const r = ok(parseQuizJson(quiz([q({ extra: 1 })])));
    expect('extra' in r.quiz.questions[0]).toBe(false);
  });

  it('keeps explanation and tags', () => {
    const r = ok(parseQuizJson(quiz([q({ explanation: 'Because', tags: ['t1'] })])));
    expect(r.quiz.questions[0].explanation).toBe('Because');
    expect(r.quiz.questions[0].tags).toEqual(['t1']);
  });

  it('accepts fenced JSON wrapped in prose', () => {
    const raw = 'Sure! Here is your quiz:\n```json\n' + quiz([q()]) + '\n```\nLet me know if you need more.';
    expect(parseQuizJson(raw).ok).toBe(true);
  });

  it('produces the same sourceHash for the same input', () => {
    const a = ok(parseQuizJson(quiz([q()])));
    const b = ok(parseQuizJson(quiz([q()])));
    expect(a.quiz.sourceHash).toBe(b.quiz.sourceHash);
  });

  it('changes the sourceHash when an option changes', () => {
    const a = ok(parseQuizJson(quiz([q()])));
    const b = ok(parseQuizJson(quiz([q({ options: ['one', 'TWO', 'three', 'four', 'five'] })])));
    expect(a.quiz.sourceHash).not.toBe(b.quiz.sourceHash);
  });
});

describe('parseQuizJson: fatal input problems', () => {
  it('rejects empty input', () => {
    expect(fail(parseQuizJson('   ')).kind).toBe('empty');
  });

  it('rejects input over 10 MB', () => {
    const r = fail(parseQuizJson('x'.repeat(10 * 1024 * 1024 + 1)));
    expect(r.kind).toBe('too-large');
    expect(r.issues[0].params).toEqual({ maxMb: 10 });
  });

  it('rejects text with NUL characters as not UTF-8', () => {
    expect(fail(parseQuizJson('\u0000{}')).kind).toBe('not-utf8');
  });

  it('rejects a top-level array', () => {
    expect(fail(parseQuizJson('[1,2]')).kind).toBe('wrong-shape');
  });

  it('reports a trailing comma with a position', () => {
    const r = fail(parseQuizJson('{"schemaVersion":1,"title":"T","questions":[],}'));
    expect(r.kind).toBe('syntax');
    expect(r.issues[0].params.hint).toBe('trailing_comma');
    expect(r.issues[0].params.line).toBe(1);
    expect(typeof r.issues[0].params.column).toBe('number');
  });

  it('reports truncated output', () => {
    const r = fail(parseQuizJson('{"schemaVersion":1,"questions":[{"question":"a"'));
    expect(r.kind).toBe('syntax');
    expect(r.issues[0].params.hint).toBe('truncated');
  });
});

describe('parseQuizJson: schema problems', () => {
  it('reports an answer letter outside the options with the question number', () => {
    const questions = Array.from({ length: 12 }, () => q());
    questions[11] = q({ options: ['a', 'b', 'c', 'd'], answer: 'F' });
    const r = fail(parseQuizJson(quiz(questions)));
    expect(r.kind).toBe('schema');
    expect(r.issues).toContainEqual({
      code: 'answer_out_of_range',
      params: { question: 12, answer: 'F', optionCount: 4 },
    });
  });

  it('rejects an unsupported schemaVersion', () => {
    expect(codes(parseQuizJson(quiz([q()], { schemaVersion: 2 })))).toContain('schema_version_unsupported');
  });

  it('rejects a 121-char title', () => {
    expect(codes(parseQuizJson(quiz([q()], { title: 'x'.repeat(121) })))).toContain('title_invalid');
  });

  it('rejects zero questions', () => {
    expect(codes(parseQuizJson(quiz([])))).toContain('questions_count');
  });

  it('rejects 5001 questions', () => {
    const many = Array.from({ length: 5001 }, () => q());
    expect(codes(parseQuizJson(quiz(many)))).toContain('questions_count');
  });

  it('rejects 7 options', () => {
    expect(codes(parseQuizJson(quiz([q({ options: ['1', '2', '3', '4', '5', '6', '7'] })])))).toContain('options_count');
  });

  it('rejects a number as an option', () => {
    expect(codes(parseQuizJson(quiz([q({ options: ['a', 2, 'c'] })])))).toContain('option_not_string');
  });

  it('rejects a missing question text', () => {
    expect(codes(parseQuizJson(quiz([q({ question: '  ' })])))).toContain('question_text_missing');
  });

  it('rejects an invalid answer value', () => {
    expect(codes(parseQuizJson(quiz([q({ answer: 2 })])))).toContain('answer_invalid');
  });

  it('rejects duplicate ids', () => {
    expect(codes(parseQuizJson(quiz([q({ id: 'x' }), q({ id: 'x' })])))).toContain('duplicate_id');
  });

  it('caps the reported issues at 10 and counts the rest', () => {
    const broken = Array.from({ length: 15 }, () => q({ answer: 'Z' }));
    const r = fail(parseQuizJson(quiz(broken)));
    expect(r.issues).toHaveLength(10);
    expect(r.moreCount).toBe(5);
  });
});

describe('parseQuizJson: repairs and warnings', () => {
  it('repairs a single-backslash \\frac and warns', () => {
    const raw = '{"schemaVersion":1,"title":"T","questions":[{"question":"$\\frac{1}{2}$ = ?","options":["a","b"],"answer":"A"}]}';
    const r = ok(parseQuizJson(raw));
    expect(r.quiz.questions[0].text).toBe('$\\frac{1}{2}$ = ?');
    expect(warningCodes(parseQuizJson(raw))).toContain('backslashes_repaired');
  });

  it('warns about a lone dollar', () => {
    expect(warningCodes(parseQuizJson(quiz([q({ question: 'a $ b' })])))).toContain('odd_dollar');
  });

  it('warns about math KaTeX cannot parse', () => {
    expect(warningCodes(parseQuizJson(quiz([q({ question: 'What is $\\frac{$?' })])))).toContain('math_unparseable');
  });

  it('warns about duplicate options', () => {
    expect(warningCodes(parseQuizJson(quiz([q({ options: ['a', 'a', 'b'] })])))).toContain('duplicate_option');
  });

  it('warns about duplicate questions', () => {
    expect(warningCodes(parseQuizJson(quiz([q(), q()])))).toContain('duplicate_question');
  });

  it('warns about and strips images', () => {
    const r = ok(parseQuizJson(quiz([q({ image: 'x.png' })])));
    expect(r.warnings).toContainEqual({ code: 'images_unsupported', params: { count: 1 } });
    expect('image' in r.quiz.questions[0]).toBe(false);
  });

  it('gives a clean quiz no warnings', () => {
    expect(ok(parseQuizJson(quiz([q()]))).warnings).toEqual([]);
  });
});
