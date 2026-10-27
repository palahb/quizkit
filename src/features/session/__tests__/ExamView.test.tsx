import '@/test/mockUi';
import '@/test/mockWebView';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { translate } from '@/i18n';
import type { Question } from '@/domain/types';

import { needsSubmitConfirm, submitMessage, unansweredCount } from '../examModel';
import { QuestionView } from '../QuestionView';

const question: Question = {
  id: 'q1',
  text: 'Which?',
  options: [
    { id: 'a', text: 'alpha' },
    { id: 'b', text: 'beta' },
  ],
  correctOptionId: 'a',
  explanation: 'Because alpha.',
};
const en = (k: string, p?: Record<string, string | number>) => translate('en', k, p);

describe('QuestionView (exam)', () => {
  it('shows the selection without revealing the answer or explanation', async () => {
    await render(<QuestionView question={question} mode="exam" pickedOptionId="b" onPick={() => {}} />);
    expect(screen.getByLabelText('Option B, selected: beta')).toBeTruthy();
    expect(screen.getByLabelText('Option A: alpha')).toBeTruthy();
    expect(screen.queryByText('Because alpha.')).toBeNull();
  });

  it('lets the user change the answer', async () => {
    const onPick = jest.fn();
    await render(<QuestionView question={question} mode="exam" pickedOptionId="b" onPick={onPick} />);
    await fireEvent.press(screen.getByText('alpha'));
    await fireEvent.press(screen.getByText('beta'));
    expect(onPick.mock.calls).toEqual([['a'], ['b']]);
  });
});

describe('submit confirmation', () => {
  it('counts unanswered questions', () => {
    expect(unansweredCount(['q1', 'q2', 'q3'], { q2: 'x' })).toBe(2);
  });
  it('states the total when nothing is answered', () => {
    expect(submitMessage(en, unansweredCount(['q1', 'q2', 'q3', 'q4'], {}))).toBe('4 questions are unanswered and will count as wrong.');
  });
  it('says when everything is answered', () => {
    expect(submitMessage(en, 0)).toBe('All questions are answered.');
  });
});

describe('needsSubmitConfirm', () => {
  it('always confirms in exam mode', () => {
    expect(needsSubmitConfirm('exam', 0)).toBe(true);
  });
  it('confirms in practice mode when questions are unanswered (e.g. a double tap landed on Finish)', () => {
    expect(needsSubmitConfirm('practice', 1)).toBe(true);
  });
  it('finishes practice directly when everything is answered', () => {
    expect(needsSubmitConfirm('practice', 0)).toBe(false);
  });
});
