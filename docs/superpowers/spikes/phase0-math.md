# Phase 0 math spike — results

Status: **PENDING owner test on iPhone** (no iOS simulator on the dev machine).

Setup: one WebView per math-bearing string (stem, each option, explanation); plain strings are native `<Text>`.
KaTeX HTML is rendered in JS; the WebView gets a static page with CSS and base64 woff2 fonts (360 KB CSS) and no external URLs.

## How to run
1. `npx expo start` on the Mac, scan the QR code with the iPhone camera (Expo Go).
2. Once loaded, turn on **airplane mode**, tap "Open math spike".
3. Press Next 20 times, tap options, scroll the explanation.

## Criteria (spec §5.4)
| Check | Result |
|---|---|
| Math appears with airplane mode on | |
| Blank/flicker on first paint (rough ms) | |
| Flicker when pressing Next 20 times | |
| Option taps stay responsive | |

## Decision
_pending_
