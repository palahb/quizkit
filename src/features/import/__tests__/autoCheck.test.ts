import { act, renderHook } from '@testing-library/react-native';

import { isBulkChange, useAutoCheck } from '../autoCheck';

describe('isBulkChange', () => {
  it('treats a paste into the box as bulk', () => {
    expect(isBulkChange('', '{"schemaVersion":1,"title":"A long pasted quiz","questions":[]}')).toBe(true);
  });
  it('treats typing a character as not bulk', () => {
    expect(isBulkChange('{"a":1', '{"a":1}')).toBe(false);
  });
  it('treats deleting most of the text as bulk', () => {
    expect(isBulkChange('x'.repeat(200), 'x')).toBe(true);
  });
});

describe('useAutoCheck', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('checks the text after a short pause, not while typing', async () => {
    const parse = jest.fn((s: string) => s.length);
    const { result, rerender } = await renderHook(({ text }: { text: string }) => useAutoCheck(text, parse, 500), {
      initialProps: { text: 'ab' },
    });
    expect(result.current).toBeNull();
    await rerender({ text: 'abc' });
    await act(async () => {
      jest.advanceTimersByTime(499);
    });
    expect(parse).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledWith('abc');
    expect(result.current).toBe(3);
  });

  it('shows nothing for an empty box', async () => {
    const parse = jest.fn((s: string) => s.length);
    const { result, rerender } = await renderHook(({ text }: { text: string }) => useAutoCheck(text, parse, 500), {
      initialProps: { text: 'abc' },
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe(3);
    await rerender({ text: '   ' });
    expect(result.current).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.current).toBeNull();
  });
});
