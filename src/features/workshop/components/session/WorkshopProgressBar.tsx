'use client';

import { ProgressBar } from '@/components/shared';

interface WorkshopProgressBarProps {
  progress: number;
  className?: string;
}

export function WorkshopProgressBar({ progress, className }: WorkshopProgressBarProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">Overall Progress</span>
        <span className="text-xs font-bold text-emerald-600 tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
      <ProgressBar value={progress} color="emerald" size="md" />
    </div>
  );
}
