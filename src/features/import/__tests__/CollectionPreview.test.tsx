import '@/test/mockUi';
import '@/test/mockWebView';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { planCollection } from '@/domain/collectionPlan';
import { parseImport } from '@/domain/parseImport';
import type { Folder, QuizSummary } from '@/domain/types';

import { ImportPanel, type ImportPanelProps } from '../ImportPanel';

const noop = () => {};
const q = (t: string, over = {}) => ({ question: t, options: ['a', 'b'], answer: 'A', ...over });

const RAW = JSON.stringify({
  schemaVersion: 1,
  folders: [
    {
      name: 'AÖF',
      folders: [{ name: 'İktisat', quizzes: [{ title: 'Ara Sınav', questions: [q('1'), q('2')] }] }],
    },
  ],
  quizzes: [
    { title: 'Genel', questions: [q('3')] },
    { title: 'Bozuk', questions: [q('4', { answer: 'F' })] },
  ],
});

function props(existing: { folders?: Folder[]; quizzes?: QuizSummary[] } = {}, over: Partial<ImportPanelProps> = {}): ImportPanelProps {
  const outcome = parseImport(RAW);
  if (outcome.kind !== 'collection' || !outcome.result.ok) throw new Error('fixture');
  return {
    text: RAW,
    outcome,
    plan: planCollection(existing.folders ?? [], existing.quizzes ?? [], null, outcome.result.collection),
    onShowPrompts: noop,
    folderLabel: 'Library (top level)',
    saving: false,
    onChangeText: noop,
    onClear: noop,
    onPaste: noop,
    onPickFile: noop,
    onCopyPrompt: noop,
    onChooseFolder: noop,
    onSave: noop,
    ...over,
  };
}

describe('ImportPanel with a collection', () => {
  it('summarizes the folders, quizzes and questions', async () => {
    await render(<ImportPanel {...props()} />);
    expect(screen.getByText('2 folders · 3 quizzes · 3 questions')).toBeTruthy();
  });

  it('shows the folder tree with what is new and what already exists', async () => {
    const existing: Folder[] = [{ id: 'a', name: 'aöf', parentId: null, createdAt: 0 }];
    await render(<ImportPanel {...props({ folders: existing })} />);
    expect(screen.getByText('AÖF · will be added to the existing folder')).toBeTruthy();
    expect(screen.getByText('İktisat · new')).toBeTruthy();
    expect(screen.getByText('Ara Sınav · 2 questions')).toBeTruthy();
  });

  it('marks broken and already-imported quizzes as skipped and explains the errors', async () => {
    const first = parseImport(RAW);
    if (first.kind !== 'collection' || !first.result.ok || !first.result.collection.entries[1].result.ok) throw new Error('fixture');
    const genelHash = first.result.collection.entries[1].result.quiz.sourceHash;
    const existing: QuizSummary[] = [{ id: 'g', title: 'Genel', folderId: null, questionCount: 1, createdAt: 0, sourceHash: genelHash }];
    await render(<ImportPanel {...props({ quizzes: existing })} />);
    expect(screen.getByText('Genel · already in your library, will be skipped')).toBeTruthy();
    expect(screen.getByText('Bozuk · has errors, will be skipped')).toBeTruthy();
    expect(screen.getByText('Question 1: the answer is “F” but there are only 2 options.')).toBeTruthy();
  });

  it('saves only the new quizzes', async () => {
    const onSave = jest.fn();
    await render(<ImportPanel {...props({}, { onSave })} />);
    await fireEvent.press(screen.getByText('Save 2 quizzes'));
    expect(onSave).toHaveBeenCalled();
  });

  it('says when there is nothing new to save', async () => {
    const outcome = parseImport(JSON.stringify({ schemaVersion: 1, quizzes: [{ title: 'Bozuk', questions: [] }] }));
    if (outcome.kind !== 'collection' || !outcome.result.ok) throw new Error('fixture');
    const plan = planCollection([], [], null, outcome.result.collection);
    await render(<ImportPanel {...props({}, { outcome, plan })} />);
    expect(screen.getByText('There is no new quiz to save.')).toBeTruthy();
    expect(screen.queryByText(/^Save \d/)).toBeNull();
  });

  it('shows a collection that cannot be read as an error', async () => {
    const outcome = parseImport(JSON.stringify({ schemaVersion: 1, folders: [{ name: 'Empty' }] }));
    await render(<ImportPanel {...props({}, { outcome, plan: null })} />);
    expect(screen.getByText("We couldn't import this")).toBeTruthy();
    expect(screen.getByText('This file contains no quizzes.')).toBeTruthy();
  });
});
