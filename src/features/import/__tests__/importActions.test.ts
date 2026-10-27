import { makeQuiz } from '@/db/testing/fixtures';
import type { QuizSummary } from '@/domain/types';

import { readPickedFile, saveImport } from '../importActions';

describe('readPickedFile', () => {
  it('reports a cancelled picker and reads nothing', async () => {
    const read = jest.fn();
    const r = await readPickedFile(async () => ({ canceled: true, assets: null }), read);
    expect(r).toEqual({ kind: 'cancelled' });
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects a file over 10 MB before reading it', async () => {
    const read = jest.fn();
    const r = await readPickedFile(
      async () => ({ canceled: false, assets: [{ uri: 'file://a.json', size: 10 * 1024 * 1024 + 1 }] }),
      read,
    );
    expect(r).toEqual({ kind: 'too-large' });
    expect(read).not.toHaveBeenCalled();
  });

  it('returns the text of a picked file', async () => {
    const r = await readPickedFile(async () => ({ canceled: false, assets: [{ uri: 'file://a.json', size: 10 }] }), async () => '{"a":1}');
    expect(r).toEqual({ kind: 'ok', text: '{"a":1}' });
  });

  it('reports a read failure', async () => {
    const r = await readPickedFile(
      async () => ({ canceled: false, assets: [{ uri: 'file://a.json', size: 10 }] }),
      async () => {
        throw new Error('nope');
      },
    );
    expect(r).toEqual({ kind: 'error' });
  });
});

describe('saveImport', () => {
  const existing = { id: 'old', title: 'Old' } as QuizSummary;

  it('saves when there is no duplicate', async () => {
    const importQuiz = jest.fn(async () => existing);
    const confirm = jest.fn();
    const r = await saveImport({ quiz: makeQuiz(), folderId: null, findQuizByHash: async () => null, importQuiz, confirmDuplicate: confirm });
    expect(r).toBe('saved');
    expect(importQuiz).toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before importing a duplicate and stops if declined', async () => {
    const importQuiz = jest.fn(async () => existing);
    const confirm = jest.fn(async () => false);
    const r = await saveImport({ quiz: makeQuiz(), folderId: null, findQuizByHash: async () => existing, importQuiz, confirmDuplicate: confirm });
    expect(r).toBe('cancelled');
    expect(confirm).toHaveBeenCalledWith(existing);
    expect(importQuiz).not.toHaveBeenCalled();
  });

  it('imports a duplicate when confirmed', async () => {
    const importQuiz = jest.fn(async () => existing);
    const r = await saveImport({
      quiz: makeQuiz(),
      folderId: 'f',
      findQuizByHash: async () => existing,
      importQuiz,
      confirmDuplicate: async () => true,
    });
    expect(r).toBe('saved');
    expect(importQuiz).toHaveBeenCalledWith(expect.anything(), 'f');
  });
});
