# Quizkit release checklist

Run this on a real iPhone before each release. Tick each line and note the date.

## Automated (Mac)

| Check | Command | Result |
|---|---|---|
| Unit and component tests | `npx jest` | 2026-10-27: 194/194 pass |
| Type check | `npx tsc --noEmit` | 2026-10-27: clean |
| iOS bundle builds | `npx expo export --platform ios` | 2026-10-27: ok |
| Dependency health | `npx expo-doctor` | 2026-10-27: 20/20 |
| No network code in the app | `grep -rnE 'fetch\(\|XMLHttpRequest\|https?://\|WebSocket\|openURL' src \| grep -v __tests__ \| grep -v katexCss.generated` prints nothing | 2026-10-27: nothing found |

## On the iPhone (airplane mode ON for everything below)

- [ ] Import: tap "Copy prompt for ChatGPT/Claude", paste into an AI with real notes, paste the reply back, Check, Save.
- [ ] Import errors: paste broken JSON (delete a closing bracket) and see a readable message, not a crash.
- [ ] Import a file: pick a `.json` file from Files.
- [ ] Folders: create nested folders, rename, move a folder and a quiz, delete a folder that contains quizzes.
- [ ] Practice mode: green/red feedback, explanation, double-tap an option (only the first counts), Finish → results.
- [ ] Exam mode: stopwatch runs, no colors before submit, question grid jump, submit with unanswered questions shows the count.
- [ ] Results: Redo wrong (choose Practice), Retake all, Review (All / Only wrong).
- [ ] Resume: answer 5 exam questions, swipe the app away (force quit), reopen → "Unfinished quiz" card → Resume: same answers, timer continues from where it was.
- [ ] Background: leave the app for 1 minute during an exam; the stopwatch did not advance.
- [ ] Large quiz: import 1000+ questions; library, start and Next stay responsive.
- [ ] Math-heavy quiz: fractions, integrals, matrices, `$$…$$` blocks render; no blank or flicker when pressing Next.
- [ ] Turkish: switch language to Türkçe and back; Turkish characters (ı, İ, ş, ğ) in titles sort correctly.
- [ ] Dark mode (Settings → Appearance → Dark): every screen readable, math readable.
- [ ] Text size: iOS Settings → Display & Brightness → Text Size at largest; nothing clipped, math grows too.
- [ ] Delete all data (Settings) empties the library and history.

## Android (only if publishing to Google Play)

- [ ] Run on an Android emulator: same flows as above (best effort, not verified on a real device).
- [ ] The release build's manifest must not request `android.permission.INTERNET`. After `npx expo prebuild`, check `android/app/src/main/AndroidManifest.xml`; if it is there, add `"blockedPermissions": ["android.permission.INTERNET"]` under `expo.android` in `app.json` for the release build only (development builds need it to reach the dev server).
