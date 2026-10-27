export type Id = string;

export interface Folder {
  id: Id;
  parentId: Id | null;
  name: string;
  createdAt: number;
}

export interface QuizSummary {
  id: Id;
  folderId: Id | null;
  title: string;
  description?: string;
  language?: string;
  questionCount: number;
  createdAt: number;
  sourceHash: string;
  lastAttempt?: { score: number; total: number; finishedAt: number };
}

export interface Option {
  id: Id;
  text: string;
}

export interface Question {
  id: Id;
  text: string;
  options: Option[];
  correctOptionId: Id;
  explanation?: string;
  tags?: string[];
}

export type Mode = 'practice' | 'exam';

export interface QuestionRef {
  quizId: Id | null;
  questionId: Id;
  optionOrder?: Id[];
}

export type Scope =
  | { kind: 'quiz'; quizId: Id }
  | { kind: 'folder'; folderId: Id }
  | { kind: 'retry-wrong'; parentAttemptId: Id }
  | { kind: 'retake'; parentAttemptId: Id };

export interface Session {
  id: Id;
  mode: Mode;
  scope: Scope;
  questionRefs: QuestionRef[];
  /** Present only for retry-wrong and retake, whose questions may no longer exist in the library. */
  snapshot?: Question[];
  answers: Record<Id, Id>;
  currentIndex: number;
  startedAt: number;
  activeMs: number;
  resumedAt: number | null;
}

export interface Attempt {
  id: Id;
  quizId: Id | null;
  title: string;
  mode: Mode;
  scope: Scope;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  questions: Question[];
  answers: Record<Id, Id>;
  correctCount: number;
  total: number;
}

export type AttemptSummary = Omit<Attempt, 'questions' | 'answers'>;

export interface Segment {
  kind: 'text' | 'inline' | 'display';
  value: string;
}

export interface ImportIssue {
  code: string;
  params: Record<string, string | number>;
}

export type ImportWarning = ImportIssue;

export interface ParsedQuiz {
  title: string;
  description?: string;
  language?: string;
  questions: Question[];
  sourceHash: string;
}

export type ImportFailureKind = 'empty' | 'too-large' | 'not-utf8' | 'syntax' | 'wrong-shape' | 'schema';

export type ImportResult =
  | { ok: true; quiz: ParsedQuiz; warnings: ImportWarning[] }
  | { ok: false; kind: ImportFailureKind; issues: ImportIssue[]; moreCount: number };
