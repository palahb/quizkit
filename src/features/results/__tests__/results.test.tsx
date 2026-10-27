import '@/test/mockUi';
import '@/test/mockWebView';

import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Attempt, AttemptSummary, Question } from '@/domain/types';

import { HistoryList } from '../HistoryList';
import { ResultsView, type ResultsViewProps } from '../ResultsView';
import { ReviewView } from '../ReviewView';

function q(id: string, text: string): Question {
  return {
    id,
    text,
    options: [
      { id: `${id}a`, text: `${text} right` },
      { id: `${id}b`, text: `${text} wrong` },
    ],
    correctOptionId: `${id}a`,
    explanation: `${text} explained`,
  };
}

function attempt(answers: Record<string, string>): Attempt {
  const questions = [q('1', 'One'), q('2', 'Two'), q('3', 'Three')];
  const correctCount = questions.filter((x) => answers[x.id] === x.correctOptionId).length;
  return {
    id: 'att',
    quizId: 'quiz',
    title: 'Quiz',
    mode: 'exam',
    scope: { kind: 'quiz', quizId: 'quiz' },
    startedAt: 0,
    finishedAt: 1,
    durationMs: 65_000,
    questions,
    answers,
    correctCount,
    total: 3,
  };
}

const noop = () => {};
function props(a: Attempt, over: Partial<ResultsViewProps> = {}): ResultsViewProps {
  return { attempt: a, onRedoWrong: noop, onRetakeAll: noop, onReview: noop, onBack: noop, ...over };
}

describe('ResultsView', () => {
  it('shows 0 / N and every question as wrong when nothing was answered', async () => {
    await render(<ResultsView {...props(attempt({}))} />);
    expect(screen.getByText('0 / 3')).toBeTruthy();
    expect(screen.getByText('Redo 3 wrong')).toBeTruthy();
    expect(screen.getAllByText(/^Question \d$/)).toHaveLength(3);
  });

  it('lists the wrong question numbers and the time', async () => {
    await render(<ResultsView {...props(attempt({ 1: '1a', 2: '2b' }))} />);
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByText('Time: 1:05')).toBeTruthy();
    expect(screen.getByText('Question 2')).toBeTruthy();
    expect(screen.getByText('Question 3')).toBeTruthy();
    expect(screen.queryByText('Question 1')).toBeNull();
  });

  it('hides redo-wrong when everything is correct', async () => {
    await render(<ResultsView {...props(attempt({ 1: '1a', 2: '2a', 3: '3a' }))} />);
    expect(screen.getByText('Everything correct!')).toBeTruthy();
    expect(screen.queryByText(/^Redo/)).toBeNull();
  });

  it('calls the retake handler', async () => {
    const onRetakeAll = jest.fn();
    await render(<ResultsView {...props(attempt({}), { onRetakeAll })} />);
    await fireEvent.press(screen.getByText('Retake all'));
    expect(onRetakeAll).toHaveBeenCalled();
  });
});

describe('ReviewView', () => {
  it('shows the pick, the correct option and the explanation', async () => {
    await render(<ReviewView attempt={attempt({ 1: '1b' })} onlyWrong={false} />);
    expect(screen.getByLabelText('Option B, wrong, your answer: One wrong')).toBeTruthy();
    expect(screen.getByLabelText('Option A, correct: One right')).toBeTruthy();
    expect(screen.getByText('One explained')).toBeTruthy();
  });

  it('filters to wrong questions only', async () => {
    await render(<ReviewView attempt={attempt({ 1: '1a', 2: '2b' })} onlyWrong />);
    expect(screen.queryByText('One')).toBeNull();
    expect(screen.getByText('Two')).toBeTruthy();
    expect(screen.getByText('Three')).toBeTruthy();
    expect(screen.getByText("You didn't answer this question.")).toBeTruthy();
  });
});

describe('HistoryList', () => {
  it('lists attempts in the given order and opens one', async () => {
    const onOpen = jest.fn();
    const items: AttemptSummary[] = [
      { ...attempt({}), id: 'new', title: 'Newer' },
      { ...attempt({}), id: 'old', title: 'Older' },
    ].map(({ questions: _q, answers: _a, ...summary }) => summary);
    await render(<HistoryList items={items} language="en" onOpen={onOpen} />);
    const titles = screen.getAllByTestId('history-row').map((r) => r.props.accessibilityLabel);
    expect(titles[0]).toMatch(/^Newer/);
    expect(titles[1]).toMatch(/^Older/);
    await fireEvent.press(screen.getByText('Older'));
    expect(onOpen).toHaveBeenCalledWith('old');
  });

  it('shows the empty text', async () => {
    await render(<HistoryList items={[]} language="en" onOpen={noop} />);
    expect(screen.getByText('Finished quizzes appear here.')).toBeTruthy();
  });
});
