import katex from 'katex';

import { hashString } from './hash';
import { newId } from './ids';
import {
  answerLetterSchema,
  idSchema,
  MAX_INPUT_BYTES,
  MAX_REPORTED_ISSUES,
  optionalTextSchema,
  optionsArraySchema,
  optionTextSchema,
  questionsArraySchema,
  questionTextSchema,
  schemaVersionSchema,
  tagsSchema,
  titleSchema,
} from './importSchema';
import { segment } from './mathSegments';
import { extractJson, repairBackslashes, restoreLatexEscapes } from './normalizeInput';
import type { ImportFailureKind, ImportIssue, ImportResult, ImportWarning, Question } from './types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function failure(kind: ImportFailureKind, issues: ImportIssue[]): ImportResult {
  return {
    ok: false,
    kind,
    issues: issues.slice(0, MAX_REPORTED_ISSUES),
    moreCount: Math.max(0, issues.length - MAX_REPORTED_ISSUES),
  };
}

/** Line/column (1-based) of an index in text. */
function lineCol(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  return { line, column: index - before.lastIndexOf('\n') };
}

/** True when brackets or a string are still open at the end (LLM stopped early). */
function isTruncated(json: string): boolean {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const c of json) {
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
  }
  return inString || depth > 0;
}

function syntaxIssue(json: string, error: unknown): ImportIssue {
  const message = error instanceof Error ? error.message : String(error);
  const trailing = /,\s*[}\]]/.exec(json);
  let hint: string;
  let index: number;
  if (trailing) {
    hint = 'trailing_comma';
    index = trailing.index;
  } else if (isTruncated(json)) {
    hint = 'truncated';
    index = json.length;
  } else {
    const pos = /position (\d+)/.exec(message);
    index = pos ? Number(pos[1]) : 0;
    hint = (json.match(/"/g)?.length ?? 0) % 2 === 1 ? 'missing_quote' : 'unknown';
  }
  const { line, column } = lineCol(json, index);
  const snippet = json.slice(Math.max(0, index - 20), index + 20);
  return { code: 'syntax', params: { line, column, snippet, hint } };
}

function mathWarnings(text: string, question: number, field: string): ImportWarning[] {
  const out: ImportWarning[] = [];
  const { segments, unmatchedDollars } = segment(text);
  if (unmatchedDollars > 0) out.push({ code: 'odd_dollar', params: { question, field } });
  for (const s of segments) {
    if (s.kind === 'text') continue;
    try {
      katex.renderToString(s.value, { throwOnError: true, displayMode: s.kind === 'display' });
    } catch {
      out.push({ code: 'math_unparseable', params: { question, field, snippet: s.value.slice(0, 40) } });
    }
  }
  return out;
}

interface CheckedQuestion {
  question: Question;
  letter: string;
  rawOptions: string[];
}

function checkQuestion(raw: unknown, n: number, issues: ImportIssue[], seenIds: Set<string>): CheckedQuestion | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push({ code: 'question_text_missing', params: { question: n } });
    return null;
  }
  const r = raw as Record<string, unknown>;
  const before = issues.length;

  const text = questionTextSchema.safeParse(r.question);
  if (!text.success) issues.push({ code: 'question_text_missing', params: { question: n } });

  const options: string[] = [];
  const optionsArr = optionsArraySchema.safeParse(r.options);
  if (!optionsArr.success) {
    issues.push({ code: 'options_count', params: { question: n, count: Array.isArray(r.options) ? r.options.length : 0 } });
  } else {
    optionsArr.data.forEach((o, i) => {
      const parsed = optionTextSchema.safeParse(o);
      if (parsed.success) options.push(parsed.data);
      else issues.push({ code: typeof o === 'string' ? 'option_empty' : 'option_not_string', params: { question: n, option: i + 1 } });
    });
  }

  const answer = answerLetterSchema.safeParse(r.answer);
  let letterIndex = -1;
  if (!answer.success) {
    issues.push({ code: 'answer_invalid', params: { question: n, answer: String(r.answer) } });
  } else {
    letterIndex = LETTERS.indexOf(answer.data);
    if (optionsArr.success && letterIndex >= optionsArr.data.length) {
      issues.push({
        code: 'answer_out_of_range',
        params: { question: n, answer: answer.data, optionCount: optionsArr.data.length },
      });
    }
  }

  const id = idSchema.parse(r.id);
  if (id !== undefined) {
    if (seenIds.has(id)) issues.push({ code: 'duplicate_id', params: { question: n, id } });
    seenIds.add(id);
  }

  if (issues.length > before || !text.success || !answer.success) return null;

  const optionObjs = options.map((o) => ({ id: newId(), text: o }));
  const question: Question = {
    id: newId(),
    text: text.data,
    options: optionObjs,
    correctOptionId: optionObjs[letterIndex].id,
  };
  const explanation = optionalTextSchema.parse(r.explanation);
  if (explanation !== undefined) question.explanation = explanation;
  const tags = tagsSchema.parse(r.tags);
  if (tags !== undefined) question.tags = tags;
  return { question, letter: answer.data, rawOptions: options };
}

/** Validates pasted or file-loaded quiz JSON. Never throws. */
export function parseQuizJson(raw: string): ImportResult {
  if (raw.trim() === '') return failure('empty', [{ code: 'empty', params: {} }]);
  if (raw.length > MAX_INPUT_BYTES) return failure('too-large', [{ code: 'too_large', params: { maxMb: 10 } }]);
  if (raw.includes('\u0000')) return failure('not-utf8', [{ code: 'not_utf8', params: {} }]);

  const extracted = extractJson(raw);
  if (extracted === null) {
    const trimmed = raw.trim().replace(/^﻿/, '');
    if (trimmed.startsWith('[') || trimmed.startsWith('"') || /^[\d-]|^(true|false|null)\b/.test(trimmed)) {
      return failure('wrong-shape', [{ code: 'wrong_shape', params: {} }]);
    }
    return failure('syntax', [syntaxIssue(trimmed, null)]);
  }

  const repaired = repairBackslashes(extracted);
  let parsed: unknown;
  try {
    parsed = JSON.parse(repaired.json);
  } catch (e) {
    return failure('syntax', [syntaxIssue(repaired.json, e)]);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return failure('wrong-shape', [{ code: 'wrong_shape', params: {} }]);
  }
  const restored = restoreLatexEscapes(parsed);
  const data = restored.value as Record<string, unknown>;

  const issues: ImportIssue[] = [];
  if (!schemaVersionSchema.safeParse(data.schemaVersion).success) {
    issues.push({ code: 'schema_version_unsupported', params: { found: String(data.schemaVersion) } });
  }
  const title = titleSchema.safeParse(data.title);
  if (!title.success) issues.push({ code: 'title_invalid', params: { max: 120 } });
  const questionsArr = questionsArraySchema.safeParse(data.questions);
  if (!questionsArr.success) {
    issues.push({ code: 'questions_count', params: { count: Array.isArray(data.questions) ? data.questions.length : 0 } });
    return failure('schema', issues);
  }

  const seenIds = new Set<string>();
  const checked = questionsArr.data.map((q, i) => checkQuestion(q, i + 1, issues, seenIds));
  if (issues.length > 0 || !title.success) return failure('schema', issues);
  const good = checked as CheckedQuestion[];

  const warnings: ImportWarning[] = [];
  const fixedCount = repaired.fixed + restored.fixed;
  if (fixedCount > 0) warnings.push({ code: 'backslashes_repaired', params: { count: fixedCount } });

  const imageCount = questionsArr.data.filter(
    (q) => q !== null && typeof q === 'object' && ('image' in q || 'images' in q),
  ).length;
  if (imageCount > 0) warnings.push({ code: 'images_unsupported', params: { count: imageCount } });

  const seenTexts = new Set<string>();
  good.forEach(({ question, rawOptions }, i) => {
    const n = i + 1;
    warnings.push(...mathWarnings(question.text, n, 'question'));
    rawOptions.forEach((o) => warnings.push(...mathWarnings(o, n, 'option')));
    if (question.explanation) warnings.push(...mathWarnings(question.explanation, n, 'explanation'));
    if (new Set(rawOptions).size !== rawOptions.length) warnings.push({ code: 'duplicate_option', params: { question: n } });
    if (seenTexts.has(question.text)) warnings.push({ code: 'duplicate_question', params: { question: n } });
    seenTexts.add(question.text);
  });

  const description = optionalTextSchema.parse(data.description);
  const language = optionalTextSchema.parse(data.language);
  const sourceHash = hashString(
    JSON.stringify({
      title: title.data,
      questions: good.map((g) => ({
        text: g.question.text,
        options: g.rawOptions,
        answer: g.letter,
        explanation: g.question.explanation ?? null,
      })),
    }),
  );

  return {
    ok: true,
    quiz: {
      title: title.data,
      ...(description !== undefined && { description }),
      ...(language !== undefined && { language }),
      questions: good.map((g) => g.question),
      sourceHash,
    },
    warnings,
  };
}
