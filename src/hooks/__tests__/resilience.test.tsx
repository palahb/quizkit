import '@/test/mockUi';

import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { AppState, BackHandler, Text } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';

import { useAppStateClock } from '../useAppStateClock';
import { useBackGuard } from '../useBackGuard';

describe('useAppStateClock', () => {
  it('pauses when the app leaves the foreground and resumes when it returns', async () => {
    let listener: (s: string) => void = () => {};
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, cb) => {
      listener = cb as (s: string) => void;
      return { remove } as never;
    });
    const onPause = jest.fn();
    const onResume = jest.fn();
    const { unmount } = await renderHook(() => useAppStateClock(onPause, onResume));
    listener('background');
    listener('active');
    listener('inactive');
    expect(onPause).toHaveBeenCalledTimes(2);
    expect(onResume).toHaveBeenCalledTimes(1);
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});

describe('useBackGuard', () => {
  it('intercepts the Android back button while enabled', async () => {
    let handler: () => boolean = () => false;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, cb) => {
      handler = cb as () => boolean;
      return { remove: jest.fn() };
    });
    const onBack = jest.fn();
    await renderHook(() => useBackGuard(true, onBack));
    expect(handler()).toBe(true);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ErrorBoundary', () => {
  function Boom(): never {
    throw new Error('kaboom');
  }

  it('renders a recoverable fallback when a child throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = jest.fn();
    await render(
      <ErrorBoundary onReset={onReset}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    await fireEvent.press(screen.getByText('Go to library'));
    expect(onReset).toHaveBeenCalled();
  });

  it('renders children when nothing throws', async () => {
    await render(
      <ErrorBoundary onReset={() => {}}>
        <Text>fine</Text>
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeTruthy();
  });
});
