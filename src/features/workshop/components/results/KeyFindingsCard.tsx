'use client';

import { Search } from 'lucide-react';

interface FindingItem {
  id: string;
  order: number;
  content: string;
}

interface KeyFindingsCardProps {
  findings: FindingItem[];
}

export function KeyFindingsCard({ findings }: KeyFindingsCardProps) {
  const safeFindings = Array.isArray(findings) ? findings : [];
  if (safeFindings.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-900">Key Findings</h3>
      </div>
      <div className="space-y-3">
        {safeFindings.map((finding) => (
          <div
            key={finding.id}
            className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">
              {finding.order}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">
              {finding.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
