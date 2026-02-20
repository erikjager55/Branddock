'use client';

import { useState } from 'react';
import { Button, Badge, ProgressBar } from '@/components/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Interview, InterviewQuestion, QuestionType } from '../../types/interview.types';

const TYPE_LABELS: Record<QuestionType, string> = {
  OPEN: 'Open',
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTI_SELECT: 'Multi Select',
  RATING_SCALE: 'Rating Scale',
  RANKING: 'Ranking',
};

interface ConductStepProps {
  interview: Interview;
  onUpdateQuestion: (questionId: string, data: Record<string, unknown>) => void;
  onSaveNotes: (data: Record<string, unknown>) => void;
  onComplete: () => void;
  isUpdating: boolean;
  isCompleting: boolean;
}

export function ConductStep({
  interview,
  onUpdateQuestion,
  onSaveNotes,
  onComplete,
  isUpdating,
  isCompleting,
}: ConductStepProps) {
  const questions = interview.questions ?? [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [notes, setNotes] = useState(interview.generalNotes ?? '');
  const [localAnswers, setLocalAnswers] = useState<Record<string, {
    answerText?: string;
    answerOptions?: string[];
    answerRating?: number;
  }>>({});

  const answeredCount = questions.filter((q) => q.isAnswered).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const currentQuestion = questions[currentIdx];

  const getLocalAnswer = (q: InterviewQuestion) => {
    return localAnswers[q.id] ?? {};
  };

  const setLocalAnswer = (questionId: string, updates: Record<string, unknown>) => {
    setLocalAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...updates },
    }));
  };

  const handleSaveAnswer = (q: InterviewQuestion) => {
    const local = getLocalAnswer(q);
    onUpdateQuestion(q.id, {
      ...local,
      isAnswered: true,
    });
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleNext = () => {
    if (currentQuestion) {
      handleSaveAnswer(currentQuestion);
    }
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleSaveAndComplete = () => {
    onSaveNotes({ generalNotes: notes });
    onComplete();
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">
          No questions to conduct. Go back to the Questions step to add questions first.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Conduct Interview</h2>
          <span className="text-sm text-gray-500">
            {answeredCount} of {questions.length} answered ({progress}%)
          </span>
        </div>
        <ProgressBar value={progress} color="emerald" size="sm" />
      </div>

      {/* Question navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          onClick={handlePrev}
          disabled={currentIdx === 0}
        >
          Previous
        </Button>
        <span className="text-sm font-medium text-gray-600">
          Question {currentIdx + 1} of {questions.length}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleNext}
          disabled={currentIdx === questions.length - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Current question */}
      {currentQuestion && (
        <div className="p-6 bg-white border border-gray-200 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="info" size="sm">
              {TYPE_LABELS[currentQuestion.questionType]}
            </Badge>
            {currentQuestion.linkedAsset && (
              <Badge variant="default" size="sm">
                {currentQuestion.linkedAsset.name}
              </Badge>
            )}
            {currentQuestion.isAnswered && (
              <Badge variant="success" size="sm">Answered</Badge>
            )}
          </div>
          <p className="text-gray-900 font-medium mb-4">{currentQuestion.questionText}</p>

          {/* Answer area based on question type */}
          <AnswerInput
            question={currentQuestion}
            localAnswer={getLocalAnswer(currentQuestion)}
            onUpdate={(updates) => setLocalAnswer(currentQuestion.id, updates)}
          />

          <div className="mt-4 flex justify-end">
            <Button
              variant="cta"
              size="sm"
              onClick={() => handleSaveAnswer(currentQuestion)}
              isLoading={isUpdating}
            >
              Save Answer
            </Button>
          </div>
        </div>
      )}

      {/* General notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          General Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add general notes about the interview..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
      </div>

      {/* Complete button */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={() => onSaveNotes({ generalNotes: notes })}
          isLoading={isUpdating}
        >
          Save Progress
        </Button>
        <Button
          variant="cta"
          size="md"
          onClick={handleSaveAndComplete}
          isLoading={isCompleting}
          disabled={answeredCount < questions.length}
        >
          Complete Interview
        </Button>
      </div>
    </div>
  );
}

// ─── Answer Input Sub-component ──────────────────────────────

function AnswerInput({
  question,
  localAnswer,
  onUpdate,
}: {
  question: InterviewQuestion;
  localAnswer: { answerText?: string; answerOptions?: string[]; answerRating?: number };
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const textValue = localAnswer.answerText ?? question.answerText ?? '';
  const selectedOptions = localAnswer.answerOptions ?? question.answerOptions ?? [];
  const ratingValue = localAnswer.answerRating ?? question.answerRating ?? 0;

  switch (question.questionType) {
    case 'OPEN':
      return (
        <textarea
          value={textValue}
          onChange={(e) => onUpdate({ answerText: e.target.value })}
          placeholder="Enter response..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
      );

    case 'MULTIPLE_CHOICE':
      return (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedOptions.includes(opt)
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={selectedOptions.includes(opt)}
                onChange={() => onUpdate({ answerOptions: [opt] })}
                className="text-emerald-500"
              />
              <span className="text-sm text-gray-900">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'MULTI_SELECT':
      return (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const isSelected = selectedOptions.includes(opt);
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    const updated = isSelected
                      ? selectedOptions.filter((o) => o !== opt)
                      : [...selectedOptions, opt];
                    onUpdate({ answerOptions: updated });
                  }}
                  className="text-emerald-500"
                />
                <span className="text-sm text-gray-900">{opt}</span>
              </label>
            );
          })}
        </div>
      );

    case 'RATING_SCALE':
      return (
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onUpdate({ answerRating: n })}
              className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-lg font-semibold transition-colors ${
                ratingValue === n
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );

    case 'RANKING':
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">Click options in order of preference:</p>
          {question.options.map((opt) => {
            const rank = selectedOptions.indexOf(opt);
            const isRanked = rank !== -1;
            return (
              <button
                key={opt}
                onClick={() => {
                  const updated = isRanked
                    ? selectedOptions.filter((o) => o !== opt)
                    : [...selectedOptions, opt];
                  onUpdate({ answerOptions: updated });
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  isRanked
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isRanked && (
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-medium">
                    {rank + 1}
                  </span>
                )}
                <span className="text-sm text-gray-900">{opt}</span>
              </button>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}
