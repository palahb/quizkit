import { memo, useMemo, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { hashString } from '@/domain/hash';
import { hasMath, segment } from '@/domain/mathSegments';
import { useTheme } from '@/theme/useTheme';

import { renderMathHtml } from './renderMathHtml';

// Rendered pages and their measured heights, kept across screens so revisiting or
// pre-rendering a question shows it at the right size without a jump.
const htmlCache = new Map<string, string>();
const heightCache = new Map<string, number>();
const MAX_CACHE = 400;

function remember<V>(map: Map<string, V>, key: string, value: V) {
  if (map.size >= MAX_CACHE) map.delete(map.keys().next().value!);
  map.set(key, value);
}

/**
 * Text with optional LaTeX. Plain text renders as a native <Text>; text with math renders
 * as a static KaTeX page in a WebView (no network, no JS other than height reporting).
 * If math cannot be rendered, the raw text is shown instead.
 */
export const MathText = memo(function MathText({ text, fontSize = 16, color }: { text: string; fontSize?: number; color?: string }) {
  const theme = useTheme();
  const textColor = color ?? theme.text;
  const style: TextStyle = { fontSize, color: textColor, lineHeight: Math.round(fontSize * 1.4) };

  const page = useMemo(() => {
    const { segments } = segment(text);
    if (!hasMath(segments)) return null;
    const key = hashString(`${textColor}|${fontSize}|${text}`);
    let html = htmlCache.get(key);
    if (html === undefined) {
      try {
        html = renderMathHtml(segments, { color: textColor, fontSize });
      } catch {
        return null;
      }
      remember(htmlCache, key, html);
    }
    return { key, html };
  }, [text, textColor, fontSize]);

  const [height, setHeight] = useState(() => (page ? (heightCache.get(page.key) ?? Math.round(fontSize * 1.6)) : 0));

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
