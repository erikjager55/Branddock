'use client';

import { Clock, User } from 'lucide-react';
import { useGoldenCircleHistory } from '../hooks/useGoldenCircle';

interface GoldenCircleHistoryProps {
  assetId: string;
}

export function GoldenCircleHistory({ assetId }: GoldenCircleHistoryProps) {
  const { data, isLoading } = useGoldenCircleHistory(assetId);
  const versions = data?.versions ?? [];

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
        <p className="text-sm text-gray-500">No version history available.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />

        <div className="space-y-4">
          {versions.map((version) => (
            <div key={version.id} className="flex items-start gap-4 relative">
              {/* Dot */}
              <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0 z-10">
                <span className="text-xs font-medium text-gray-500">
                  {version.version}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 text-sm">
                  {version.changedBy && (
                    <span className="flex items-center gap-1 text-gray-700 font-medium">
                      <User className="w-3.5 h-3.5" />
                      {version.changedBy.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(version.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {version.changeNote && (
                  <p className="text-sm text-gray-600 mt-1">{version.changeNote}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
