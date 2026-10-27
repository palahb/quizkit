import { hasMath, segment } from '../mathSegments';

describe('segment', () => {
  it('returns one text segment for plain text', () => {
    expect(segment('plain')).toEqual({ segments: [{ kind: 'text', value: 'plain' }], unmatchedDollars: 0 });
  });

  it('splits inline math', () => {
    expect(segment('Find $x^2$ now').segments).toEqual([
      { kind: 'text', value: 'Find ' },
      { kind: 'inline', value: 'x^2' },
      { kind: 'text', value: ' now' },
    ]);
  });

  it('recognizes display math', () => {
    expect(segment('$$\\int_0^1 x\\,dx$$').segments).toEqual([{ kind: 'display', value: '\\int_0^1 x\\,dx' }]);
  });

  it('keeps prices as text', () => {
    const r = segment('It costs $5 and $10');
    expect(r.segments).toEqual([{ kind: 'text', value: 'It costs $5 and $10' }]);
    expect(r.unmatchedDollars).toBe(0);
  });

  it('turns \\$ into a literal dollar', () => {
    expect(segment('cost \\$5').segments).toEqual([{ kind: 'text', value: 'cost $5' }]);
  });

  it('counts an unmatched dollar and keeps it as text', () => {
    const r = segment('a $ b');
    expect(r.segments).toEqual([{ kind: 'text', value: 'a $ b' }]);
    expect(r.unmatchedDollars).toBe(1);
  });

  it('keeps $ x $ with inner spaces as text', () => {
    expect(segment('$ x $').segments).toEqual([{ kind: 'text', value: '$ x $' }]);
  });

  it('counts an unclosed $$ as unmatched', () => {
    const r = segment('see $$x^2');
    expect(r.segments).toEqual([{ kind: 'text', value: 'see $$x^2' }]);
    expect(r.unmatchedDollars).toBe(1);
  });

  it('handles 200,000 chars of math quickly', () => {
    const big = '$a$ '.repeat(50_000);
    const t0 = Date.now();
    const r = segment(big);
    expect(Date.now() - t0).toBeLessThan(200);
    expect(r.segments.filter((s) => s.kind === 'inline')).toHaveLength(50_000);
  });

  it('handles thousands of unmatched dollars quickly', () => {
    const t0 = Date.now();
    segment('$ '.repeat(100_000));
    expect(Date.now() - t0).toBeLessThan(200);
  });

  it('returns one segment for a 10,000-char line', () => {
    expect(segment('a'.repeat(10_000)).segments).toHaveLength(1);
  });
});

describe('hasMath', () => {
  it('is false for plain text', () => {
    expect(hasMath(segment('plain').segments)).toBe(false);
  });
  it('is true when math is present', () => {
    expect(hasMath(segment('$x$').segments)).toBe(true);
  });
});
