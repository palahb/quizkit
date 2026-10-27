// THROWAWAY Phase 0 spike (plan Task 3). Delete after the gate decision.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { renderMathHtml } from '@/components/math/renderMathHtml';
import type { Segment } from '@/domain/types';

const inline = (value: string): Segment => ({ kind: 'inline', value });
const display = (value: string): Segment => ({ kind: 'display', value });
const text = (value: string): Segment => ({ kind: 'text', value });

type Sample = { stem: Segment[]; options: Segment[][]; explanation: Segment[] };

function makeSample(i: number): Sample {
  const n = i + 2;
  return {
    stem: [text(`Soru ${i + 1}: `), inline(`\\int_0^{${n}} x^{${n}}\\,dx`), text(' işleminin sonucu nedir?')],
    options: [
      [inline(`\\frac{${n}^{${n + 1}}}{${n + 1}}`)],
      [inline(`${n}^{${n}}`)],
      [inline(`\\begin{pmatrix} 1 & ${n} \\\\ ${n} & 1 \\end{pmatrix}`)],
      [inline(`\\sqrt{${n}} + \\sum_{k=1}^{${n}} k`)],
      [text('Hiçbiri')],
    ],
    explanation: [
      text('Kuvvet kuralı: '),
      display(`\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C`),
      text('Sınırları yerine koyarız.'),
    ],
  };
}

const SAMPLES = Array.from({ length: 20 }, (_, i) => makeSample(i));

function MathWeb({ segments }: { segments: Segment[] }) {
  const [height, setHeight] = useState(24);
  const html = useMemo(() => renderMathHtml(segments), [segments]);
  const hasMath = segments.some((s) => s.kind !== 'text');
  if (!hasMath) return <Text style={{ fontSize: 16 }}>{segments.map((s) => s.value).join('')}</Text>;
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={{ height, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      pointerEvents="none"
      onMessage={(e) => {
        const h = Number(e.nativeEvent.data);
        if (h > 0) setHeight(h);
      }}
    />
  );
}

export default function Spike() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = SAMPLES[index];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 60, gap: 10 }}>
      <Text>Spike {index + 1} / {SAMPLES.length}</Text>
      <MathWeb segments={q.stem} />
      {q.options.map((opt, i) => (
        <Pressable
          key={`${index}-${i}`}
          onPress={() => setPicked(i)}
          style={{ borderWidth: 2, borderRadius: 8, padding: 8, borderColor: picked === i ? '#2e9e5b' : '#ccc' }}
        >
          <MathWeb segments={opt} />
        </Pressable>
      ))}
      <MathWeb segments={q.explanation} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={() => { setIndex((i) => Math.max(0, i - 1)); setPicked(null); }} style={{ padding: 12, backgroundColor: '#ddd' }}>
          <Text>Prev</Text>
        </Pressable>
        <Pressable onPress={() => { setIndex((i) => Math.min(SAMPLES.length - 1, i + 1)); setPicked(null); }} style={{ padding: 12, backgroundColor: '#ddd' }}>
          <Text>Next</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
