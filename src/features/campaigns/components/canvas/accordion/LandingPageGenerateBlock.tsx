'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Loader2, Sparkles, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2, ImageIcon, Pencil,
} from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { generateCanvasVisual } from '../../../api/canvas.api';
import { variantToPuckDataFromStructured } from '../medium/variant-to-puck-data';
import { FidelityScoreBar } from '../FidelityScoreBar';
import type { LandingPageVariantContent } from '@/lib/landing-pages/variant-schema';
import { computeBrandRenderHints } from '@/lib/landing-pages/brand-render-rules';
import type { BrandTokens } from '@/lib/landing-pages/brand-tokens';
import { STUDIO } from '@/lib/constants/design-tokens';
import { ImageSourcePanel } from '../ImageSourcePanel';
import type { VisualBriefSource } from '@/lib/ai/canvas-context';
import type { InsertImageSelection } from '../insert-image/types';
import { setHeroImage as persistHeroImage } from '../../../api/canvas.api';

interface LandingPageGenerateBlockProps {
  deliverableId: string;
  onAdvance: () => void;
}

/**
 * Step 2 voor PUCK_WEBPAGE_TYPES (web-page-builder spec §4b).
 *
 * Multi-variant paradigma: server genereert 2 variants (conservative temp 0.3
 * + creative temp 0.7). User ziet beide side-by-side, kiest 1 → gekozen
 * variant gepromoot naar deliverable.settings.structuredVariant + puckData
 * (via Puck-mapper), daarna onAdvance naar Step 3 (Puck-editor).
 *
 * Vier weergaven:
 *  1. Briefing incompleet → amber-banner + Step 1-link (geen auto-trigger)
 *  2. Genereren bezig → spinner met "30-90 sec" ETA
 *  3. Genereer-error → ErrorBanner + "Probeer opnieuw"
 *  4. Klaar → 2 variant-cards naast elkaar + "Kies deze variant" knoppen
 *           + na keuze: hero-visual-knop + "Bevestig & ga naar editor"
 */
export function LandingPageGenerateBlock({
  deliverableId,
  onAdvance,
}: LandingPageGenerateBlockProps) {
  const setStructuredVariant = useCanvasStore((s) => s.setStructuredVariant);
  const setStructuredVariantOptions = useCanvasStore((s) => s.setStructuredVariantOptions);
  const setContextStack = useCanvasStore((s) => s.setContextStack);
  const resetFidelityScore = useCanvasStore((s) => s.resetFidelityScore);
  const setFidelityRunningForVariant = useCanvasStore((s) => s.setFidelityRunningForVariant);
  const setFidelityCompleteForVariant = useCanvasStore((s) => s.setFidelityCompleteForVariant);
  const setFidelityScoreSkippedForVariant = useCanvasStore((s) => s.setFidelityScoreSkippedForVariant);
  const variantOptions = useCanvasStore((s) => s.structuredVariantOptions) as
    | LandingPageVariantContent[]
    | null;
  const chosenVariant = useCanvasStore((s) => s.structuredVariant) as
    | LandingPageVariantContent
    | null;
  const brief = useCanvasStore((s) => s.brief);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const setActiveStep = useCanvasStore((s) => s.setActiveStep);
  const contextStack = useCanvasStore((s) => s.contextStack);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);

  // Welke variant getoond wordt in de FidelityScoreBar (klik op A/B-toggle).
  // Los van de gekozen variant — laat de user per-variant scores vergelijken.
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  // Handmatig geselecteerde hero-image. Wordt geïnjecteerd in de hero van de
  // gekozen variant zodat Step 3 (die puckData rendert) de foto toont — anders
  // verdween de selectie omdat persistHeroImage de puckData niet bijwerkt.
  const [selectedHeroImageUrl, setSelectedHeroImageUrl] = useState<string | null>(null);
  // LP-specifieke auto-iterate (Step 2): verbetert de actieve variant in-place.
  const [isAutoIterating, setIsAutoIterating] = useState(false);
  const [autoIterateMsg, setAutoIterateMsg] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [partialDelivery, setPartialDelivery] = useState<{ delivered: number; requested: number } | null>(null);
  // ImageSourcePanel state (Step 2 parity): user kiest image-source vóór
  // hero-visual aan deliverable hangt. Default 'generate' want dat is de
  // meest-gebruikte flow. Bij asset-selectie roept persistHeroImage aan.
  const [visualSource, setVisualSource] = useState<VisualBriefSource>('generate');
  const handleImageSelected = useCallback(async (selection: InsertImageSelection) => {
    try {
      // imageSource afleiden uit visualSource state (= active tab in panel).
      const sourceMap: Record<string, 'library' | 'url-import' | 'stock' | 'ai-generated' | 'upload'> = {
        'library': 'library',
        'url': 'url-import',
        'stock': 'stock',
        'generate': 'ai-generated',
        'upload': 'upload',
        'smart-search': 'library',
        'compose': 'ai-generated',
        'trained-style': 'ai-generated',
        'photography-request': 'library',
      };
      const imageSource = sourceMap[visualSource] ?? 'library';
      await persistHeroImage(deliverableId, {
        imageUrl: selection.url,
        imageSource,
        mediaAssetId: selection.mediaAssetId ?? null,
        alt: selection.alt ?? null,
      });
      // Onthoud de selectie zodat handleChooseVariant 'm in de hero injecteert.
      setSelectedHeroImageUrl(selection.url);
      // Wanneer al een variant gekozen is (user kwam via back-nav terug), werk
      // de puckData meteen bij — anders rendert Step 3 de oude (lege) hero.
      if (chosenVariant) {
        const updated: LandingPageVariantContent = {
          ...chosenVariant,
          hero: { ...chosenVariant.hero, heroVisualUrl: selection.url },
        };
        setStructuredVariant(updated);
        const puckData = variantToPuckDataFromStructured(updated, contextStack);
        await fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { structuredVariant: updated, puckData } }),
        });
      }
      window.dispatchEvent(
        new CustomEvent('canvas:refresh-deliverable', { detail: { deliverableId } }),
      );
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Hero-image opslaan mislukt');
    }
  }, [deliverableId, visualSource, chosenVariant, contextStack, setStructuredVariant]);

  const builtPrompt = useMemo(() => {
    const parts: string[] = [];
    if (brief.objective?.trim()) parts.push(`Doel: ${brief.objective.trim()}`);
    if (brief.keyMessage?.trim()) parts.push(`Kernboodschap: ${brief.keyMessage.trim()}`);
    const valueProp = contentTypeInputs.valueProposition;
    if (typeof valueProp === 'string' && valueProp.trim()) parts.push(`Value proposition: ${valueProp.trim()}`);
    const targetObj = contentTypeInputs.targetObjection;
    if (typeof targetObj === 'string' && targetObj.trim()) parts.push(`Belangrijkste bezwaar om weg te nemen: ${targetObj.trim()}`);
    const conversionGoal = contentTypeInputs.conversionGoal;
    if (typeof conversionGoal === 'string' && conversionGoal.trim()) parts.push(`Conversie-doel: ${conversionGoal.trim()}`);
    const trafficSource = contentTypeInputs.trafficSource;
    if (typeof trafficSource === 'string' && trafficSource.trim()) parts.push(`Primaire traffic-bron: ${trafficSource.trim()}`);
    const socialProof = contentTypeInputs.socialProof;
    if (Array.isArray(socialProof) && socialProof.length > 0) parts.push(`Beschikbare social proof: ${socialProof.join(', ')}`);
    if (brief.callToAction?.trim()) parts.push(`Gewenste CTA-tekst: ${brief.callToAction.trim()}`);
    if (brief.toneDirection?.trim()) parts.push(`Tone-direction: ${brief.toneDirection.trim()}`);
    return parts.join('\n');
  }, [brief, contentTypeInputs]);

  const { includeProblem, includePricing } = useMemo(() => {
    const targetObj = contentTypeInputs.targetObjection;
    const hasObjection = typeof targetObj === 'string' && targetObj.trim().length > 0;
    const conversionGoal = contentTypeInputs.conversionGoal;
    const PRICING_GOALS = new Set(['Purchase', 'Free Trial']);
    const wantsPricing = typeof conversionGoal === 'string' && PRICING_GOALS.has(conversionGoal);
    return { includeProblem: hasObjection, includePricing: wantsPricing };
  }, [contentTypeInputs]);

  const briefIncomplete = !brief.objective?.trim() && !contentTypeInputs.valueProposition;

  /**
   * Track 5 (plan zippy-twirling-feigenbaum 2026-05-29) — fire-and-forget
   * F-VAL scoring voor 1 variant. Schrijft running → complete/skipped naar
   * store; `FidelityScoreBar` rendert vanuit dezelfde state als
   * content-deliverables in `Step2ContentVariants`. Scoort enkel variant 0
   * (scope A); per-variant scoring is scope B (out-of-scope).
   */
  const scoreVariantFidelity = useCallback(
    async (variant: LandingPageVariantContent, variantIndex: number) => {
      setFidelityRunningForVariant(variantIndex);
      try {
        const res = await fetch(
          `/api/landing-pages/${deliverableId}/score-variant-fidelity`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variantIndex, variant }),
          },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setFidelityScoreSkippedForVariant(
            variantIndex,
            data.error ?? `HTTP ${res.status}`,
          );
          return;
        }
        const data = (await res.json()) as
          | {
              skipped: false;
              payload: {
                compositeScore: number;
                thresholdMet: boolean;
                compositeThreshold: number;
                detectorVerdict: 'TOP_TIER' | 'HUMAN_BASELINE' | 'AI_LEANING' | 'PURE_AI';
                humanBaselinePosition: number;
                pillars: {
                  style: number | null;
                  judge: number | null;
                  rules: number | null;
                };
                elapsedMs: number;
              };
            }
          | { skipped: true; reason: string };
        if (data.skipped) {
          setFidelityScoreSkippedForVariant(variantIndex, data.reason);
          return;
        }
        setFidelityCompleteForVariant(variantIndex, data.payload);
      } catch (err) {
        setFidelityScoreSkippedForVariant(
          variantIndex,
          err instanceof Error ? err.message : 'fetch-error',
        );
      }
    },
    [
      deliverableId,
      setFidelityCompleteForVariant,
      setFidelityRunningForVariant,
      setFidelityScoreSkippedForVariant,
    ],
  );

  const handleGenerate = useCallback(async () => {
    if (briefIncomplete) {
      setError('Vul eerst Doel of Value Proposition in Step 1.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    resetFidelityScore();
    try {
      const res = await fetch(
        `/api/landing-pages/${deliverableId}/generate-structured-variant`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPrompt: builtPrompt,
            includeProblem,
            includePricing,
            count: 2,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        variants: LandingPageVariantContent[];
        deliveredCount?: number;
        requestedCount?: number;
      };
      setStructuredVariantOptions(data.variants);
      // Reset chosen variant zodat user-keuze opnieuw moet plaatsvinden
      setStructuredVariant(null);
      // Partial delivery: 1 van 2 variants gelukt — banner tonen
      if (
        typeof data.requestedCount === 'number'
        && typeof data.deliveredCount === 'number'
        && data.deliveredCount < data.requestedCount
      ) {
        setPartialDelivery({ delivered: data.deliveredCount, requested: data.requestedCount });
      } else {
        setPartialDelivery(null);
      }
      // Track 5 — fire-and-forget scoring voor ALLE varianten (A + B). User
      // ziet variants direct; per-variant fidelity-score volgt ~20s later via
      // store-update zodat klikken op variant B ook diens score toont. Geen
      // await — variant-keuze mag niet blokkeren op scoring-latency.
      data.variants.forEach((v, i) => void scoreVariantFidelity(v, i));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generatie mislukt');
    } finally {
      setIsGenerating(false);
    }
  }, [
    briefIncomplete,
    builtPrompt,
    deliverableId,
    includePricing,
    includeProblem,
    resetFidelityScore,
    scoreVariantFidelity,
    setStructuredVariant,
    setStructuredVariantOptions,
  ]);

  // Auto-trigger op mount
  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (
      !variantOptions
      && !chosenVariant
      && !isGenerating
      && !briefIncomplete
      && !error
      && !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      void handleGenerate();
    }
  }, [variantOptions, chosenVariant, isGenerating, briefIncomplete, error, handleGenerate]);

  /**
   * Genereert een hero-visual en RETURNT de eerste URL (of null) — geen persist/
   * navigatie-side-effects. Vult wel de image-varianten-picker. Zo kan de
   * variant-keuze de URL deterministisch IN de variant vouwen vóór de éne
   * persist+render (i.p.v. fire-and-forget dat soms een kleurblok liet zien).
   */
  const generateHeroVisualUrl = useCallback(
    async (variant: LandingPageVariantContent): Promise<string | null> => {
      const heroVisualInstruction = buildHeroVisualInstruction(variant, contextStack);
      const result = await generateCanvasVisual(deliverableId, {
        instruction: heroVisualInstruction,
        aspectRatio: '16:9',
        count: 1,
      });
      const variants = result.variants ?? [];
      if (variants.length === 0) return null;
      setImageVariants(
        variants.map((v, i) => ({ index: i, url: v.url, prompt: v.prompt ?? '', isSelected: i === 0 })),
      );
      return variants[0]?.url ?? null;
    },
    [contextStack, deliverableId, setImageVariants],
  );

  /**
   * Genereert een hero-visual, injecteert de URL in de hero en persisteert de
   * bijgewerkte puckData. Gebruikt door de handmatige "genereer visual"-knop in
   * Step 3 (eigen persist + refresh).
   */
  const generateHeroVisualFor = useCallback(
    async (variant: LandingPageVariantContent): Promise<void> => {
      const firstUrl = await generateHeroVisualUrl(variant);
      if (!firstUrl) return;
      const updated: LandingPageVariantContent = {
        ...variant,
        hero: { ...variant.hero, heroVisualUrl: firstUrl },
      };
      setStructuredVariant(updated);
      const puckData = variantToPuckDataFromStructured(updated, contextStack);
      await fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { structuredVariant: updated, puckData } }),
      });
      window.dispatchEvent(
        new CustomEvent('canvas:refresh-deliverable', { detail: { deliverableId } }),
      );
    },
    [generateHeroVisualUrl, contextStack, deliverableId, setStructuredVariant],
  );

  const handleChooseVariant = useCallback(async (variant: LandingPageVariantContent) => {
    setIsChoosing(true);
    setError(null);
    try {
      // Injecteer een eerder handmatig geselecteerde hero-image zodat Step 3
      // (die puckData rendert) de foto toont. Behoud een reeds aanwezige
      // heroVisualUrl op de variant wanneer er geen losse selectie is.
      let chosen: LandingPageVariantContent = selectedHeroImageUrl
        ? { ...variant, hero: { ...variant.hero, heroVisualUrl: selectedHeroImageUrl } }
        : variant;
      // Verplichte header-image (user-feedback 2026-06-03): een LP zonder hero-
      // image is niet toegestaan. DETERMINISTISCH: genereer 'm hier en vouw 'm
      // IN de variant vóór de éne persist+render — zodat Step 3 de pagina MÉT de
      // foto toont i.p.v. eerst een kleurblok (de oude fire-and-forget-na-
      // onAdvance liet soms een beeldloze hero zien). Faalt de generatie, dan
      // surfacen we dat + de pagina rendert zonder foto (handmatige knop in
      // Step 3 blijft beschikbaar) — navigatie wordt niet geblokkeerd.
      if (!chosen.hero.heroVisualUrl) {
        setIsGeneratingVisual(true);
        setVisualError(null);
        try {
          // Race tegen een ceiling zodat een hangende image-API de keuze-flow
          // niet oneindig blokkeert: bij timeout renderen we zonder foto (de
          // gen loopt door en vult de picker zodra klaar). 45s dekt FLUX/Imagen.
          const heroUrl = await Promise.race([
            generateHeroVisualUrl(chosen),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 45_000)),
          ]);
          if (heroUrl) {
            chosen = { ...chosen, hero: { ...chosen.hero, heroVisualUrl: heroUrl } };
          } else {
            setVisualError('Automatische header-image kwam niet (op tijd) terug — genereer handmatig in Step 3.');
          }
        } catch (genErr) {
          setVisualError(genErr instanceof Error ? genErr.message : 'Automatische header-image mislukt — genereer handmatig in Step 3.');
        } finally {
          setIsGeneratingVisual(false);
        }
      }
      const puckData = variantToPuckDataFromStructured(chosen, contextStack);
      const patchRes = await fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { structuredVariant: chosen, puckData },
        }),
      });
      if (!patchRes.ok) {
        throw new Error(`Persist mislukt: HTTP ${patchRes.status}`);
      }
      setStructuredVariant(chosen);
      // Fetch /context expliciet zodat contextStack.puckData synchroon
      // ververst is vóór user naar Step 3 doorklikt.
      try {
        const ctxRes = await fetch(`/api/studio/${deliverableId}/context`);
        if (ctxRes.ok) {
          const ctxData = (await ctxRes.json()) as { contextStack?: typeof contextStack };
          if (ctxData?.contextStack) {
            setContextStack(ctxData.contextStack);
          }
        }
      } catch {
        // Niet-blokkerend: dispatch event als fallback voor andere listeners
      }
      window.dispatchEvent(
        new CustomEvent('canvas:refresh-deliverable', { detail: { deliverableId } }),
      );
      // De hero-image (indien gegenereerd) zit nu al in de gepersisteerde
      // puckData → Step 3 rendert de pagina MÉT de foto.
      onAdvance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Variant-keuze opslaan mislukt');
    } finally {
      setIsChoosing(false);
    }
  }, [contextStack, deliverableId, selectedHeroImageUrl, setContextStack, setStructuredVariant, onAdvance, generateHeroVisualUrl]);

  const handleGenerateVisual = useCallback(async () => {
    if (!chosenVariant) return;
    setIsGeneratingVisual(true);
    setVisualError(null);
    try {
      await generateHeroVisualFor(chosenVariant);
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Visual-generatie mislukt');
    } finally {
      setIsGeneratingVisual(false);
    }
  }, [chosenVariant, generateHeroVisualFor]);

  /**
   * LP auto-iterate (Step 2): laat het backend de actieve variant herschrijven
   * voor een hogere fidelity-score, vervangt 'm in-place in de options en
   * herscoort. Vervangt de generieke studio-trigger die LP-structured niet kan
   * lezen (gaf "0 woorden").
   */
  const handleAutoIterateVariant = useCallback(async () => {
    if (!variantOptions) return;
    const variant = variantOptions[activeVariantIndex];
    if (!variant) return;
    setIsAutoIterating(true);
    setAutoIterateMsg(null);
    try {
      const res = await fetch(`/api/landing-pages/${deliverableId}/auto-iterate-variant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantIndex: activeVariantIndex, variant }),
      });
      const json = (await res.json()) as
        | { status: 'skipped'; reason: string }
        | { status: 'no_improvement'; score: number; scoreProjected: number }
        | { status: 'proposal'; score: number; scoreProjected: number | null; variant: LandingPageVariantContent }
        | { status: 'error'; error: string }
        | { status?: undefined; error?: string };
      if (!res.ok || !('status' in json) || json.status === undefined) {
        setAutoIterateMsg(('error' in json && json.error) ? json.error : 'Verbeteren mislukt — probeer opnieuw.');
        return;
      }
      if (json.status === 'skipped') {
        setAutoIterateMsg(
          json.reason === 'above-threshold'
            ? 'Deze variant zit al boven de drempel.'
            : 'Te weinig content om te verbeteren.',
        );
        return;
      }
      if (json.status === 'no_improvement') {
        setAutoIterateMsg(`Geen verbetering gevonden (${json.score} → ${json.scoreProjected}). Huidige variant blijft.`);
        return;
      }
      if (json.status === 'error') {
        setAutoIterateMsg(json.error);
        return;
      }
      // proposal — vervang variant in-place + herscoor zodat de bar update.
      setStructuredVariantOptions(
        variantOptions.map((v, i) => (i === activeVariantIndex ? json.variant : v)),
      );
      void scoreVariantFidelity(json.variant, activeVariantIndex);
      setAutoIterateMsg(`Verbeterd: ${json.score} → ${json.scoreProjected ?? '?'}.`);
    } catch (err) {
      setAutoIterateMsg(err instanceof Error ? err.message : 'Verbeteren mislukt');
    } finally {
      setIsAutoIterating(false);
    }
  }, [variantOptions, activeVariantIndex, deliverableId, setStructuredVariantOptions, scoreVariantFidelity]);

  // ─── Briefing incompleet ─────────────────────────────────
  if (briefIncomplete) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Brief incompleet</p>
              <p className="text-xs text-amber-800 mt-1">
                Vul eerst minimaal Doel of Value Proposition in Step 1.
              </p>
              <button
                type="button"
                onClick={() => setActiveStep('context')}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline hover:text-amber-700"
              >
                <ArrowLeft className="h-3 w-3" />Terug naar Step 1
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Genereren bezig ─────────────────────────────────────
  if (!variantOptions && !chosenVariant && isGenerating) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-8 flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
          <div>
            <p className="text-sm font-medium text-teal-900">2 landing-page varianten genereren...</p>
            <p className="text-xs text-teal-800 mt-1">
              Conservative + creative variant in parallel — totaal 30-90 seconden.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Generatie-fout ──────────────────────────────────────
  if (!variantOptions && !chosenVariant && error) {
    return (
      <div className="space-y-6">
        <ErrorBanner message={error} />
        <button
          type="button"
          onClick={() => { setError(null); void handleGenerate(); }}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
        >
          <Sparkles className="h-4 w-4" />Probeer opnieuw
        </button>
        <button
          type="button"
          onClick={() => setActiveStep('context')}
          className="w-full inline-flex items-center justify-center gap-1 text-xs text-gray-600 underline hover:text-gray-900"
        >
          <ArrowLeft className="h-3 w-3" />Brief aanpassen in Step 1
        </button>
      </div>
    );
  }

  // ─── Variant-keuze (na generatie, vóór keuze) ────────────
  if (variantOptions && !chosenVariant) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <p className="font-medium">
            {variantOptions.length} variant{variantOptions.length === 1 ? '' : 'en'} klaar — kies welke past
          </p>
        </div>
        {/* Track 5 — F-VAL fidelity-score voor LP-variant. Verschijnt zodra
            scoring-call gestart is (running state) en update naar complete
            (~20s later) via setFidelityCompleteForVariant. Identiek pattern
            aan Step2ContentVariants.tsx voor content-deliverables.
            variantIndex koppelt de bar aan de A/B-toggle hieronder zodat
            klikken op B diens score toont. */}
        {variantOptions.length > 1 ? (
          <div className="flex items-center gap-2" role="tablist" aria-label="Variant voor fidelity-score">
            {variantOptions.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={activeVariantIndex === i}
                onClick={() => setActiveVariantIndex(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeVariantIndex === i
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Variant {String.fromCharCode(65 + i)}
              </button>
            ))}
          </div>
        ) : null}
        <FidelityScoreBar deliverableId={deliverableId} variantIndex={activeVariantIndex} suppressAutoIterateCta />
        {/* LP-specifieke auto-iterate: verbetert de actieve variant in-place.
            Vervangt de generieke studio-trigger (gaf "0 woorden" op LP). */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAutoIterateVariant}
            disabled={isAutoIterating || isChoosing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50"
          >
            {isAutoIterating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Verbeteren…</>
            ) : (
              <><Sparkles className="h-4 w-4" />Verbeter variant {String.fromCharCode(65 + activeVariantIndex)} automatisch</>
            )}
          </button>
          {autoIterateMsg ? (
            <p className="text-xs text-gray-600">{autoIterateMsg}</p>
          ) : null}
        </div>
        {partialDelivery ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {partialDelivery.delivered} van {partialDelivery.requested} varianten geleverd
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Eén variant is niet gelukt (timeout of validatie-fail). Klik &lsquo;Genereer
                2 nieuwe varianten&rsquo; om opnieuw te proberen, of werk verder met de
                geleverde.
              </p>
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {variantOptions.map((v, i) => (
            <VariantCompareCard
              key={i}
              variant={v}
              label={i === 0 ? 'Variant A — conservative' : 'Variant B — creative'}
              accent={i === 0 ? 'emerald' : 'violet'}
              disabled={isChoosing}
              onChoose={(edited) => void handleChooseVariant(edited)}
            />
          ))}
        </div>
        {/* Deterministische hero-gen feedback: tijdens de keuze genereert de
            verplichte hero-image (de pagina opent ermee). Surface dat + een
            niet-blokkerende waarschuwing bij timeout/fout (pagina rendert dan
            zonder foto). Voorheen werd deze state nergens getoond → stil. */}
        {isChoosing && isGeneratingVisual ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Hero-image genereren — de pagina opent met de foto…
          </div>
        ) : null}
        {visualError ? (
          <div role="alert" className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-xs text-amber-700">{visualError}</p>
          </div>
        ) : null}
        {error ? <ErrorBanner message={error} /> : null}

        {/* User-feedback 2026-05-28: hetzelfde Step 2 patroon als 'Content
            Variants' — Visual-source tab-strip + Regenerate-feedback +
            Confirm & Continue onderaan. ImageSourcePanel embedded handelt
            alle 10 image-sources (smart-search/generate/library/upload/url/
            stock/compose/trained-style/photography-request/none). */}
        <ImageSourcePanel
          deliverableId={deliverableId}
          source={visualSource}
          onSourceChange={setVisualSource}
          variant="embedded"
          onSelected={handleImageSelected}
        />

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isChoosing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Regenereren...</>
            ) : (
              <><RefreshCw className="h-4 w-4" />Genereer 2 nieuwe varianten</>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              const first = variantOptions[0];
              if (first) void handleChooseVariant(first);
            }}
            disabled={isChoosing || !variantOptions?.[0]}
            className={`ml-auto inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium ${STUDIO.generateButton} disabled:opacity-50`}
          >
            {isChoosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Bevestig & ga door
          </button>
        </div>
      </div>
    );
  }

  // No-data fallback
  if (!chosenVariant) {
    return null;
  }

  // ─── Variant gekozen — korte status, geen detailed preview ─
  // User-feedback 2026-05-28: de section-by-section preview is verwijderd.
  // handleChooseVariant doet nu meteen onAdvance() → wizard wisselt direct
  // naar Step 3 (Medium). Wanneer user via back-nav terug komt naar Step 2:
  // toont alleen een korte status met optie 'Andere variant kiezen'.
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">Variant gekozen</p>
          <p className="text-xs text-emerald-800 mt-0.5">
            De pagina is opgebouwd in Step 3 (Medium). Klik hieronder om een andere variant te kiezen of door te gaan.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {variantOptions && variantOptions.length > 1 ? (
          <button
            type="button"
            onClick={() => setStructuredVariant(null)}
            className="text-xs font-medium text-gray-600 underline hover:text-gray-900"
          >
            Andere variant kiezen
          </button>
        ) : null}
        <div className="ml-auto">
          <button
            type="button"
            onClick={onAdvance}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium ${STUDIO.generateButton}`}
          >
            <CheckCircle2 className="h-4 w-4" />Open editor (Step 3)
          </button>
        </div>
      </div>
    </div>
  );
}

// Onbereikbaar — vroegere detailed preview wordt niet meer gerendered.

// ─── Sub-componenten ──────────────────────────────────────

function VariantCompareCard({
  variant: initialVariant,
  label,
  accent,
  disabled,
  onChoose,
}: {
  variant: LandingPageVariantContent;
  label: string;
  accent: 'emerald' | 'violet';
  disabled: boolean;
  onChoose: (variant: LandingPageVariantContent) => void;
}) {
  // Local edit-state: user kan inline velden bewerken voordat hij "Kies"
  // klikt. Pennetje naast elk veld toggled edit-mode.
  const [v, setV] = useState<LandingPageVariantContent>(initialVariant);

  // Re-sync wanneer parent een nieuwe variant levert (regenerate).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- bewust: state-reset bij prop-change, niet derived state
  useEffect(() => { setV(initialVariant); }, [initialVariant]);

  const ringClass = accent === 'emerald' ? 'border-emerald-200' : 'border-violet-200';
  const tagClass =
    accent === 'emerald'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-violet-100 text-violet-800';

  return (
    <div className={`rounded-lg border-2 ${ringClass} bg-white p-4 flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto`}>
      <div className="sticky top-0 bg-white pb-2 border-b border-gray-100 -mx-4 px-4 -mt-4 pt-4 z-10">
        <span className={`inline-block text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded ${tagClass}`}>
          {label}
        </span>
      </div>

      {/* HERO */}
      <VariantSection title="Hero">
        <EditableField
          label="Headline"
          value={v.hero.headline}
          onChange={(val) => setV({ ...v, hero: { ...v.hero, headline: val } })}
          fontClass="text-base font-semibold text-gray-900"
        />
        <EditableField
          label="Subhead"
          value={v.hero.subhead}
          onChange={(val) => setV({ ...v, hero: { ...v.hero, subhead: val } })}
          multiline
          fontClass="text-sm text-gray-700"
        />
        {v.hero.eyebrow ? (
          <EditableField
            label="Eyebrow"
            value={v.hero.eyebrow}
            onChange={(val) => setV({ ...v, hero: { ...v.hero, eyebrow: val } })}
            fontClass="text-xs uppercase tracking-wider text-gray-600"
          />
        ) : null}
        <EditableField
          label="Primary CTA"
          value={v.hero.primaryCta}
          onChange={(val) => setV({ ...v, hero: { ...v.hero, primaryCta: val } })}
          fontClass="text-sm font-medium text-teal-700"
        />
      </VariantSection>

      {/* TRUST */}
      <VariantSection title={`Trust (${v.trust.type} · ${v.trust.items.length})`}>
        {v.trust.items.map((item, i) => (
          <div key={i} className="text-xs text-gray-600">• {item.label}</div>
        ))}
      </VariantSection>

      {/* PROBLEM */}
      {v.problem ? (
        <VariantSection title="Probleem">
          <EditableField
            label="Heading"
            value={v.problem.heading}
            onChange={(val) => setV({ ...v, problem: { ...v.problem!, heading: val } })}
            fontClass="text-sm font-medium text-gray-800"
          />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Pijnpunten</p>
            <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
              {v.problem.painBullets.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="text-xs italic text-gray-600 pt-1">{v.problem.bridgingSentence}</div>
        </VariantSection>
      ) : null}

      {/* FEATURES */}
      <VariantSection title={`Features (${v.features.items.length})`}>
        <EditableField
          label="Section Heading"
          value={v.features.sectionHeading}
          onChange={(val) => setV({ ...v, features: { ...v.features, sectionHeading: val } })}
          fontClass="text-sm font-medium text-gray-800"
        />
        {v.features.items.map((f, i) => (
          <div key={i} className="border-l-2 border-gray-200 pl-3 space-y-1">
            <div className="text-xs text-gray-500">{f.icon}</div>
            <EditableField
              label="Heading"
              value={f.heading}
              onChange={(val) => {
                const items = [...v.features.items];
                items[i] = { ...items[i], heading: val };
                setV({ ...v, features: { ...v.features, items } });
              }}
              compact
              fontClass="text-sm font-semibold text-gray-900"
            />
            <EditableField
              label="Body"
              value={f.body}
              onChange={(val) => {
                const items = [...v.features.items];
                items[i] = { ...items[i], body: val };
                setV({ ...v, features: { ...v.features, items } });
              }}
              multiline
              compact
              fontClass="text-xs text-gray-700"
            />
          </div>
        ))}
      </VariantSection>

      {/* SOCIAL PROOF */}
      <VariantSection title={`Social proof (${v.socialProof.testimonials.length} testimonials)`}>
        {v.socialProof.testimonials.map((t, i) => (
          <div key={i} className="text-xs text-gray-700 italic border-l-2 border-gray-200 pl-3">
            <p>&ldquo;{t.quote}&rdquo;</p>
            <p className="text-gray-500 mt-1 not-italic">— {t.authorName}, {t.authorRole}{t.authorCompany ? `, ${t.authorCompany}` : ''}</p>
          </div>
        ))}
        {v.socialProof.impactStats && v.socialProof.impactStats.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            {v.socialProof.impactStats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-sm font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </VariantSection>

      {/* PRICING */}
      {v.pricing ? (
        <VariantSection title={`Pricing (${v.pricing.tiers.length} tiers)`}>
          <div className="grid grid-cols-3 gap-2">
            {v.pricing.tiers.map((tier, i) => (
              <div key={i} className={`text-xs p-2 rounded border ${tier.highlighted ? 'border-teal-400 bg-teal-50' : 'border-gray-200'}`}>
                <div className="font-semibold text-gray-900">{tier.name}</div>
                <div className="text-gray-700">{tier.price}</div>
                <ul className="mt-1 text-gray-600 space-y-0.5">
                  {tier.features.slice(0, 3).map((f, j) => <li key={j}>• {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </VariantSection>
      ) : null}

      {/* FAQ */}
      <VariantSection title={`FAQ (${v.faq.items.length} items)`}>
        {v.faq.items.map((q, i) => (
          <details key={i} className="text-xs">
            <summary className="font-medium text-gray-800 cursor-pointer">{q.question}</summary>
            <p className="text-gray-600 mt-1 pl-3">{q.answer}</p>
          </details>
        ))}
      </VariantSection>

      {/* FINAL CTA */}
      <VariantSection title="Final CTA">
        <EditableField
          label="Heading"
          value={v.finalCta.heading}
          onChange={(val) => setV({ ...v, finalCta: { ...v.finalCta, heading: val } })}
          fontClass="text-sm font-medium text-gray-900"
        />
        <EditableField
          label="Primary CTA"
          value={v.finalCta.primaryCta}
          onChange={(val) => setV({ ...v, finalCta: { ...v.finalCta, primaryCta: val } })}
          fontClass="text-sm font-medium text-teal-700"
        />
        {v.finalCta.riskReducer ? (
          <p className="text-xs text-gray-500 italic">{v.finalCta.riskReducer}</p>
        ) : null}
      </VariantSection>

      <button
        type="button"
        onClick={() => onChoose(v)}
        disabled={disabled}
        className={`mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 sticky bottom-0`}
      >
        {disabled ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Opslaan...</>
        ) : (
          <><CheckCircle2 className="h-4 w-4" />Kies deze variant</>
        )}
      </button>
    </div>
  );
}

function VariantSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pb-3 border-b border-gray-100 last:border-b-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  multiline,
  compact,
  fontClass,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  compact?: boolean;
  fontClass?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- state-reset bij value-change uit parent
  useEffect(() => { setDraft(value); }, [value]);

  const save = () => {
    if (draft.trim() !== value) onChange(draft.trim());
    setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className={compact ? '' : 'group relative'}>
      {!compact ? (
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      ) : null}
      {editing ? (
        <div className="space-y-1">
          {multiline ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="w-full text-sm border border-teal-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
              className="w-full text-sm border border-teal-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          )}
          <div className="flex gap-1 text-xs">
            <button onClick={save} className="text-teal-700 font-medium hover:underline">Opslaan</button>
            <span className="text-gray-400">·</span>
            <button onClick={cancel} className="text-gray-500 hover:underline">Annuleer</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2 group">
          <span className={fontClass ?? 'text-sm text-gray-800'}>{value}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-teal-700 transition-opacity flex-shrink-0"
            title="Bewerken"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function FieldRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-sm">
      <span className="text-xs font-medium text-gray-500">{label}: </span>
      <span className={accent ? 'font-semibold text-gray-900' : 'text-gray-700'}>{value}</span>
    </div>
  );
}

/**
 * Sub-Sprint C — Hero-visual prompt brand-aware. Combineert
 * heroImagePromptFragment (computeBrandRenderHints) + brand.brandImageryStyle
 * + headline/subhead + brandImageryDonts.
 */
function buildHeroVisualInstruction(
  variant: LandingPageVariantContent,
  contextStack: {
    brand?: {
      brandImageryStyle?: string | null;
      brandImageryDonts?: string[] | null;
      brandName?: string | null;
    } | null;
    brandTokens?: BrandTokens;
  } | null,
): string {
  const brand = contextStack?.brand;
  const tokens = contextStack?.brandTokens;
  // Verbeterplan Fase E: tokens.photography.promptFragment bevat reeds
  // gestructureerde mood+composition+subjects uit scraped photographyStyle
  // (BrandTokens v4 mapper). Dit is sterker dan brand.brandImageryStyle
  // free-text. Bij beide: photography eerst, brandImageryStyle als
  // aanvullende layer.
  const hints = tokens
    ? computeBrandRenderHints(tokens.archetype, tokens.designSystem)
    : null;
  const parts: string[] = [];
  parts.push(`Hero-visual for landing-page about: ${variant.hero.headline}`);
  parts.push(`Subject context: ${variant.hero.subhead}`);
  // Tier-1: scraped photographyStyle (rijkst, brand-specifiek)
  const photographyFragment = tokens?.photography?.promptFragment?.trim();
  if (photographyFragment) {
    parts.push(photographyFragment);
  } else if (hints) {
    // Tier-2: archetype-default uit hints
    parts.push(`Photography style: ${hints.heroImagePromptFragment}`);
  }
  if (brand?.brandImageryStyle) parts.push(`Brand imagery: ${brand.brandImageryStyle}`);
  if (brand?.brandName) parts.push(`Brand: ${brand.brandName}`);
  const donts = brand?.brandImageryDonts;
  if (donts && donts.length > 0) {
    parts.push(`Avoid: ${donts.join(', ')}`);
  } else {
    parts.push('Avoid: stock photo people, generic SaaS illustrations, text overlays, lens flares');
  }
  return parts.join('. ') + '.';
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2 text-sm text-red-900">
      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Fout</p>
        <p className="text-xs text-red-800 mt-1">{message}</p>
      </div>
    </div>
  );
}
