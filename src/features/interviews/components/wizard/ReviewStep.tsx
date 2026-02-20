'use client';

import { Badge, Button } from '@/components/shared';
import { CheckCircle, Clock, Layers, FileCheck, Lock } from 'lucide-react';
import type { Interview, QuestionType } from '../../types/interview.types';

const TYPE_LABELS: Record<QuestionType, string> = {
  OPEN: 'Open',
  MULTIPLE_CHOICE: 'MC',
  MULTI_SELECT: 'MS',
  RATING_SCALE: 'Rating',
  RANKING: 'Ranking',
};

interface ReviewStepProps {
  interview: Interview;
  onApprove: () => void;
  onEditResponses: () => void;
  isApproving: boolean;
}

export function ReviewStep({ interview, onApprove, onEditResponses, isApproving }: ReviewStepProps) {
  const questions = interview.questions ?? [];
  const answeredCount = questions.filter((q) => q.isAnswered).length;
  const completion = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // Group questions by linked asset
  const grouped = questions.reduce<Record<string, typeof questions>>((acc, q) => {
    const key = q.linkedAsset?.name ?? 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Review & Approve</h2>
      <p className="text-sm text-gray-500 mb-6">
        Review the interview responses before approving and locking.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-gray-900">{answeredCount}/{questions.length}</p>
          <p className="text-xs text-gray-500">Answered</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-gray-900">
            {interview.actualDuration ?? interview.durationMinutes} min
          </p>
          <p className="text-xs text-gray-500">Duration</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <Layers className="w-5 h-5 text-teal-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-gray-900">{interview.selectedAssets?.length ?? 0}</p>
          <p className="text-xs text-gray-500">Assets</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <FileCheck className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-semibold text-gray-900">{completion}%</p>
          <p className="text-xs text-gray-500">Completion</p>
        </div>
      </div>

      {/* Interviewee info */}
      {interview.intervieweeName && (
        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <p className="font-medium text-gray-900">{interview.intervieweeName}</p>
          <p className="text-sm text-gray-500">
            {[interview.intervieweePosition, interview.intervieweeCompany].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/* Questions review */}
      <div className="space-y-6 mb-6">
        {Object.entries(grouped).map(([category, catQuestions]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-gray-700 mb-3">{category}</h3>
            <div className="space-y-3">
              {catQuestions.map((q, idx) => (
                <div key={q.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-sm text-gray-400">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" size="sm">
                          {TYPE_LABELS[q.questionType]}
                        </Badge>
                        {q.isAnswered ? (
                          <Badge variant="success" size="sm">Answered</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Unanswered</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{q.questionText}</p>
                      {q.isAnswered && (
                        <div className="mt-2 pl-3 border-l-2 border-emerald-200">
                          {q.answerText && (
                            <p className="text-sm text-gray-600 italic">{q.answerText}</p>
                          )}
                          {q.answerOptions.length > 0 && (
                            <p className="text-sm text-gray-600">
                              {q.answerOptions.join(', ')}
                            </p>
                          )}
                          {q.answerRating !== null && q.answerRating !== undefined && (
                            <p className="text-sm text-gray-600">
                              Rating: {q.answerRating}/5
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* General notes */}
      {interview.generalNotes && (
        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Interview Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{interview.generalNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="md" onClick={onEditResponses}>
          Edit Responses
        </Button>
        {interview.isLocked ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock className="w-4 h-4" />
            Interview approved & locked
          </div>
        ) : (
          <Button
            variant="cta"
            size="md"
            icon={Lock}
            onClick={onApprove}
            isLoading={isApproving}
            disabled={answeredCount < questions.length}
          >
            Approve & Lock
          </Button>
        )}
      </div>
    </div>
  );
}
