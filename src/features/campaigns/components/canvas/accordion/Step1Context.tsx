'use client';

import React from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { Building2, Lightbulb, Route, Monitor, BookOpen, Plus, X, Sparkles } from 'lucide-react';
import { Badge, Skeleton, SkeletonText } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';

interface Step1ContextProps {
  deliverableId: string;
}

export function Step1Context({ deliverableId }: Step1ContextProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const additionalContextItems = useCanvasStore((s) => s.additionalContextItems);
  const removeContextItem = useCanvasStore((s) => s.removeContextItem);
  const { generate, isGenerating } = useCanvasOrchestration(deliverableId);

  const handleGenerate = async () => {
    try {
      // Trigger content generation (SSE auto-advance handles step 2 transition)
      await generate();

      // Read fresh state after async generation (avoid stale closures)
      const state = useCanvasStore.getState();
      const brand = state.contextStack?.brand;
      const medium = state.contextStack?.medium;
      const phase = state.contextStack?.journeyPhase;
      const knowledgeCount = state.additionalContextItems.size;

      const summaryParts: string[] = [];
      if (brand?.brandName) summaryParts.push(`Brand: ${brand.brandName}`);
      if (medium?.platform && medium?.format) summaryParts.push(`${medium.platform}/${medium.format}`);
      if (phase?.phase) summaryParts.push(`${phase.phase} phase`);
      if (knowledgeCount > 0) summaryParts.push(`${knowledgeCount} knowledge items`);

      state.setStepSummary(1, {
        label: summaryParts.join(' | ') || 'Context reviewed',
      });
    } catch (err) {
      console.error('[Step1Context] Generation failed:', err);
    }
  };

  if (!contextStack) {
    return (
      <div className="space-y-3">
        <SkeletonContextCard />
        <SkeletonContextCard />
        <SkeletonContextCard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Context cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Brand */}
        <ContextCard icon={<Building2 className="h-4 w-4" />} title="Brand">
          <BrandContent brand={contextStack.brand} />
        </ContextCard>

        {/* Campaign Concept */}
        <ContextCard icon={<Lightbulb className="h-4 w-4" />} title="Campaign Concept">
          {contextStack.concept ? (
            <>
              {contextStack.concept.campaignTheme && (
                <p className="text-sm text-gray-600">{contextStack.concept.campaignTheme}</p>
              )}
              {contextStack.concept.positioningStatement && (
                <p className="text-xs text-gray-500 mt-1">{contextStack.concept.positioningStatement}</p>
              )}
              {contextStack.concept.keyMessages?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {contextStack.concept.keyMessages.map((msg, i) => (
                    <Badge key={i} variant="default" size="sm">{msg}</Badge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No concept data available</p>
          )}
        </ContextCard>

        {/* Journey Phase */}
        <ContextCard icon={<Route className="h-4 w-4" />} title="Journey Phase">
          {contextStack.journeyPhase ? (
            <>
              <Badge variant="info" size="sm">{contextStack.journeyPhase.phase}</Badge>
              {contextStack.journeyPhase.phaseObjectives?.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {contextStack.journeyPhase.phaseObjectives.join(', ')}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No phase data available</p>
          )}
        </ContextCard>

        {/* Medium */}
        <ContextCard icon={<Monitor className="h-4 w-4" />} title="Medium">
          {contextStack.medium ? (
            <>
              <div className="flex gap-2">
                <Badge variant="teal" size="sm">{contextStack.medium.platform}</Badge>
                <Badge variant="default" size="sm">{contextStack.medium.format}</Badge>
              </div>
              {contextStack.medium.bestPractices?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {contextStack.medium.bestPractices.slice(0, 2).map((bp, i) => (
                    <li key={i} className="text-xs text-gray-500">• {bp}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No medium data available</p>
          )}
        </ContextCard>
      </div>

      {/* Knowledge context */}
      {additionalContextItems.size > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Knowledge Context</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(additionalContextItems.entries()).map(([key, item]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-md"
              >
                <span className="truncate">{item.title}</span>
                <button
                  type="button"
                  onClick={() => removeContextItem(key)}
                  aria-label={`Remove ${item.title}`}
                  className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add knowledge context button */}
      <button
        type="button"
        onClick={() => useCanvasStore.getState().toggleContextSelector()}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium"
      >
        <Plus className="h-3 w-3" />
        {additionalContextItems.size > 0 ? 'Add more context' : 'Select knowledge context'}
      </button>

      {/* Generate Content button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Generate Content'}
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

function ContextCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-500">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      {children}
    </div>
  );
}

function firstSentence(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  const result = match ? match[1] : text;
  return result.length > 120 ? result.slice(0, 117) + '...' : result;
}

function BrandContent({ brand }: { brand: BrandContextBlock }) {
  const filledFields = [
    brand.brandPurpose, brand.goldenCircle, brand.brandEssence,
    brand.brandPromise, brand.brandMission, brand.brandVision,
    brand.brandArchetype, brand.brandPersonality, brand.brandStory,
    brand.transformativeGoals, brand.socialRelevancy,
  ].filter(Boolean).length;

  const purposeSummary = firstSentence(brand.brandPurpose);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{brand.brandName}</p>
        <Badge variant="default" size="sm">{filledFields}/11</Badge>
      </div>
      {purposeSummary && (
        <p className="text-xs text-gray-500 line-clamp-2">{purposeSummary}</p>
      )}
      {brand.targetAudience && (
        <p className="text-xs text-gray-500">Audience: {brand.targetAudience}</p>
      )}
    </div>
  );
}

function SkeletonContextCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-2">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}
