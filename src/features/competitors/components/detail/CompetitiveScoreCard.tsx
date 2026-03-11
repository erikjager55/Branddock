"use client";

import { BarChart3 } from "lucide-react";
import { getScoreColor, getScoreBgColor, getScoreLabel } from "../../constants/competitor-constants";

interface CompetitiveScoreCardProps {
  score: number | null;
}

/** Circular competitive score display card */
export function CompetitiveScoreCard({ score }: CompetitiveScoreCardProps) {
  const hasScore = score !== null && score !== undefined;
  const displayScore = hasScore ? score : 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (circumference * displayScore) / 100;

  // Determine stroke color based on score
  let strokeColor = "#e5e7eb"; // gray-200
  if (hasScore) {
    if (score >= 70) strokeColor = "#dc2626"; // red-600
    else if (score >= 40) strokeColor = "#d97706"; // amber-600
    else strokeColor = "#059669"; // emerald-600
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-gray-500" />
        Competitive Score
      </h3>

      <div className="flex flex-col items-center">
        {/* Circular score ring */}
        <div className="relative h-24 w-24 mb-3">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
            {/* Background ring */}
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              strokeWidth="8"
              stroke="#f3f4f6"
            />
            {/* Score ring */}
            {hasScore && (
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                strokeWidth="8"
                stroke={strokeColor}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${hasScore ? getScoreColor(score) : "text-gray-300"}`}>
              {hasScore ? score : "—"}
            </span>
          </div>
        </div>

        {/* Label */}
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${hasScore ? getScoreBgColor(score) : "bg-gray-100"} ${hasScore ? getScoreColor(score) : "text-gray-400"}`}>
          {getScoreLabel(score ?? null)}
        </div>
      </div>
    </div>
  );
}
