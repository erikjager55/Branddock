'use client';

import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PersonaAnalysisProgressBarProps {
  progress: number;
  answeredDimensions: number;
}

const DIMENSION_KEYS = [
  'analysis.dimensions.demographics',
  'analysis.dimensions.goalsMotivations',
  'analysis.dimensions.challenges',
  'analysis.dimensions.valueProposition',
];

export function PersonaAnalysisProgressBar({
  answeredDimensions,
}: PersonaAnalysisProgressBarProps) {
  const { t } = useTranslation('personas');
  return (
    <div className="space-y-2">
      {/* Step dots with connecting lines */}
      <div className="flex items-center">
        {DIMENSION_KEYS.map((labelKey, i) => {
          const isComplete = i < answeredDimensions;
          const isCurrent = i === answeredDimensions;

          return (
            <div key={labelKey} className="flex items-center flex-1 last:flex-none">
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
                  {t(labelKey)}
                </span>
              </div>
              {/* Connecting line */}
              {i < DIMENSION_KEYS.length - 1 && (
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
