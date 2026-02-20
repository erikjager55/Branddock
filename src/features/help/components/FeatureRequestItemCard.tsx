'use client';

import React from 'react';
import { ChevronUp } from 'lucide-react';
import type { FeatureRequestItem } from '@/types/help';
import { useVoteFeatureRequest } from '@/hooks/use-help';

interface FeatureRequestItemCardProps {
  item: FeatureRequestItem;
}

const statusBadgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  REQUESTED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Requested' },
  PLANNED: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Planned' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Progress' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
};

export function FeatureRequestItemCard({ item }: FeatureRequestItemCardProps) {
  const voteMutation = useVoteFeatureRequest();

  const statusConfig = statusBadgeConfig[item.status] ?? statusBadgeConfig.REQUESTED;

  const handleVote = () => {
    voteMutation.mutate(item.id);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Vote button */}
        <button
          type="button"
          onClick={handleVote}
          disabled={voteMutation.isPending}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          <ChevronUp className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">{item.voteCount}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {item.title}
            </h3>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>

          {/* Submitter info */}
          {item.submittedBy && (
            <div className="flex items-center gap-1.5 mt-2">
              {item.submittedBy.avatarUrl ? (
                <img
                  src={item.submittedBy.avatarUrl}
                  alt={item.submittedBy.name ?? 'User'}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[8px] font-medium text-gray-500">
                    {(item.submittedBy.name ?? 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xs text-gray-400">
                {item.submittedBy.name ?? 'Anonymous'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
