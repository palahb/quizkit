# Phase 0 math spike — results

Status: **PASSED** — tested by the owner on their iPhone via Expo Go (2026-10-27).

Setup: one WebView per math-bearing string (stem, each option, explanation); plain strings are native `<Text>`.
KaTeX HTML is rendered in JS; the WebView gets a static page with CSS and base64 woff2 fonts (360 KB CSS) and no external URLs.

## How to run
1. `npx expo start` on the Mac, scan the QR code with the iPhone camera (Expo Go).
2. Once loaded, turn on **airplane mode**, tap "Open math spike".
3. Press Next 20 times, tap options, scroll the explanation.

## Criteria (spec §5.4)
| Check | Result |
|---|---|
| Math appears with airplane mode on | pass (owner: "everything seems ok, no math problem") |
| Blank/flicker on first paint (rough ms) | none reported |
| Flicker when pressing Next 20 times | none reported |
| Option taps stay responsive | pass |

## Decision
Keep the WebView + KaTeX approach, one WebView per math-bearing string (stem, each option, explanation). Plain strings stay native `<Text>`. The MathJax/SVG fallback is not needed.
