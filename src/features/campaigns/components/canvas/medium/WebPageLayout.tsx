'use client';

import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { useCanvasOrchestration } from '../../../hooks/useCanvasOrchestration';
import { SimpleMarkdown } from '../previews/SimpleMarkdown';
import { STUDIO } from '@/lib/constants/design-tokens';
import {
  CheckCircle2,
  ImagePlus,
  Play,
  Sparkles,
  Download,
  Calendar,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { ContentSectionsEditor } from './ContentSectionsEditor';
import type { PreviewContent } from '../../../types/canvas.types';

interface WebPageLayoutProps {
  children: React.ReactNode;
  onAdvance: () => void;
  deliverableId?: string;
}

/**
 * Web-page-specific layout for Step 3 (Medium). Config blocks at top
 * (collapsible, side by side), full-width article preview below that
 * responds in real-time to pageLayout, heroStyle, ctaType, and seoFocus
 * from mediumConfigValues in the canvas store.
 */
export function WebPageLayout({ children, onAdvance, deliverableId }: WebPageLayoutProps) {
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setInsertImageModalOpen = useCanvasStore((s) => s.setInsertImageModalOpen);
  const config = useCanvasStore((s) => s.mediumConfigValues);

  const { generate } = useCanvasOrchestration(deliverableId ?? null);
  const hasExistingContent = variantGroups.size > 0;

  // Read config values
  const pageLayout = (config.pageLayout as string) ?? 'single-column';
  const heroStyle = (config.heroStyle as string) ?? 'full-bleed-image';
  const ctaType = (config.ctaType as string) ?? 'button';

  // Build preview content from selected variants
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

    if (hasExistingContent) {
      generate({ instruction: 'Regenerate content applying the updated medium configuration settings.' });
    }

    store.setStepSummary(store.activeStep, { label: 'Web page configured' });
    onAdvance();
  }, [onAdvance, deliverableId, hasExistingContent, generate]);

  // Separate title / meta from body entries
  const titleEntry = textEntries.find(([g]) => g.toLowerCase() === 'title');
  const metaEntry = textEntries.find(([g]) => g.toLowerCase().includes('meta'));
  const bodyEntries = textEntries.filter(
    ([g]) => g.toLowerCase() !== 'title' && !g.toLowerCase().includes('meta'),
  );

  const titleText = titleEntry?.[1]?.content ?? null;
  const metaText = metaEntry?.[1]?.content ?? null;

  // ─── Hero Section (responds to heroStyle) ─────────────────

  const renderHero = () => {
    if (heroStyle === 'text-only') return null;

    if (heroStyle === 'split-content') {
      return (
        <div className="px-6 py-6 grid grid-cols-2 gap-6 items-center">
          <div>
            {titleText && (
              <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{titleText}</h1>
            )}
            {metaText && <p className="text-sm text-gray-500 italic">{metaText}</p>}
          </div>
          <button
            type="button"
            onClick={() => setInsertImageModalOpen(true)}
            className="w-full rounded-lg overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {heroImage?.url ? (
              <img src={heroImage.url} alt={heroImage.alt ?? ''} className="w-full aspect-[4/3] object-cover" />
            ) : (
              <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 text-gray-400">
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-medium">Add image</span>
              </div>
            )}
          </button>
        </div>
      );
    }

    if (heroStyle === 'video-hero') {
      return (
        <div className="px-6 py-5">
          <div className="w-full aspect-[16/9] rounded-lg bg-gray-900 flex flex-col items-center justify-center gap-2 text-gray-400">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-gray-300">Video hero placeholder</span>
          </div>
        </div>
      );
    }

    if (heroStyle === 'animated') {
      return (
        <div className="px-6 py-5">
          <div className="w-full aspect-[16/9] rounded-lg flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #6366f1 50%, #ec4899 100%)' }}
          >
            <Sparkles className="h-8 w-8 text-white/80" />
            <span className="text-xs text-white/70 font-medium">Animated hero</span>
          </div>
        </div>
      );
    }

    // Default: full-bleed-image
    const isFullBleed = heroStyle === 'full-bleed-image';
    return (
      <div className={isFullBleed ? '' : 'px-6 py-5'}>
        <button
          type="button"
          onClick={() => setInsertImageModalOpen(true)}
          className={`w-full ${isFullBleed ? '' : 'rounded-lg'} overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
        >
          {heroImage?.url ? (
            <img src={heroImage.url} alt={heroImage.alt ?? ''} className="w-full aspect-[16/9] object-cover" />
          ) : (
            <div className="w-full aspect-[16/9] flex flex-col items-center justify-center gap-2 text-gray-400">
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">Click to add a hero image</span>
            </div>
          )}
        </button>
      </div>
    );
  };

  // ─── CTA (responds to ctaType) ────────────────────────────

  const renderCta = () => {
    const base = "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors";

    switch (ctaType) {
      case 'form':
        return (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Stay updated</p>
            <div className="flex gap-2">
              <div className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-3 flex items-center">
                <Mail className="h-3.5 w-3.5 text-gray-400 mr-2" />
                <span className="text-xs text-gray-400">you@example.com</span>
              </div>
              <div className={`${base} bg-teal-600 text-white`}>Sign up</div>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <div className="text-center">
            <div className={`${base} bg-teal-600 text-white`}>
              <Calendar className="h-4 w-4" /> Book a Demo
            </div>
          </div>
        );
      case 'download':
        return (
          <div className="text-center">
            <div className={`${base} bg-teal-600 text-white`}>
              <Download className="h-4 w-4" /> Download
            </div>
          </div>
        );
      default: // button
        return (
          <div className="text-center">
            <div className={`${base} bg-teal-600 text-white`}>
              Get Started <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        );
    }
  };

  // ─── Article body layout (responds to pageLayout) ─────────

  const renderBody = () => {
    if (textEntries.length === 0) {
      return (
        <p className="text-sm text-gray-400 text-center py-8">
          Generate content in Step 2 to see the article preview here
        </p>
      );
    }

    // Title + meta only shown here if NOT already shown in split-content hero
    const showTitleInBody = heroStyle !== 'split-content';

    const articleContent = (
      <div className="space-y-4">
        {showTitleInBody && titleText && (
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{titleText}</h1>
        )}
        {showTitleInBody && metaText && (
          <p className="text-sm text-gray-500 italic">{metaText}</p>
        )}
        {bodyEntries.map(([group, value]) => (
          <div key={group}>
            <SimpleMarkdown text={value.content ?? ''} />
          </div>
        ))}
        <div className="pt-4">{renderCta()}</div>
      </div>
    );

    if (pageLayout === 'two-column') {
      return (
        <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>{articleContent}</div>
          <aside className="space-y-4 pt-1">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">In this article</p>
              {bodyEntries.slice(0, 5).map(([group], i) => (
                <p key={group} className="text-xs text-teal-700 py-1 border-b border-gray-100 last:border-0">
                  {i + 1}. {group.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())}
                </p>
              ))}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Related</p>
              <div className="space-y-2">
                <div className="h-3 w-4/5 rounded bg-gray-200" />
                <div className="h-3 w-3/5 rounded bg-gray-200" />
                <div className="h-3 w-4/5 rounded bg-gray-200" />
              </div>
            </div>
          </aside>
        </div>
      );
    }

    if (pageLayout === 'magazine') {
      return (
        <div className="max-w-4xl mx-auto">
          {showTitleInBody && titleText && (
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{titleText}</h1>
          )}
          {showTitleInBody && metaText && (
            <p className="text-base text-gray-500 italic mb-6">{metaText}</p>
          )}
          {bodyEntries.length > 0 && (
            <div className="border-l-4 border-teal-500 pl-4 mb-6 py-1">
              <p className="text-lg text-gray-700 italic leading-relaxed">
                {(bodyEntries[0][1].content ?? '').split('.')[0]}.
              </p>
            </div>
          )}
          <div className="space-y-4">
            {bodyEntries.map(([group, value]) => (
              <div key={group}>
                <SimpleMarkdown text={value.content ?? ''} />
              </div>
            ))}
          </div>
          <div className="pt-6">{renderCta()}</div>
        </div>
      );
    }

    // Default: single-column
    return <div className="max-w-3xl mx-auto">{articleContent}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Config sections side by side */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {children}
      </div>

      {/* Per-section content editor */}
      {hasExistingContent && deliverableId && (
        <ContentSectionsEditor deliverableId={deliverableId} />
      )}

      {/* Full-width article preview */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600">Article Preview</span>
          {textEntries.length > 0 && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Live preview
            </span>
          )}
        </div>

        {renderHero()}

        <div className="px-6 py-5">
          {renderBody()}
        </div>
      </div>

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
