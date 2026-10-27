import '@/test/mockUi';

import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from '../ui';

describe('Screen', () => {
  // iOS 26 native headers are transparent (Liquid Glass); without automatic insets the
  // content starts underneath the title bar.
  it('lets iOS inset scrolling content below a transparent header', async () => {
    await render(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByTestId('screen-scroll').props.contentInsetAdjustmentBehavior).toBe('automatic');
  });
});
