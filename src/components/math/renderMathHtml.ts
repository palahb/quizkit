import katex from 'katex';

import type { Segment } from '@/domain/types';

import { KATEX_CSS } from './katexCss.generated';

export interface MathHtmlOptions {
  color?: string;
  fontSize?: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function renderSegment(seg: Segment): string {
  if (seg.kind === 'text') return escapeHtml(seg.value);
  // output: 'html' skips the MathML copy, which keeps the page smaller.
  return katex.renderToString(seg.value, {
    displayMode: seg.kind === 'display',
    throwOnError: false,
    output: 'html',
  });
}

// Posts the content height to React Native whenever layout changes (fonts load, resize).
const HEIGHT_SCRIPT = `
(function () {
  function post() {
    var h = document.getElementById('c').getBoundingClientRect().height;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(Math.ceil(h)));
  }
  if (window.ResizeObserver) new ResizeObserver(post).observe(document.getElementById('c'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(post);
  post();
})();`;

/** A complete, self-contained HTML document for the given segments. No external URLs. */
export function renderMathHtml(segments: Segment[], opts: MathHtmlOptions = {}): string {
  const color = opts.color ?? '#111';
  const fontSize = opts.fontSize ?? 16;
  let body: string;
  try {
    body = segments.map(renderSegment).join('');
  } catch {
    body = escapeHtml(segments.map((s) => s.value).join(''));
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${KATEX_CSS}
html,body{margin:0;padding:0;background:transparent;}
#c{color:${color};font-size:${fontSize}px;font-family:-apple-system,system-ui,sans-serif;line-height:1.4;overflow-wrap:anywhere;}
.katex-display{overflow-x:auto;overflow-y:hidden;margin:0.4em 0;}
</style></head><body><div id="c">${body}</div><script>${HEIGHT_SCRIPT}</script></body></html>`;
}
