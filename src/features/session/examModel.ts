import type { Id, Mode } from '@/domain/types';
import type { TFunction } from '@/i18n';

export function unansweredCount(questionIds: Id[], answers: Record<Id, Id>): number {
  return questionIds.filter((id) => !(id in answers)).length;
}

export function submitMessage(t: TFunction, unanswered: number): string {
  return unanswered === 0 ? t('session.submitAllAnswered') : t('session.submitUnanswered', { n: unanswered });
}

/**
 * Exam always confirms. Practice confirms only when something is unanswered, which also
 * catches a double tap on Next that lands on the Finish button.
 */
export function needsSubmitConfirm(mode: Mode, unanswered: number): boolean {
  return mode === 'exam' || unanswered > 0;
}
