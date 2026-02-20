'use client';

interface RelevanceScoreCardProps {
  score: number;
}

export function RelevanceScoreCard({ score }: RelevanceScoreCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-sm text-gray-500 mb-1">Relevance Score</p>
      <p className="text-3xl font-bold text-green-600">{score}%</p>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}
