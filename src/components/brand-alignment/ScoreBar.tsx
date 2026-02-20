import React from 'react';
import { getScoreBarColor } from '@/lib/alignment/score-calculator';

// ─── Types ──────────────────────────────────────────────────

interface ScoreBarProps {
  score: number;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────

export function ScoreBar({ score, className }: ScoreBarProps) {
  const fillColor = getScoreBarColor(score);
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className={`h-2 bg-gray-100 rounded-full w-full ${className ?? ''}`}>
      <div
        className={`h-2 rounded-full ${fillColor}`}
        style={{
          width: `${clamped}%`,
          transition: 'width 500ms ease-in-out',
        }}
      />
    </div>
  );
}
