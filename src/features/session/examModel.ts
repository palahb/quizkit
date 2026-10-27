import type { Id } from '@/domain/types';
import type { TFunction } from '@/i18n';

export function unansweredCount(questionIds: Id[], answers: Record<Id, Id>): number {
  return questionIds.filter((id) => !(id in answers)).length;
}

export function submitMessage(t: TFunction, unanswered: number): string {
  return unanswered === 0 ? t('session.submitAllAnswered') : t('session.submitUnanswered', { n: unanswered });
}
