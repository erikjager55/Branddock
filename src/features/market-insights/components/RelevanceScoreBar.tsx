'use client';

interface RelevanceScoreBarProps {
  score: number;
  size?: 'sm' | 'lg';
}

export function RelevanceScoreBar({ score, size = 'sm' }: RelevanceScoreBarProps) {
  if (size === 'lg') {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Relevance Score</span>
          <span className="text-lg font-semibold text-green-600">{score}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all"
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase text-gray-400 tracking-wide">Relevance</span>
      <span className="text-xs font-semibold text-gray-700">{score}%</span>
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all"
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}
