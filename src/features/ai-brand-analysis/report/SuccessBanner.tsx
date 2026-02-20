'use client';

import React from 'react';
import { CheckCircle, Calendar, Database, BookOpen, Gauge } from 'lucide-react';
import type { AIAnalysisReportData } from '@/types/ai-analysis';

interface SuccessBannerProps {
  reportData: AIAnalysisReportData;
}

export function SuccessBanner({ reportData }: SuccessBannerProps) {
  const formattedDate = new Date(reportData.completedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-emerald-800">Analysis Report Ready</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">{reportData.dataPointsCount} data points</span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">{reportData.sourcesCount} sources</span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">{reportData.confidenceScore}% confidence</span>
        </div>
      </div>
    </div>
  );
}
