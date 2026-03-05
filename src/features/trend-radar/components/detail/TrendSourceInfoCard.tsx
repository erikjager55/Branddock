'use client';

import { ExternalLink, Clock } from 'lucide-react';
import { Card } from '@/components/shared';
import { DETECTION_SOURCE_CONFIG } from '../../constants/trend-radar-constants';
import type { DetectedTrendWithMeta } from '../../types/trend-radar.types';

interface TrendSourceInfoCardProps {
  trend: DetectedTrendWithMeta;
}

export function TrendSourceInfoCard({ trend }: TrendSourceInfoCardProps) {
  const sourceConfig = DETECTION_SOURCE_CONFIG[trend.detectionSource];
  const createdDate = new Date(trend.createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card padding="none">
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source Info</h3>

        <div className="space-y-2">
          {/* Detection source */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Detection</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${sourceConfig.color}`}>
              {sourceConfig.label}
            </span>
          </div>

          {/* Trend source (website) */}
          {trend.trendSource && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Source</span>
              <a
                href={trend.trendSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
              >
                {trend.trendSource.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Detected date */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Detected</span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3 h-3" /> {createdDate}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
