'use client';

import React, { useMemo } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { resolvePreviewComponent } from '../previews/preview-map';
import { HeroImageSlot } from '../previews/HeroImageSlot';
import { SimpleMarkdown } from '../previews/SimpleMarkdown';
import { STUDIO } from '@/lib/constants/design-tokens';
import { CheckCircle2, ImagePlus } from 'lucide-react';
import type { PreviewContent } from '../../../types/canvas.types';

interface WebPageLayoutProps {
  children: React.ReactNode;
  onAdvance: () => void;
  deliverableId?: string;
}

/**
 * Web-page-specific layout for Step 3 (Medium). Instead of the generic
 * config-left / preview-right split, this arranges:
 *
 *   [Page Layout]  [Content Sections]    ← 2-column config, collapsible
 *   [        Full-width article         ] ← live preview below
 *
 * The article preview updates in real-time as config values change
 * (read from canvas store which is updated on each field interaction).
 */
export function WebPageLayout({ children, onAdvance, deliverableId }: WebPageLayoutProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const variantGroups = useCanvasStore((s) => s.variantGroups);
  const selections = useCanvasStore((s) => s.selections);
  const heroImage = useCanvasStore((s) => s.heroImage);
  const setInsertImageModalOpen = useCanvasStore((s) => s.setInsertImageModalOpen);

  const platform = contextStack?.medium?.platform ?? null;
  const format = contextStack?.medium?.format ?? null;
  const previewEntry = useMemo(
    () => resolvePreviewComponent(platform, format),
    [platform, format],
  );

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

  return (
    <div className="space-y-6">
      {/* Config sections — rendered side by side, items-start so collapsed
          sections don't stretch to match the height of expanded ones */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {children}
      </div>

      {/* Full-width article preview */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-600">{previewEntry.label} Preview</span>
          {textEntries.length > 0 && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Live preview
            </span>
          )}
        </div>

        {/* Hero image — full width */}
        <button
          type="button"
          onClick={() => setInsertImageModalOpen(true)}
          className="w-full bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {heroImage?.url ? (
            <img
              src={heroImage.url}
              alt={heroImage.alt ?? ''}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 flex flex-col items-center justify-center gap-2 text-gray-400">
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">Click to add a hero image</span>
            </div>
          )}
        </button>

        {/* Article body */}
        <div className="px-6 py-5 max-w-3xl mx-auto">
          {textEntries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Generate content in Step 2 to see the article preview here
            </p>
          ) : (
            <div className="space-y-4">
              {textEntries.map(([group, value]) => {
                const isTitle = group.toLowerCase() === 'title';
                const isMeta = group.toLowerCase().includes('meta');
                return (
                  <div key={group}>
                    {isTitle ? (
                      <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                        {value.content}
                      </h1>
                    ) : isMeta ? (
                      <p className="text-sm text-gray-500 italic">{value.content}</p>
                    ) : (
                      <SimpleMarkdown text={value.content ?? ''} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm button */}
      <button
        type="button"
        onClick={onAdvance}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
      >
        <CheckCircle2 className="h-4 w-4" />
        Confirm & Continue
      </button>
    </div>
  );
}
