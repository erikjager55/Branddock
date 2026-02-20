import React from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface AlignmentStatsRowProps {
  alignedCount: number;
  reviewCount: number;
  misalignedCount: number;
}

// ─── Component ──────────────────────────────────────────────

export function AlignmentStatsRow({
  alignedCount,
  reviewCount,
  misalignedCount,
}: AlignmentStatsRowProps) {
  return (
    <div className="flex gap-4">
      {/* Aligned */}
      <div className="bg-green-50 rounded-lg p-4 flex-1">
        <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
        <div className="text-2xl font-bold text-green-600">{alignedCount}</div>
        <div className="text-sm text-gray-500">Aligned</div>
      </div>

      {/* Needs Review */}
      <div className="bg-orange-50 rounded-lg p-4 flex-1">
        <AlertCircle className="w-5 h-5 text-orange-400 mb-2" />
        <div className="text-2xl font-bold text-orange-500">{reviewCount}</div>
        <div className="text-sm text-gray-500">Needs Review</div>
      </div>

      {/* Misaligned */}
      <div className="bg-red-50 rounded-lg p-4 flex-1">
        <XCircle className="w-5 h-5 text-red-500 mb-2" />
        <div className="text-2xl font-bold text-red-500">{misalignedCount}</div>
        <div className="text-sm text-gray-500">Misaligned</div>
      </div>
    </div>
  );
}
