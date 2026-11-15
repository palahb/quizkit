import { Alert, type AlertButton } from 'react-native';

export type { AlertButton };

export type AlertOptions = { cancelable?: boolean; onDismiss?: () => void };

/** Native: delegates to Alert.alert. See alert.web.ts for the web version. */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
): void {
  Alert.alert(title, message, buttons, options);
}
