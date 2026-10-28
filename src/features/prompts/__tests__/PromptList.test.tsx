import '@/test/mockUi';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { getPrompt, getPrompts } from '@/domain/prompts';

import { PromptDetail } from '../PromptDetail';
import { PromptList } from '../PromptList';

describe('PromptList', () => {
  it('lists every prompt with its description and opens one', async () => {
    const onOpen = jest.fn();
    await render(<PromptList prompts={getPrompts('en')} onOpen={onOpen} onCopy={jest.fn()} />);
    expect(screen.getByText('Whole course: folders in one go')).toBeTruthy();
    expect(screen.getByText('One quiz per unit or year, organized into folders.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Quiz from past exam questions'));
    expect(onOpen).toHaveBeenCalledWith('past-exam');
  });

  it('copies a prompt straight from the list', async () => {
    const onCopy = jest.fn();
    await render(<PromptList prompts={getPrompts('en')} onOpen={jest.fn()} onCopy={onCopy} />);
    await fireEvent.press(screen.getAllByText('Copy')[2]);
    expect(onCopy).toHaveBeenCalledWith(getPrompt('course', 'en'));
  });
});

describe('PromptDetail', () => {
  it('shows the full text and copies it', async () => {
    const onCopy = jest.fn();
    const prompt = getPrompt('math', 'en');
    await render(<PromptDetail prompt={prompt} onCopy={onCopy} />);
    expect(screen.getByText(prompt.body)).toBeTruthy();
    await fireEvent.press(screen.getByText('Copy'));
    expect(onCopy).toHaveBeenCalledWith(prompt);
  });
});
