'use client';

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageIcon, Loader2, Sparkles, FolderOpen, Globe, Trash2 } from 'lucide-react';
import { Modal } from '@/components/shared';
import { CLEAR_IMAGE_SENTINEL, isClearedImage } from '../../../lib/feature-visual-preserve';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { VisualBriefSource } from '@/lib/ai/canvas-context';
import type { InsertImageSelection } from '../insert-image/types';

// Lazy zodat de picker-tabs (tanstack-query hooks, upload/stock/generate UI)
// niet in de bundle van /p/[slug] en de lp-screenshotter belanden — beide
// importeren puck-config (en dus dit field) maar openen nooit de picker.
// Factory i.p.v. één module-level lazy: React.lazy memoizet een REJECTED
// import permanent, dus de retry-knop moet een vers lazy-component kunnen
// maken om de chunk-load daadwerkelijk opnieuw te proberen.
const makeLazyImageSourcePanel = () =>
  lazy(() =>
    import('../ImageSourcePanel').then((m) => ({ default: m.ImageSourcePanel })),
  );

/**
 * Minimale error-boundary om de lazy-geladen picker: faalt de chunk-load of
 * gooit een tab, dan blijft de Suspense-spinner anders eeuwig hangen zonder
 * uitleg. Class-component omdat React lazy-failures alleen via een boundary
 * te vangen zijn.
 */
class PickerErrorBoundary extends React.Component<
  { onRetry: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error('[PuckImageField] picker failed to load:', error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-gray-600">
            De afbeeldingskiezer kon niet worden geladen.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Opnieuw proberen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Bronnen die in de veld-picker zinvol zijn: compose/trained zijn niet
 * modal-ready (amber dead-end in ImageSourcePanel), photography-request/none
 * leveren geen InsertImageSelection op.
 */
const FIELD_PICKER_SOURCES: VisualBriefSource[] = [
  'library',
  'smart-search',
  'generate',
  'upload',
  'url',
  'stock',
];

/**
 * Puck custom-field voor image-URL props (Layout editor, Canvas Step 3).
 *
 * Vervangt het kale tekstveld (raw `/uploads/media/...`-URL) door een
 * thumbnail-preview + "Kies afbeelding" die de bestaande media-library
 * interactie opent (ImageSourcePanel modal-variant: selecteren / zoeken /
 * genereren). De keuze stroomt UITSLUITEND via Puck's `onChange` het bestaande
 * autosave-pad in — bewust géén extra server-write vanuit dit veld (één
 * schrijfpad; de PATCH-route synct structuredVariant.hero op het chokepoint,
 * zie `syncHeroFromPuck` in hero-visual-preserve.ts).
 *
 * `allowClear` staat UIT voor de hero: een lege hero wordt server-side
 * teruggedraaid door `preserveHeroOnSettings` én de self-heal genereert dan
 * direct opnieuw — een wis-knop die niets blijvends doet is misleidend.
 * Feature-beelden hebben sinds #317 óók een clobber-guard
 * (`preserveFeatureVisualsOnSettings`) — een kale '' zou stil hersteld
 * worden. De wis-knop stuurt daarom CLEAR_IMAGE_SENTINEL: de guard herkent
 * dat als expliciete user-intentie, slaat de preserve over en normaliseert
 * naar '' bij persist (follow-up 2026-06-10).
 */
export function PuckImageField({
  value,
  onChange,
  label,
  allowClear,
  readOnly,
}: {
  value?: string | null;
  onChange: (v: string) => void;
  label?: string;
  allowClear?: boolean;
  /** Puck's field-render readOnly-arg: toon alleen de preview, geen acties. */
  readOnly?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [LazyPanel, setLazyPanel] = useState(() => makeLazyImageSourcePanel());
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const [activeSource, setActiveSource] = useState<VisualBriefSource>('library');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Broken-URL fallback: een 404'ende/verwijderde media-URL toont anders het
  // browser-broken-image-glyph. Geen reset-effect nodig — een nieuwe value
  // matcht de bewaarde broken-URL niet meer.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  // Focus-restore: shared Modal auto-focust de picker, maar laat focus bij
  // sluiten op document.body achter — keyboard-users verliezen hun plek in de
  // fullscreen editor. wasOpen-guard voorkomt focus-steal bij field-mount.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !pickerOpen) triggerRef.current?.focus();
    wasOpenRef.current = pickerOpen;
  }, [pickerOpen]);

  // Reset naar de library-tab bij elke open — de picker is veld-gebonden
  // (media library first), niet visualBrief-gebonden zoals InsertImageModal.
  // In de open-handler i.p.v. een effect (Next.js 16 ESLint set-state-in-effect).
  const openPicker = () => {
    setActiveSource('library');
    setPickerOpen(true);
  };

  // ESC-conflict: zowel shared Modal (document keydown) als de fullscreen
  // Puck-editor (window keydown, PuckPageBuilder) sluiten op Escape — zonder
  // deze guard sluit één ESC de hele editor mee. Capture-phase op window vuurt
  // vóór beide bubble-listeners; we sluiten alleen de picker en stoppen de
  // event volledig.
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      setPickerOpen(false);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [pickerOpen]);

  const hasValue = typeof value === 'string' && value.trim().length > 0 && !isClearedImage(value);
  const showThumb = hasValue && value !== brokenUrl;
  // Bron-heuristiek op de URL — zero-fetch herkomst-badge (AI-bestandsnamen
  // uit de generate-routes vs media-library-uploads vs externe URLs).
  const sourceBadge = !hasValue ? null
    : /feature-visual-|canvas-visual-|canvas-refined-/.test(value as string)
      ? { label: 'AI-gegenereerd', Icon: Sparkles }
    : (value as string).startsWith('/uploads/')
      ? { label: 'Media library', Icon: FolderOpen }
    : /^https?:\/\//.test(value as string)
      ? { label: 'Extern', Icon: Globe }
    : null;

  const handleSelected = (selection: InsertImageSelection) => {
    onChange(selection.url);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
          {label}
        </div>
      ) : null}

      {showThumb ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value as string}
            alt={label ?? 'Gekozen afbeelding'}
            onError={() => setBrokenUrl(value as string)}
            className="aspect-video w-full rounded-md border border-gray-200 object-cover"
          />
          {sourceBadge ? (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
              <sourceBadge.Icon className="h-3 w-3" />
              {sourceBadge.label}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <ImageIcon className="h-4 w-4" />
            {hasValue ? 'Afbeelding niet laadbaar' : 'Geen afbeelding'}
          </span>
        </div>
      )}

      {readOnly ? null : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            ref={triggerRef}
            onClick={openPicker}
            aria-label={`${hasValue ? 'Vervang' : 'Kies'} afbeelding${label ? ` — ${label}` : ''}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {hasValue ? 'Vervang afbeelding' : 'Kies afbeelding'}
          </button>
          {allowClear && hasValue ? (
            <button
              type="button"
              onClick={() => onChange(CLEAR_IMAGE_SENTINEL)}
              aria-label={`Verwijder afbeelding${label ? ` — ${label}` : ''}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Verwijderen
            </button>
          ) : null}
        </div>
      )}

      {pickerOpen && typeof window !== 'undefined'
        ? createPortal(
            // Portal naar document.body op dezelfde max z-index als de
            // fullscreen editor: latere DOM-order paint deterministisch
            // bovenop, en de portal ontwijkt transform/containing-block-traps
            // in Puck's sidebar (fixed-position zou daar gevangen raken).
            <Modal
              isOpen
              onClose={() => setPickerOpen(false)}
              title="Afbeelding kiezen"
              subtitle="Selecteer, zoek of genereer een afbeelding uit je media library"
              size="xl"
              zIndex={2147483647}
              // Nooit body-attrs muteren terwijl de Puck-editor gemount is:
              // Puck spiegelt die one-shot de preview-iframe in (gotcha
              // 2026-06-10). Body is hier toch niet de scroller.
              lockBodyScroll={false}
            >
              <PickerErrorBoundary onRetry={() => setLazyPanel(() => makeLazyImageSourcePanel())}>
                <Suspense
                  fallback={
                    <div role="status" className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="sr-only">Afbeeldingskiezer laden…</span>
                    </div>
                  }
                >
                  <LazyPanel
                    deliverableId={deliverableId}
                    source={activeSource}
                    onSourceChange={setActiveSource}
                    variant="modal"
                    sources={FIELD_PICKER_SOURCES}
                    onSelected={handleSelected}
                    onCancel={() => setPickerOpen(false)}
                  />
                </Suspense>
              </PickerErrorBoundary>
            </Modal>,
            document.body,
          )
        : null}
    </div>
  );
}
