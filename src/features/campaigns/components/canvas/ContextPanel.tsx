'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { ChevronDown, ChevronRight, Building2, Lightbulb, Route, Monitor } from 'lucide-react';
import { Skeleton, SkeletonText, Badge } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';

export function ContextPanel() {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const collapsed = useCanvasStore((s) => s.contextPanelCollapsed);
  const toggle = useCanvasStore((s) => s.toggleContextPanel);

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
              defaultOpen
            >
              <p className="text-sm text-gray-600">{contextStack.brand.brandName}</p>
              {contextStack.brand.brandEssence && (
                <p className="text-xs text-gray-500 mt-1">{contextStack.brand.brandEssence}</p>
              )}
              {contextStack.brand.brandPersonality && (
                <div className="mt-2">
                  <span className="text-xs text-gray-400">Personality:</span>
                  <p className="text-xs text-gray-600">{contextStack.brand.brandPersonality}</p>
                </div>
              )}
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
          </>
        )}
      </div>
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
        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
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
