'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ProofPointAssetType = 'essence' | 'promise' | 'story' | 'social-relevancy';

const GUIDANCE_KEYS: Record<ProofPointAssetType, string> = {
  essence: 'proofPointsGuidance.essence',
  promise: 'proofPointsGuidance.promise',
  story: 'proofPointsGuidance.story',
  'social-relevancy': 'proofPointsGuidance.socialRelevancy',
};

interface ProofPointsGuidanceBannerProps {
  assetType: ProofPointAssetType;
}

/** Amber guidance banner above proof points, explaining which type of evidence belongs here. */
export function ProofPointsGuidanceBanner({ assetType }: ProofPointsGuidanceBannerProps) {
  const { t } = useTranslation('brand-asset-detail');
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg mb-2">
      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700">{t(GUIDANCE_KEYS[assetType])}</p>
    </div>
  );
}
