'use client';

import { Bot } from 'lucide-react';

interface AIReportSectionProps {
  executiveSummary: string | null;
}

export function AIReportSection({ executiveSummary }: AIReportSectionProps) {
  if (!executiveSummary) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <Bot className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          AI report not yet generated. Complete the workshop to generate
          insights.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-5 h-5 text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Executive Summary
        </h3>
      </div>
      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
        {executiveSummary.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
