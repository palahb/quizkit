import type { Attempt, Id, Mode, Question, QuestionRef, Scope, Session } from '@/domain/types';

// Pure, immutable session logic. No React, no storage, no clocks: callers pass `now`.

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const usesSnapshot = (scope: Scope) => scope.kind === 'retry-wrong' || scope.kind === 'retake';

export function createSession(args: {
  id: Id;
  now: number;
  mode: Mode;
  scope: Scope;
  items: { quizId: Id | null; question: Question }[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  rng: () => number;
}): Session {
  const items = args.shuffleQuestions ? shuffled(args.items, args.rng) : args.items;
  const questionRefs: QuestionRef[] = items.map(({ quizId, question }) => {
    const ref: QuestionRef = { quizId, questionId: question.id };
    if (args.shuffleOptions) ref.optionOrder = shuffled(question.options, args.rng).map((o) => o.id);
    return ref;
  });
  const session: Session = {
    id: args.id,
    mode: args.mode,
    scope: args.scope,
    questionRefs,
    answers: {},
    currentIndex: 0,
    startedAt: args.now,
    activeMs: 0,
    resumedAt: args.now,
  };
  if (usesSnapshot(args.scope)) session.snapshot = items.map((i) => i.question);
  return session;
}

/** Returns the question with its options in the given order (ids unchanged). */
export function applyOptionOrder(q: Question, order?: Id[]): Question {
  if (!order) return q;
  const byId = new Map(q.options.map((o) => [o.id, o]));
  const options = order.map((id) => byId.get(id)).filter((o) => o !== undefined);
  return options.length === q.options.length ? { ...q, options } : q;
}

/** Practice: the first pick is final. Exam: picks can change until submit. */
export function answerQuestion(s: Session, questionId: Id, optionId: Id): Session {
  if (s.mode === 'practice' && questionId in s.answers) return s;
  return { ...s, answers: { ...s.answers, [questionId]: optionId } };
}

/** Absolute navigation, clamped to the question range. */
export function goTo(s: Session, index: number): Session {
  const clamped = Math.max(0, Math.min(s.questionRefs.length - 1, index));
  return clamped === s.currentIndex ? s : { ...s, currentIndex: clamped };
}

export function pauseClock(s: Session, now: number): Session {
  if (s.resumedAt === null) return s;
  return { ...s, activeMs: s.activeMs + Math.max(0, now - s.resumedAt), resumedAt: null };
}

export function resumeClock(s: Session, now: number): Session {
  return s.resumedAt === null ? { ...s, resumedAt: now } : s;
}

export function elapsedMs(s: Session, now: number): number {
  return s.activeMs + (s.resumedAt === null ? 0 : Math.max(0, now - s.resumedAt));
}

/**
 * Builds the finished attempt. `questions` are the session's questions in session order,
 * with option order already applied (what the user saw). The attempt id is the session id.
 */
export function finishSession(s: Session, questions: Question[], title: string, quizId: Id | null, now: number): Attempt {
  const correctCount = questions.filter((q) => s.answers[q.id] === q.correctOptionId).length;
  return {
    id: s.id,
    quizId,
    title,
    mode: s.mode,
    scope: s.scope,
    startedAt: s.startedAt,
    finishedAt: now,
    durationMs: elapsedMs(s, now),
    questions,
    answers: s.answers,
    correctCount,
    total: questions.length,
  };
}

/** Questions answered incorrectly or left unanswered. */
export function wrongQuestions(a: Attempt): Question[] {
  return a.questions.filter((q) => a.answers[q.id] !== q.correctOptionId);
}

function sessionFromQuestions(questions: Question[], scope: Scope, mode: Mode, id: Id, now: number): Session {
  return createSession({
    id,
    now,
    mode,
    scope,
    items: questions.map((question) => ({ quizId: null, question })),
    shuffleQuestions: false,
    shuffleOptions: false,
    rng: Math.random,
  });
}

/** Null when nothing was wrong, so an empty session is never created. */
export function buildRetrySession(a: Attempt, mode: Mode, id: Id, now: number): Session | null {
  const wrong = wrongQuestions(a);
  if (wrong.length === 0) return null;
  return sessionFromQuestions(wrong, { kind: 'retry-wrong', parentAttemptId: a.id }, mode, id, now);
}

export function buildRetakeSession(a: Attempt, mode: Mode, id: Id, now: number): Session {
  return sessionFromQuestions(a.questions, { kind: 'retake', parentAttemptId: a.id }, mode, id, now);
}
