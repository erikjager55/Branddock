'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Puck, Render, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Loader2, Shield, Wand2, Layout, X } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { buildSpikePuckConfig, type SpikePuckProps } from './puck-config';
import { variantToPuckData } from './variant-to-puck-data';
import { PageDiffPreviewModal } from './PageDiffPreviewModal';
import { isComponentLocked, toggleComponentLock } from '@/lib/landing-pages/component-lock';

type SpikeData = Data<SpikePuckProps>;

const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * Preview-first web-page builder voor de 5 Puck-types (Phase 6.6 — 2026-05-25).
 *
 * UX-keuze (user-feedback browser-smoke): de pagina is geschreven in brand-voice
 * via Step 2; component-level AI-rewrite (shorten/formal/casual/alternatives)
 * voegt weinig waarde toe en is verwijderd. Page-level AI (Auto-iterate /
 * Strict-rewrite / Generate-from-prompt) blijft voor structurele iteraties.
 *
 * Layout:
 *  - Full-width `<Render>` van puckData = hoofd-view (preview-first)
 *  - Floating action-buttons rechtsboven: lock-toggle + "Bewerk layout"
 *  - Page-level toolbar onderaan (3 page-AI actions)
 *  - Fullscreen Puck editor modal voor drag-drop / Blocks-library / properties
 *
 * Data-flow (ongewijzigd sinds Phase 1):
 *  - Hydrate uit `contextStack.puckData` (server-loaded)
 *  - Seed via {@link variantToPuckData} op first-mount
 *  - Persist via debounced 1500ms PATCH naar /api/studio/[deliverableId]
 */
export function PuckPageBuilder({
  previewContent,
  isGenerating,
}: PlatformPreviewProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const hydratedPuckData = (contextStack?.puckData ?? null) as SpikeData | null;

  const config = useMemo(() => buildSpikePuckConfig(contextStack), [contextStack]);

  const initialData = useMemo<SpikeData>(() => {
    if (
      hydratedPuckData &&
      Array.isArray(hydratedPuckData.content) &&
      hydratedPuckData.content.length > 0
    ) {
      return hydratedPuckData;
    }
    return variantToPuckData(previewContent, contextStack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [puckData, setPuckData] = useState<SpikeData>(initialData);
  const [editorOpen, setEditorOpen] = useState(false);

  type PagePending = {
    current: SpikeData;
    proposed: SpikeData;
    scoreBefore: number;
    scoreProjected: number;
    threshold: number;
    source: 'auto-iterate';
  };
  const [pagePending, setPagePending] = useState<PagePending | null>(null);
  const [pageBusy, setPageBusy] = useState<null | 'auto-iterate'>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPuckData = useCallback(
    (data: SpikeData) => {
      if (!deliverableId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { puckData: data } }),
        }).catch((err) => {
          console.warn('[PuckPageBuilder] auto-save failed', err);
        });
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [deliverableId],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const handlePuckChange = useCallback(
    (data: SpikeData) => {
      setPuckData(data);
      persistPuckData(data);
    },
    [persistPuckData],
  );

  // Lock-toggle target: first editable component in de tree. Lock geldt
  // semantisch voor de hele pagina ("bevries de huidige tekst"); in de
  // fullscreen editor kan per-component locks gezet via Puck sidebar.
  const lockTargetIndex = useMemo(() => {
    const editable = new Set(['BrandHero', 'BrandCTA', 'Testimonial', 'RichText', 'Footer']);
    return puckData.content.findIndex((c) => editable.has(c.type));
  }, [puckData]);

  const lockTargetComponentId =
    lockTargetIndex >= 0
      ? ((puckData.content[lockTargetIndex].props as { id?: string }).id ?? '')
      : '';
  const lockTargetLocked = lockTargetComponentId
    ? isComponentLocked(puckData as never, lockTargetComponentId)
    : false;

  const handleToggleLock = useCallback(() => {
    if (!lockTargetComponentId) return;
    const nextData = toggleComponentLock(puckData as never, lockTargetComponentId) as SpikeData;
    setPuckData(nextData);
    persistPuckData(nextData);
  }, [puckData, persistPuckData, lockTargetComponentId]);

  const handleAutoIterate = useCallback(async () => {
    setPageError(null);
    setPageBusy('auto-iterate');
    try {
      const res = await fetch('/api/landing-pages/auto-iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puckData,
          deliverableId,
          brandVoiceTone: contextStack?.brand?.brandToneOfVoice ?? null,
          brandName: contextStack?.brand?.brandName ?? null,
        }),
      });
      const json = (await res.json()) as
        | { status: 'skipped'; reason: string; score: number; threshold: number }
        | { status: 'proposal'; score: number; scoreProjected: number; threshold: number; proposedPuckData: SpikeData }
        | { status: 'error'; error: string };
      if (json.status === 'skipped') {
        setPageError(`Page passeert al de kwaliteitsdrempel (${json.score}/${json.threshold})`);
        return;
      }
      if (json.status === 'error') {
        setPageError(json.error);
        return;
      }
      setPagePending({
        current: puckData,
        proposed: json.proposedPuckData,
        scoreBefore: json.score,
        scoreProjected: json.scoreProjected,
        threshold: json.threshold,
        source: 'auto-iterate',
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'auto-iterate failed');
    } finally {
      setPageBusy(null);
    }
  }, [puckData, contextStack, deliverableId]);

  const handlePageAccept = useCallback(
    (merged: SpikeData) => {
      setPuckData(merged);
      persistPuckData(merged);
      setPagePending(null);
    },
    [persistPuckData],
  );

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-[480px] rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        Wachten op variant-generatie…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top action-bar — Branddock-stijl outline buttons + lock-toggle (zoals
          Brand Styleguide header). Rechts-uitgelijnd boven de page-render. */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {pageError ? (
          <span className="text-xs text-red-600 mr-2">{pageError}</span>
        ) : null}
        <ActionButton
          icon={pageBusy === 'auto-iterate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          label="Auto-iterate"
          onClick={handleAutoIterate}
          disabled={pageBusy !== null}
          title="Verbeter automatisch wanneer de paginakwaliteit onder de drempel zit"
        />
        <ActionButton
          icon={<Layout className="h-4 w-4" />}
          label="Bewerk layout"
          onClick={() => setEditorOpen(true)}
          title="Open layout-editor — herorden, voeg toe of verwijder componenten"
        />
        <LockToggle
          locked={lockTargetLocked}
          disabled={!lockTargetComponentId}
          onToggle={handleToggleLock}
        />
      </div>

      {/* Page-render */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <Render config={config} data={puckData} />
      </div>

      {pagePending ? (
        <PageDiffPreviewModal
          config={config}
          current={pagePending.current}
          proposed={pagePending.proposed}
          scoreBefore={pagePending.scoreBefore}
          scoreProjected={pagePending.scoreProjected}
          threshold={pagePending.threshold}
          source={pagePending.source}
          onAccept={handlePageAccept}
          onReject={() => setPagePending(null)}
        />
      ) : null}

      {editorOpen ? (
        <FullscreenEditorModal
          config={config}
          data={puckData}
          onChange={handlePuckChange}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Branddock-stijl secondary outline button voor de top action-bar
 * (zoals Edit / New analysis / Export op de Brand Styleguide page).
 * Rounded-full pill met Lucide icon + label.
 */
function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Emerald pill-shape lock-toggle in Branddock-stijl (zoals de Lock-toggle
 * op Brand Styleguide / Personas / Products header). Click toggle't tussen
 * unlocked (emerald-100 bg, handle links) en locked (amber-100 bg, handle
 * rechts) — kleurkeuze mirrort Branddock's bestaande lock-color-coding.
 */
function LockToggle({
  locked,
  disabled,
  onToggle,
}: {
  locked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={locked}
      aria-label={locked ? 'Pagina is vergrendeld — klik om te ontgrendelen' : 'Pagina is ontgrendeld — klik om te vergrendelen'}
      title={locked ? 'Vergrendeld — klik om te ontgrendelen' : 'Ontgrendeld — klik om te vergrendelen'}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        locked ? 'bg-amber-100' : 'bg-emerald-100'
      }`}
    >
      <span
        className={`absolute inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-transform ${
          locked ? 'translate-x-7 bg-amber-600' : 'translate-x-1 bg-emerald-600'
        }`}
      >
        <Shield className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/**
 * Fullscreen modal die de volledige `<Puck>` editor opent (drag-drop /
 * Blocks-library / properties-panel) voor power-user layout-werk. Verstopt
 * achter de "Bewerk layout" knop zodat de preview-first default-view
 * uncluttered blijft.
 */
function FullscreenEditorModal({
  config,
  data,
  onChange,
  onClose,
}: {
  config: ReturnType<typeof buildSpikePuckConfig>;
  data: SpikeData;
  onChange: (data: SpikeData) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-3 text-white">
        <div className="flex items-center gap-2">
          <Layout className="h-4 w-4" />
          <span className="text-sm font-semibold">Layout-editor</span>
          <span className="ml-2 text-xs opacity-70">
            Sleep componenten · pas volgorde aan · klik buiten om terug naar preview
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten — terug naar preview"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
          Sluit editor
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Puck config={config} data={data} onChange={onChange} />
      </div>
    </div>
  );
}
