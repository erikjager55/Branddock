'use client';

import { Zap, ZapOff } from 'lucide-react';
import { Card } from '@/components/shared';
import type { DetectedTrendWithMeta } from '../../types/trend-radar.types';

interface TrendActivationCardProps {
  trend: DetectedTrendWithMeta;
  onToggle: () => void;
}

export function TrendActivationCard({ trend, onToggle }: TrendActivationCardProps) {
  const activatedDate = trend.activatedAt
    ? new Date(trend.activatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Card padding="none">
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activation Status</h3>

        {trend.isActivated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Activated</span>
            </div>
            {activatedDate && (
              <p className="text-xs text-gray-500">Since {activatedDate}</p>
            )}
            {trend.activatedBy && (
              <p className="text-xs text-gray-500">By {trend.activatedBy.name}</p>
            )}
            <p className="text-[10px] text-gray-400">
              This trend is included in brand context, Content Studio, and campaign knowledge.
            </p>
            <button
              onClick={onToggle}
              className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ZapOff className="w-3.5 h-3.5" /> Deactivate
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ZapOff className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Not Activated</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Activate this trend to include it in AI context, Content Studio, and campaign planning.
            </p>
            <button
              onClick={onToggle}
              className="flex items-center gap-1.5 w-full justify-center px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Activate Trend
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
