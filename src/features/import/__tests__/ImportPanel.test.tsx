import '@/test/mockUi';
import '@/test/mockWebView';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { parseQuizJson } from '@/domain/parseQuizJson';
import type { ImportResult } from '@/domain/types';

import { ImportPanel, type ImportPanelProps } from '../ImportPanel';

const noop = () => {};
/** `result` is shorthand for a single-quiz outcome. */
function props({ result, ...over }: Partial<ImportPanelProps> & { result?: ImportResult } = {}): ImportPanelProps {
  return {
    text: '',
    outcome: result ? { kind: 'quiz', result } : null,
    plan: null,
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

const goodQuiz = (questions: unknown[]) => JSON.stringify({ schemaVersion: 1, title: 'T', questions });
const q = (over = {}) => ({ question: 'Q?', options: ['a', 'b'], answer: 'A', ...over });

describe('ImportPanel', () => {
  it('shows a translated message and hint for a trailing comma, not the raw code', async () => {
    const result = parseQuizJson('{"schemaVersion":1,"title":"T","questions":[],}');
    await render(<ImportPanel {...props({ result })} />);
    expect(screen.getByText("We couldn't import this")).toBeTruthy();
    expect(screen.getByText(/The JSON has a mistake at line 1/)).toBeTruthy();
    expect(screen.getByText(/extra comma/)).toBeTruthy();
    expect(screen.queryByText(/trailing_comma/)).toBeNull();
  });

  it('shows how many more problems there are', async () => {
    const result = parseQuizJson(goodQuiz(Array.from({ length: 13 }, () => q({ answer: 'Z' }))));
    await render(<ImportPanel {...props({ result })} />);
    expect(screen.getByText('+3 more problems')).toBeTruthy();
  });

  it('shows warnings on the preview and still allows saving', async () => {
    const onSave = jest.fn();
    const result = parseQuizJson(goodQuiz([q({ options: ['a', 'a'] })]));
    await render(<ImportPanel {...props({ result, onSave })} />);
    expect(screen.getByText('Please check')).toBeTruthy();
    expect(screen.getByText('Question 1: two options are identical.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save quiz'));
    expect(onSave).toHaveBeenCalled();
  });

  it('translates the field name inside warnings', async () => {
    const result = parseQuizJson(goodQuiz([q({ question: 'costs a $ here' })]));
    await render(<ImportPanel {...props({ result })} />);
    expect(screen.getByText('Question 1: a $ in the question has no partner, so it is shown as plain text.')).toBeTruthy();
  });

  it('shows the title and question count for a valid quiz', async () => {
    const result = parseQuizJson(goodQuiz([q(), q({ question: 'Second?' })]));
    await render(<ImportPanel {...props({ result })} />);
    expect(screen.getByText('T')).toBeTruthy();
    expect(screen.getByText('2 questions')).toBeTruthy();
  });

  it('renders math in the first-question preview', async () => {
    const result = parseQuizJson(goodQuiz([q({ question: 'What is $x^2$?' })]));
    await render(<ImportPanel {...props({ result })} />);
    expect(screen.getByTestId('math-webview')).toBeTruthy();
  });

  it('has no Check button: checking happens automatically', async () => {
    await render(<ImportPanel {...props({ text: '{}' })} />);
    expect(screen.queryByText('Check')).toBeNull();
  });

  it('clears the box with one tap', async () => {
    const onClear = jest.fn();
    await render(<ImportPanel {...props({ text: '{ broken', onClear })} />);
    await fireEvent.press(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalled();
  });

  it('hides Clear when the box is empty', async () => {
    await render(<ImportPanel {...props({ text: '' })} />);
    expect(screen.queryByText('Clear')).toBeNull();
  });

  it('reports where the result is, so the screen can scroll to it', async () => {
    const onResultLayout = jest.fn();
    const result = parseQuizJson('{"schemaVersion":1,"title":"T","questions":[],}');
    await render(<ImportPanel {...props({ result, onResultLayout })} />);
    await fireEvent(screen.getByTestId('import-result'), 'layout', { nativeEvent: { layout: { x: 0, y: 420, width: 300, height: 100 } } });
    expect(onResultLayout).toHaveBeenCalledWith(420);
  });

  it('shows the question, field, line and the faulty text for an error inside a question', async () => {
    const raw = ['{"schemaVersion": 1, "title": "T", "questions": [', '{"question": "Q?", "options" ["a", "b"], "answer": "A"}', ']}'].join('\n');
    await render(<ImportPanel {...props({ result: parseQuizJson(raw) })} />);
    expect(screen.getByText('Question 1, field "options": the JSON has a mistake at line 2, column 30.')).toBeTruthy();
    expect(screen.getByText(/"options" \["a", "b"\]/)).toBeTruthy();
  });

  it('links to the prompt library', async () => {
    const onShowPrompts = jest.fn();
    await render(<ImportPanel {...props({ onShowPrompts })} />);
    await fireEvent.press(screen.getByText('All prompts'));
    expect(onShowPrompts).toHaveBeenCalled();
  });
});
