import '@/test/mockUi';
import '@/test/mockWebView';

import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Question } from '@/domain/types';

import { QuestionView, type QuestionViewProps } from '../QuestionView';

const question: Question = {
  id: 'q1',
  text: 'Which is right?',
  options: [
    { id: 'a', text: 'alpha' },
    { id: 'b', text: 'beta' },
  ],
  correctOptionId: 'a',
  explanation: 'Because alpha.',
};

function props(over: Partial<QuestionViewProps> = {}): QuestionViewProps {
  return { question, mode: 'practice', pickedOptionId: undefined, onPick: jest.fn(), ...over };
}

describe('QuestionView (practice)', () => {
  it('calls onPick once when an option is pressed twice', async () => {
    const onPick = jest.fn();
    await render(<QuestionView {...props({ onPick })} />);
    await fireEvent.press(screen.getByText('beta'));
    await fireEvent.press(screen.getByText('alpha'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('b');
  });

  it('hides the explanation until answered', async () => {
    await render(<QuestionView {...props()} />);
    expect(screen.queryByText('Because alpha.')).toBeNull();
  });

  it('shows correct and wrong marks and the explanation after answering', async () => {
    await render(<QuestionView {...props({ pickedOptionId: 'b' })} />);
    expect(screen.getByText('Because alpha.')).toBeTruthy();
    expect(screen.getByLabelText('Option A, correct: alpha')).toBeTruthy();
    expect(screen.getByLabelText('Option B, wrong, your answer: beta')).toBeTruthy();
  });

  it('says when there is no explanation', async () => {
    await render(<QuestionView {...props({ pickedOptionId: 'a', question: { ...question, explanation: undefined } })} />);
    expect(screen.getByText('No explanation provided.')).toBeTruthy();
  });
});
