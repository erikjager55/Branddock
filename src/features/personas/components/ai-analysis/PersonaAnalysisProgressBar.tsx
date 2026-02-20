'use client';

import { Check } from 'lucide-react';

interface PersonaAnalysisProgressBarProps {
  progress: number;
  answeredDimensions: number;
}

const DIMENSIONS = [
  'Demographics',
  'Goals & Motivations',
  'Challenges',
  'Value Proposition',
];

export function PersonaAnalysisProgressBar({
  answeredDimensions,
}: PersonaAnalysisProgressBarProps) {
  return (
    <div className="space-y-2">
      {/* Step dots with connecting lines */}
      <div className="flex items-center">
        {DIMENSIONS.map((label, i) => {
          const isComplete = i < answeredDimensions;
          const isCurrent = i === answeredDimensions;

          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                {/* Step circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isComplete
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-gray-300 text-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={`text-[10px] whitespace-nowrap ${
                    isComplete || isCurrent
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
              {/* Connecting line */}
              {i < DIMENSIONS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 mt-[-18px] transition-colors ${
                    i < answeredDimensions
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
