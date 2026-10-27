import '@/test/mockUi';
import '@/test/mockWebView';

import { render, screen } from '@testing-library/react-native';

import { OptionRow } from '../OptionRow';

describe('OptionRow', () => {
  it('labels a wrong pick for screen readers and shows a cross', async () => {
    await render(<OptionRow letter="B" text="two" state="wrong" onPress={() => {}} />);
    expect(screen.getByLabelText('Option B, wrong, your answer: two')).toBeTruthy();
    expect(screen.getByText('✗')).toBeTruthy();
  });

  it('shows a check mark on the correct option', async () => {
    await render(<OptionRow letter="A" text="one" state="correct" onPress={() => {}} />);
    expect(screen.getByText('✓')).toBeTruthy();
    expect(screen.getByLabelText('Option A, correct: one')).toBeTruthy();
  });

  it('has no mark when idle', async () => {
    await render(<OptionRow letter="C" text="three" state="idle" onPress={() => {}} />);
    expect(screen.queryByText('✓')).toBeNull();
    expect(screen.queryByText('✗')).toBeNull();
    expect(screen.getByLabelText('Option C: three')).toBeTruthy();
  });
});
