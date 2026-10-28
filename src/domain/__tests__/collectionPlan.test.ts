import type { Folder, QuizSummary } from '../types';
import { planCollection } from '../collectionPlan';
import { parseImport, type ParsedCollection } from '../parseImport';

const folder = (id: string, name: string, parentId: string | null = null): Folder => ({ id, name, parentId, createdAt: 0 });
const summary = (id: string, sourceHash: string): QuizSummary => ({ id, title: id, folderId: null, questionCount: 1, createdAt: 0, sourceHash });

const q = (text: string) => ({ question: text, options: ['a', 'b'], answer: 'A' });
function collectionOf(body: Record<string, unknown>): ParsedCollection {
  const r = parseImport(JSON.stringify({ schemaVersion: 1, ...body }));
  if (r.kind !== 'collection' || !r.result.ok) throw new Error('bad fixture');
  return r.result.collection;
}

describe('planCollection', () => {
  const c = collectionOf({
    folders: [{ name: 'AÖF', folders: [{ name: 'iktisat', quizzes: [{ title: 'Ara', questions: [q('1')] }] }, { name: 'Hukuk' }] }],
    quizzes: [{ title: 'Genel', questions: [q('2')] }, { title: 'Bozuk', questions: [] }, { title: 'Genel kopya', questions: [q('2')] }],
  });

  it('reuses existing folders by name (case-insensitive) under the target and marks the rest new', () => {
    const existing = [folder('t', 'Target'), folder('a', 'AÖF', 't'), folder('i', 'İKTİSAT', 'a')];
    const plan = planCollection(existing, [], 't', c);
    expect(plan.folders.map((f) => [f.path.join('/'), f.status])).toEqual([
      ['AÖF', 'existing'],
      ['AÖF/iktisat', 'existing'],
      ['AÖF/Hukuk', 'new'],
    ]);
  });

  it('only matches folders under the chosen target', () => {
    const existing = [folder('a', 'AÖF', null)];
    const plan = planCollection(existing, [], 'elsewhere', c);
    expect(plan.folders[0].status).toBe('new');
  });

  it('skips quizzes already in the library, repeated in the batch, or invalid', () => {
    const genel = c.entries[1].result;
    if (!genel.ok) throw new Error('fixture');
    const plan = planCollection([], [summary('old', 'nope')], null, c);
    expect(plan.quizzes.map((x) => [x.entry.title, x.status])).toEqual([
      ['Ara', 'new'],
      ['Genel', 'new'],
      ['Bozuk', 'invalid'],
      ['Genel kopya', 'new'],
    ]);
    const withExisting = planCollection([], [summary('old', genel.quiz.sourceHash)], null, c);
    expect(withExisting.quizzes[1].status).toBe('duplicate');
  });

  it('marks a repeat of the same quiz inside the batch as duplicate', () => {
    const twice = collectionOf({ quizzes: [{ title: 'Same', questions: [q('x')] }, { title: 'Same', questions: [q('x')] }] });
    expect(planCollection([], [], null, twice).quizzes.map((x) => x.status)).toEqual(['new', 'duplicate']);
  });

  it('counts what will be saved', () => {
    const plan = planCollection([folder('a', 'AÖF')], [], null, c);
    expect(plan.counts).toEqual({ newFolders: 2, newQuizzes: 3, duplicates: 0, invalid: 1, questions: 3 });
  });
});
