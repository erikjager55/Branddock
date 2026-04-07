'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, RefreshCw, Sparkles, Camera } from 'lucide-react';
import { useCampaignWizardStore } from '../../stores/useCampaignWizardStore';
import type { ConceptVisual } from '../../types/campaign-wizard.types';

interface ConceptVisualsViewProps {
  onRegenerate?: (format: string, hint?: string) => void;
  isRegenerating?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  hero: 'Hero Banner (16:9)',
  square: 'Social Square (1:1)',
  story: 'Story / Reel (9:16)',
};

const FORMAT_ASPECT: Record<string, string> = {
  hero: 'aspect-[16/9]',
  square: 'aspect-square',
  story: 'aspect-[9/16]',
};

const FORMAT_WIDTH: Record<string, string> = {
  hero: 'col-span-2',
  square: 'col-span-1',
  story: 'col-span-1',
};

/**
 * Displays 3 campaign mockup visuals (hero/square/story) with text overlays
 * from the selected creative concept. Each card has a regenerate option.
 */
export function ConceptVisualsView({ onRegenerate, isRegenerating }: ConceptVisualsViewProps) {
  const visuals = useCampaignWizardStore((s) => s.conceptVisuals);
  const concepts = useCampaignWizardStore((s) => s.concepts);
  const selectedIdx = useCampaignWizardStore((s) => s.selectedConceptIndex);

  const concept = selectedIdx !== null ? concepts[selectedIdx] : null;
  const campaignLine = concept?.campaignLine ?? '';
  const bigIdea = concept?.bigIdea ?? '';

  const [hints, setHints] = useState<Record<string, string>>({});

  if (!visuals || visuals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <ImageIcon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No visuals generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Camera className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Campaign Visuals</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            3 mockup visuals generated from your creative concept. Review and fine-tune before proceeding.
          </p>
        </div>
      </div>

      {/* Applied models strip */}
      {visuals[0]?.appliedModels.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span>Brand LoRA models applied:</span>
          {visuals[0].appliedModels.map((m) => (
            <span key={`${m.type}-${m.name}`} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
              {m.name} <span className="text-violet-400">({m.type}, {m.scale})</span>
            </span>
          ))}
        </div>
      )}

      {/* Visual cards grid */}
      <div className="grid grid-cols-4 gap-4 items-start">
        {visuals.map((visual) => (
          <VisualCard
            key={visual.format}
            visual={visual}
            campaignLine={campaignLine}
            bigIdea={bigIdea}
            hint={hints[visual.format] ?? ''}
            onHintChange={(v) => setHints((prev) => ({ ...prev, [visual.format]: v }))}
            onRegenerate={onRegenerate ? () => onRegenerate(visual.format, hints[visual.format]) : undefined}
            isRegenerating={isRegenerating}
          />
        ))}
      </div>
    </div>
  );
}

interface VisualCardProps {
  visual: ConceptVisual;
  campaignLine: string;
  bigIdea: string;
  hint: string;
  onHintChange: (value: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function VisualCard({ visual, campaignLine, bigIdea, hint, onHintChange, onRegenerate, isRegenerating }: VisualCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${FORMAT_WIDTH[visual.format]} space-y-2`}>
      {/* Format label */}
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {FORMAT_LABELS[visual.format]}
      </p>

      {/* Image with text overlay */}
      <div className={`relative ${FORMAT_ASPECT[visual.format]} rounded-xl overflow-hidden bg-gray-100 group`}>
        {!imgError ? (
          <img
            src={visual.imageUrl}
            alt={`${visual.format} campaign visual`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Brand name - top left */}
        <div className="absolute top-3 left-3">
          <span className="text-xs font-medium text-white/80 tracking-wide uppercase" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {bigIdea ? bigIdea.slice(0, 40) : 'Brand'}
          </span>
        </div>

        {/* Campaign line - centered */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <h4
            className="text-center font-bold text-white leading-tight"
            style={{
              fontSize: visual.format === 'hero' ? '1.5rem' : visual.format === 'story' ? '1.25rem' : '1.125rem',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              maxWidth: '90%',
            }}
          >
            {campaignLine}
          </h4>
        </div>

        {/* CTA - bottom */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <span
            className="inline-block rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-900"
            style={{ backdropFilter: 'blur(4px)' }}
          >
            Learn More
          </span>
        </div>
      </div>

      {/* Regenerate controls */}
      <div className="space-y-1.5">
        <textarea
          value={hint}
          onChange={(e) => onHintChange(e.target.value)}
          placeholder="Regeneration hints (optional)..."
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-violet-400"
          rows={2}
        />
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
