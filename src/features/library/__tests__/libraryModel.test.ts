import type { Folder, QuizSummary } from '@/domain/types';

import { childrenOf, moveTargets } from '../libraryModel';

const folder = (id: string, name: string, parentId: string | null = null): Folder => ({ id, name, parentId, createdAt: 0 });
const quiz = (id: string, title: string, folderId: string | null = null): QuizSummary => ({
  id,
  title,
  folderId,
  questionCount: 1,
  createdAt: 0,
  sourceHash: id,
});

describe('childrenOf', () => {
  it('returns the direct children of a folder, sorted in Turkish order', () => {
    const folders = [folder('1', 'İzmir'), folder('2', 'Iğdır'), folder('3', 'ankara'), folder('4', 'inner', '1')];
    const quizzes = [quiz('a', 'Zeta'), quiz('b', 'çay'), quiz('c', 'inside', '1')];
    const root = childrenOf(folders, quizzes, null);
    expect(root.folders.map((f) => f.name)).toEqual(['ankara', 'Iğdır', 'İzmir']);
    expect(root.quizzes.map((q) => q.title)).toEqual(['çay', 'Zeta']);
    expect(childrenOf(folders, quizzes, '1').folders.map((f) => f.name)).toEqual(['inner']);
    expect(childrenOf(folders, quizzes, '1').quizzes.map((q) => q.title)).toEqual(['inside']);
  });
});

describe('moveTargets', () => {
  const folders = [folder('a', 'A'), folder('b', 'B', 'a'), folder('c', 'C', 'b'), folder('d', 'D')];

  it('hides the folder itself and its descendants when moving a folder', () => {
    expect(moveTargets(folders, { kind: 'folder', id: 'a' }).map((t) => t.folder.id)).toEqual(['d']);
  });

  it('offers every folder with its depth when moving a quiz', () => {
    expect(moveTargets(folders, { kind: 'quiz', id: 'q' }).map((t) => [t.folder.id, t.depth])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
      ['d', 0],
    ]);
  });
});
