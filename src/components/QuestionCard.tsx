import type { Question } from '@/domain/types';

import { MathText } from './math/MathText';
import { Card } from './ui';

export function QuestionCard({ question }: { question: Question }) {
  return (
    <Card>
      <MathText text={question.text} fontSize={18} />
    </Card>
  );
}
