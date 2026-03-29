'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { ChevronDown, ChevronRight, Building2, Lightbulb, Route, Monitor, BookOpen, X, Plus } from 'lucide-react';
import { Skeleton, SkeletonText, Badge } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';

export function ContextPanel() {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const collapsed = useCanvasStore((s) => s.contextPanelCollapsed);
  const toggle = useCanvasStore((s) => s.toggleContextPanel);
  const additionalContextItems = useCanvasStore((s) => s.additionalContextItems);

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col items-center pt-3">
        <button
          type="button"
          onClick={toggle}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
          title="Expand context panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`${STUDIO.panel.left} flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Context</h2>
        <button
          type="button"
          onClick={toggle}
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
          title="Collapse panel"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        {!contextStack ? (
          <>
            <SkeletonContextCard />
            <SkeletonContextCard />
            <SkeletonContextCard />
            <SkeletonContextCard />
          </>
        ) : (
          <>
            <ContextCard
              icon={<Building2 className="h-4 w-4" />}
              title="Brand"
            >
              <BrandContextContent brand={contextStack.brand} />
            </ContextCard>

            <ContextCard
              icon={<Lightbulb className="h-4 w-4" />}
              title="Campaign Concept"
            >
              {contextStack.concept ? (
                <>
                  {contextStack.concept.campaignTheme && (
                    <p className="text-sm text-gray-600">{contextStack.concept.campaignTheme}</p>
                  )}
                  {contextStack.concept.positioningStatement && (
                    <p className="text-xs text-gray-500 mt-1">{contextStack.concept.positioningStatement}</p>
                  )}
                  {contextStack.concept.keyMessages.length > 0 && (
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

            <ContextCard
              icon={<Route className="h-4 w-4" />}
              title="Journey Phase"
            >
              {contextStack.journeyPhase ? (
                <>
                  <Badge variant="info" size="sm">{contextStack.journeyPhase.phase}</Badge>
                  {contextStack.journeyPhase.phaseObjectives.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">{contextStack.journeyPhase.phaseObjectives.join(', ')}</p>
                  )}
                  {contextStack.journeyPhase.messageGuidance && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-400">Message guidance:</span>
                      <p className="text-xs text-gray-600">{contextStack.journeyPhase.messageGuidance}</p>
                    </div>
                  )}
                  {contextStack.journeyPhase.ctaDirection && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-400">CTA:</span>
                      <p className="text-xs text-gray-600">{contextStack.journeyPhase.ctaDirection}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400 italic">No phase data available</p>
              )}
            </ContextCard>

            <ContextCard
              icon={<Monitor className="h-4 w-4" />}
              title="Medium"
            >
              {contextStack.medium ? (
                <>
                  <div className="flex gap-2">
                    <Badge variant="teal" size="sm">{contextStack.medium.platform}</Badge>
                    <Badge variant="default" size="sm">{contextStack.medium.format}</Badge>
                  </div>
                  {contextStack.medium.bestPractices.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {contextStack.medium.bestPractices.slice(0, 3).map((bp, i) => (
                        <li key={i} className="text-xs text-gray-500">• {bp}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400 italic">No medium data available</p>
              )}
            </ContextCard>

            <ContextCard
              icon={<BookOpen className="h-4 w-4" />}
              title="Knowledge Context"
              defaultOpen={additionalContextItems.size > 0}
            >
              <KnowledgeContextContent />
            </ContextCard>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Brand Context Content ───────────────────────────────────

/** Extract the first sentence from a long formatted string */
function firstSentence(text: string | undefined): string | null {
  if (!text) return null;
  // Take text up to the first period followed by a space or end, max 120 chars
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  const result = match ? match[1] : text;
  return result.length > 120 ? result.slice(0, 117) + '...' : result;
}

function BrandContextContent({ brand }: { brand: import('@/lib/ai/prompt-templates').BrandContextBlock }) {
  const [expanded, setExpanded] = React.useState(false);

  // Extract compact summaries from the long AI-formatted strings
  const essenceSummary = firstSentence(brand.brandEssence);
  const personalitySummary = firstSentence(brand.brandPersonality);
  const purposeSummary = firstSentence(brand.brandPurpose);
  const missionSummary = firstSentence(brand.brandMission);

  // Count how many brand context fields have data
  const filledFields = [
    brand.brandPurpose, brand.goldenCircle, brand.brandEssence,
    brand.brandPromise, brand.brandMission, brand.brandVision,
    brand.brandArchetype, brand.brandPersonality, brand.brandStory,
    brand.transformativeGoals, brand.socialRelevancy,
  ].filter(Boolean).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{brand.brandName}</p>
        <Badge variant="default" size="sm">{filledFields}/11</Badge>
      </div>

      {purposeSummary && (
        <ContextField label="Purpose" value={purposeSummary} />
      )}
      {essenceSummary && (
        <ContextField label="Essence" value={essenceSummary} />
      )}
      {personalitySummary && (
        <ContextField label="Personality" value={personalitySummary} />
      )}
      {missionSummary && (
        <ContextField label="Mission" value={missionSummary} />
      )}

      {brand.targetAudience && (
        <ContextField label="Audience" value={brand.targetAudience} />
      )}

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          {brand.brandVision && <ContextField label="Vision" value={firstSentence(brand.brandVision) ?? brand.brandVision} />}
          {brand.brandArchetype && <ContextField label="Archetype" value={firstSentence(brand.brandArchetype) ?? brand.brandArchetype} />}
          {brand.brandPromise && <ContextField label="Promise" value={firstSentence(brand.brandPromise) ?? brand.brandPromise} />}
          {brand.brandStory && <ContextField label="Story" value={firstSentence(brand.brandStory) ?? brand.brandStory} />}
          {brand.brandValues && brand.brandValues.length > 0 && (
            <ContextField label="Values" value={brand.brandValues.join(', ')} />
          )}
          {brand.brandToneOfVoice && <ContextField label="Tone" value={firstSentence(brand.brandToneOfVoice) ?? brand.brandToneOfVoice} />}
          {brand.productsOverview && <ContextField label="Products" value={brand.productsOverview} />}
        </div>
      )}

      {filledFields > 4 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:text-primary-700 font-medium"
        >
          {expanded ? 'Show less' : `Show ${filledFields - 4} more`}
        </button>
      )}
    </div>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-gray-400">{label}</span>
      <p className="text-xs text-gray-600 line-clamp-2">{value}</p>
    </div>
  );
}

// ─── Knowledge Context Content ────────────────────────────────

function KnowledgeContextContent() {
  const items = useCanvasStore((s) => s.additionalContextItems);
  const removeItem = useCanvasStore((s) => s.removeContextItem);

  return (
    <div className="space-y-2">
      {items.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(items.entries()).map(([key, item]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-md"
            >
              <span className="truncate">{item.title}</span>
              <button
                type="button"
                onClick={() => removeItem(key)}
                className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => useCanvasStore.getState().toggleContextSelector()}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium"
      >
        <Plus className="h-3 w-3" />
        {items.size > 0 ? 'Add more context' : 'Select knowledge context'}
      </button>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ContextCard({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-gray-50 rounded-t-lg"
        aria-expanded={open}
      >
        <span className="text-gray-500">{icon}</span>
        <span className="text-sm font-medium text-gray-700 flex-1">{title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-3 border-t border-gray-100">
          {children}
        </div>
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
