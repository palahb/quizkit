import { z } from 'zod';

// Field-level schemas. parseQuizJson checks each field on its own so every problem maps
// to one friendly issue code with the question number, instead of raw Zod paths.

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_QUESTIONS = 5000;
export const MAX_TITLE = 120;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_REPORTED_ISSUES = 10;

const nonEmpty = z.string().trim().min(1);

export const schemaVersionSchema = z.literal(1);
export const titleSchema = z.string().trim().min(1).max(MAX_TITLE);
export const optionalTextSchema = z.string().trim().min(1).optional().catch(undefined);
export const questionsArraySchema = z.array(z.unknown()).min(1).max(MAX_QUESTIONS);

export const questionTextSchema = nonEmpty;
export const optionsArraySchema = z.array(z.unknown()).min(MIN_OPTIONS).max(MAX_OPTIONS);
export const optionTextSchema = nonEmpty;
export const answerLetterSchema = z
  .string()
  .trim()
  .regex(/^[A-Fa-f]$/)
  .transform((s) => s.toUpperCase());
export const tagsSchema = z.array(z.string().trim().min(1)).optional().catch(undefined);
export const idSchema = z.union([z.string(), z.number()]).transform(String).optional().catch(undefined);

/** The documented shape of one question in import JSON (version 1). */
export const importQuestionSchema = z.object({
  question: questionTextSchema,
  options: z.array(optionTextSchema).min(MIN_OPTIONS).max(MAX_OPTIONS),
  answer: answerLetterSchema,
  explanation: optionalTextSchema,
  tags: tagsSchema,
  id: idSchema,
});

/** The documented shape of an import file (version 1). */
export const importQuizSchema = z.object({
  schemaVersion: schemaVersionSchema,
  title: titleSchema,
  description: optionalTextSchema,
  language: optionalTextSchema,
  questions: z.array(importQuestionSchema).min(1).max(MAX_QUESTIONS),
});

export type ImportQuizJson = z.infer<typeof importQuizSchema>;
