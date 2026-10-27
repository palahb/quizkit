import { Component, type ReactNode } from 'react';
import { View } from 'react-native';

import { useT } from '@/hooks/useT';
import { useTheme } from '@/theme/useTheme';

import { Button, T } from './ui';

function Fallback({ onReset }: { onReset(): void }) {
  const t = useT();
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: theme.bg }}>
      <T variant="heading">{t('errorBoundary.title')}</T>
      <T variant="muted">{t('errorBoundary.body')}</T>
      <Button label={t('errorBoundary.goLibrary')} onPress={onReset} />
    </View>
  );
}

/** Catches render errors below it and offers a way back instead of a white screen. */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset(): void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Render error', error);
  }

  private reset = () => {
    this.setState({ failed: false });
    this.props.onReset();
  };

  render() {
    return this.state.failed ? <Fallback onReset={this.reset} /> : this.props.children;
  }
}
