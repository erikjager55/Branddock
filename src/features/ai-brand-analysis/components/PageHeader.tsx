'use client';

import React from 'react';
import { Building2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { AIAnalysisStatus } from '@/types/ai-analysis';

interface PageHeaderProps {
  assetName: string;
  status: AIAnalysisStatus;
  onBack: () => void;
}

const STATUS_BADGE: Record<AIAnalysisStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'danger' | 'teal' }> = {
  NOT_STARTED: { label: 'Not Started', variant: 'default' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'teal' },
  REPORT_GENERATING: { label: 'Generating Report', variant: 'warning' },
  REPORT_READY: { label: 'Report Ready', variant: 'success' },
  ERROR: { label: 'Error', variant: 'danger' },
};

export function AnalysisPageHeader({ assetName, status, onBack }: PageHeaderProps) {
  const badge = STATUS_BADGE[status];

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Asset
      </button>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900">AI Brand Analysis</h1>
          <p className="text-sm text-gray-500 truncate">{assetName}</p>
        </div>
        <Badge variant={badge.variant} dot>{badge.label}</Badge>
      </div>
    </div>
  );
}
