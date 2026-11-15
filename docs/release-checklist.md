# Quizkit release checklist

Run this on a real iPhone before each release. Tick each line and note the date.

## Automated (Mac)

| Check | Command | Result |
|---|---|---|
| Unit and component tests | `npx jest` | 2026-10-27: 204/204 pass |
| Type check | `npx tsc --noEmit` | 2026-10-27: clean |
| iOS bundle builds | `npx expo export --platform ios` | 2026-10-27: ok |
| Dependency health | `npx expo-doctor` | 2026-10-27: 20/20 |
| No network code in the app | `grep -rnE 'fetch\(\|XMLHttpRequest\|https?://\|WebSocket\|openURL' src \| grep -v __tests__ \| grep -v katexCss.generated` prints only the allowed hit below | 2026-10-27: nothing found; 2026-11-15: only the allowed hit |
| No remote URLs in the app | `grep -rnE 'https?://' src \| grep -v __tests__ \| grep -v katexCss.generated` prints nothing | 2026-11-15: nothing found |
| Web bundle builds | `npm run build:web` | 2026-11-15: ok (exports dist/, writes sw.js with 47 precached urls and 404.html) |
| Unit and component tests (web work) | `npx jest` | 2026-11-15: 373/373 pass (44 suites) |
| Type check (web work) | `npx tsc --noEmit` | 2026-11-15: clean |

Allowed hit in the network grep: `src/features/import/readFile.web.ts` calls `fetch(asset.uri)` to read a file the user picked (a local blob URL). It must never be given a remote URL. Any other hit, or any `http(s)://` string in `src`, is a failure: the app makes no remote network access at runtime. (`scripts/` and the generated `sw.js` are outside `src/`; the service worker only serves precached same-origin files.)

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

## Web / PWA (iPhone, installed from Safari)

- [ ] Open the Pages URL in Safari, Share, Add to Home Screen, launch from the icon (full screen, no Safari bars).
- [ ] Import a quiz with math; solve in Practice and Exam; kill the app and reopen: data and unfinished quiz are still there.
- [ ] Airplane mode, launch from the icon: everything works.
- [ ] Settings, Back up: file saved; Delete all data; Restore: library returns.
- [ ] The Safari tab copy and the installed app have separate libraries (a quiz imported in the Safari tab does not appear in the installed app, and vice versa).
- [ ] Back up in the Safari tab, then Restore that file in the installed app: the library moves over.
- [ ] After a later deploy: open the app twice, the new version appears; data intact.
- [ ] Wait a week unused, reopen: data still there (home-screen apps are exempt from Safari's 7-day cleanup; this confirms it on the owner's phone).
- [ ] After force-quitting the home-screen app and reopening, the unfinished quiz card still resumes.
- [ ] The "Add to Home Screen" hint in Settings disappears when launched from the home-screen icon.
- [ ] Importing a `.json` file via the web file picker works, and pasting from the clipboard works (iOS asks permission).
- [ ] On a desktop browser, a second tab of the site shows the "already open in another window" screen without a Reset button.

## Android (only if publishing to Google Play)

- [ ] Run on an Android emulator: same flows as above (best effort, not verified on a real device).
- [ ] The release build's manifest must not request `android.permission.INTERNET`. After `npx expo prebuild`, check `android/app/src/main/AndroidManifest.xml`; if it is there, add `"blockedPermissions": ["android.permission.INTERNET"]` under `expo.android` in `app.json` for the release build only (development builds need it to reach the dev server).
