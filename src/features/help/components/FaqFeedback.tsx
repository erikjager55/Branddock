'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFaqFeedback } from '@/hooks/use-help';

interface FaqFeedbackProps {
  id: string;
  helpfulYes: number;
  helpfulNo: number;
}

export function FaqFeedback({ id, helpfulYes, helpfulNo }: FaqFeedbackProps) {
  const { t } = useTranslation('help');
  const [submitted, setSubmitted] = useState(false);
  const feedbackMutation = useFaqFeedback();

  const handleFeedback = (helpful: boolean) => {
    feedbackMutation.mutate(
      { id, helpful },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      },
    );
  };

  if (submitted) {
    return (
      <p className="text-sm text-gray-500">{t('faq.feedback.thanks')}</p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">{t('faq.feedback.prompt')}</span>
      <button
        type="button"
        onClick={() => handleFeedback(true)}
        disabled={feedbackMutation.isPending}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 transition-colors disabled:opacity-50"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        <span>{helpfulYes}</span>
      </button>
      <button
        type="button"
        onClick={() => handleFeedback(false)}
        disabled={feedbackMutation.isPending}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        <span>{helpfulNo}</span>
      </button>
    </div>
  );
}
