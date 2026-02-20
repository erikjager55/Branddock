'use client';

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
  progress,
  answeredDimensions,
}: PersonaAnalysisProgressBarProps) {
  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between">
        {DIMENSIONS.map((label, i) => {
          const isComplete = i < answeredDimensions;
          const isCurrent = i === answeredDimensions;

          return (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  isComplete
                    ? 'bg-purple-500 border-purple-500'
                    : isCurrent
                      ? 'bg-white border-blue-500'
                      : 'bg-white border-gray-300'
                }`}
              />
              <span className={`text-[10px] ${isComplete || isCurrent ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Label */}
      <p className="text-xs text-gray-500 text-center">
        {answeredDimensions} of 4 dimensions analyzed
      </p>
    </div>
  );
}
