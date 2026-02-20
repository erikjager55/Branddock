'use client';

import { Badge, Button } from '@/components/shared';
import { Plus, BookOpen, Trash2, GripVertical } from 'lucide-react';
import type { Interview, InterviewQuestion, QuestionType } from '../../types/interview.types';

const TYPE_LABELS: Record<QuestionType, string> = {
  OPEN: 'Open',
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTI_SELECT: 'Multi Select',
  RATING_SCALE: 'Rating',
  RANKING: 'Ranking',
};

interface QuestionsStepProps {
  interview: Interview;
  onAddQuestion: () => void;
  onOpenTemplates: () => void;
  onDeleteQuestion: (questionId: string) => void;
}

export function QuestionsStep({
  interview,
  onAddQuestion,
  onOpenTemplates,
  onDeleteQuestion,
}: QuestionsStepProps) {
  const questions = interview.questions ?? [];

  // Group questions by linked asset
  const grouped = questions.reduce<Record<string, InterviewQuestion[]>>((acc, q) => {
    const key = q.linkedAsset?.name ?? 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Interview Questions</h2>
          <p className="text-sm text-gray-500">
            {questions.length} question{questions.length !== 1 ? 's' : ''} added
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={BookOpen}
            onClick={onOpenTemplates}
          >
            Import from Templates
          </Button>
          <Button
            variant="cta"
            size="sm"
            icon={Plus}
            onClick={onAddQuestion}
          >
            Add Question
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm mb-3">
            No questions added yet. Add questions manually or import from templates.
          </p>
          <div className="flex items-center gap-2 justify-center">
            <Button variant="secondary" size="sm" icon={BookOpen} onClick={onOpenTemplates}>
              Browse Templates
            </Button>
            <Button variant="cta" size="sm" icon={Plus} onClick={onAddQuestion}>
              Add Question
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catQuestions]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
              <div className="space-y-2">
                {catQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg group"
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-400 mt-0.5 flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{q.questionText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" size="sm">
                          {TYPE_LABELS[q.questionType]}
                        </Badge>
                        {q.isFromTemplate && (
                          <span className="text-xs text-gray-400">From template</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteQuestion(q.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
