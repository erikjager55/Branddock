'use client';

import { Button, Badge } from '@/components/shared';
import { Video, Star, StarOff, CheckCircle, Timer } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface WorkshopToolbarProps {
  formattedTime: string;
  timerRunning: boolean;
  bookmarkStep: number | null;
  currentStep: number;
  hasFacilitator: boolean;
  facilitatorName: string | null;
  onTimerToggle: () => void;
  onBookmarkToggle: () => void;
  onComplete: () => void;
  isCompleting: boolean;
}

export function WorkshopToolbar({
  formattedTime,
  timerRunning,
  bookmarkStep,
  currentStep,
  hasFacilitator,
  facilitatorName,
  onTimerToggle,
  onBookmarkToggle,
  onComplete,
  isCompleting,
}: WorkshopToolbarProps) {
  const isBookmarked = bookmarkStep === currentStep;

  return (
    <div data-testid="workshop-toolbar" className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg mb-6">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors">
          <Video className="w-4 h-4" />
          Video Guide
        </button>

        {hasFacilitator && (
          <Badge variant="info" className="bg-purple-50 text-purple-700">
            {facilitatorName || 'Facilitator'}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Timer */}
        <button
          data-testid="timer-button"
          onClick={onTimerToggle}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono transition-colors',
            timerRunning
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          <Timer className="w-4 h-4" />
          {formattedTime}
        </button>

        {/* Bookmark */}
        <button
          data-testid="bookmark-button"
          onClick={onBookmarkToggle}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isBookmarked
              ? 'text-amber-500 bg-amber-50'
              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50',
          )}
        >
          {isBookmarked ? (
            <Star className="w-4 h-4 fill-current" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </button>

        {/* Complete */}
        <Button
          variant="cta"
          size="sm"
          icon={CheckCircle}
          onClick={onComplete}
          isLoading={isCompleting}
        >
          Complete
        </Button>
      </div>
    </div>
  );
}
