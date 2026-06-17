'use client';

import React from 'react';
import { Camera, PenTool, BarChart3, Smartphone, Type, Lightbulb } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import {
  getRecommendedModality,
  MODALITY_LABELS,
  type RecommendedModality,
} from '../../lib/deliverable-types';

/**
 * Pattern G1 image-quality-chain — modality-fit hint.
 *
 * Toont per content-type een suggestion welke beeld-modality het beste past
 * ("Blog post → Photography aanbevolen"). Voorkomt dat user een Tweet als
 * lifestyle-hero genereert of een explainer-video als data-chart.
 *
 * Niet-blokkerend — gebruiker mag elke source kiezen, dit is enkel een
 * informatieve nudge bovenaan de ImageSourcePanel.
 */

const MODALITY_ICONS: Record<RecommendedModality, React.ElementType> = {
  photo: Camera,
  illustration: PenTool,
  infographic: BarChart3,
  ugc: Smartphone,
  none: Type,
};

const MODALITY_ACCENT: Record<RecommendedModality, { bg: string; text: string; border: string }> = {
  photo: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  illustration: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  infographic: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ugc: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  none: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

export function ModalityHint() {
  const contentType = useCanvasStore((s) => s.contentType);

  if (!contentType) return null;

  const modality = getRecommendedModality(contentType);
  const Icon = MODALITY_ICONS[modality];
  const meta = MODALITY_LABELS[modality];
  const accent = MODALITY_ACCENT[modality];

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-md border text-xs ${accent.bg} ${accent.border}`}
    >
      <Lightbulb className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${accent.text}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${accent.text}`}>
          <span className="inline-flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {meta.label} recommended for this content type
          </span>
        </p>
        <p className="text-gray-600 mt-0.5 leading-snug">{meta.description}</p>
      </div>
    </div>
  );
}
