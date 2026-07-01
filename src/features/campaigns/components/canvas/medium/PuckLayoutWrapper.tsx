'use client';

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { STUDIO } from '@/lib/constants/design-tokens';
import type { PreviewContent } from '../../../types/canvas.types';
import { PuckPageBuilder } from './PuckPageBuilder';

interface PuckLayoutWrapperProps {
  /** Config-sections passed from GenericConfigPanel — ignored: Puck has its
   *  own sidebar for component configuration, so the legacy hero/layout/cta
   *  dropdowns from the web-page category config-registry are out of scope. */
  children: React.ReactNode;
  onAdvance: () => void;
  deliverableId?: string;
}

/**
 * Step 3 (Medium) layout for the 5 Puck-powered web-page content-types
 * (landing-page / product-page / faq-page / comparison-page / microsite).
 *
 * Routes directly to PuckPageBuilder without going through preview-map or
 * the legacy WebPageLayout's EditableArticleSection. The web-page config-
 * registry fields (heroStyle / layoutMode / ctaType) are replaced by Puck's
 * own component sidebar — those dropdowns become noise when the user has
 * a visual drag-drop editor for the same decisions.
 *
 * Other web-page types that should KEEP the legacy article-preview path
 * (blog-post / pillar-page / etc. — `format: 'blog-article'`) route to
 * WebPageLayout instead via GenericConfigPanel's content-type check.
 */
export function PuckLayoutWrapper({ children: _children, onAdvance, deliverableId }: PuckLayoutWrapperProps) {
  const { t } = useTranslation('campaigns-canvas-medium');
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const imageVariants = useCanvasStore((s) => s.imageVariants);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setInsertImageModalOpen = useCanvasStore((s) => s.setInsertImageModalOpen);
  const mediumConfigValues = useCanvasStore((s) => s.mediumConfigValues);

  // Assemble PreviewContent from selected variants — mirrors the build-flow
  // in MediumConfigLayout so PuckPageBuilder's variantToPuckData seed-mapper
  // sees the same shape that LandingPagePreview would have seen.
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
    store.setStepSummary(store.activeStep, { label: t('builder.configured') });
    onAdvance();
  }, [onAdvance, deliverableId, t]);

  return (
    <div className="space-y-6">
      {/* Header indicates this is the new builder flow — distinct from the
          legacy WebPageLayout article-preview so users + future devs know
          which path they're on. */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm text-emerald-900 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="font-medium">{t('builder.active')}</p>
          <p className="text-xs text-emerald-800 mt-0.5">
            {t('builder.activeHint')}
          </p>
        </div>
      </div>

      <PuckPageBuilder
        previewContent={previewContent}
        imageVariants={imageVariants}
        isGenerating={false}
        heroImage={heroImage}
        onAddImage={() => setInsertImageModalOpen(true)}
        mediumConfig={mediumConfigValues}
        brandName={contextStack?.brand?.brandName ?? undefined}
      />

      {/* Sticky Confirm button — same pattern as MediumConfigLayout so the
          stepper-progression UX stays consistent across all content-types. */}
      <div className="sticky bottom-0 -mx-1 pt-3 pb-1 px-1 bg-gradient-to-t from-white via-white to-white/0">
        <button
          type="button"
          onClick={handleConfirm}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm ${STUDIO.generateButton}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('confirm.confirmContinue')}
        </button>
      </div>
    </div>
  );
}
