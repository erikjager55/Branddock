'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/shared';
import { useComponentPipelineStore } from '@/lib/studio/stores/component-pipeline-store';

interface ComponentRatingCardProps {
  componentId: string;
  rating: number | null;
  feedbackText: string | null;
}

export function ComponentRatingCard({ componentId, rating, feedbackText }: ComponentRatingCardProps) {
  const setComponentRating = useComponentPipelineStore((s) => s.setComponentRating);
  const [showComment, setShowComment] = useState(!!feedbackText);
  const [localFeedback, setLocalFeedback] = useState(feedbackText ?? '');

  const handleRate = (newRating: number) => {
    const finalRating = rating === newRating ? 0 : newRating;
    setComponentRating(componentId, finalRating, localFeedback || undefined);
    if (newRating === -1 && !showComment) {
      setShowComment(true);
    }
    if (finalRating === 0) {
      setShowComment(false);
    }
  };

  const handleFeedbackBlur = () => {
    if (rating != null) {
      setComponentRating(componentId, rating, localFeedback || undefined);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Rating
      </h4>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRate(1)}
          className={rating === 1 ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : ''}
          aria-pressed={rating === 1}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRate(-1)}
          className={rating === -1 ? 'text-red-600 bg-red-50 hover:bg-red-100' : ''}
          aria-pressed={rating === -1}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
        {!showComment && rating != null && rating !== 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComment(true)}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Add Comment
          </Button>
        )}
      </div>

      {showComment && (
        <textarea
          value={localFeedback}
          onChange={(e) => setLocalFeedback(e.target.value)}
          onBlur={handleFeedbackBlur}
          rows={2}
          placeholder="What's good or could be improved..."
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      )}
    </div>
  );
}
