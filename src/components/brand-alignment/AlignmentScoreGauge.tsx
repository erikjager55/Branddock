import React from 'react';

// ─── Types ──────────────────────────────────────────────────

interface AlignmentScoreGaugeProps {
  score: number;
}

// ─── Helpers ────────────────────────────────────────────────

function getStrokeColor(score: number): string {
  if (score >= 90) return 'stroke-green-500';
  if (score >= 70) return 'stroke-green-400';
  if (score >= 50) return 'stroke-orange-400';
  return 'stroke-red-500';
}

function getTextColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-500';
}

// ─── Component ──────────────────────────────────────────────

export function AlignmentScoreGauge({ score }: AlignmentScoreGaugeProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div data-testid="alignment-score-gauge" className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
      <svg
        width={160}
        height={160}
        viewBox="0 0 120 120"
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth={12}
          className="stroke-gray-100"
        />
        {/* Score circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          className={getStrokeColor(score)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getTextColor(score)}`}>
          {score}<span className="text-2xl">%</span>
        </span>
      </div>
    </div>
  );
}
