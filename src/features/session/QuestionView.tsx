import { useRef } from 'react';
import { View } from 'react-native';

import { ExplanationPanel } from '@/components/ExplanationPanel';
import { OptionRow, type OptionState } from '@/components/OptionRow';
import { QuestionCard } from '@/components/QuestionCard';
import type { Id, Mode, Question } from '@/domain/types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface QuestionViewProps {
  question: Question;
  mode: Mode;
  pickedOptionId: Id | undefined;
  onPick(optionId: Id): void;
  /** Exam review after submit: show correct/wrong marks and the explanation. */
  reveal?: boolean;
}

export function optionState(mode: Mode, reveal: boolean, question: Question, optionId: Id, picked: Id | undefined): OptionState {
  const showAnswer = reveal || (mode === 'practice' && picked !== undefined);
  if (!showAnswer) return picked === optionId ? 'selected' : 'idle';
  if (optionId === question.correctOptionId) return picked === undefined ? 'missed' : 'correct';
  return picked === optionId ? 'wrong' : 'idle';
}

/** One question with its options. Practice mode locks after the first pick and reveals the answer. */
export function QuestionView({ question, mode, pickedOptionId, onPick, reveal = false }: QuestionViewProps) {
  // Guards against a double tap landing before the store update re-renders this view.
  const lockedFor = useRef<Id | null>(null);
  const answered = pickedOptionId !== undefined;
  const locked = reveal || (mode === 'practice' && answered);

  const press = (optionId: Id) => {
    if (locked) return;
    if (mode === 'practice') {
      if (lockedFor.current === question.id) return;
      lockedFor.current = question.id;
    }
    onPick(optionId);
  };

  return (
    <View style={{ gap: 10 }}>
      <QuestionCard question={question} />
      {question.options.map((o, i) => (
        <OptionRow
          key={o.id}
          letter={LETTERS[i]}
          text={o.text}
          state={optionState(mode, reveal, question, o.id, pickedOptionId)}
          onPress={() => press(o.id)}
          disabled={locked}
        />
      ))}
      {reveal || (mode === 'practice' && answered) ? <ExplanationPanel text={question.explanation} /> : null}
    </View>
  );
}
