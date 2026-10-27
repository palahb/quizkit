import type { Attempt, Mode, Question, Scope, Session } from '@/domain/types';

import { mulberry32 } from '../rng';
import {
  answerQuestion,
  applyOptionOrder,
  buildRetakeSession,
  buildRetrySession,
  createSession,
  elapsedMs,
  finishSession,
  goTo,
  pauseClock,
  resumeClock,
  wrongQuestions,
} from '../sessionEngine';

function makeQuestions(n: number): Question[] {
  return Array.from({ length: n }, (_, i) => {
    const options = ['a', 'b', 'c', 'd'].map((t) => ({ id: `q${i}-${t}`, text: t }));
    return { id: `q${i}`, text: `Question ${i}`, options, correctOptionId: options[0].id };
  });
}

function start(
  questions: Question[],
  mode: Mode = 'practice',
  over: Partial<Parameters<typeof createSession>[0]> = {},
): Session {
  const scope: Scope = { kind: 'quiz', quizId: 'quiz1' };
  return createSession({
    id: 's1',
    now: 1000,
    mode,
    scope,
    items: questions.map((question) => ({ quizId: 'quiz1', question })),
    shuffleQuestions: false,
    shuffleOptions: false,
    rng: mulberry32(1),
    ...over,
  });
}

function finish(s: Session, questions: Question[]): Attempt {
  return finishSession(s, questions, 'Quiz', 'quiz1', 5000);
}

describe('createSession', () => {
  it('keeps order when not shuffling', () => {
    const qs = makeQuestions(5);
    const s = start(qs);
    expect(s.questionRefs.map((r) => r.questionId)).toEqual(qs.map((q) => q.id));
    expect(s.currentIndex).toBe(0);
    expect(s.resumedAt).toBe(1000);
    expect(s.activeMs).toBe(0);
    expect(s.snapshot).toBeUndefined();
  });

  it('shuffles deterministically into a permutation', () => {
    const qs = makeQuestions(20);
    const a = start(qs, 'practice', { shuffleQuestions: true, rng: mulberry32(1) });
    const b = start(qs, 'practice', { shuffleQuestions: true, rng: mulberry32(1) });
    const ids = a.questionRefs.map((r) => r.questionId);
    expect(ids).toEqual(b.questionRefs.map((r) => r.questionId));
    expect(ids).not.toEqual(qs.map((q) => q.id));
    expect([...ids].sort()).toEqual(qs.map((q) => q.id).sort());
  });

  it('records option order when shuffling options, and applyOptionOrder keeps ids', () => {
    const qs = makeQuestions(3);
    const s = start(qs, 'practice', { shuffleOptions: true });
    const order = s.questionRefs[0].optionOrder!;
    expect([...order].sort()).toEqual(qs[0].options.map((o) => o.id).sort());
    const reordered = applyOptionOrder(qs[0], order);
    expect(reordered.options.map((o) => o.id)).toEqual(order);
    expect(reordered.correctOptionId).toBe(qs[0].correctOptionId);
  });

  it('applyOptionOrder without an order returns the question unchanged', () => {
    const [q] = makeQuestions(1);
    expect(applyOptionOrder(q)).toBe(q);
  });

  it('attaches a snapshot for retry scopes', () => {
    const qs = makeQuestions(2);
    const s = start(qs, 'practice', { scope: { kind: 'retry-wrong', parentAttemptId: 'a1' } });
    expect(s.snapshot).toEqual(qs);
  });
});

describe('answering', () => {
  it('practice keeps the first pick', () => {
    const qs = makeQuestions(2);
    let s = start(qs, 'practice');
    s = answerQuestion(s, 'q0', 'q0-b');
    s = answerQuestion(s, 'q0', 'q0-a');
    expect(s.answers).toEqual({ q0: 'q0-b' });
  });

  it('exam keeps the last pick', () => {
    const qs = makeQuestions(2);
    let s = start(qs, 'exam');
    s = answerQuestion(s, 'q0', 'q0-b');
    s = answerQuestion(s, 'q0', 'q0-a');
    expect(s.answers).toEqual({ q0: 'q0-a' });
  });
});

describe('goTo', () => {
  it('clamps to the last index', () => {
    expect(goTo(start(makeQuestions(5)), 99).currentIndex).toBe(4);
  });
  it('clamps below zero', () => {
    expect(goTo(start(makeQuestions(5)), -3).currentIndex).toBe(0);
  });
  it('is absolute, so a double tap does not skip', () => {
    const s = start(makeQuestions(5));
    expect(goTo(goTo(s, 3), 3).currentIndex).toBe(3);
  });
});

describe('clock', () => {
  it('counts only foreground time', () => {
    let s = start(makeQuestions(1));
    s = pauseClock(s, 5000);
    expect(s.activeMs).toBe(4000);
    expect(s.resumedAt).toBeNull();
    expect(elapsedMs(s, 8000)).toBe(4000);
    s = resumeClock(s, 9000);
    expect(elapsedMs(s, 10000)).toBe(5000);
  });

  it('ignores a double pause and a double resume', () => {
    let s = start(makeQuestions(1));
    s = pauseClock(pauseClock(s, 5000), 7000);
    expect(s.activeMs).toBe(4000);
    s = resumeClock(resumeClock(s, 9000), 9500);
    expect(s.resumedAt).toBe(9000);
  });
});

describe('finishSession and wrong questions', () => {
  it('scores 7 of 10 with one skipped and three wrong', () => {
    const qs = makeQuestions(10);
    let s = start(qs, 'exam');
    for (let i = 0; i < 7; i++) s = answerQuestion(s, `q${i}`, `q${i}-a`);
    s = answerQuestion(s, 'q7', 'q7-b');
    s = answerQuestion(s, 'q8', 'q8-c');
    const a = finish(s, qs);
    expect(a.correctCount).toBe(7);
    expect(a.total).toBe(10);
    expect(a.durationMs).toBe(4000);
    expect(a.finishedAt).toBe(5000);
    expect(a.title).toBe('Quiz');
    expect(a.quizId).toBe('quiz1');
    expect(wrongQuestions(a).map((q) => q.id)).toEqual(['q7', 'q8', 'q9']);
  });

  it('finishes an exam with zero answers as 0/N', () => {
    const qs = makeQuestions(4);
    const a = finish(start(qs, 'exam'), qs);
    expect(a.correctCount).toBe(0);
    expect(a.total).toBe(4);
    expect(wrongQuestions(a)).toHaveLength(4);
  });

  it('works end to end with a single question', () => {
    const qs = makeQuestions(1);
    let s = start(qs);
    s = goTo(s, 1);
    s = answerQuestion(s, 'q0', 'q0-a');
    const a = finish(s, qs);
    expect(a.correctCount).toBe(1);
    expect(buildRetrySession(a, 'practice', 'r', 1)).toBeNull();
  });

  it('uses the time accumulated so far when finished while paused', () => {
    const qs = makeQuestions(1);
    const s = pauseClock(start(qs), 3000);
    expect(finishSession(s, qs, 'Quiz', 'quiz1', 9999).durationMs).toBe(2000);
  });
});

describe('retry and retake', () => {
  it('returns null when nothing was wrong', () => {
    const qs = makeQuestions(2);
    let s = start(qs);
    s = answerQuestion(s, 'q0', 'q0-a');
    s = answerQuestion(s, 'q1', 'q1-a');
    expect(buildRetrySession(finish(s, qs), 'exam', 'r1', 1)).toBeNull();
  });

  it('builds a retry with exactly the wrong questions, in the option order the user saw', () => {
    const qs = makeQuestions(3);
    let s = start(qs, 'exam', { shuffleOptions: true });
    s = answerQuestion(s, 'q0', 'q0-a');
    s = answerQuestion(s, 'q1', 'q1-b');
    const attempt = finish(s, qs.map((q, i) => applyOptionOrder(q, s.questionRefs[i].optionOrder)));
    const retry = buildRetrySession(attempt, 'practice', 'r1', 7)!;
    expect(retry.mode).toBe('practice');
    expect(retry.scope).toEqual({ kind: 'retry-wrong', parentAttemptId: attempt.id });
    expect(retry.snapshot!.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(retry.snapshot![0].options).toEqual(attempt.questions[1].options);
    expect(retry.questionRefs[0].optionOrder).toBeUndefined();
    expect(retry.questionRefs.map((r) => r.questionId)).toEqual(['q1', 'q2']);
    expect(retry.answers).toEqual({});
    expect(retry.startedAt).toBe(7);
  });

  it('builds a retake with every question', () => {
    const qs = makeQuestions(3);
    const attempt = finish(start(qs), qs);
    const retake = buildRetakeSession(attempt, 'exam', 'r2', 1);
    expect(retake.scope).toEqual({ kind: 'retake', parentAttemptId: attempt.id });
    expect(retake.snapshot!.map((q) => q.id)).toEqual(['q0', 'q1', 'q2']);
  });
});
