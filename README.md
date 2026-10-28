<p align="center">
  <img src="assets/images/icon.png" width="96" alt="Quizkit icon: two books and a check mark">
</p>

<h1 align="center">Quizkit</h1>

<p align="center">An offline quiz app for your own study material.<br>
<a href="README.tr.md">Türkçe</a></p>

---

Turn your notes, PDFs or past exam questions into quizzes with ChatGPT or Claude, import them as JSON, and practice anywhere. No internet, no account, nothing leaves your phone.

Quizkit started as a way to drill past exam questions for Turkey's Open Education Faculty (AÖF) on the metro, but it works for any subject.

## Features

- **Import by pasting or picking a `.json` file.** Mistakes are explained in plain words: question number, line and column, and the faulty text. Common AI slips (text around the JSON, single LaTeX backslashes, unescaped quotation marks) are repaired automatically, with a warning.
- **Whole courses in one file.** A single JSON can hold dozens of quizzes in nested folders. The preview shows what is new, what already exists and what has errors before anything is saved.
- **Two modes.** Practice shows right or wrong and the explanation after each question. Exam is silent, runs a stopwatch, and reveals everything at the end.
- **Learn from mistakes.** Review every answer, redo only the questions you got wrong, and look back through your history.
- **Math.** LaTeX formulas (`$...$` and `$$...$$`) in questions, options and explanations, rendered offline with KaTeX.
- **Folders, Turkish and English interface, dark mode.**
- **Fully offline and private.** No network requests, no accounts, no analytics. Everything is stored on the device.

## Making quizzes with AI

Quizkit doesn't generate questions itself. You ask an AI, using a ready-made prompt that teaches it the format:

1. Pick a prompt in the app's **Prompts** tab, or from [**docs/prompts**](docs/prompts/README.md).
2. Paste it into ChatGPT, Claude or another AI, together with your material.
3. Paste the reply into Quizkit's **Import** screen, or save it as a `.json` file.

There are prompts for notes and PDFs, past exam questions, a whole course in folders, math, terms and definitions, a topic with no source material, and for fixing a broken JSON. Each comes in English and Turkish.

The format is documented in [docs/format.md](docs/format.md), with ready-to-import files in [examples/](examples/). You can also write or generate the JSON on a computer and send the file to your phone.

A minimal quiz looks like this:

```json
{
  "schemaVersion": 1,
  "title": "Biology – Cell Structure",
  "questions": [
    {
      "question": "Which organelle produces most of the cell's ATP?",
      "options": ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus", "Lysosome"],
      "answer": "C",
      "explanation": "Mitochondria carry out cellular respiration, which produces most of the ATP."
    }
  ]
}
```

## Running it

Quizkit isn't on the App Store. To run it from source:

```bash
git clone https://github.com/palahb/quizkit.git
cd quizkit
npm install
npx expo start
```

Then scan the QR code with the [Expo Go](https://expo.dev/go) app. Expo Go on a physical iPhone requires signing in to a free Expo account, both in the app and on the computer (`npx expo login`).

Requirements: Node.js 22 or newer and Expo Go for SDK 58.

## Development

```bash
npm test             # unit and component tests (Jest)
npm run typecheck    # TypeScript
npm run build:docs   # regenerate docs/prompts, docs/format*.md and examples/ from the app's prompts
npm run build:icons  # regenerate app icons from assets/branding/*.svg
npm run build:katex  # regenerate the offline KaTeX stylesheet
```

Built with Expo SDK 58, React Native, TypeScript, Expo Router, Zustand, Zod, expo-sqlite and KaTeX.

| Folder | What's inside |
|---|---|
| `src/domain` | Pure logic: JSON import and repair, LaTeX handling, prompts. |
| `src/engine` | Quiz sessions: answers, stopwatch, scoring, redo-wrong. |
| `src/db` | SQLite schema, migrations and repositories. |
| `src/stores` | App state (Zustand). |
| `src/app` | Screens (Expo Router). |
| `docs/superpowers` | The original design document and implementation plan. |

The prompt docs and examples are generated from `src/domain/prompts.ts`, and a test fails if they fall out of sync, so edit the prompts there and run `npm run build:docs`.

## License

[MIT](LICENSE)
