import { renderMathHtml } from '../renderMathHtml';

describe('renderMathHtml', () => {
  it('renders inline math with katex markup', () => {
    expect(renderMathHtml([{ kind: 'inline', value: 'x^2' }])).toContain('class="katex"');
  });
  it('contains no external URLs', () => {
    const html = renderMathHtml([{ kind: 'display', value: '\\int_0^1 x\\,dx' }]);
    expect(html).not.toMatch(/https?:\/\//);
  });
  it('escapes HTML in text segments', () => {
    const html = renderMathHtml([{ kind: 'text', value: '<b>' }]);
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>');
  });
  it('does not throw on invalid formulas', () => {
    expect(() => renderMathHtml([{ kind: 'inline', value: '\\frac{' }])).not.toThrow();
    expect(renderMathHtml([{ kind: 'inline', value: '\\frac{' }])).toContain('<html');
  });
});
