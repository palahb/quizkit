# Quizkit: Design

Date: 2026-10-27. Status: draft for approval.

Items marked **(my call)** are decisions I made without the owner explicitly choosing them. Everything else comes from the conversation.

## 1. Intent

Quizkit is an offline mobile app for practicing multiple-choice questions on a phone. The owner studies for Açıköğretim (AÖF) exams, where practicing previously asked questions ("çıkmış sorular", available as PDFs in the AÖF system) is the most effective way to pass. They want to do that on the metro and anywhere without a connection. The app is not AÖF-specific: anyone can import a quiz on any topic.

Quizzes are produced **outside** the app. The user gives a PDF or notes to an LLM (ChatGPT, Claude), gets JSON in Quizkit's format, and pastes it or picks a `.json` file. The app itself never talks to an LLM or a server. An in-app generator may come much later; the design must not block it but must not build it.

The owner intends to publish the app (App Store / Google Play) for fun, not revenue.

## 2. Goals, non-goals, anti-goals

**Goals (v1)**
- Import quizzes from pasted JSON or a picked `.json` file with strict validation and human-friendly errors.
- Organize quizzes in user-created, nestable folders. A folder can be played as one combined quiz (all questions mixed).
- Two modes: **Practice** (instant green/red feedback and explanation per question) and **Exam** (silent selection, progress, stopwatch, results and answer key only after submit).
- After a quiz: review wrong answers, and redo only the wrong ones.
- Math (LaTeX) rendering for inline `$...$` and display `$$...$$` in questions, options and explanations, fully offline.
- Turkish and English UI with a language switch; adding a language later is a new translation file.
- All data stays on the device.

**Non-goals (v1, possibly later)**
- Images in questions. The JSON format must leave room for adding them (see §4).
- Question types other than single-answer multiple choice (true/false, multi-select, short answer).
- Exam countdown timer / auto-submit (v1 is a stopwatch).
- In-app LLM / PDF parsing, accounts, sync, analytics, ads, payments.
- Spaced repetition, export/backup, sharing quizzes between devices.

**Anti-goals (would make it a failure even if it "works")**
- Any network call or network-dependent feature.
- A crash or white screen caused by bad user input.
- Losing an in-progress quiz because the app was backgrounded or killed.
- Math that visibly lags or flickers while moving between questions.

## 3. Constraints and stack

- React Native + Expo + TypeScript (strict mode). **(my call)** Expo Router for navigation, current stable Expo SDK at project start.
- Validation: Zod. State: Zustand. Persistence: `expo-sqlite` **(my call, see §5.1)**.
- Owner works on macOS. Target devices to test on are unknown; assume at least one iPhone or Android phone plus simulators. Ask before Phase 0 which they have.
- No network permission needed. Check that the Android build does not request `INTERNET` in release (Expo adds it for dev tooling only; verify).

## 4. Data contract

### 4.1 Import JSON format (version 1)

```json
{
  "schemaVersion": 1,
  "title": "İktisat Final 2023",
  "description": "optional",
  "language": "tr",
  "questions": [
    {
      "question": "$\\int x^2\\,dx$ işleminin sonucu nedir?",
      "options": ["$x^3$", "$\\frac{x^3}{3}+C$", "$2x$", "$\\frac{x^2}{2}$", "$x$"],
      "answer": "B",
      "explanation": "Kuvvet kuralı: $\\int x^n dx = \\frac{x^{n+1}}{n+1}+C$.",
      "id": "optional-stable-id",
      "tags": ["optional"]
    }
  ]
}
```

Rules **(my call on details)**:
- `schemaVersion`: required, must be `1`. Unknown higher versions give a clear "update the app" message.
- `title`: required, 1–120 chars after trim. `description`, `language`: optional.
- `questions`: 1–5000 items (also an input size cap of about 10 MB).
- `question`: required non-empty string.
- `options`: 2–6 non-empty strings. AÖF uses 5.
- `answer`: a letter `"A"`–`"F"`, case-insensitive, must exist within the option count. Letters are chosen over a numeric index because LLMs make off-by-one mistakes with 0-based indexes, and letters match how printed exams look.
- `explanation`, `tags`, `id`: optional. Unknown extra fields are ignored and stripped, not errors (LLMs add fields).
- Strings are trimmed; Markdown/HTML is not interpreted. Plain text plus math only. Newlines (`\n`) are preserved.
- Image support later: reserve an optional `images`/`image` field name; v1 strips it and shows a one-time "images are not supported yet" warning on import rather than failing.

### 4.2 Internal TypeScript model (after validation)

```ts
type Id = string; // uuid or nanoid

interface Folder { id: Id; parentId: Id | null; name: string; createdAt: number; }

interface QuizSummary {
  id: Id; folderId: Id | null; title: string; description?: string;
  language?: string; questionCount: number; createdAt: number;
  sourceHash: string;              // hash of normalized import, for duplicate detection
  lastAttempt?: { score: number; total: number; finishedAt: number };
}

interface Question {
  id: Id;                          // stable within the quiz
  text: string;
  options: { id: Id; text: string }[]; // stable option ids so shuffling is safe
  correctOptionId: Id;
  explanation?: string;
  tags?: string[];
}

type Mode = 'practice' | 'exam';

type Scope =
  | { kind: 'quiz'; quizId: Id }
  | { kind: 'folder'; folderId: Id }               // combined run
  | { kind: 'retry-wrong'; parentAttemptId: Id };

interface Session {                // the one active, unfinished run
  id: Id; mode: Mode; scope: Scope;
  questionRefs: { quizId: Id; questionId: Id; optionOrder?: Id[] }[]; // ordered/shuffled; references only
  answers: Record<Id /*questionId*/, Id /*optionId*/>;
  currentIndex: number;
  startedAt: number;
  activeMs: number;                // accumulated foreground time
  resumedAt: number | null;        // null while backgrounded
}

interface Attempt {                // a finished run
  id: Id; mode: Mode; scope: Scope;
  startedAt: number; finishedAt: number; durationMs: number;
  questions: Question[];           // snapshot, so history survives deleting/re-importing the quiz
  answers: Record<Id, Id>;
  correctCount: number; total: number;
}
```

Decision **(my call)**: a *finished* attempt stores a full snapshot of the questions it used, so review and retry keep working after the quiz is re-imported or deleted. A 40-question quiz is tens of KB. The snapshot is taken once, at submit.

The *active* session stores only references (`questionRefs`) plus the answers, so each autosave after an answer writes a small row even for a folder run with thousands of questions. Question bodies are read from the `questions` table as needed. Folder runs have no hard cap in v1; if loading is slow, load bodies in pages around `currentIndex`. If the user deletes a quiz that the active session references, ask for confirmation and discard that session.

Attempts are independent of quizzes: deleting a quiz does **not** delete its attempts. They stay in the History tab (shown with the quiz title saved in the attempt). "Retake all" and "Redo wrong" on any attempt use the attempt's own snapshot, so they work even if the quiz is gone. The per-quiz attempt list on the quiz detail screen only exists while the quiz exists.

A **skipped** (unanswered) question counts as wrong for score and for "redo wrong". Practice mode locks the first pick (no changing the answer after feedback). Exam mode lets the user change answers freely until submit.

### 4.3 Zod strategy

1. **Pre-process text** (pure function `normalizeInput(raw: string)`): strip BOM, strip ```` ```json ```` fences and surrounding prose when a single JSON object can be found, convert smart quotes **only outside** string literals, trim.
2. **Backslash repair** (the most common real-world failure): LLMs often write `"\frac"` instead of `"\\frac"`.
   - Invalid escapes such as `\a`, `\(`, `\int`, `\alpha` make `JSON.parse` throw. Repair pass: inside string literals, a `\` not followed by one of `" \ / b f n r t u` becomes `\\`.
   - Worse, `\f` (`\frac`), `\b` (`\beta`), `\t` (`\times`, `\theta`), `\n` (`\neq`, `\nu`), `\r` (`\rho`) are *valid* escapes and silently corrupt the text (a form-feed character plus `rac`). Policy: after parsing, form feed and backspace never occur legitimately, so restore them to `\f` / `\b`. Tab, newline, and carriage return are legitimate, so only restore them when they sit inside a `$...$` span and are followed by a known LaTeX command name. Build a test corpus for this; it is a place the app can quietly be wrong.
   - Whenever repair changes anything, show a non-blocking notice: "We fixed N backslash issues."
3. `JSON.parse` in try/catch. On failure, report line/column and a snippet, plus the likely cause (trailing comma, missing quote, truncated output because the LLM stopped early).
4. **Zod `safeParse`** on the parsed value. Convert Zod issues into messages a person can act on, using the question number and field: "Question 12: `answer` is 'F' but this question only has 4 options." Show at most about 10 problems, with a "+N more" count.
5. **Strict by default**: any structural error rejects the whole import (no partial imports) **(my call)**. The user sees all problems at once so they can fix them in one pass.
6. **Warnings (do not block)**: odd number of unescaped `$` in a string, math that KaTeX cannot parse, duplicate option text within a question, duplicate question text within the quiz, images present, repaired backslashes. Shown on a confirm screen before saving; the user can still import.
7. After success: assign ids, hash, show a preview (title, N questions, first question rendered, warnings) and a folder picker, then save. If `sourceHash` matches an existing quiz, ask "Import again anyway?". **(my call)** In v1 every import creates a new quiz; there is no "update in place". The optional `id` field only needs to be unique within its quiz (duplicates are a validation error) and is otherwise unused, so an identity concept for updating quizzes can be added later without breaking the format.

**Built-in LLM helper (my suggestion, small, offline):** the import screen has a "Copy prompt for ChatGPT/Claude" button that copies a ready-made instruction (with the JSON schema and a one-question example, and a reminder to double every backslash in LaTeX). This is likely the biggest practical win for import success, because the owner's workflow depends on LLM output being valid.

## 5. Architecture

### 5.1 Persistence (my call: SQLite, not AsyncStorage)

Quizzes can have thousands of questions, and attempts store question snapshots. AsyncStorage is a poor fit (size limits per value on Android, whole-blob reads and writes). Use `expo-sqlite` behind a thin repository layer.

Tables: `folders`, `quizzes` (summary columns), `questions` (`quiz_id`, `position`, `payload` JSON), `attempts` (summary columns plus `payload` JSON snapshot), `active_session` (single row, JSON), plus a `schema_migrations` version table. Small settings (UI language, theme) use `expo-sqlite/kv-store` (an AsyncStorage-compatible API shipped with Expo) or plain AsyncStorage if that is unavailable in the chosen SDK. Migrations are versioned from day one.

Repositories (`LibraryRepo`, `AttemptRepo`, `SessionRepo`) are plain async functions behind interfaces so stores and tests can use an in-memory fake.

### 5.2 Zustand stores

Stores hold what the UI needs right now; SQLite holds everything.

- **`libraryStore`**: folder tree and quiz summaries (no question bodies) loaded at startup. Actions: create/rename/move/delete folder, import quiz, move/rename/delete quiz. Every action writes through to SQLite then updates state. Question bodies are loaded lazily per quiz when a session starts.
- **`sessionStore`**: the active `Session` (or null). Actions: `start(scope, mode, options)`, `answer(questionId, optionId)`, `goTo(index)`, `submit()`, `abandon()`. Business logic lives in a **pure reducer / functions module** (`sessionEngine.ts`) that the store calls, so it is unit-testable without React. The session is written to the `active_session` row on every answer and navigation (debounced to one write per tick). On `submit()` the engine produces an `Attempt`, writes it, and clears the session.
- **`historyStore`**: thin; loads recent attempts and per-quiz attempt lists on demand from `AttemptRepo`. Not a full in-memory mirror.
- **`settingsStore`**: UI language, theme (system/light/dark), option for "shuffle questions" defaults.

Selectors derive progress, score, wrong-question lists. Components subscribe to narrow slices to avoid re-render storms.

### 5.3 Session and timer behavior

- Stopwatch time = `activeMs` + (now − `resumedAt`) while foregrounded. On `AppState` change to background, add the elapsed span to `activeMs` and set `resumedAt = null`; on return, set it to now. So the exam time **excludes time in the background** **(my call: this is a study app, not proctored)**.
- On cold start, if `active_session` exists, the Library shows a "Resume quiz" card (and the user may discard it). The stopwatch stays paused until resumed.
- Hardware/gesture back during a session asks "Leave quiz? Progress is saved" (it is autosaved, so leaving is safe).
- "Redo wrong" builds a new `Session` with scope `retry-wrong`, from the parent attempt's snapshot: all questions answered incorrectly plus all unanswered. The mode is chosen again.
- Start sheet options **(my call)**: mode, shuffle question order (default off for a single quiz, on for a folder run), shuffle option order (default **off**, because AÖF-style options like "A ve B" or "Hiçbiri" depend on order).

### 5.4 Math rendering (offline)

Requirement: inline and display LaTeX in questions, options, and explanations, no network, no lag when moving between questions.

Approach **(my call, subject to a Phase 0 spike that must pass before building on it)**:

1. A pure function `segment(text)` splits a string into `text | inlineMath | displayMath` segments. Rules: `$$...$$` is display; `$...$` is inline only if the character after the opening `$` and before the closing `$` is not whitespace, and the closing `$` is not followed by a digit. This keeps "it costs $5 and $10" as plain text. `\$` is a literal dollar sign. An unmatched `$` is treated as literal text and produces an import warning, so one bad `$` never breaks a whole question.
2. Strings with **no math** (the common AÖF case) render as a native `<Text>`. No WebView, so plain questions are as fast as it gets.
3. Strings **with math** are rendered by running `katex.renderToString` in the app's JS (KaTeX is pure JS and runs in Hermes) with `throwOnError: false`, then showing the resulting static HTML in a WebView with bundled KaTeX CSS and fonts (fonts inlined as base64 so no file access or network is needed). The WebView needs no JavaScript for display. The page reports its content height back so the native layout can size it.
4. Performance plan: render one WebView per *question card* section that contains math rather than per fragment if a spike shows many small WebViews are slow; prerender the next question while the current one is shown; cache rendered HTML by string hash; mount only the current and next question.
5. Spike acceptance (Phase 0): a question with 5 math-heavy options plus a math explanation appears with no visible blank/flicker on a mid-range Android phone and on an iPhone, tapping options stays responsive, and the app works in airplane mode. If WebView is unacceptable, the fallback is MathJax rendering to SVG via `react-native-svg`; the `MathText` component interface stays the same so the choice is swappable. **(my call)** Phase 0 is a hard stop: if neither approach meets the criteria, do not continue to Phase 1 UI work. Report the measurements back to the owner, who decides between relaxing the criteria (for example, accepting a brief placeholder while math loads) or dropping display math in v1. Pure-logic work (Phases 1–3) does not depend on this and may proceed in the meantime.

All of this sits behind one component: `<MathText text={string} style=... />`. The rest of the app never knows how math is drawn.

KaTeX is also used at import time (`renderToString` in a try/catch) to find math it cannot parse, which becomes an import warning. At render time, a parse failure falls back to showing the raw source text, never a crash.

## 6. Screens and navigation

Expo Router. Bottom tabs: **Library**, **History**, **Settings**. Items below are routes/modals.

| Route | Purpose |
|---|---|
| `library/index`, `library/folder/[id]` | Folder contents (subfolders and quizzes). FAB: new folder, import quiz. Folder screen has "Play all mixed". "Resume quiz" card when a session is active. |
| `quiz/[id]` | Quiz detail: title, question count, last scores, attempt history for this quiz, Start button, rename/move/delete. |
| `start` (bottom sheet) | Mode (Practice/Exam), shuffle toggles. Opens from a quiz or folder. |
| `import` (modal) | Paste field (+ "Paste from clipboard"), "Pick file", "Copy prompt for ChatGPT/Claude". Shows human errors. On success: preview and warnings, folder picker, Save. |
| `session` (full screen, back guarded) | Question screen. Practice: tap option, instant green/red, explanation, Next. Exam: tap to select (changeable), progress bar, stopwatch, question grid/jump, Submit with unanswered count warning. |
| `results/[attemptId]` | Score, time, list of wrong questions, "Redo wrong", "Retake all", "Back to library". |
| `review/[attemptId]` | Walk through all or only wrong questions with your pick, the correct answer, and the explanation. |
| `history` | All attempts, newest first; tap opens results. |
| `settings` | Language (TR/EN), theme, about, "Delete all data". |

Component hierarchy for the question screen:
`SessionScreen → SessionHeader (progress, stopwatch, quit) → QuestionCard (MathText stem) → OptionList → OptionRow (state: idle | selected | correct | wrong | missed) → ExplanationPanel (MathText) → SessionFooter (Prev/Next/Submit)`; Exam adds `QuestionGridSheet`.

UI text lives in translation files (`i18n/tr.json`, `i18n/en.json`); no hard-coded strings in components. Default to the device language if it is Turkish or English, otherwise English.

Approved mockups (rough layout of Library, Question, Results) were shown during brainstorming and accepted as "ok".

## 7. Edge cases and failure modes to design against

**Import**
- Invalid JSON, trailing commas, truncated LLM output, JSON wrapped in prose or code fences, smart quotes, BOM, empty clipboard, picker cancelled, non-UTF-8 or UTF-16 file, huge file (size cap with clear message), wrong top-level shape (an array instead of an object): friendly message each, never a crash.
- LaTeX backslash corruption (§4.3 step 2): the most likely silent bug.
- Currency `$` vs math `$`; odd `$` counts; `\$`; unclosed `$$`; math KaTeX cannot parse; extremely long math strings.
- Answer letter outside option range; lower-case letter; option count of 1 or 7+; duplicate options; empty strings; numbers where strings are expected.
- Duplicate import of the same quiz.

**Session**
- App backgrounded or killed mid-session: autosave plus resume (§5.3). Phone call or notification interrupts: stopwatch pauses.
- Rapid double taps on options or Next; rotating the device; dynamic font scaling; dark mode; very long questions and options (scrolling); Android back button.
- Practice mode must not allow changing the answer after feedback; Exam submit with unanswered questions must warn.
- Deleting a quiz or folder while a session or attempts reference it: sessions and attempts are snapshots, so they keep working; deleting folders asks for confirmation and states what will be removed.
- Moving a folder into its own descendant must be rejected.

**Storage and updates**
- Disk full, write failure: surface an error, keep the in-memory state, never show a falsely successful import.
- Schema migrations between app versions; unknown future data version.
- Corrupted DB row: skip with a log and a message, don't brick the app (a "Reset app data" option in settings).

**Platform**
- Confirm no network requests happen anywhere (airplane-mode test in the release checklist).
- Accessibility labels on options and results; correct/incorrect must not be signaled by color alone (add ✓/✗ icons).
- Turkish locale: case-insensitive search must handle `İ/ı` correctly (use locale-aware comparison).

## 8. Testing approach

- **Unit tests (Jest)** for all pure logic: `normalizeInput`, backslash repair, Zod schema and error messages, `segment()`, `sessionEngine`, scoring, retry-wrong building. These carry most of the risk, so build them test-first with a corpus of real LLM-style outputs, including broken ones.
- Repository tests against in-memory SQLite or a fake.
- A few component tests for the option states and the import error display.
- Manual device checklist per release: airplane mode, kill/resume mid-exam, large quiz (1000+ questions), math-heavy quiz, Turkish characters, dark mode, small and large fonts.

## 9. Implementation roadmap

Each phase ends in a runnable, demonstrable state. Each phase's coding session starts from this spec plus a short prompt naming the phase, its acceptance criteria, and what is out of scope.

0. **Scaffold and math spike.** Expo + TypeScript + Expo Router, lint, Jest. Build a throwaway screen proving `MathText` meets §5.4 criteria on real devices in airplane mode. **Go/no-go gate** for the rendering approach.
1. **Domain core (pure TypeScript, no UI).** Types, input normalization and backslash repair, Zod schemas, human-friendly error mapping, `segment()`, hashing. Test-first with a corpus of good and bad inputs.
2. **Persistence.** SQLite schema, migrations, repositories, in-memory fakes, tests.
3. **Stores and session engine.** `libraryStore`, `sessionStore`, `settingsStore`, pure `sessionEngine` (start, answer, submit, retry-wrong, shuffle, timer math), autosave. Tests.
4. **App shell, Library, Import.** Tabs, library and folder screens, folder CRUD, import modal with paste/file/prompt helper, preview and warnings, quiz detail.
5. **Practice mode player.** Question screen, `MathText` integrated, option states, explanation.
6. **Exam mode, results, review, retry.** Stopwatch, question grid, submit flow, results screen, review screen, redo wrong, history tab.
7. **Resilience.** Resume after kill, background timer pause, back-button guards, error boundaries, storage-failure handling, large-quiz performance pass.
8. **i18n, settings, theming, accessibility, polish.** Turkish and English strings, language switch, dark mode, icons, empty states, onboarding hint that points to the prompt helper.
9. **Release prep (optional for now; only when the owner decides to publish).** App icon and splash, store listings and privacy statement ("collects no data"), EAS builds, final device checklist, TestFlight / internal testing.

## 10. Left to the builder

Exact UI styling and color palette, library choice for IDs/hashing, choice of bottom-sheet and icon libraries, folder drag-and-drop versus a "Move to…" action (a "Move to…" screen is acceptable for v1), exact wording of messages, and the app/bundle identifier.

## 11. Open items

- **Decided:** the owner has an iPhone and no Android device. The Phase 0 acceptance criteria are verified on the iPhone. Android is checked only on an emulator and treated as best effort; its smoothness is not guaranteed until someone tests on a real Android phone.
- **Decided:** store accounts are deferred. For now only the owner uses the app, so v1 runs on their own iPhone (Expo Go or a development build) and Phase 9 (store release) is optional and can be skipped or postponed. Apple's Developer Program costs about 99 USD per year and Google Play about 25 USD once, if the owner chooses to publish later.
- App store name availability and bundle identifier.
- **(my call)** Release path: TestFlight / Play internal testing first, public release afterwards.
