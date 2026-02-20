import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface IssueSummaryBoxProps {
  description: string;
}

export function IssueSummaryBox({ description }: IssueSummaryBoxProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-yellow-800 mb-1">Issue Summary</p>
          <p className="text-sm text-yellow-700">{description}</p>
        </div>
      </div>
    </div>
  );
}
