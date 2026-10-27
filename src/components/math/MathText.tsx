import { memo, useMemo, useState } from 'react';
import { PixelRatio, Text, type TextStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { hashString } from '@/domain/hash';
import { hasMath, segment } from '@/domain/mathSegments';
import { useTheme } from '@/theme/useTheme';

import { renderMathBody, wrapMathPage } from './renderMathHtml';

// Rendered KaTeX bodies (small; the ~360 KB font CSS is added per mounted view, never cached)
// and measured heights, kept across screens so revisiting or pre-rendering a question shows it
// at the right size without a jump.
const bodyCache = new Map<string, string>();
const heightCache = new Map<string, number>();
const MAX_CACHE = 400;

function remember<V>(map: Map<string, V>, key: string, value: V) {
  if (map.size >= MAX_CACHE) map.delete(map.keys().next().value!);
  map.set(key, value);
}

/** Total characters held in the rendered-math cache (for tests and diagnostics). */
export function mathCacheSize(): number {
  let n = 0;
  for (const v of bodyCache.values()) n += v.length;
  return n;
}

/**
 * Text with optional LaTeX. Plain text renders as a native <Text>; text with math renders
 * as a static KaTeX page in a WebView (no network, no JS other than height reporting).
 * If math cannot be rendered, the raw text is shown instead.
 */
export const MathText = memo(function MathText({ text, fontSize = 16, color }: { text: string; fontSize?: number; color?: string }) {
  const theme = useTheme();
  const textColor = color ?? theme.text;
  const style: TextStyle = { fontSize, color: textColor };
  // Native text follows the system text size on its own; the WebView needs it applied by hand.
  const mathSize = Math.round(fontSize * PixelRatio.getFontScale());

  const page = useMemo(() => {
    const { segments } = segment(text);
    if (!hasMath(segments)) return null;
    const key = hashString(`${textColor}|${mathSize}|${text}`);
    const bodyKey = hashString(text);
    try {
      let body = bodyCache.get(bodyKey);
      if (body === undefined) {
        body = renderMathBody(segments);
        remember(bodyCache, bodyKey, body);
      }
      return { key, html: wrapMathPage(body, { color: textColor, fontSize: mathSize }) };
    } catch {
      return null;
    }
  }, [text, textColor, mathSize]);

  const [height, setHeight] = useState(() => (page ? (heightCache.get(page.key) ?? Math.round(mathSize * 1.6)) : 0));

  if (!page) return <Text style={style}>{text}</Text>;
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: page.html }}
      style={{ height, backgroundColor: 'transparent' }}
      containerStyle={{ backgroundColor: 'transparent' }}
      scrollEnabled={false}
      pointerEvents="none"
      javaScriptEnabled
      accessibilityLabel={text}
      onMessage={(e) => {
        const h = Number(e.nativeEvent.data);
        if (h > 0 && h !== height) {
          remember(heightCache, page.key, h);
          setHeight(h);
        }
      }}
    />
  );
});
