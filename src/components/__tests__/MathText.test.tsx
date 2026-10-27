import '@/test/mockUi';
import '@/test/mockWebView';

import { render, screen } from '@testing-library/react-native';
import { PixelRatio } from 'react-native';

import * as renderer from '../math/renderMathHtml';
import { mathCacheSize, MathText } from '../math/MathText';

afterEach(() => jest.restoreAllMocks());

describe('MathText', () => {
  it('renders plain text natively without a WebView', async () => {
    await render(<MathText text="Plain question?" />);
    expect(screen.getByText('Plain question?')).toBeTruthy();
    expect(screen.queryByTestId('math-webview')).toBeNull();
  });

  it('renders math in one WebView', async () => {
    await render(<MathText text="What is $x^2$?" />);
    expect(screen.getAllByTestId('math-webview')).toHaveLength(1);
  });

  it('keeps prices as plain text', async () => {
    await render(<MathText text="It costs $5 and $10" />);
    expect(screen.queryByTestId('math-webview')).toBeNull();
  });

  it('falls back to the raw text when rendering throws', async () => {
    jest.spyOn(renderer, 'renderMathBody').mockImplementation(() => {
      throw new Error('boom');
    });
    const broken = String.raw`Broken $\frac{x}$ math`;
    await render(<MathText text={broken} />);
    expect(screen.getByText(broken)).toBeTruthy();
    expect(screen.queryByTestId('math-webview')).toBeNull();
  });

  it('renders a 10,000-character string', async () => {
    const long = 'word '.repeat(2000);
    await render(<MathText text={long} />);
    expect(screen.getByText(long)).toBeTruthy();
  });

  it('scales math with the system text size', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.5);
    const spy = jest.spyOn(renderer, 'wrapMathPage');
    await render(<MathText text="Scaled $y^3$" />);
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fontSize: 24 }));
  });

  it('keeps the rendered-math cache small (no per-entry copy of the font CSS)', async () => {
    for (let i = 0; i < 60; i++) await render(<MathText text={`Item ${i}: $x^{${i}}$`} />);
    expect(mathCacheSize()).toBeLessThan(2_000_000);
  });
});
