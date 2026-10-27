import type { Attempt, ParsedQuiz, Question, Session } from '@/domain/types';

let n = 0;
const uid = (p: string) => `${p}-${++n}`;

export function makeQuestion(text = 'Q'): Question {
  const options = ['a', 'b', 'c'].map((t) => ({ id: uid('o'), text: t }));
  return { id: uid('q'), text, options, correctOptionId: options[1].id, explanation: 'because' };
}

export function makeQuiz(count = 3, title = 'Quiz'): ParsedQuiz {
  return {
    title,
    questions: Array.from({ length: count }, (_, i) => makeQuestion(`Q${i + 1}`)),
    sourceHash: uid('hash'),
  };
}

export function makeAttempt(over: Partial<Attempt> = {}): Attempt {
  const questions = [makeQuestion('A1'), makeQuestion('A2')];
  return {
    id: uid('att'),
    quizId: null,
    title: 'Quiz',
    mode: 'exam',
    scope: { kind: 'quiz', quizId: 'none' },
    startedAt: 1000,
    finishedAt: 2000,
    durationMs: 1000,
    questions,
    answers: { [questions[0].id]: questions[0].correctOptionId },
    correctCount: 1,
    total: 2,
    ...over,
  };
}

export function makeSession(over: Partial<Session> = {}): Session {
  return {
    id: uid('s'),
    mode: 'practice',
    scope: { kind: 'quiz', quizId: 'q1' },
    questionRefs: [{ quizId: 'q1', questionId: 'x' }],
    answers: {},
    currentIndex: 0,
    startedAt: 1,
    activeMs: 0,
    resumedAt: 1,
    ...over,
  };
}
