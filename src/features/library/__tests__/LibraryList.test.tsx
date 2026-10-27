import '@/test/mockUi';

import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Folder, QuizSummary } from '@/domain/types';

import { LibraryList, type LibraryListProps } from '../LibraryList';

const noop = () => {};
function props(over: Partial<LibraryListProps> = {}): LibraryListProps {
  return {
    folders: [],
    quizzes: [],
    itemCounts: {},
    resume: null,
    isRoot: true,
    onOpenFolder: noop,
    onOpenQuiz: noop,
    onFolderActions: noop,
    onQuizActions: noop,
    onImport: noop,
    onResume: noop,
    onDiscard: noop,
    ...over,
  };
}

describe('LibraryList', () => {
  it('shows the empty state with an import button', async () => {
    const onImport = jest.fn();
    await render(<LibraryList {...props({ onImport })} />);
    expect(screen.getByText('No quizzes yet')).toBeTruthy();
    await fireEvent.press(screen.getByText('Import quiz'));
    expect(onImport).toHaveBeenCalled();
  });

  it('renders folders in the order given and opens one on press', async () => {
    const onOpenFolder = jest.fn();
    const folders: Folder[] = ['ankara', 'Iğdır', 'İzmir'].map((name, i) => ({ id: String(i), name, parentId: null, createdAt: 0 }));
    await render(<LibraryList {...props({ folders, onOpenFolder })} />);
    const names = screen.getAllByTestId('folder-row').map((r) => r.props.accessibilityLabel);
    expect(names).toEqual(['ankara', 'Iğdır', 'İzmir']);
    await fireEvent.press(screen.getByText('Iğdır'));
    expect(onOpenFolder).toHaveBeenCalledWith('1');
  });

  it('shows a title ending in an emoji in full', async () => {
    const quizzes: QuizSummary[] = [{ id: 'q', title: 'Fizik 🧪', folderId: null, questionCount: 3, createdAt: 0, sourceHash: 'h' }];
    await render(<LibraryList {...props({ quizzes })} />);
    expect(screen.getByText('Fizik 🧪')).toBeTruthy();
    expect(screen.getByText('3 questions')).toBeTruthy();
  });

  it('shows the resume card only when there is a resumable session', async () => {
    const { rerender } = await render(<LibraryList {...props()} />);
    expect(screen.queryByText('Unfinished quiz')).toBeNull();
    const onResume = jest.fn();
    await rerender(<LibraryList {...props({ resume: { answered: 2, total: 5 }, onResume })} />);
    expect(screen.getByText('Unfinished quiz')).toBeTruthy();
    expect(screen.getByText('2 of 5 answered')).toBeTruthy();
    await fireEvent.press(screen.getByText('Resume'));
    expect(onResume).toHaveBeenCalled();
  });

  it('shows the folder empty text inside a folder', async () => {
    await render(<LibraryList {...props({ isRoot: false })} />);
    expect(screen.getByText('This folder is empty')).toBeTruthy();
  });
});
