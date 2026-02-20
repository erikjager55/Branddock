'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface ExecutiveSummaryProps {
  summary: string;
}

export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-500" />
        <h3 className="text-base font-semibold text-gray-900">Executive Summary</h3>
      </div>
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
      </div>
    </div>
  );
}
