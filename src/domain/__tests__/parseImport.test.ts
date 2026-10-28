import { parseImport } from '../parseImport';

const q = (text = 'Q?', over: Record<string, unknown> = {}) => ({ question: text, options: ['a', 'b'], answer: 'A', ...over });
const quiz = (title: string, questions = [q()]) => ({ title, questions });
const collection = (body: Record<string, unknown>) => JSON.stringify({ schemaVersion: 1, ...body });

function okCollection(raw: string) {
  const r = parseImport(raw);
  if (r.kind !== 'collection' || !r.result.ok) throw new Error(`expected a valid collection, got ${JSON.stringify(r)}`);
  return r.result.collection;
}
function failedCollection(raw: string) {
  const r = parseImport(raw);
  if (r.kind !== 'collection' || r.result.ok) throw new Error(`expected a failed collection, got ${JSON.stringify(r)}`);
  return r.result;
}

describe('parseImport: telling formats apart', () => {
  it('treats an object with questions as a single quiz', () => {
    const r = parseImport(JSON.stringify({ schemaVersion: 1, ...quiz('Solo') }));
    expect(r.kind).toBe('quiz');
    expect(r.result.ok).toBe(true);
  });

  it('treats an object with folders or quizzes as a collection', () => {
    expect(parseImport(collection({ quizzes: [quiz('A')] })).kind).toBe('collection');
    expect(parseImport(collection({ folders: [{ name: 'F', quizzes: [quiz('A')] }] })).kind).toBe('collection');
  });

  it('passes text-level failures through unchanged', () => {
    const r = parseImport('{"schemaVersion":1,"quizzes":[,]}');
    expect(r.result.ok).toBe(false);
    if (!r.result.ok) expect(r.result.kind).toBe('syntax');
  });
});

describe('parseImport: collections', () => {
  it('flattens nested folders into paths and keeps top-level quizzes', () => {
    const c = okCollection(
      collection({
        folders: [{ name: 'AÖF 2023', folders: [{ name: 'İktisat', quizzes: [quiz('Ara Sınav'), quiz('Final')] }] }],
        quizzes: [quiz('Genel Tekrar')],
      }),
    );
    expect(c.folderPaths).toEqual([['AÖF 2023'], ['AÖF 2023', 'İktisat']]);
    expect(c.entries.map((e) => [e.path, e.title])).toEqual([
      [['AÖF 2023', 'İktisat'], 'Ara Sınav'],
      [['AÖF 2023', 'İktisat'], 'Final'],
      [[], 'Genel Tekrar'],
    ]);
    expect(c.entries.every((e) => e.result.ok)).toBe(true);
  });

  it('keeps empty folders so the structure can be created', () => {
    const c = okCollection(collection({ folders: [{ name: 'Empty' }], quizzes: [quiz('A')] }));
    expect(c.folderPaths).toEqual([['Empty']]);
  });

  it('merges sibling folders with the same name', () => {
    const c = okCollection(
      collection({ folders: [{ name: 'Math', quizzes: [quiz('A')] }, { name: ' Math ', quizzes: [quiz('B')] }] }),
    );
    expect(c.folderPaths).toEqual([['Math']]);
    expect(c.entries.map((e) => e.path)).toEqual([['Math'], ['Math']]);
  });

  it('marks only the broken quiz as failed, with question numbers inside that quiz', () => {
    const c = okCollection(
      collection({ quizzes: [quiz('Good'), quiz('Bad', [q(), q('Q2', { answer: 'F' })]), quiz('Also good')] }),
    );
    expect(c.entries.map((e) => e.result.ok)).toEqual([true, false, true]);
    const bad = c.entries[1].result;
    if (bad.ok) throw new Error('expected failure');
    expect(bad.issues).toContainEqual({ code: 'answer_out_of_range', params: { question: 2, answer: 'F', optionCount: 2 } });
    expect(c.entries[1].title).toBe('Bad');
  });

  it('does not require schemaVersion on quizzes inside a collection', () => {
    const c = okCollection(collection({ quizzes: [{ title: 'No version', questions: [q()] }] }));
    expect(c.entries[0].result.ok).toBe(true);
  });

  it('names an untitled broken quiz by its position', () => {
    const c = okCollection(collection({ quizzes: [quiz('A'), { questions: [q()] }] }));
    expect(c.entries[1].title).toBe('#2');
    expect(c.entries[1].result.ok).toBe(false);
  });

  it('reports repairs once for the whole collection', () => {
    const raw = '{"schemaVersion":1,"quizzes":[{"title":"T","questions":[{"question":"$\\frac{1}{2}$?","options":["a","b"],"answer":"A"}]}]}';
    const c = okCollection(raw);
    expect(c.warnings.map((w) => w.code)).toContain('backslashes_repaired');
    expect(c.entries[0].result.ok && c.entries[0].result.quiz.questions[0].text).toBe('$\\frac{1}{2}$?');
  });

  it('rejects an unsupported schemaVersion', () => {
    expect(failedCollection(JSON.stringify({ schemaVersion: 2, quizzes: [quiz('A')] })).issues[0].code).toBe('schema_version_unsupported');
  });

  it('rejects a folder without a name, naming where it is', () => {
    const r = failedCollection(collection({ folders: [{ name: 'Top', folders: [{ name: '  ', quizzes: [quiz('A')] }] }] }));
    expect(r.issues[0]).toEqual({ code: 'folder_name_invalid', params: { path: 'Top / #1' } });
  });

  it('rejects a collection without any quiz', () => {
    expect(failedCollection(collection({ folders: [{ name: 'Empty' }] })).issues[0].code).toBe('collection_empty');
  });

  it('rejects folders nested deeper than 8 levels', () => {
    let folder: Record<string, unknown> = { name: 'L9', quizzes: [quiz('Deep')] };
    for (let i = 8; i >= 1; i--) folder = { name: `L${i}`, folders: [folder] };
    expect(failedCollection(collection({ folders: [folder] })).issues[0]).toEqual({ code: 'folders_too_deep', params: { max: 8 } });
  });

  it('rejects more than 500 quizzes', () => {
    const many = Array.from({ length: 501 }, (_, i) => quiz(`Q${i}`));
    expect(failedCollection(collection({ quizzes: many })).issues[0]).toEqual({
      code: 'collection_too_many',
      params: { max: 500, count: 501 },
    });
  });
});
