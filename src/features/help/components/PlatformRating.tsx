'use client';

import React, { useState } from 'react';
import { Star, CheckCircle } from 'lucide-react';
import { useSubmitRating } from '@/hooks/use-help';
import { Button } from '@/components/shared';

export function PlatformRating() {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitRating = useSubmitRating();

  const handleSubmit = () => {
    if (selectedRating === 0) return;

    submitRating.mutate(
      {
        rating: selectedRating,
        feedback: feedback.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      },
    );
  };

  if (submitted) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Rate Your Experience
        </h2>
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-gray-900">Thank you for your feedback!</p>
          <p className="text-sm text-gray-500 mt-1">
            You rated us {selectedRating} out of 5 stars.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Rate Your Experience
      </h2>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hoveredStar || selectedRating);
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setSelectedRating(star)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  isFilled
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Optional feedback textarea (shows after selecting a rating) */}
      {selectedRating > 0 && (
        <div className="space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us more about your experience (optional)..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-shadow resize-none"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={submitRating.isPending}
          >
            Submit
          </Button>
        </div>
      )}
    </section>
  );
}
