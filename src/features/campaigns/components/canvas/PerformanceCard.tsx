'use client';

import React from 'react';
import { BarChart3, TrendingUp, Eye, MousePointer } from 'lucide-react';
import { EmptyState } from '@/components/shared';

interface PerformanceCardProps {
  publishedAt: string | null;
}

/** Placeholder card for published deliverable performance — Fase F will add real analytics */
export function PerformanceCard({ publishedAt }: PerformanceCardProps) {
  if (!publishedAt) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Performance
      </h3>
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-medium">Published</span>
          <span className="text-gray-400 ml-auto text-xs">
            {new Date(publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Placeholder metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-gray-50 rounded">
            <Eye className="h-3.5 w-3.5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">Views</span>
            <p className="text-sm font-medium text-gray-300">—</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <MousePointer className="h-3.5 w-3.5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">Clicks</span>
            <p className="text-sm font-medium text-gray-300">—</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <TrendingUp className="h-3.5 w-3.5 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-400">CTR</span>
            <p className="text-sm font-medium text-gray-300">—</p>
          </div>
        </div>

        <EmptyState
          icon={BarChart3}
          title="Analytics coming soon"
          description="Performance tracking will be available in a future update."
        />
      </div>
    </div>
  );
}
