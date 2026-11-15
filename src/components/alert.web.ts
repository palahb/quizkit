import type { AlertButton } from 'react-native';

export type { AlertButton };

export type AlertOptions = { cancelable?: boolean; onDismiss?: () => void };

/** Web: React Native Web's Alert.alert is a no-op, so use window.confirm/alert. */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
): void {
  const text = [title, message].filter((s) => s).join('\n\n');
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const action = buttons?.find((b) => b.style !== 'cancel');

  if (!buttons || buttons.length === 0 || !action) {
    window.alert(text);
    cancel?.onPress?.();
    return;
  }
  if (buttons.length === 1) {
    window.alert(text);
    action.onPress?.();
    return;
  }
  if (window.confirm(text)) {
    action.onPress?.();
  } else if (cancel) {
    cancel.onPress?.();
  } else {
    options?.onDismiss?.();
  }
}
