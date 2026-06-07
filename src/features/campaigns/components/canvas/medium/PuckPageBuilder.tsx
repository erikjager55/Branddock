'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Puck, Render, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Loader2, Shield, Wand2, Layout, X, ScanEye } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { buildSpikePuckConfig, type SpikePuckProps } from './puck-config';
import { variantToPuckData } from './variant-to-puck-data';
import { assignSectionBands } from './puck-templates/landing-page-from-structured';
import { generateCanvasVisual } from '../../../api/canvas.api';
import { buildHeroVisualInstruction } from '../../../lib/landing-page-visual-prompts';
import { PageDiffPreviewModal } from './PageDiffPreviewModal';
import { useBrandFontLoader } from './useBrandFontLoader';
import { buildA11yStyleBlock } from '@/lib/landing-pages/a11y-styles';
import { TokenProvenancePanel } from './TokenProvenancePanel';
import { useDeveloperAccess } from '@/hooks/use-developer-access';
// Page-level lock is stored op `puckData.root.props.locked` (boolean).
// Per-component lock-utils (component-lock.ts) blijven beschikbaar voor
// de fullscreen Puck-editor (sidebar metadata) — niet meer in default-view.

type SpikeData = Data<SpikePuckProps>;

const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * Past de achtergrond-band-afwisseling (bandTone) toe op een puckData-tree zodat
 * óók bestaande pagina's (gepersist vóór de bandTone-feature) direct ritmiek
 * tonen. Cloned de content (geen store-mutatie); deterministisch + idempotent.
 */
function withSectionBands(data: SpikeData): SpikeData {
  if (!data || !Array.isArray(data.content)) return data;
  const content = data.content.map((c) => ({ ...c, props: { ...c.props } }));
  assignSectionBands(content as Array<{ type: string; props: Record<string, unknown> }>);
  return { ...data, content } as SpikeData;
}

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
  const { data: isDeveloper } = useDeveloperAccess();
  const hydratedPuckData = (contextStack?.puckData ?? null) as SpikeData | null;

  const config = useMemo(() => buildSpikePuckConfig(contextStack), [contextStack]);

  // Laadt brand-fonts (Oranienbaum / Cormorant Garamond / Poppins / etc.)
  // dynamisch via Google Fonts zodat Puck-render de juiste typography toont
  // i.p.v. system-default sans-serif fallback.
  useBrandFontLoader(contextStack?.brandTokens ?? null);

  const initialData = useMemo<SpikeData>(() => {
    if (
      hydratedPuckData &&
      Array.isArray(hydratedPuckData.content) &&
      hydratedPuckData.content.length > 0
    ) {
      return withSectionBands(hydratedPuckData);
    }
    return withSectionBands(variantToPuckData(previewContent, contextStack));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [puckData, setPuckData] = useState<SpikeData>(initialData);
  const [editorOpen, setEditorOpen] = useState(false);

  // Re-hydrate puckData wanneer canvas-store.contextStack.puckData verandert
  // (typisch: async hero-visual generation in LandingPageGenerateBlock
  // updatet puckData.content[0].props.heroVisualUrl en PATCHED deliverable;
  // CanvasPage refetcht /context en setContextStack triggert deze effect).
  // Zonder deze sync bleef PuckPageBuilder de oude puckData zien (useMemo
  // op mount-only) en toonde hero als dark-placeholder ondanks dat de URL
  // wel gepersist was.
  // Guard: we updaten alleen als het inkomende puckData substantieel anders
  // is dan onze huidige state, anders treedt een infinite-loop op (set →
  // store → effect → set → ...).
  useEffect(() => {
    if (!hydratedPuckData) return;
    if (!Array.isArray(hydratedPuckData.content) || hydratedPuckData.content.length === 0) return;
    // Cheap diff: serialize-compare op content + root. Alleen sync bij
    // change. JSON.stringify is hier OK want puckData < 50KB typically.
    const normalized = withSectionBands(hydratedPuckData);
    const incoming = JSON.stringify(normalized);
    const current = JSON.stringify(puckData);
    if (incoming !== current) {
      setPuckData(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydratedPuckData]);

  type PagePending = {
    current: SpikeData;
    proposed: SpikeData;
    scoreBefore: number;
    scoreProjected: number;
    threshold: number;
    source: 'auto-iterate';
  };
  const [pagePending, setPagePending] = useState<PagePending | null>(null);
  const [pageBusy, setPageBusy] = useState<null | 'auto-iterate' | 'fidelity-check'>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  // Fase D — fidelity-result tonen na judge-call. Reset bij data-change zodat
  // stale-result niet blijft hangen wanneer user de page edit.
  const [fidelityResult, setFidelityResult] = useState<{
    score: number;
    verdict: 'excellent' | 'good' | 'fair' | 'poor';
    reasoning: string;
    mismatches: string[];
  } | null>(null);

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

  // ── Hero self-heal ──────────────────────────────────────────
  // User-eis: een landing-page heeft ALTIJD een header-image. De confirm-flow
  // (Step 2) genereert 'm, maar bij een timeout/fout bleef de hero leeg (Better
  // Brands). Hier herstellen we dat deterministisch: zodra de Medium-preview een
  // BrandHero ZONDER beeld toont, genereren we 'm alsnog en patchen + persisten
  // we de puckData. Eén poging per deliverable per sessie (ref-guard) → geen
  // herhaalde image-gen bij re-renders.
  const heroHealRef = useRef<Set<string>>(new Set());
  const [isHealingHero, setIsHealingHero] = useState(false);
  useEffect(() => {
    if (!deliverableId) return;
    // Ref-guard: max één poging per deliverable per sessie (geen extra
    // state-dep nodig → geen re-run bij toggle van de indicator).
    if (heroHealRef.current.has(deliverableId)) return;
    const content = Array.isArray(puckData?.content) ? puckData.content : [];
    const heroIdx = content.findIndex((c) => c?.type === 'BrandHero');
    if (heroIdx < 0) return;
    const heroProps = (content[heroIdx]?.props ?? {}) as { headline?: string; sub?: string; heroVisualUrl?: string };
    const hasImage = typeof heroProps.heroVisualUrl === 'string' && heroProps.heroVisualUrl.trim().length > 0;
    if (hasImage || !heroProps.headline) return;
    heroHealRef.current.add(deliverableId);
    const instruction = buildHeroVisualInstruction(
      { hero: { headline: heroProps.headline, subhead: heroProps.sub ?? '' } },
      contextStack,
    );
    // .then()-keten i.p.v. synchrone setState-in-effect (Next.js 16 ESLint).
    Promise.resolve()
      .then(() => {
        setIsHealingHero(true);
        return generateCanvasVisual(deliverableId, { instruction, aspectRatio: '16:9', count: 1 });
      })
      .then((result) => {
        const url = result.variants?.[0]?.url;
        if (!url) return;
        let nextData: SpikeData | null = null;
        setPuckData((prev) => {
          const items = (prev.content ?? []) as SpikeData['content'];
          const i = items.findIndex((c) => c?.type === 'BrandHero');
          if (i < 0) return prev;
          const updatedHero = {
            ...items[i],
            props: { ...items[i].props, heroVisualUrl: url },
          } as (typeof items)[number];
          nextData = { ...prev, content: items.map((c, idx) => (idx === i ? updatedHero : c)) };
          return nextData;
        });
        if (!nextData) return;
        // Direct persisten (niet de debounce) zodat het beeld de re-mount overleeft.
        // Daarna 'canvas:refresh-deliverable' dispatchen zodat CanvasPage /context
        // refetcht en de store (contextStack.puckData) MET het beeld synct — anders
        // kan de re-hydrate-effect de zojuist-gezette hero weer overschrijven met de
        // stale (beeldloze) store-versie (clobber-race).
        return fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { puckData: nextData } }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`persist HTTP ${res.status}`);
            window.dispatchEvent(new CustomEvent('canvas:refresh-deliverable', { detail: { deliverableId } }));
          })
          .catch((err) => console.warn('[PuckPageBuilder] hero self-heal persist failed', err));
      })
      .catch((err) => console.warn('[PuckPageBuilder] hero self-heal failed', err))
      .finally(() => setIsHealingHero(false));
  }, [deliverableId, puckData, contextStack]);

  const handlePuckChange = useCallback(
    (data: SpikeData) => {
      // Defense-in-depth: zelfs als de "Bewerk layout"-knop disabled is bij
      // pageLocked, mag een onChange-event van een al-open editor de page
      // niet alsnog muteren. Locked = bevries de hele content-tree.
      const currentRoot = (data.root?.props ?? {}) as Record<string, unknown>;
      if (currentRoot.locked === true) return;
      // Puck's onChange filtert props die niet in component.fields staan → de
      // bandTone (geen editor-field) wordt gestript en sectie-reorders breken de
      // ritmiek. Her-toepassen na elke editor-mutatie houdt de bands correct.
      const banded = withSectionBands(data);
      setPuckData(banded);
      persistPuckData(banded);
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
    // Auto-iterate doet nu 1 Anthropic rewrite-call (~60-90s) i.p.v. de
    // oude initial F-VAL + rewrite combo. Server-cap is 90s op de
    // Anthropic-call zelf + ~5s overhead. Client-cap 3 min geeft marge
    // voor 1 transient-retry zonder eindeloos hangen.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);
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
        signal: controller.signal,
      });
      const json = (await res.json()) as
        | { status: 'skipped'; reason: string; score: number; threshold: number }
        | { status: 'no_improvement'; reason: string; score: number; scoreProjected: number; threshold: number; delta: number }
        | { status: 'proposal'; score: number; scoreProjected: number; threshold: number; proposedPuckData: SpikeData }
        | { status: 'error'; error: string }
        // Non-2xx responses (bv. 502 'AI response not parseable') hebben geen
        // `status`-veld maar wel `error`. Zonder deze guard viel de flow door
        // naar setPagePending met proposedPuckData=undefined → lege modal.
        | { status?: undefined; error?: string; raw?: string };
      if (!res.ok || !('status' in json) || json.status === undefined) {
        setPageError(
          ('error' in json && json.error)
            ? json.error
            : 'Auto-iterate kon geen geldig voorstel genereren — de AI-respons was niet verwerkbaar. Probeer opnieuw.',
        );
        return;
      }
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
      if (json.status !== 'proposal' || !json.proposedPuckData?.content?.length) {
        setPageError(
          'Auto-iterate leverde geen bruikbaar voorstel op. Probeer opnieuw.',
        );
        return;
      }
      setPagePending({
        current: puckData,
        proposed: json.proposedPuckData,
        scoreBefore: typeof json.score === 'number' ? json.score : 0,
        // Server kan scoreProjected=null returnen wanneer F-VAL deep-score
        // uit staat (heuristic-mode default). Fallback op scoreBefore zodat
        // de modal niet 'NaN/70' toont — geen delta wordt visible maar
        // user kan alsnog accept/reject.
        scoreProjected:
          typeof json.scoreProjected === 'number'
            ? json.scoreProjected
            : (typeof json.score === 'number' ? json.score : 0),
        threshold: typeof json.threshold === 'number' ? json.threshold : 70,
        source: 'auto-iterate',
      });
    } catch (err) {
      // AbortError = timeout (4 min cap). Geef expliciete feedback i.p.v.
      // 'auto-iterate failed' wat als generic ai-error overkomt.
      if (err instanceof Error && err.name === 'AbortError') {
        setPageError(
          'Auto-iterate timeout (3 min). Mogelijk is Anthropic overbelast — probeer over 1-2 minuten opnieuw.',
        );
      } else {
        setPageError(err instanceof Error ? err.message : 'auto-iterate failed');
      }
    } finally {
      clearTimeout(timeoutId);
      setPageBusy(null);
    }
  }, [puckData, contextStack, deliverableId, pageLocked]);

  /** Fase D — fidelity-check: vergelijk LP-hero side-by-side met bron-
   *  website hero-screenshot. Geeft een verdict (excellent/good/fair/poor)
   *  + mismatches zodat user direct ziet of de gegenereerde LP visueel
   *  consistent is met de geanalyseerde bron. */
  const handleFidelityCheck = useCallback(async () => {
    setPageBusy('fidelity-check');
    setPageError(null);
    setFidelityResult(null);
    try {
      const res = await fetch(
        `/api/landing-pages/${deliverableId}/lp-fidelity-check`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) {
        setPageError(json.error ?? `Fidelity-check faalde (HTTP ${res.status})`);
        return;
      }
      setFidelityResult({
        score: json.score,
        verdict: json.verdict,
        reasoning: json.reasoning,
        mismatches: json.mismatches ?? [],
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'fidelity-check failed');
    } finally {
      setPageBusy(null);
    }
  }, [deliverableId]);

  const handlePageAccept = useCallback(
    (merged: SpikeData) => {
      setPuckData(merged);
      persistPuckData(merged);
      setPagePending(null);
    },
    [persistPuckData],
  );

  // Show full loading-state when:
  //   - parent reports generating, OR
  //   - we don't yet have non-empty puckData (= variant-choice not persisted
  //     OR puckData has been written but not yet hydrated back to store)
  // User-feedback 2026-05-28: pagina pas tonen wanneer alles klaar is —
  // geen half-gevulde state.
  const hasContent = Array.isArray(puckData.content) && puckData.content.length > 0;
  if (isGenerating || !hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-[480px] rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{isGenerating ? 'Variant wordt gegenereerd…' : 'Pagina wordt opgebouwd…'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top action-bar — Branddock-stijl outline buttons + lock-toggle (zoals
          Brand Styleguide header). Rechts-uitgelijnd boven de page-render. */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {isHealingHero ? (
          <span className="text-xs text-gray-500 mr-2 flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Header-beeld wordt gegenereerd…
          </span>
        ) : null}
        {pageBusy === 'auto-iterate' ? (
          <span className="text-xs text-gray-500 mr-2 flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Auto-iterate loopt (~60-90s) — Anthropic genereert verbetering…
          </span>
        ) : null}
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
          icon={pageBusy === 'fidelity-check' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanEye className="h-4 w-4" />}
          label="Brand-fit check"
          onClick={handleFidelityCheck}
          disabled={pageBusy !== null}
          title="Vergelijk deze LP-hero side-by-side met de geanalyseerde bron-website"
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

      {/* Fase D — fidelity-result banner. Verdict-bucket bepaalt kleur:
          excellent=emerald, good=teal, fair=amber, poor=red. */}
      {fidelityResult ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm space-y-2 ${
            fidelityResult.verdict === 'excellent' ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : fidelityResult.verdict === 'good' ? 'border-teal-200 bg-teal-50 text-teal-900'
              : fidelityResult.verdict === 'fair' ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                Brand-fit met bron: {fidelityResult.score}/100 — {fidelityResult.verdict}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFidelityResult(null)}
              className="opacity-60 hover:opacity-100"
              aria-label="Sluit"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs">{fidelityResult.reasoning}</p>
          {fidelityResult.mismatches.length > 0 ? (
            <ul className="text-xs space-y-0.5 list-disc pl-5">
              {fidelityResult.mismatches.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* a11y-styles injectie (#4 design-quality) — :focus-visible /
          :hover / reduced-motion / aria-disabled vereisen pseudo-class CSS
          die inline-styles niet kunnen leveren. Eenmalig per page-render. */}
      <style
        dangerouslySetInnerHTML={{
          __html: buildA11yStyleBlock(contextStack?.brandTokens?.brand ?? '#1FD1B2'),
        }}
      />

      {/* V3 — token-provenance footer (developer-only): waar komt elke
          gerenderde token-waarde vandaan? Maakt GIGO debugbaar vóór accept. */}
      {isDeveloper === true ? (
        <TokenProvenancePanel provenance={contextStack?.brandProvenance} />
      ) : null}

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
      {/* Branddock-style topbar ABOVE Puck — guarantees that "Close editor"
          is always visible at viewport-top, independent of Puck's own
          header-layout or any CSS conflicts. */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Layout className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">Layout editor</span>
          <span className="ml-2 text-xs text-gray-500">
            Drag components · reorder · ESC or &lsquo;Close editor&rsquo; to return
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close — back to preview"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-opacity"
        >
          <X className="h-4 w-4" />
          Close editor
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
