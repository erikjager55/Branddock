'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import { CircularProgress } from '@/features/personas/components/detail/CircularProgress';
import type { BrandAssetDetail } from '../../types/brand-asset-detail.types';
import type {
  ESGFrameworkData,
  GoldenCircleFrameworkData,
  SWOTFrameworkData,
  PurposeKompasFrameworkData,
} from '../../types/framework.types';

interface AssetCompletenessCardProps {
  asset: BrandAssetDetail;
}

interface FieldCheck {
  label: string;
  filled: boolean;
}

function getAssetFields(asset: BrandAssetDetail): FieldCheck[] {
  const fields: FieldCheck[] = [
    { label: 'Description', filled: !!(asset.description && asset.description.length > 0) },
  ];

  if (!asset.frameworkType || !asset.frameworkData) return fields;

  const data = typeof asset.frameworkData === 'string'
    ? JSON.parse(asset.frameworkData as string)
    : asset.frameworkData;

  switch (asset.frameworkType) {
    case 'ESG': {
      const pillars = (data as ESGFrameworkData)?.pillars;
      fields.push(
        { label: 'Environmental', filled: !!pillars?.environmental?.description },
        { label: 'Social', filled: !!pillars?.social?.description },
        { label: 'Governance', filled: !!pillars?.governance?.description },
      );
      break;
    }
    case 'GOLDEN_CIRCLE': {
      const gc = data as GoldenCircleFrameworkData;
      fields.push(
        { label: 'Why', filled: !!gc?.why?.statement },
        { label: 'How', filled: !!gc?.how?.statement },
        { label: 'What', filled: !!gc?.what?.statement },
      );
      break;
    }
    case 'SWOT': {
      const swot = data as SWOTFrameworkData;
      fields.push(
        { label: 'Strengths', filled: (swot?.strengths?.length ?? 0) > 0 },
        { label: 'Weaknesses', filled: (swot?.weaknesses?.length ?? 0) > 0 },
        { label: 'Opportunities', filled: (swot?.opportunities?.length ?? 0) > 0 },
        { label: 'Threats', filled: (swot?.threats?.length ?? 0) > 0 },
      );
      break;
    }
    case 'PURPOSE_KOMPAS': {
      const pk = (data as PurposeKompasFrameworkData)?.pillars;
      fields.push(
        { label: 'People', filled: !!pk?.mens?.description },
        { label: 'Environment', filled: !!pk?.milieu?.description },
        { label: 'Society', filled: !!pk?.maatschappij?.description },
      );
      break;
    }
  }

  return fields;
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
