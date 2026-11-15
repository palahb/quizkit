import { memo, useEffect, useMemo } from 'react';
import { Text, type TextStyle } from 'react-native';

import { hashString } from '@/domain/hash';
import { hasMath, segment } from '@/domain/mathSegments';
import { useTheme } from '@/theme/useTheme';

import { KATEX_CSS } from './katexCss.generated';
import { renderMathBody } from './renderMathHtml';

const STYLE_ID = 'katex-css';

function ensureKatexCss() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = KATEX_CSS;
  document.head.appendChild(el);
}

const bodyCache = new Map<string, string>();
const MAX_CACHE = 400;

/** Total characters held in the rendered-math cache (for tests and diagnostics). */
export function mathCacheSize(): number {
  let n = 0;
  for (const v of bodyCache.values()) n += v.length;
  return n;
}

/** Text with optional LaTeX, rendered as KaTeX HTML straight into the page DOM. */
export const MathText = memo(function MathText({ text, fontSize = 16, color }: { text: string; fontSize?: number; color?: string }) {
  const theme = useTheme();
  const textColor = color ?? theme.text;
  const style: TextStyle = { fontSize, color: textColor };

  const html = useMemo(() => {
    const { segments } = segment(text);
    if (!hasMath(segments)) return null;
    const key = hashString(text);
    try {
      let body = bodyCache.get(key);
      if (body === undefined) {
        body = renderMathBody(segments);
        if (bodyCache.size >= MAX_CACHE) bodyCache.delete(bodyCache.keys().next().value!);
        bodyCache.set(key, body);
      }
      return body;
    } catch {
      return null;
    }
  }, [text]);

  useEffect(() => {
    if (html !== null) ensureKatexCss();
  }, [html]);

  if (html === null) return <Text style={style}>{text}</Text>;
  return (
    <div
      aria-label={text}
      style={{ fontSize, color: textColor, lineHeight: 1.4, overflowWrap: 'anywhere', maxWidth: '100%' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
