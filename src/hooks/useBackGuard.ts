import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/** While enabled, the Android back button calls onBack instead of leaving the screen. */
export function useBackGuard(enabled: boolean, onBack: () => void) {
  const handler = useRef(onBack);
  handler.current = onBack;
  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handler.current();
      return true;
    });
    return () => sub.remove();
  }, [enabled]);
}
