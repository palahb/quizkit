import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Calls onPause when the app leaves the foreground and onResume when it returns. */
export function useAppStateClock(onPause: () => void, onResume: () => void) {
  const handlers = useRef({ onPause, onResume });
  handlers.current = { onPause, onResume };
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') handlers.current.onResume();
      else handlers.current.onPause();
    });
    return () => sub.remove();
  }, []);
}
