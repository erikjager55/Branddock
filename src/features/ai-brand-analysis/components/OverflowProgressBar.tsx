'use client';

import React from 'react';

interface OverflowProgressBarProps {
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
}

export function OverflowProgressBar({
  progress,
  answeredQuestions,
  totalQuestions,
}: OverflowProgressBarProps) {
  const clampedWidth = Math.min(progress, 100);
  const isOverflow = progress > 100;

  // Label color based on progress range
  const labelColor =
    progress >= 100
      ? 'text-emerald-600'
      : progress >= 75
        ? 'text-blue-600'
        : progress >= 50
          ? 'text-teal-600'
          : 'text-gray-600';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500">
          {answeredQuestions} of {totalQuestions} questions answered
        </span>
        <span className={`text-xs font-medium ${labelColor}`}>
          {progress}%{isOverflow ? ' (bonus questions!)' : ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOverflow
              ? 'bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400'
              : 'bg-gradient-to-r from-blue-500 to-emerald-500'
          }`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
    </div>
  );
}
