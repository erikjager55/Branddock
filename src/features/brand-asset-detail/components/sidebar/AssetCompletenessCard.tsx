'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import { CircularProgress } from '@/features/personas/components/detail/CircularProgress';
import type { BrandAssetDetail } from '../../types/brand-asset-detail.types';

interface AssetCompletenessCardProps {
  asset: BrandAssetDetail;
}

interface FieldCheck {
  label: string;
  filled: boolean;
}

function getAssetFields(asset: BrandAssetDetail): FieldCheck[] {
  const contentStr = typeof asset.content === 'string' ? asset.content : '';
  return [
    { label: 'Content', filled: contentStr.length > 0 },
    { label: 'Description', filled: !!(asset.description && asset.description.length > 0) },
    { label: 'Framework', filled: !!(asset.frameworkType && asset.frameworkData) },
    { label: 'AI Exploration', filled: asset.researchMethods?.some(m => m.status === 'COMPLETED' || m.status === 'VALIDATED') ?? false },
  ];
}

export function AssetCompletenessCard({ asset }: AssetCompletenessCardProps) {
  const fields = getAssetFields(asset);
  const filledCount = fields.filter(f => f.filled).length;
  const percentage = Math.round((filledCount / fields.length) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <CircularProgress percentage={percentage} size={48} strokeWidth={4} />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Asset Completeness</h3>
          <p className="text-xs text-gray-500">{filledCount}/{fields.length} sections filled</p>
        </div>
      </div>
      <div className="space-y-2">
        {fields.map(field => (
          <div key={field.label} className="flex items-center gap-2 text-xs">
            {field.filled ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            )}
            <span className={field.filled ? 'text-gray-700' : 'text-gray-400'}>{field.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
