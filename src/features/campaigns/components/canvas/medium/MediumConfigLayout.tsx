'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { resolvePreviewComponent } from '../previews/preview-map';
import { SimpleMarkdown } from '../previews/SimpleMarkdown';
import { HeroImageSlot } from '../previews/HeroImageSlot';
import { STUDIO } from '@/lib/constants/design-tokens';
import { CheckCircle2, RefreshCw, Video, Pencil, ChevronDown } from 'lucide-react';
import { ContentSectionsEditor } from './ContentSectionsEditor';
import type { PreviewContent } from '../../../types/canvas.types';

interface MediumConfigLayoutProps {
  children: React.ReactNode;
  onAdvance: () => void;
  deliverableId?: string;
}

/**
 * Unified layout for Step 3 (Medium) — used by all non-web-page categories.
 *
 * Structure:
 *   [Config Section A]  [Config Section B]    ← side by side, collapsible
 *   [       Full-width content preview       ] ← live preview below
 *   [           Confirm & Continue           ]
 *
 * Web-page has its own WebPageLayout with article-specific rendering
 * (hero styles, layout modes, CTA types). All other categories use this
 * layout which renders the platform-specific PreviewComponent below
 * the config blocks.
 */
export function MediumConfigLayout({ children, onAdvance, deliverableId }: MediumConfigLayoutProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setInsertImageModalOpen = useCanvasStore((s) => s.setInsertImageModalOpen);
  const mediumConfigValues = useCanvasStore((s) => s.mediumConfigValues);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  // Edit panel collapsed by default — preview is the primary view, edit is
  // a tweak surface (intermediate step toward fully inline-editable previews
  // per category, see TODO 9.0b).
  const [showEditor, setShowEditor] = useState(false);

  const { generate } = useCanvasOrchestration(deliverableId ?? null);

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;

  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

  const previewContent = useMemo<PreviewContent>(() => {
    const content: PreviewContent = {};
    for (const [group, variants] of variantGroups) {
      const selectedIdx = selections.get(group) ?? 0;
      const selected = variants[selectedIdx];
      if (selected) {
        content[group] = { content: selected.content, type: 'text' };
      }
    }
    return content;
  }, [variantGroups, selections]);

  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );

  const hasExistingContent = variantGroups.size > 0;

  const handleConfirm = useCallback(async () => {
    const store = useCanvasStore.getState();
    store.setMediumApproved(true);

    if (deliverableId) {
      try {
        await fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { mediumConfig: store.mediumConfigValues },
          }),
        });
      } catch {
        // Non-blocking
      }
    }

    // Regenerate content with the new medium config applied
    if (hasExistingContent) {
      generate({ instruction: 'Regenerate content applying the updated medium configuration settings.' });
    }

    store.setStepSummary(store.activeStep, { label: `${previewEntry.label} configured` });
    onAdvance();
  }, [onAdvance, previewEntry.label, deliverableId, hasExistingContent, generate]);

  const PreviewComponent = previewEntry.component;

  const composedVideoUrl = useCanvasStore((s) => s.composedVideoUrl);

  const configBadges = useMemo(() => {
    return Object.entries(mediumConfigValues)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .slice(0, 6)
      .map(([key, val]) => ({
        key,
        display: typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val),
      }));
  }, [mediumConfigValues]);

  // After the 9.0c content-styling migration, several categories
  // (long-form, sales, pr-hr, social-post) have no Step 3 config fields
  // — content-styling moved to Step 1 Content Brief. Show a brief notice
  // so the user knows it's intentional, not a missing-data bug.
  const hasConfigChildren = React.Children.count(children) > 0;

  return (
    <div className="space-y-6">
      {/* Config sections — side by side, collapsible */}
      {hasConfigChildren ? (
        <div className="grid grid-cols-2 gap-4 items-start">
          {children}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No platform-specific configuration for this content type — review
          the preview below and click <span className="font-medium">Confirm &amp; Continue</span>.
        </div>
      )}

      {/* Full-width content preview — show generated video if available, else platform mock.
          The preview is now the primary view; editing happens in the collapsible
          panel below. Long-term goal (TODO 9.0b): make each preview component
          inline-editable per section so the panel disappears entirely. */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600">
            {composedVideoUrl ? 'Generated Video' : `${previewEntry.label} Preview`}
          </span>
          {composedVideoUrl ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Video className="h-3 w-3" /> Video ready
            </span>
          ) : textEntries.length > 0 ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Live preview
            </span>
          ) : null}
        </div>

        <div className="p-4">
          {composedVideoUrl ? (
            <div className="rounded-lg overflow-hidden bg-black">
              <video src={composedVideoUrl} controls playsInline className="w-full" style={{ maxHeight: 400 }} />
            </div>
          ) : (
            <PreviewComponent
              previewContent={previewContent}
              imageVariants={imageVariants}
              isGenerating={false}
              heroImage={heroImage}
              onAddImage={() => setInsertImageModalOpen(true)}
              mediumConfig={mediumConfigValues}
              brandName={contextStack?.brand?.brandName ?? undefined}
              platform={platform ?? undefined}
            />
          )}
        </div>
      </div>

      {/* Edit content sections — collapsible, opens below the preview when
          the user wants to tweak. Replaces the previous duplicate editor
          that sat *above* the preview (which forced the user to compare two
          rendered copies). */}
      {hasExistingContent && deliverableId && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEditor((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-colors"
            aria-expanded={showEditor}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <Pencil className="h-3.5 w-3.5" />
              Edit content sections
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${showEditor ? 'rotate-180' : ''}`}
            />
          </button>
          {showEditor && (
            <div className="p-3">
              <ContentSectionsEditor deliverableId={deliverableId} />
            </div>
          )}
        </div>
      )}

      {/* Config summary badges */}
      {configBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {configBadges.map(({ key, display }) => (
            <span
              key={key}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              {display}
            </span>
          ))}
        </div>
      )}

      {/* Confirm button */}
      <button
        type="button"
        onClick={handleConfirm}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
      >
        <CheckCircle2 className="h-4 w-4" />
        Confirm & Continue
      </button>
    </div>
  );
}
