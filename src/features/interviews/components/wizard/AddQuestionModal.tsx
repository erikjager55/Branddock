'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/shared';
import { MessageSquare, List, CheckSquare, Star, ArrowUpDown, Plus, X } from 'lucide-react';
import type { QuestionType } from '../../types/interview.types';

const QUESTION_TYPES: { type: QuestionType; label: string; description: string; icon: typeof MessageSquare }[] = [
  { type: 'OPEN', label: 'Open', description: 'Free-text response', icon: MessageSquare },
  { type: 'MULTIPLE_CHOICE', label: 'Multiple Choice', description: 'Select one option', icon: List },
  { type: 'MULTI_SELECT', label: 'Multi Select', description: 'Select multiple options', icon: CheckSquare },
  { type: 'RATING_SCALE', label: 'Rating Scale', description: 'Rate from 1 to 5', icon: Star },
  { type: 'RANKING', label: 'Ranking', description: 'Order by preference', icon: ArrowUpDown },
];

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    questionType: QuestionType;
    questionText: string;
    answerOptions: string[];
  }) => void;
  isSubmitting: boolean;
}

export function AddQuestionModal({ isOpen, onClose, onSubmit, isSubmitting }: AddQuestionModalProps) {
  const [questionType, setQuestionType] = useState<QuestionType>('OPEN');
  const [questionText, setQuestionText] = useState('');
  const [answerOptions, setAnswerOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  const needsOptions = questionType === 'MULTIPLE_CHOICE' || questionType === 'MULTI_SELECT' || questionType === 'RANKING';

  const handleAddOption = () => {
    if (newOption.trim()) {
      setAnswerOptions([...answerOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setAnswerOptions(answerOptions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!questionText.trim()) return;
    const options = questionType === 'RATING_SCALE'
      ? ['1', '2', '3', '4', '5']
      : answerOptions;
    onSubmit({ questionType, questionText: questionText.trim(), answerOptions: options });
    // Reset
    setQuestionType('OPEN');
    setQuestionText('');
    setAnswerOptions([]);
    setNewOption('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Question" size="lg">
      <div className="space-y-6">
        {/* Question type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Type
          </label>
          <div className="grid grid-cols-5 gap-2">
            {QUESTION_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => {
                  setQuestionType(type);
                  setAnswerOptions([]);
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-colors ${
                  questionType === type
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Question text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type your question here..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Answer options for MC/MS/Ranking */}
        {needsOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Options
            </label>
            <div className="space-y-2 mb-3">
              {answerOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-5">{idx + 1}.</span>
                  <span className="flex-1 text-sm text-gray-900">{opt}</span>
                  <button
                    onClick={() => handleRemoveOption(idx)}
                    className="p-0.5 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Add an option..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
              />
              <Button variant="secondary" size="sm" icon={Plus} onClick={handleAddOption}>
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Rating scale preview */}
        {questionType === 'RATING_SCALE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scale Preview
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-500"
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="cta"
          size="md"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!questionText.trim() || (needsOptions && answerOptions.length < 2)}
        >
          Add Question
        </Button>
      </div>
    </Modal>
  );
}
