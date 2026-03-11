'use client';

import { AlertCircle } from 'lucide-react';

type ProofPointAssetType = 'essence' | 'promise' | 'story' | 'social-relevancy';

const GUIDANCE_TEXT: Record<ProofPointAssetType, string> = {
  essence:
    'List evidence that proves your brand identity is genuine (e.g. founding principles, heritage, consistent behaviors). For customer-facing proof, see Brand Promise.',
  promise:
    'List verifiable proof that you deliver on your promise (e.g. guarantees, certifications, statistics). For identity evidence, see Brand Essence.',
  story:
    'List milestones and achievements that support your brand narrative (e.g. awards, pivotal moments, growth metrics).',
  'social-relevancy':
    'List evidence of your social/environmental impact (e.g. certifications, impact reports, partnerships). For broader brand proof, see Brand Promise.',
};

interface ProofPointsGuidanceBannerProps {
  assetType: ProofPointAssetType;
}

/** Amber guidance banner above proof points, explaining which type of evidence belongs here. */
export function ProofPointsGuidanceBanner({ assetType }: ProofPointsGuidanceBannerProps) {
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg mb-2">
      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700">{GUIDANCE_TEXT[assetType]}</p>
    </div>
  );
}
