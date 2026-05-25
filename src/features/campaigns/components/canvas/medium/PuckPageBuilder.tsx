'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Puck, Render, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Loader2, Lock, Unlock, Wand2, Pencil, FileText, Layout, X } from 'lucide-react';
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
    source: 'auto-iterate' | 'strict-rewrite';
  };
  const [pagePending, setPagePending] = useState<PagePending | null>(null);
  const [pageBusy, setPageBusy] = useState<null | 'auto-iterate' | 'strict-rewrite' | 'generate-page'>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [promptModal, setPromptModal] = useState<null | 'strict-rewrite' | 'generate-page'>(null);
  const [promptValue, setPromptValue] = useState('');

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

  const handleStrictRewriteSubmit = useCallback(async (instruction: string) => {
    setPageError(null);
    setPageBusy('strict-rewrite');
    try {
      const res = await fetch('/api/landing-pages/strict-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puckData,
          instruction,
          brandVoiceTone: contextStack?.brand?.brandToneOfVoice ?? null,
          brandName: contextStack?.brand?.brandName ?? null,
        }),
      });
      const json = (await res.json()) as
        | { status: 'proposal'; score: number; scoreProjected: number; threshold: number; proposedPuckData: SpikeData }
        | { status: 'error'; error: string };
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
        source: 'strict-rewrite',
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'strict-rewrite failed');
    } finally {
      setPageBusy(null);
    }
  }, [puckData, contextStack]);

  const handleGeneratePageSubmit = useCallback(async (prompt: string) => {
    if (!deliverableId) {
      setPageError('Geen deliverableId — kan generate niet starten');
      return;
    }
    setPageError(null);
    setPageBusy('generate-page');
    try {
      const res = await fetch('/api/landing-pages/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableId, prompt }),
      });
      const json = (await res.json()) as { puckData?: SpikeData; error?: string };
      if (!res.ok || !json.puckData) {
        setPageError(json.error ?? 'generate-page failed');
        return;
      }
      setPuckData(json.puckData);
      persistPuckData(json.puckData);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'generate-page failed');
    } finally {
      setPageBusy(null);
    }
  }, [deliverableId, persistPuckData]);

  const handlePageAccept = useCallback(
    (merged: SpikeData) => {
      setPuckData(merged);
      persistPuckData(merged);
      setPagePending(null);
    },
    [persistPuckData],
  );

  const handlePromptSubmit = useCallback(() => {
    const value = promptValue.trim();
    if (value.length < 3) return;
    const mode = promptModal;
    setPromptModal(null);
    setPromptValue('');
    if (mode === 'strict-rewrite') {
      void handleStrictRewriteSubmit(value);
    } else if (mode === 'generate-page') {
      void handleGeneratePageSubmit(value);
    }
  }, [promptValue, promptModal, handleStrictRewriteSubmit, handleGeneratePageSubmit]);

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-[480px] rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        Wachten op variant-generatie…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Page-level toolbar — boven de render zodat alle acties direct zichtbaar zijn */}
      <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="text-xs font-semibold text-gray-700">
          Pagina-acties (AI op hele page)
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pageError ? (
            <span className="text-xs text-red-600">{pageError}</span>
          ) : null}
          <button
            type="button"
            onClick={handleAutoIterate}
            disabled={pageBusy !== null}
            title="Verbeter automatisch wanneer de paginakwaliteit onder de drempel zit"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
          >
            {pageBusy === 'auto-iterate' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            Auto-iterate
          </button>
          <button
            type="button"
            onClick={() => { setPromptModal('strict-rewrite'); setPromptValue(''); }}
            disabled={pageBusy !== null}
            title="Herschrijf de hele pagina met jouw instructie"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
          >
            {pageBusy === 'strict-rewrite' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            Strict-rewrite
          </button>
          <button
            type="button"
            onClick={() => { setPromptModal('generate-page'); setPromptValue(''); }}
            disabled={pageBusy !== null}
            title="Genereer een nieuwe pagina vanaf nul met een prompt"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
          >
            {pageBusy === 'generate-page' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Generate from prompt
          </button>
        </div>
      </div>

      {/* Page-render met floating action buttons rechtsboven (lock + bewerk-layout) */}
      <div className="relative rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleLock}
            disabled={!lockTargetComponentId}
            title={lockTargetLocked ? 'Unlock — sta wijzigingen toe' : 'Lock — bevries huidige inhoud'}
            className={
              lockTargetLocked
                ? 'inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'
                : 'inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {lockTargetLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {lockTargetLocked ? 'Vergrendeld' : 'Ontgrendeld'}
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            title="Open layout-editor — herorden, voeg toe of verwijder componenten"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Layout className="h-3.5 w-3.5" />
            Bewerk layout
          </button>
        </div>
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

      {promptModal ? (
        <PromptInputModal
          title={
            promptModal === 'strict-rewrite'
              ? 'Strict-rewrite — instructie voor de hele page'
              : 'Generate from prompt — beschrijf de page'
          }
          placeholder={
            promptModal === 'strict-rewrite'
              ? 'Bijv. Maak alles 30% formeler'
              : 'Bijv. Landing page voor product-launch met persona Marit'
          }
          value={promptValue}
          onChange={setPromptValue}
          onSubmit={handlePromptSubmit}
          onCancel={() => { setPromptModal(null); setPromptValue(''); }}
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

function PromptInputModal({
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-6"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={value.trim().length < 3}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Versturen
          </button>
        </div>
      </div>
    </div>
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
