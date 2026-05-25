'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Puck, Render, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Loader2, Shield, Wand2, Layout, X } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { buildSpikePuckConfig, type SpikePuckProps } from './puck-config';
import { variantToPuckData } from './variant-to-puck-data';
import { PageDiffPreviewModal } from './PageDiffPreviewModal';
// Page-level lock is stored op `puckData.root.props.locked` (boolean).
// Per-component lock-utils (component-lock.ts) blijven beschikbaar voor
// de fullscreen Puck-editor (sidebar metadata) — niet meer in default-view.

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
      // Defense-in-depth: zelfs als de "Bewerk layout"-knop disabled is bij
      // pageLocked, mag een onChange-event van een al-open editor de page
      // niet alsnog muteren. Locked = bevries de hele content-tree.
      const currentRoot = (data.root?.props ?? {}) as Record<string, unknown>;
      if (currentRoot.locked === true) return;
      setPuckData(data);
      persistPuckData(data);
    },
    [persistPuckData],
  );

  // Page-level lock — semantisch "bevries de hele pagina, geen AI-mutaties".
  // Opgeslagen als boolean op `root.props.locked` zodat de toggle altijd
  // werkt onafhankelijk van content-id-shape (Puck normaliseert IDs bij
  // onChange en bij hydratatie zijn seed-IDs niet meer betrouwbaar).
  const pageLocked = useMemo(() => {
    const rootProps = puckData.root?.props as { locked?: boolean } | undefined;
    return rootProps?.locked === true;
  }, [puckData]);

  const handleToggleLock = useCallback(() => {
    const currentRootProps = (puckData.root?.props ?? {}) as Record<string, unknown>;
    const currentLocked = currentRootProps.locked === true;
    const nextData = {
      ...puckData,
      root: {
        ...(puckData.root ?? {}),
        props: { ...currentRootProps, locked: !currentLocked },
      },
    } as SpikeData;
    setPuckData(nextData);
    persistPuckData(nextData);
  }, [puckData, persistPuckData]);

  const handleAutoIterate = useCallback(async () => {
    if (pageLocked) {
      setPageError('Pagina is vergrendeld — ontgrendel eerst om AI-iteraties toe te staan.');
      return;
    }
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
        | { status: 'no_improvement'; reason: string; score: number; scoreProjected: number; threshold: number; delta: number }
        | { status: 'proposal'; score: number; scoreProjected: number; threshold: number; proposedPuckData: SpikeData }
        | { status: 'error'; error: string };
      if (json.status === 'skipped') {
        setPageError(`Page passeert al de kwaliteitsdrempel (${json.score}/${json.threshold})`);
        return;
      }
      if (json.status === 'no_improvement') {
        const sign = json.delta === 0 ? '±0' : `${json.delta}`;
        setPageError(
          `Auto-iterate vond geen verbetering (huidig ${json.score} → voorstel ${json.scoreProjected}, Δ${sign}). De huidige page-tekst blijft het beste voorstel.`,
        );
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
  }, [puckData, contextStack, deliverableId, pageLocked]);

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
          disabled={pageBusy !== null || pageLocked}
          title={pageLocked
            ? 'Pagina is vergrendeld — ontgrendel om AI-iteraties toe te staan'
            : 'Verbeter automatisch wanneer de paginakwaliteit onder de drempel zit'}
        />
        <ActionButton
          icon={<Layout className="h-4 w-4" />}
          label="Bewerk layout"
          onClick={() => setEditorOpen(true)}
          disabled={pageLocked}
          title={pageLocked
            ? 'Pagina is vergrendeld — ontgrendel om de layout te bewerken'
            : 'Open layout-editor — herorden, voeg toe of verwijder componenten'}
        />
        <LockToggle
          locked={pageLocked}
          onToggle={handleToggleLock}
        />
      </div>

      {/* Page-render — flat op de pagina-achtergrond, geen kader/wrapper-bg
          zodat de preview naadloos in het Step 3 layout zit. */}
      <Render config={config} data={puckData} />

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
 * High-contrast pill-shape lock-toggle met inline-style transform (Tailwind-
 * purge-proof) + zichtbare animatie + tekst-label.
 *
 * Color-rationale:
 *  - Unlocked → bg-emerald-500 (helder groen, "page is open voor edits")
 *  - Locked → bg-amber-500 (helder oranje-geel, "page bevroren")
 *  - White handle met colored Shield-icon = tweede contrast-laag.
 *
 * Implementation-keuze: handle-positionering via inline-style `transform`
 * ipv Tailwind translate-x-* utilities — voorkomt JIT-purge issues waar
 * dynamische class-names uit template-literals niet meegenomen worden in
 * de gecompileerde CSS (was de oorzaak van het "handle schuift niet"-issue
 * in Phase 6.9). Animatie via `transition-transform duration-300 ease-out`.
 *
 * Focus-state: explicit `focus:outline-none` kill de browser-default focus-
 * ring (was de "groene outline" rond de toggle), plus accessibility via
 * conditionele `focus-visible:ring-2` matching de state-kleur.
 *
 * Tekst-label rechts bevestigt de state in woorden — derde contrast-laag
 * voor users die kleurverschil minder zien.
 */
function LockToggle({
  locked,
  onToggle,
}: {
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        role="switch"
        aria-checked={locked}
        aria-label={locked ? 'Pagina is vergrendeld — klik om te ontgrendelen' : 'Pagina is ontgrendeld — klik om te vergrendelen'}
        title={locked ? 'Vergrendeld — klik om te ontgrendelen' : 'Ontgrendeld — klik om te vergrendelen'}
        className={`relative inline-flex h-8 w-14 items-center rounded-full shadow-inner transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          locked
            ? 'bg-amber-500 focus-visible:ring-amber-400'
            : 'bg-emerald-500 focus-visible:ring-emerald-400'
        }`}
      >
        <span
          className="absolute left-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${locked ? '30px' : '4px'})` }}
        >
          <Shield className={`h-3.5 w-3.5 ${locked ? 'text-amber-600' : 'text-emerald-600'}`} />
        </span>
      </button>
      <span className={`text-sm font-medium ${locked ? 'text-amber-700' : 'text-emerald-700'}`}>
        {locked ? 'Vergrendeld' : 'Ontgrendeld'}
      </span>
    </div>
  );
}

/**
 * Fullscreen modal die de volledige `<Puck>` editor opent (drag-drop /
 * Blocks-library / properties-panel) voor power-user layout-werk. Verstopt
 * achter de "Bewerk layout" knop zodat de preview-first default-view
 * uncluttered blijft.
 *
 * Implementation-keuze: React.createPortal naar `document.body` ipv
 * inline-render in de Step 3 React-tree — voorkomt stacking-context-trap
 * waar `fixed inset-0` constrained werd tot een transformed parent in
 * Branddock's app-shell (bug 2026-05-25: Sluit-editor topbar onzichtbaar
 * + Confirm-Continue knop nog steeds zichtbaar bij open editor).
 *
 * UI-keuze: ipv aparte slate-900 topbar BOVEN Puck, vervangen we Puck's
 * default Publish-knop via `overrides.headerActions` met een Branddock-
 * primary pill "Sluit editor". Dit consolideert tot één header (Puck's
 * eigen, met viewport-toggles + zoom + undo/redo behouden) en haalt
 * Puck's Publish-knop weg (we hebben eigen `/api/landing-pages/publish`).
 *
 * Theming: CSS-variable overrides op de wrapper-div mappen Puck's
 * `--puck-color-azure-*` blauw-palet naar Branddock primary cyan tones,
 * zodat selection-outlines, focus-rings, en hover-states matchen met
 * de rest van de app.
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

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      style={{
        // Inline-style fixed-positioning + max z-index om Tailwind-JIT-
        // compile issues (`z-[10000]` werd niet altijd opgepikt) en
        // stacking-context-traps van Branddock's app-chrome (z-30 sticky
        // top-nav + sidebar) te bypassen. Max int32 = 2147483647 garandeert
        // dat geen ander element ooit boven dit modal komt te liggen.
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        // Map Puck's azure-blauw accent-palette → Branddock primary cyan
        // (#1FD1B2 + darker hover). Geldt voor selection-outlines, focus-
        // rings, button-bg, en hover-tints binnen de Puck-editor.
        ['--puck-color-azure-04' as string]: '#1FD1B2',
        ['--puck-color-azure-05' as string]: '#0DAFA0',
        ['--puck-color-azure-11' as string]: '#e8faf7',
        ['--puck-color-azure-12' as string]: '#f0fdfa',
      } as React.CSSProperties}
    >
      {/* Branddock-stijl topbar BOVEN Puck — garandeert dat "Sluit editor"
          altijd zichtbaar is op viewport-top, onafhankelijk van Puck's
          eigen header-layout of eventuele CSS-conflicten. */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Layout className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">Layout-editor</span>
          <span className="ml-2 text-xs text-gray-500">
            Sleep componenten · pas volgorde aan · ESC of &lsquo;Sluit editor&rsquo; om terug
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten — terug naar preview"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-opacity"
        >
          <X className="h-4 w-4" />
          Sluit editor
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Puck
          config={config}
          data={data}
          onChange={onChange}
          overrides={{
            // Vervang Puck's default Publish-knop met een lege fragment —
            // we hebben eigen `/api/landing-pages/publish` flow buiten de
            // editor. De close-knop zit in onze eigen topbar hierboven.
            // Fragment ipv null omdat Puck's RenderFunc een ReactElement
            // verwacht (geen null).
            headerActions: () => <></>,
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
