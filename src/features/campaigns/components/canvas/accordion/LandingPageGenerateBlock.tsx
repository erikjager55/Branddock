'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef, useContext, createContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2, Sparkles, ArrowLeft, RefreshCw, CheckCircle2, ImageIcon, Pencil,
} from 'lucide-react';
import { Render } from '@puckeditor/core';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { generateCanvasVisual, generateFeatureVisuals } from '../../../api/canvas.api';
import { variantToPuckDataFromStructured } from '../medium/variant-to-puck-data';
import { buildSpikePuckConfig } from '../medium/puck-config';
import { useBrandFontLoader } from '../medium/useBrandFontLoader';
import { buildA11yStyleBlock } from '@/lib/landing-pages/a11y-styles';
import { assignBrandImagesToVariant } from '@/lib/landing-pages/brand-images';
import { FidelityScoreBar } from '../FidelityScoreBar';
import { InfoBox } from '@/components/ui/InfoBox';
import { ModelUnavailableNotice } from '@/components/ui/ModelUnavailableNotice';
import { interpretAiError, notifyAiError, errorFromResponse } from '@/lib/ai/ai-error-client';
import type { AIErrorType } from '@/lib/ai/error-handler';
import { useInlineTransform } from '../../../hooks/canvas.hooks';
import type { LandingPageVariantContent } from '@/lib/landing-pages/variant-schema';
import {
  isLandingPageVariant,
  hasOwnVariantSchema,
  type PageVariantContent,
} from '@/lib/landing-pages/page-type-schemas';
import { buildHeroVisualInstruction } from '../../../lib/landing-page-visual-prompts';
import { diffVariantCopy, type CopyFieldChange } from '@/lib/landing-pages/variant-copy-diff';
import { STUDIO } from '@/lib/constants/design-tokens';
import { ImageSourcePanel } from '../ImageSourcePanel';
import type { VisualBriefSource, CanvasContextStack } from '@/lib/ai/canvas-context';
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
 *  4. Klaar → N variant-cards naast elkaar + "Kies deze variant" knoppen
 *           + na keuze: hero-visual-knop + "Bevestig & ga naar editor"
 */

// P3a — N-variant ondersteuning (1-4). Per-variant accent + fallback-label.
const ACCENTS = ['emerald', 'violet', 'blue', 'amber'] as const;
type VariantAccent = (typeof ACCENTS)[number];
const accentFor = (i: number): VariantAccent => ACCENTS[i % ACCENTS.length];
// Fallback creative-angle labels (per index) live in the i18n catalog
// (lp.variant.fallback.*), resolved at render.
const FALLBACK_LABEL_KEYS = ['conservative', 'creative', 'narrative', 'dataDriven'] as const;
// Inline-style hexes i.p.v. Tailwind-klassen: src/index.css (gecompileerde,
// gecommitte output) mist de blue/amber-utilities → purge-veilig (CLAUDE.md
// Tailwind-4 gotcha). emerald/violet-hexes matchen de bestaande -400/-100-shades.
const ACCENT_HEX: Record<VariantAccent, { border: string; ring: string; tagBg: string; tagText: string; cardBorder: string }> = {
  emerald: { border: '#34d399', ring: '#d1fae5', tagBg: '#d1fae5', tagText: '#065f46', cardBorder: '#a7f3d0' },
  violet:  { border: '#a78bfa', ring: '#ede9fe', tagBg: '#ede9fe', tagText: '#5b21b6', cardBorder: '#ddd6fe' },
  blue:    { border: '#60a5fa', ring: '#dbeafe', tagBg: '#dbeafe', tagText: '#1e40af', cardBorder: '#bfdbfe' },
  amber:   { border: '#fbbf24', ring: '#fef3c7', tagBg: '#fef3c7', tagText: '#92400e', cardBorder: '#fde68a' },
};

export function LandingPageGenerateBlock({
  deliverableId,
  onAdvance,
}: LandingPageGenerateBlockProps) {
  const { t } = useTranslation('campaigns-canvas-accordion');
  const setStructuredVariant = useCanvasStore((s) => s.setStructuredVariant);
  const setStructuredVariantOptions = useCanvasStore((s) => s.setStructuredVariantOptions);
  const setContextStack = useCanvasStore((s) => s.setContextStack);
  const resetFidelityScore = useCanvasStore((s) => s.resetFidelityScore);
  const setFidelityRunningForVariant = useCanvasStore((s) => s.setFidelityRunningForVariant);
  const setFidelityCompleteForVariant = useCanvasStore((s) => s.setFidelityCompleteForVariant);
  const setFidelityScoreSkippedForVariant = useCanvasStore((s) => s.setFidelityScoreSkippedForVariant);
  const setVisualBriefSource = useCanvasStore((s) => s.setVisualBriefSource);
  // W1: kan naast LP- ook faq/product/microsite-shaped variants bevatten —
  // alle LP-specifieke paden hieronder gaten op isLandingPageVariant (shape).
  const variantOptions = useCanvasStore((s) => s.structuredVariantOptions) as
    | PageVariantContent[]
    | null;
  const chosenVariant = useCanvasStore((s) => s.structuredVariant) as
    | PageVariantContent
    | null;
  const brief = useCanvasStore((s) => s.brief);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const setActiveStep = useCanvasStore((s) => s.setActiveStep);
  const contextStack = useCanvasStore((s) => s.contextStack);
  // Laad brand-fonts zodat de WYSIWYG-variant-previews (P1a) met de juiste
  // typografie renderen i.p.v. system-fallback.
  useBrandFontLoader(contextStack?.brandTokens ?? null);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);

  // Welke variant getoond wordt in de FidelityScoreBar (klik op A/B-toggle).
  // Los van de gekozen variant — laat de user per-variant scores vergelijken.
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  // P3a — hoeveel varianten de regenereer-knop genereert (eerste auto-run = 2).
  const [selectedCount, setSelectedCount] = useState<number>(2);
  // P3b — per-variant creative-angle-labels (uit de generatie); null bij axis-fallback.
  const [variantLabels, setVariantLabels] = useState<(string | null)[] | null>(null);
  // Handmatig geselecteerde hero-image. Wordt geïnjecteerd in de hero van de
  // gekozen variant zodat Step 3 (die puckData rendert) de foto toont — anders
  // verdween de selectie omdat persistHeroImage de puckData niet bijwerkt.
  const [selectedHeroImageUrl, setSelectedHeroImageUrl] = useState<string | null>(null);
  // LP-specifieke auto-iterate (Step 2): verbetert de actieve variant in-place.
  const [isAutoIterating, setIsAutoIterating] = useState(false);
  const [autoIterateMsg, setAutoIterateMsg] = useState<string | null>(null);
  // P4: fouten apart van voortgang/succes zodat ze als fout-banner tonen.
  const [autoIterateError, setAutoIterateError] = useState<string | null>(null);
  // P2a — before/after-voorstel: na de iteratie-loop tonen we WAT er verandert
  // (per veld) + de score-winst, en de user kiest Toepassen/Verwerpen.
  const [pendingProposal, setPendingProposal] = useState<{
    improved: LandingPageVariantContent;
    before: number;
    after: number;
    iterations: number;
    changes: CopyFieldChange[];
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUnavailable, setErrorUnavailable] = useState(false);
  const [errorType, setErrorType] = useState<AIErrorType | null>(null);
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
      // W1: alleen voor LP-shaped variants (eigen-schema-typen hebben geen
      // hero.heroVisualUrl-slot; hun panel is sowieso verborgen).
      if (chosenVariant && isLandingPageVariant(chosenVariant)) {
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
      setVisualError(err instanceof Error ? err.message : t('lp.errors.saveHeroImage'));
    }
  }, [deliverableId, visualSource, chosenVariant, contextStack, setStructuredVariant, t]);

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
    // W0 (plan §6): de type-eigen inputs (topQuestions, featureBenefitMap,
    // productSpecs, narrativeFlow, …) bereikten de generator nooit — alleen
    // de LP-velden hierboven werden gerenderd. Generieke doorvoer van alle
    // overige gevulde velden i.p.v. een tweede hardcoded lijst.
    const rendered = new Set([
      'valueProposition', 'targetObjection', 'conversionGoal', 'trafficSource', 'socialProof',
    ]);
    const internal = new Set(['productId']);
    const extraLabels: Record<string, string> = {
      topQuestions: 'Belangrijkste klantvragen',
      featureBenefitMap: 'Feature-benefit-koppels',
      productSpecs: 'Productspecificaties',
      pricingInfo: 'Prijsinformatie',
      narrativeFlow: 'Verhaallijn',
      micrositePages: 'Aantal secties',
      pageSkeleton: 'Pagina-opzet',
      seoKeyword: 'SEO-keyword',
    };
    for (const [key, value] of Object.entries(contentTypeInputs)) {
      if (rendered.has(key) || internal.has(key)) continue;
      const label = extraLabels[key] ?? key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, (c) => c.toUpperCase());
      if (typeof value === 'string' && value.trim()) parts.push(`${label}: ${value.trim()}`);
      else if (Array.isArray(value) && value.length > 0) parts.push(`${label}: ${value.join(', ')}`);
      else if (typeof value === 'number') parts.push(`${label}: ${value}`);
    }
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

  // W0 (plan §6): type-bewuste gate — faq-page heeft geen valueProposition-veld
  // (blokkeerde onnodig) en kan op topQuestions varen; microsite op narrativeFlow.
  const contentType = useCanvasStore((s) => s.contentType);
  const briefIncomplete = useMemo(() => {
    const hasObjective = Boolean(brief.objective?.trim());
    if (hasObjective || contentTypeInputs.valueProposition) return false;
    if (contentType === 'faq-page') {
      const tq = contentTypeInputs.topQuestions;
      return !(typeof tq === 'string' ? tq.trim() : Array.isArray(tq) && tq.length > 0);
    }
    if (contentType === 'microsite') {
      const nf = contentTypeInputs.narrativeFlow;
      return !(typeof nf === 'string' && nf.trim());
    }
    if (contentType === 'product-page') {
      // W2: een gekoppeld product is genoeg context om te genereren (en is
      // server-side verplicht). De brief is dus pas incompleet als óók het
      // product ontbreekt.
      const pid = contentTypeInputs.productId;
      return !(typeof pid === 'string' && pid.trim());
    }
    return true;
  }, [brief.objective, contentTypeInputs, contentType]);

  /**
   * Track 5 (plan zippy-twirling-feigenbaum 2026-05-29) — fire-and-forget
   * F-VAL scoring voor 1 variant. Schrijft running → complete/skipped naar
   * store; `FidelityScoreBar` rendert vanuit dezelfde state als
   * content-deliverables in `Step2ContentVariants`. Scoort enkel variant 0
   * (scope A); per-variant scoring is scope B (out-of-scope).
   */
  const scoreVariantFidelity = useCallback(
    async (variant: PageVariantContent, variantIndex: number) => {
      // P4 race-guard: claim een verse token vóór de fetch; alle store-writes
      // hieronder dragen 'm zodat een tragere/oudere fetch voor dezelfde index
      // (na wissel/regeneratie/reset) bij terugkomst gedropt wordt. getState()
      // i.p.v. een selector houdt de dep-array (en React-Compiler-memoisatie) stabiel.
      const token = useCanvasStore.getState().bumpFidelityToken(variantIndex);
      setFidelityRunningForVariant(variantIndex, token);
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
            token,
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
          setFidelityScoreSkippedForVariant(variantIndex, data.reason, token);
          return;
        }
        setFidelityCompleteForVariant(variantIndex, data.payload, token);
      } catch (err) {
        setFidelityScoreSkippedForVariant(
          variantIndex,
          err instanceof Error ? err.message : 'fetch-error',
          token,
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

  const handleGenerate = useCallback(async (countArg: number = 2) => {
    // Guard: bare onClick={handleGenerate} zou een MouseEvent doorgeven → coerce.
    const count = typeof countArg === 'number' && countArg >= 1 && countArg <= 4 ? countArg : 2;
    if (briefIncomplete) {
      setError(t('lp.errors.fillObjective'));
      setErrorUnavailable(false);
      return;
    }
    setIsGenerating(true);
    setError(null);
    setErrorUnavailable(false);
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
            count,
          }),
        },
      );
      if (!res.ok) {
        throw await errorFromResponse(res, `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        variants: PageVariantContent[];
        variantLabels?: (string | null)[];
        deliveredCount?: number;
        requestedCount?: number;
      };
      setStructuredVariantOptions(data.variants);
      setVariantLabels(Array.isArray(data.variantLabels) ? data.variantLabels : null);
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
      const e = interpretAiError(err);
      setError(e.message || t('lp.errors.generationFailed'));
      setErrorUnavailable(e.unavailable);
      setErrorType(e.errorType);
      if (e.unavailable) notifyAiError(err, { retry: () => { void handleGenerate(countArg); } });
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
    t,
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
        // Server-side hero-wiring (atomisch) — naast de confirm-flow-persist een
        // betrouwbare garantie dat de header-image in de puckData landt.
        target: 'hero',
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

  const handleChooseVariant = useCallback(async (variant: PageVariantContent) => {
    setIsChoosing(true);
    setError(null);
    try {
      let chosen: PageVariantContent = variant;
      // W1: het hele beeld-blok hieronder (hero-injectie, brandImages-fill,
      // hero-AI-gen, feature-AI-gen) is LP-shaped. Eigen-schema-variants
      // (faq/product/microsite) slaan het over — hun builders vullen brand-
      // beelden zelf bij de puckData-build; AI-beeld-gen per type volgt in
      // de beeld-fase van het plan (W2/W3).
      if (isLandingPageVariant(variant)) {
      // Injecteer een eerder handmatig geselecteerde hero-image zodat Step 3
      // (die puckData rendert) de foto toont. Behoud een reeds aanwezige
      // heroVisualUrl op de variant wanneer er geen losse selectie is.
      let lpChosen: LandingPageVariantContent = selectedHeroImageUrl
        ? { ...variant, hero: { ...variant.hero, heroVisualUrl: selectedHeroImageUrl } }
        : variant;
      // P2 beeld-prioriteit (handmatig > merk-eigen brandImages > AI): vul lege
      // hero/feature-slots eerst met de brand-eigen brandImages, zodat de hero-
      // AI-gen + feature-AI-gen hieronder alleen de slots vullen die GEEN
      // bronbeeld hebben. (De mapper past dezelfde producer nog idempotent toe.)
      lpChosen = assignBrandImagesToVariant(lpChosen, contextStack?.brandImages ?? null);
      // Verplichte header-image (user-feedback 2026-06-03): een LP zonder hero-
      // image is niet toegestaan. DETERMINISTISCH: genereer 'm hier en vouw 'm
      // IN de variant vóór de éne persist+render — zodat Step 3 de pagina MÉT de
      // foto toont i.p.v. eerst een kleurblok (de oude fire-and-forget-na-
      // onAdvance liet soms een beeldloze hero zien). Faalt de generatie, dan
      // surfacen we dat + de pagina rendert zonder foto (handmatige knop in
      // Step 3 blijft beschikbaar) — navigatie wordt niet geblokkeerd.
      if (!lpChosen.hero.heroVisualUrl) {
        setIsGeneratingVisual(true);
        setVisualError(null);
        try {
          // Race tegen een ceiling zodat een hangende image-API de keuze-flow
          // niet oneindig blokkeert. 75s dekt nano-banana-pro (trager dan FLUX/
          // Imagen — 45s gaf soms een beeldloze hero op Better Brands). Eén retry
          // bij timeout/null vóór we de pagina zonder foto laten; mislukt het
          // alsnog, dan vult de self-heal in Step 3 het beeld alsnog aan.
          const genOnce = () => Promise.race([
            generateHeroVisualUrl(lpChosen),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 75_000)),
          ]);
          let heroUrl = await genOnce();
          if (!heroUrl) heroUrl = await genOnce();
          if (heroUrl) {
            lpChosen = { ...lpChosen, hero: { ...lpChosen.hero, heroVisualUrl: heroUrl } };
          } else {
            setVisualError(t('lp.errors.heroTimeout'));
          }
        } catch (genErr) {
          setVisualError(genErr instanceof Error ? genErr.message : t('lp.errors.heroFailed'));
        } finally {
          setIsGeneratingVisual(false);
        }
      }
      // P2 AI-feature-beelden (budget 4/pagina): genereer een sectie-relevante
      // shot voor elke feature ZONDER beeld (brandImages vulden de rest al).
      // Fase 3 (audit 2026-06-10): we sturen feature-COPY + imageBrief — de
      // route bouwt de prompts server-side (scene-templates, sibling-
      // differentiatie, seeds, persist). Best-effort + 120s-race (judges +
      // gerichte retry in de route maken de run langer dan de oude 60s);
      // mislukte/overgeslagen features vallen terug op de icon-grid.
      const FEATURE_IMAGE_BUDGET = 4;
      const needIdx = lpChosen.features.items
        .map((f, i) => (f.imageUrl ? -1 : i))
        .filter((i) => i >= 0)
        .slice(0, FEATURE_IMAGE_BUDGET);
      if (needIdx.length > 0) {
        try {
          // Truncatie matcht het route-schema (zod-max) — variant-schema heeft
          // geen max op heading/body, dus één lange waarde mag niet de hele
          // batch laten 400'en (review 2026-06-10).
          const featureSlots = needIdx.map((i) => ({
            index: i,
            heading: lpChosen.features.items[i].heading.slice(0, 200),
            body: lpChosen.features.items[i].body.slice(0, 600),
            imageBrief: lpChosen.features.items[i].imageBrief ?? null,
          }));
          // 120s-abort i.p.v. kale race: de fetch stopt écht bij timeout, zodat
          // er geen zombie-request doorloopt naast een eventuele her-klik
          // (review-2 2026-06-10).
          const featureAbort = new AbortController();
          const featureTimer = setTimeout(() => featureAbort.abort(), 120_000);
          const urls = await generateFeatureVisuals(
            deliverableId,
            { features: featureSlots, pageHeadline: lpChosen.hero.headline.slice(0, 200) },
            { signal: featureAbort.signal },
          ).catch((err: unknown) => {
            if (err instanceof DOMException && err.name === 'AbortError') return [] as Array<string | null>;
            throw err;
          }).finally(() => clearTimeout(featureTimer));
          if (urls.length > 0) {
            const items = lpChosen.features.items.map((it, i) => {
              const k = needIdx.indexOf(i);
              return k >= 0 && urls[k] ? { ...it, imageUrl: urls[k] as string } : it;
            });
            lpChosen = { ...lpChosen, features: { ...lpChosen.features, items } };
          }
        } catch {
          // Niet-blokkerend: zonder feature-beelden rendert de icon-grid.
        }
      }
      chosen = lpChosen;
      } // einde LP-shaped beeld-blok (W1)
      const puckData = variantToPuckDataFromStructured(chosen, contextStack);
      const patchRes = await fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { structuredVariant: chosen, puckData },
        }),
      });
      if (!patchRes.ok) {
        throw new Error(t('lp.errors.saveFailedHttp', { status: patchRes.status }));
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
      setError(err instanceof Error ? err.message : t('lp.errors.saveVariantChoice'));
    } finally {
      setIsChoosing(false);
    }
  }, [contextStack, deliverableId, selectedHeroImageUrl, setContextStack, setStructuredVariant, onAdvance, generateHeroVisualUrl, t]);

  const handleGenerateVisual = useCallback(async () => {
    // W1: hero-AI-gen is LP-shaped (buildHeroVisualInstruction leest hero.subhead).
    if (!chosenVariant || !isLandingPageVariant(chosenVariant)) return;
    setIsGeneratingVisual(true);
    setVisualError(null);
    try {
      await generateHeroVisualFor(chosenVariant);
    } catch (err) {
      const e = interpretAiError(err);
      setVisualError(e.message || t('lp.errors.visualGenerationFailed'));
      if (e.unavailable) notifyAiError(err);
    } finally {
      setIsGeneratingVisual(false);
    }
  }, [chosenVariant, generateHeroVisualFor, t]);

  /**
   * LP auto-iterate (Step 2): laat het backend de actieve variant herschrijven
   * voor een hogere fidelity-score, vervangt 'm in-place in de options en
   * herscoort. Vervangt de generieke studio-trigger die LP-structured niet kan
   * lezen (gaf "0 woorden").
   */
  // P2a — iterate-tot-threshold: itereer de auto-iterate (max 3×) tot de score de
  // drempel haalt of niet verder verbetert; toon dan een before/after-voorstel
  // (wijzigingen per veld) i.p.v. blind toe te passen.
  const AUTO_ITERATE_MAX = 3;
  type IterateResponse =
    | { status: 'skipped'; reason: string }
    | { status: 'no_improvement'; score: number; scoreProjected: number }
    | { status: 'proposal'; score: number; scoreProjected: number | null; threshold: number; variant: LandingPageVariantContent }
    | { status: 'error'; error: string }
    | { status?: undefined; error?: string };

  const handleAutoIterateVariant = useCallback(async () => {
    if (!variantOptions) return;
    const original = variantOptions[activeVariantIndex];
    // W1: auto-iterate is LP-only (server geeft 422 voor eigen-schema-typen);
    // de knop is voor die typen verborgen — dit is de belt-and-braces-guard.
    if (!original || !isLandingPageVariant(original)) return;
    setIsAutoIterating(true);
    setAutoIterateMsg(null);
    setAutoIterateError(null);
    setPendingProposal(null);
    let current = original;
    let startScore: number | null = null;
    let bestScore: number | null = null;
    let iterations = 0;
    try {
      for (let iter = 1; iter <= AUTO_ITERATE_MAX; iter++) {
        setAutoIterateMsg(
          bestScore != null
            ? t('lp.autoIterate.iterationScore', { current: iter, max: AUTO_ITERATE_MAX, score: bestScore })
            : t('lp.autoIterate.iteration', { current: iter, max: AUTO_ITERATE_MAX }),
        );
        const res = await fetch(`/api/landing-pages/${deliverableId}/auto-iterate-variant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantIndex: activeVariantIndex, variant: current }),
        });
        const json = (await res.json().catch(() => null)) as IterateResponse | null;
        if (!res.ok || !json || !('status' in json) || json.status === undefined) {
          if (iterations === 0) setAutoIterateError((json && 'error' in json && json.error) ? json.error : t('lp.errors.improvementRetry'));
          break;
        }
        if (json.status === 'skipped') {
          // Informatief, geen fout (al goed genoeg / te weinig content).
          if (iterations === 0) setAutoIterateMsg(json.reason === 'above-threshold' ? t('lp.autoIterate.aboveThreshold') : t('lp.autoIterate.notEnoughContent'));
          break;
        }
        if (json.status === 'no_improvement') {
          // Informatief, geen fout — huidige variant blijft het beste.
          if (iterations === 0) setAutoIterateMsg(t('lp.autoIterate.noImprovement', { score: json.score, projected: json.scoreProjected }));
          break; // kan niet verder → stop met het beste (current)
        }
        if (json.status === 'error') {
          if (iterations === 0) setAutoIterateError(json.error);
          break;
        }
        // proposal — accumuleer + ga door tot drempel/max.
        if (startScore === null) startScore = json.score;
        current = json.variant;
        bestScore = json.scoreProjected ?? bestScore;
        iterations += 1;
        if (json.scoreProjected != null && json.scoreProjected >= json.threshold) break;
      }
      if (iterations > 0 && current !== original) {
        setAutoIterateMsg(null);
        setPendingProposal({
          improved: current,
          before: startScore ?? 0,
          after: bestScore ?? 0,
          iterations,
          changes: diffVariantCopy(original, current),
        });
      }
    } catch (err) {
      const e = interpretAiError(err);
      setAutoIterateError(e.message || t('lp.errors.improvementFailed'));
      if (e.unavailable) notifyAiError(err);
    } finally {
      setIsAutoIterating(false);
    }
  }, [variantOptions, activeVariantIndex, deliverableId, t]);

  const applyProposal = useCallback(() => {
    if (!pendingProposal || !variantOptions) return;
    const improved = pendingProposal.improved;
    setStructuredVariantOptions(variantOptions.map((v, i) => (i === activeVariantIndex ? improved : v)));
    void scoreVariantFidelity(improved, activeVariantIndex);
    setAutoIterateError(null);
    setAutoIterateMsg(t('lp.autoIterate.applied', { before: pendingProposal.before, after: pendingProposal.after }));
    setPendingProposal(null);
  }, [pendingProposal, variantOptions, activeVariantIndex, setStructuredVariantOptions, scoreVariantFidelity, t]);

  const discardProposal = useCallback(() => {
    setPendingProposal(null);
    setAutoIterateError(null);
    setAutoIterateMsg(t('lp.autoIterate.discarded'));
  }, [t]);

  // P4: auto-iterate-feedback is variant-specifiek. Reset bij het wisselen van
  // variant (i.p.v. in een effect — voorkomt de setState-in-effect-gotcha) zodat
  // variant B nooit de gedecontextualiseerde feedback van variant A toont.
  const selectVariant = useCallback((i: number) => {
    setActiveVariantIndex(i);
    setAutoIterateMsg(null);
    setAutoIterateError(null);
    setPendingProposal(null);
  }, []);

  // P3b — display-label per variant: het creative-angle-label wanneer aanwezig,
  // anders de generieke conservatief/creatief-fallback.
  const variantLabel = (i: number): string => {
    const angle = variantLabels?.[i]?.trim();
    const fallbackKey = FALLBACK_LABEL_KEYS[i];
    const displayAngle = angle && angle.length > 0
      ? angle
      : fallbackKey
        ? t(`lp.variant.fallback.${fallbackKey}`)
        : t('lp.variant.fallback.generic');
    return t('lp.variant.labelWithAngle', { letter: String.fromCharCode(65 + i), angle: displayAngle });
  };

  // ─── Briefing incompleet ─────────────────────────────────
  if (briefIncomplete) {
    return (
      <div className="space-y-6">
        <InfoBox variant="warning" size="md" title={t('lp.briefIncomplete.title')}>
          <p>{t('lp.briefIncomplete.body')}</p>
          <button
            type="button"
            onClick={() => setActiveStep('context')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline hover:opacity-80"
          >
            <ArrowLeft className="h-3 w-3" />{t('lp.backToStep1')}
          </button>
        </InfoBox>
      </div>
    );
  }

  // ─── Genereren bezig ─────────────────────────────────────
  if (!variantOptions && !chosenVariant && isGenerating) {
    return (
      <div className="space-y-6">
        <InfoBox variant="info" size="md" title={t('lp.generating.title', { count: selectedCount })}>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            <span>{t('lp.generating.body')}</span>
          </div>
        </InfoBox>
      </div>
    );
  }

  // ─── Generatie-fout ──────────────────────────────────────
  if (!variantOptions && !chosenVariant && error) {
    if (errorUnavailable) {
      return (
        <ModelUnavailableNotice
          errorType={errorType ?? undefined}
          retryable={errorType !== 'authentication'}
          onRetry={() => { setError(null); setErrorUnavailable(false); void handleGenerate(); }}
        />
      );
    }
    return (
      <div className="space-y-6">
        <InfoBox variant="error" size="md" title={t('lp.errors.generationFailed')}>{error}</InfoBox>
        <button
          type="button"
          onClick={() => { setError(null); void handleGenerate(); }}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
        >
          <Sparkles className="h-4 w-4" />{t('common.tryAgain')}
        </button>
        <button
          type="button"
          onClick={() => setActiveStep('context')}
          className="w-full inline-flex items-center justify-center gap-1 text-xs text-gray-600 underline hover:text-gray-900"
        >
          <ArrowLeft className="h-3 w-3" />{t('lp.editBrief')}
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
            {t('lp.variantsReady', { count: variantOptions.length })}
          </p>
        </div>
        {/* Track 5 — F-VAL fidelity-score voor LP-variant. Verschijnt zodra
            scoring-call gestart is (running state) en update naar complete
            (~20s later) via setFidelityCompleteForVariant. Identiek pattern
            aan Step2ContentVariants.tsx voor content-deliverables.
            variantIndex koppelt de bar aan de A/B-toggle eronder zodat
            klikken op B diens score toont. Boven de selector geplaatst
            (user-verzoek 2026-06-10): de score is het primaire vergelijk-
            signaal bij het kiezen. */}
        {/* A11y: koppelt de (buiten de tablist gerenderde) score expliciet aan de
            actieve variant, zodat een screen reader bij tab-wissel aankondigt
            wélke variant de score betreft (relevanter nu het er tot 4 zijn). */}
        {variantOptions.length > 1 ? (
          <p className="sr-only" aria-live="polite">{t('lp.fidelityFor', { variant: variantLabel(activeVariantIndex) })}</p>
        ) : null}
        <FidelityScoreBar deliverableId={deliverableId} variantIndex={activeVariantIndex} suppressAutoIterateCta />
        {/* Thumbnail-selector: vergelijk A/B in één oogopslag + klik om te
            selecteren. De actieve variant drijft de preview, fidelity-score,
            auto-iterate én de detail-kaart hieronder. */}
        {variantOptions.length > 1 ? (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${variantOptions.length === 3 ? 3 : 2}, minmax(0, 1fr))` }}
            role="tablist"
            aria-label={t('lp.chooseVariantAria')}
          >
            {variantOptions.map((v, i) => {
              const isActive = activeVariantIndex === i;
              const hex = ACCENT_HEX[accentFor(i)];
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectVariant(i)}
                  className={`text-left rounded-lg border-2 overflow-hidden bg-white transition-colors ${isActive ? '' : 'border-gray-200 hover:border-gray-300'}`}
                  style={isActive ? { borderColor: hex.border, boxShadow: `0 0 0 2px ${hex.ring}` } : undefined}
                >
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
                    <span className={`text-xs font-medium uppercase tracking-wide ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                      {variantLabel(i)}
                    </span>
                    {isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" /> : null}
                  </div>
                  <VariantPuckPreview variant={v} contextStack={contextStack} maxHeight={200} />
                </button>
              );
            })}
          </div>
        ) : null}
        {/* LP-specifieke auto-iterate: verbetert de actieve variant in-place.
            Vervangt de generieke studio-trigger (gaf "0 woorden" op LP).
            W1: verborgen voor eigen-schema-typen (faq/product/microsite) —
            de server-route geeft daar bewust 422 (per-type rewrite = W2-W4). */}
        {!hasOwnVariantSchema(contentType) ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAutoIterateVariant}
            disabled={isAutoIterating || isChoosing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50"
          >
            {isAutoIterating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('lp.autoIterate.improving')}</>
            ) : (
              <><Sparkles className="h-4 w-4" />{t('lp.autoIterate.improveAuto', { variant: variantLabel(activeVariantIndex) })}</>
            )}
          </button>
        </div>
        ) : null}
        {autoIterateError ? (
          <InfoBox variant="error" size="sm" onDismiss={() => setAutoIterateError(null)}>{autoIterateError}</InfoBox>
        ) : autoIterateMsg ? (
          <InfoBox variant="info" size="sm" onDismiss={() => setAutoIterateMsg(null)}>{autoIterateMsg}</InfoBox>
        ) : null}
        {/* P2a — before/after-voorstel: toon de score-winst + wat er per veld
            verandert, en laat de user Toepassen/Verwerpen. */}
        {pendingProposal ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-medium text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                {t('lp.proposal.scoreLabel', { before: pendingProposal.before, after: pendingProposal.after })}
                {pendingProposal.iterations > 1 ? t('lp.proposal.iterationsSuffix', { count: pendingProposal.iterations }) : ''}
                {' · '}{t('lp.proposal.changesCount', { count: pendingProposal.changes.length })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyProposal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />{t('common.apply')}
                </button>
                <button
                  type="button"
                  onClick={discardProposal}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50"
                >
                  {t('common.discard')}
                </button>
              </div>
            </div>
            {pendingProposal.changes.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-md border border-emerald-100 bg-white p-3">
                {pendingProposal.changes.map((c, i) => (
                  <div key={i} className="text-xs">
                    <p className="font-medium text-gray-500 mb-0.5">{c.label}</p>
                    <p className="text-red-700/80 line-through decoration-red-300">{c.before || '—'}</p>
                    <p className="text-emerald-800">{c.after || '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">{t('lp.proposal.noVisibleChanges')}</p>
            )}
          </div>
        ) : null}
        {partialDelivery ? (
          <InfoBox
            variant="warning"
            size="sm"
            title={t('lp.partialDelivery.title', { delivered: partialDelivery.delivered, requested: partialDelivery.requested })}
            onDismiss={() => setPartialDelivery(null)}
          >
            {t('lp.partialDelivery.body', { count: partialDelivery.requested - partialDelivery.delivered })}
          </InfoBox>
        ) : null}
        {/* Detail: ÉÉN full-width, leesbare kaart voor de actieve variant
            (key forceert verse local edit-state bij wisselen van variant).
            W1: het inline edit-panel (VariantCompareCard) is LP-shaped —
            eigen-schema-variants krijgen preview + keuze; tekst bewerken
            gebeurt voor die typen in Step 3 (Puck-editor). */}
        {(() => {
          const i = Math.min(activeVariantIndex, variantOptions.length - 1);
          const v = variantOptions[i];
          if (!v) return null;
          if (!isLandingPageVariant(v)) {
            const hex = ACCENT_HEX[accentFor(i)];
            return (
              <div key={i} className="rounded-lg border-2 bg-white p-4 flex flex-col gap-4" style={{ borderColor: hex.cardBorder }}>
                <div>
                  <span className="inline-block text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded" style={{ backgroundColor: hex.tagBg, color: hex.tagText }}>
                    {variantLabel(i)}
                  </span>
                </div>
                <VariantPuckPreview variant={v} contextStack={contextStack} maxHeight={560} scroll />
                <p className="text-[11px] text-gray-500 -mt-2">
                  {t('lp.readablePreviewEditor')}
                </p>
                <button
                  type="button"
                  onClick={() => void handleChooseVariant(v)}
                  disabled={isChoosing}
                  className={`mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50`}
                >
                  {isChoosing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{t('common.saving')}</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" />{t('lp.chooseThisVariant')}</>
                  )}
                </button>
              </div>
            );
          }
          return (
            <VariantCompareCard
              key={i}
              variant={v}
              label={variantLabel(i)}
              accent={accentFor(i)}
              disabled={isChoosing}
              onChoose={(edited) => void handleChooseVariant(edited)}
              contextStack={contextStack}
              deliverableId={deliverableId}
              variantIndex={i}
              onVariantChange={(edited) =>
                setStructuredVariantOptions(variantOptions.map((vo, j) => (j === i ? edited : vo)))
              }
            />
          );
        })()}
        {/* Deterministische hero-gen feedback: tijdens de keuze genereert de
            verplichte hero-image (de pagina opent ermee). Surface dat + een
            niet-blokkerende waarschuwing bij timeout/fout (pagina rendert dan
            zonder foto). Voorheen werd deze state nergens getoond → stil. */}
        {isChoosing && isGeneratingVisual ? (
          <InfoBox variant="info" size="sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <span>{t('lp.generatingHero')}</span>
            </div>
          </InfoBox>
        ) : null}
        {visualError ? (
          <InfoBox variant="warning" size="sm" onDismiss={() => setVisualError(null)}>{visualError}</InfoBox>
        ) : null}
        {error ? (
          <InfoBox variant="error" size="sm" title={t('lp.variantChoiceFailed')} onDismiss={() => setError(null)}>{error}</InfoBox>
        ) : null}

        {/* User-feedback 2026-05-28: hetzelfde Step 2 patroon als 'Content
            Variants' — Visual-source tab-strip + Regenerate-feedback +
            Confirm & Continue onderaan. ImageSourcePanel embedded handelt
            alle 10 image-sources (smart-search/generate/library/upload/url/
            stock/compose/trained-style/photography-request/none).
            W1: verborgen voor eigen-schema-typen — de hero-injectie is
            LP-shaped (faq heeft geen hero-beeld; product/microsite-beeld-
            picking volgt in de beeld-fase van het plan). */}
        {!hasOwnVariantSchema(contentType) ? (
        <ImageSourcePanel
          deliverableId={deliverableId}
          source={visualSource}
          onSourceChange={(next) => {
            // Persisteer de source naast de lokale tab-state zodat compose/trained
            // de server-gate (visualBrief.source === ...) passeren in de LP-flow.
            setVisualSource(next);
            setVisualBriefSource(next);
          }}
          variant="embedded"
          onSelected={handleImageSelected}
          target="hero"
        />
        ) : null}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 flex-wrap">
          {/* P3a — aantal-selector: stuurt hoeveel varianten de regenereer-knop
              genereert. Default 2; 4 ≈ 2× generatietijd. */}
          <div className="flex items-center gap-1.5" role="group" aria-label={t('lp.countAria')}>
            <span className="text-xs text-gray-500">{t('lp.count')}</span>
            {[2, 3, 4].map((n) => {
              const sel = selectedCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedCount(n)}
                  disabled={isGenerating || isChoosing}
                  aria-pressed={sel}
                  title={n === 4 ? t('lp.countTitle4') : t('lp.countTitle', { count: n })}
                  className={`w-7 h-7 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 ${sel ? '' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  style={sel ? { borderColor: '#14b8a6', backgroundColor: '#f0fdfa', color: '#0f766e' } : undefined}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate(selectedCount)}
            disabled={isGenerating || isChoosing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('common.regenerating')}</>
            ) : (
              <><RefreshCw className="h-4 w-4" />{t('lp.generateNewVariants', { count: selectedCount })}</>
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
            {t('lp.confirmContinue')}
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
          <p className="font-medium">{t('lp.variantChosen')}</p>
          <p className="text-xs text-emerald-800 mt-0.5">
            {t('lp.variantChosenBody')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* >= 1 (niet > 1): ook bij één geleverde variant moet de gebruiker terug naar de
            keuze kunnen. Bij een partial generation (slot-failure → 1 variant) zat de
            gebruiker anders vast in deze "Variant chosen"-state zonder weg terug. De knop
            zet de keuze leeg → de keuze-weergave (met "Choose this variant") verschijnt. */}
        {variantOptions && variantOptions.length >= 1 ? (
          <button
            type="button"
            onClick={() => setStructuredVariant(null)}
            className="text-xs font-medium text-gray-600 underline hover:text-gray-900"
          >
            {t('lp.chooseDifferent')}
          </button>
        ) : null}
        <div className="ml-auto">
          <button
            type="button"
            onClick={onAdvance}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium ${STUDIO.generateButton}`}
          >
            <CheckCircle2 className="h-4 w-4" />{t('lp.openEditor')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Onbereikbaar — vroegere detailed preview wordt niet meer gerendered.

// ─── Sub-componenten ──────────────────────────────────────

/** Breedte waarop de LP desktop rendert; de preview wordt naar de kaart-breedte
 *  geschaald. */
const PREVIEW_RENDER_WIDTH = 1180;

/**
 * P1a — WYSIWYG-preview van een landing-page-variant in Step 2. Rendert de ÉCHTE
 * Puck-pagina (zelfde renderer als Step 3) uit de structured variant, geschaald
 * naar de kaart-breedte. Niet-interactief (pointer-events none); reflecteert live
 * de bewerkte velden omdat hij uit de actuele `variant`-state rendert. De hero
 * toont nog geen foto (die wordt bij de keuze gegenereerd) — wel de echte layout,
 * branding, typografie, kleur-banden en CTA-stijl.
 */
function VariantPuckPreview({
  variant,
  contextStack,
  maxHeight,
  scroll,
}: {
  /** W1: alle page-variant-shapes — variantToPuckDataFromStructured dispatcht. */
  variant: PageVariantContent;
  contextStack: CanvasContextStack | null;
  /** Cap de hoogte: thumbnail-modus (overflow verborgen) of, met `scroll`,
   *  een leesbaar venster waarin de gebruiker de pagina scrollt. */
  maxHeight?: number;
  scroll?: boolean;
}) {
  const { t } = useTranslation('campaigns-canvas-accordion');
  // Step 2 variant-preview is geschaald/ingebed → niet-sticky nav.
  const config = useMemo(() => buildSpikePuckConfig(contextStack, { stickyNav: false }), [contextStack]);
  const puckData = useMemo(
    () => variantToPuckDataFromStructured(variant, contextStack),
    [variant, contextStack],
  );
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.34);
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const content = contentRef.current;
    if (!outer || !content) return;
    const measure = () => {
      const w = outer.clientWidth;
      if (w > 0) setScale(w / PREVIEW_RENDER_WIDTH);
      setContentH(content.scrollHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(content);
    return () => ro.disconnect();
  }, [puckData]);

  const brand = contextStack?.brandTokens?.brand ?? '#1FD1B2';
  const scaledHeight = contentH > 0 ? contentH * scale : 320;
  const boxHeight = maxHeight != null ? Math.min(scaledHeight, maxHeight) : scaledHeight;

  return (
    <div
      ref={outerRef}
      className={`w-full rounded-lg border border-gray-200 bg-white ${scroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
      style={{ height: maxHeight != null ? boxHeight : undefined }}
      aria-label={t('lp.pagePreviewAria')}
    >
      <div style={{ height: scaledHeight, position: 'relative' }}>
        <div
          ref={contentRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: PREVIEW_RENDER_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: buildA11yStyleBlock(brand) }} />
          <Render config={config} data={puckData} />
        </div>
      </div>
    </div>
  );
}

type RegenSection = 'hero' | 'problem' | 'features' | 'socialProof' | 'faq' | 'finalCta';

function VariantCompareCard({
  variant: initialVariant,
  label,
  accent,
  disabled,
  onChoose,
  contextStack,
  deliverableId,
  variantIndex,
  onVariantChange,
}: {
  variant: LandingPageVariantContent;
  label: string;
  accent: VariantAccent;
  disabled: boolean;
  onChoose: (variant: LandingPageVariantContent) => void;
  contextStack: CanvasContextStack | null;
  deliverableId: string;
  variantIndex: number;
  /** P3c — bubbelt de (bewerkte) variant omhoog bij unmount zodat edits NIET
   *  verloren gaan wanneer je naar de andere variant-thumbnail wisselt. */
  onVariantChange?: (variant: LandingPageVariantContent) => void;
}) {
  const { t } = useTranslation('campaigns-canvas-accordion');
  // Local edit-state: user kan inline velden bewerken voordat hij "Kies"
  // klikt. Pennetje naast elk veld toggled edit-mode.
  const [v, setV] = useState<LandingPageVariantContent>(initialVariant);
  const [regenSection, setRegenSection] = useState<RegenSection | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  // Ref op de actuele `v` zodat regenerate de huidige snapshot meestuurt zonder
  // `v` in de deps (anders re-create elke edit + clobber-race).
  const vRef = useRef(v);
  useEffect(() => { vRef.current = v; }, [v]);
  // P3c — draft-persist: bij unmount (wisselen van variant) de actuele v naar de
  // parent bubbelen zodat de edits behouden blijven bij terugwisselen.
  // GUARD (race-fix): alleen bubbelen wanneer `v` afwijkt van de laatste
  // `initialVariant`-prop (ref-ongelijk = échte user-edit). Na een parent-driven
  // update (applyProposal / regenerate) synct de effect hieronder `v` terug naar
  // exact dezelfde ref → géén bubble → geen clobber van die parent-update.
  const initialRef = useRef(initialVariant);
  useEffect(() => { initialRef.current = initialVariant; }, [initialVariant]);
  const onChangeRef = useRef(onVariantChange);
  useEffect(() => { onChangeRef.current = onVariantChange; }, [onVariantChange]);
  useEffect(() => () => {
    if (vRef.current !== initialRef.current) onChangeRef.current?.(vRef.current);
  }, []);

  // Re-sync wanneer parent een nieuwe variant levert (regenerate).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- bewust: state-reset bij prop-change, niet derived state
  useEffect(() => { setV(initialVariant); }, [initialVariant]);

  // P1b — regenereer ALLEEN één sectie via auto-iterate-variant (section-scope).
  // Werkt de lokale `v` bij (zoals een edit); persist gebeurt bij "Kies".
  const regenerate = useCallback((section: RegenSection) => {
    setRegenSection(section);
    setRegenError(null);
    fetch(`/api/landing-pages/${deliverableId}/auto-iterate-variant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantIndex, variant: vRef.current, section }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(data?.error ?? `HTTP ${res.status}`);
        if (data.status === 'proposal' && data.variant) {
          // Merge ALLEEN de geregenereerde sectie in de LAATSTE state — zo
          // overleven gelijktijdige edits aan ándere secties (geen clobber).
          const next = data.variant as LandingPageVariantContent;
          setV((prev) => ({ ...prev, [section]: next[section] }));
        } else if (data.status === 'error') {
          throw new Error(data.error ?? t('lp.errors.regenerationFailed'));
        } else if (data.status === 'skipped') {
          setRegenError(data.reason === 'insufficient-content' ? t('lp.errors.notEnoughToRegenerate') : t('lp.errors.regenerationSkipped'));
        } else if (data.status === 'no_improvement') {
          setRegenError(t('lp.errors.noImprovementSection'));
        }
      })
      .catch((err) => setRegenError(err instanceof Error ? err.message : t('lp.errors.regenerationFailed')))
      .finally(() => setRegenSection(null));
  }, [deliverableId, variantIndex, t]);

  // P3a — accent-kleuren via inline-style (purge-veilig voor blue/amber).
  const hex = ACCENT_HEX[accent];

  return (
    <EditDeliverableCtx.Provider value={deliverableId}>
    <div className="rounded-lg border-2 bg-white p-4 flex flex-col gap-4" style={{ borderColor: hex.cardBorder }}>
      <div className="sticky top-0 bg-white pb-2 border-b border-gray-100 -mx-4 px-4 -mt-4 pt-4 z-10">
        <span className="inline-block text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded" style={{ backgroundColor: hex.tagBg, color: hex.tagText }}>
          {label}
        </span>
      </div>

      {/* P1a — WYSIWYG-preview: de echte (geschaalde) pagina uit deze variant. */}
      <VariantPuckPreview variant={v} contextStack={contextStack} maxHeight={560} scroll />
      <p className="text-[11px] text-gray-500 -mt-2">
        {t('lp.readablePreviewEdit')}
      </p>
      {regenError ? (
        <InfoBox variant="error" size="sm" onDismiss={() => setRegenError(null)}>{t('lp.errors.regenerationFailedPrefix')} {regenError}</InfoBox>
      ) : null}

      {/* Tekst-bewerking — ingeklapt zodat de preview centraal staat.
          P1b: per-sectie regenereren via de ↻-knop in elke sectie-header.
          P1c: tone/length-microtransforms in elk bewerkbaar veld. */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1.5 select-none">
          <Pencil className="h-3.5 w-3.5" />
          {t('lp.editContent')}
        </summary>
        <div className="flex flex-col gap-4 pt-3">

      {/* HERO */}
      <VariantSection title={t('lp.sections.hero')} onRegenerate={() => regenerate('hero')} regenerating={regenSection === 'hero'}>
        <EditableField
          label={t('lp.fields.headline')}
          value={v.hero.headline}
          onChange={(val) => setV({ ...v, hero: { ...v.hero, headline: val } })}
          fontClass="text-base font-semibold text-gray-900"
        />
        <EditableField
          label={t('lp.fields.subhead')}
          value={v.hero.subhead}
          onChange={(val) => setV({ ...v, hero: { ...v.hero, subhead: val } })}
          multiline
          fontClass="text-sm text-gray-700"
        />
        {v.hero.eyebrow ? (
          <EditableField
            label={t('lp.fields.eyebrow')}
            value={v.hero.eyebrow}
            onChange={(val) => setV({ ...v, hero: { ...v.hero, eyebrow: val } })}
            fontClass="text-xs uppercase tracking-wider text-gray-600"
          />
        ) : null}
        <EditableField
          label={t('lp.fields.primaryCta')}
          value={v.hero.primaryCta}
          onChange={(val) => setV({ ...v, hero: { ...v.hero, primaryCta: val } })}
          fontClass="text-sm font-medium text-teal-700"
        />
      </VariantSection>

      {/* TRUST */}
      <VariantSection title={t('lp.sections.trust', { type: v.trust.type, count: v.trust.items.length })}>
        {v.trust.items.map((item, i) => (
          <div key={i} className="text-xs text-gray-600">• {item.label}</div>
        ))}
      </VariantSection>

      {/* PROBLEM */}
      {v.problem ? (
        <VariantSection title={t('lp.sections.problem')} onRegenerate={() => regenerate('problem')} regenerating={regenSection === 'problem'}>
          <EditableField
            label={t('lp.fields.heading')}
            value={v.problem.heading}
            onChange={(val) => setV({ ...v, problem: { ...v.problem!, heading: val } })}
            fontClass="text-sm font-medium text-gray-800"
          />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t('lp.painPoints')}</p>
            <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
              {v.problem.painBullets.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="text-xs italic text-gray-600 pt-1">{v.problem.bridgingSentence}</div>
        </VariantSection>
      ) : null}

      {/* FEATURES */}
      <VariantSection title={t('lp.sections.features', { count: v.features.items.length })} onRegenerate={() => regenerate('features')} regenerating={regenSection === 'features'}>
        <EditableField
          label={t('lp.fields.sectionHeading')}
          value={v.features.sectionHeading}
          onChange={(val) => setV({ ...v, features: { ...v.features, sectionHeading: val } })}
          fontClass="text-sm font-medium text-gray-800"
        />
        {v.features.items.map((f, i) => (
          <div key={i} className="border-l-2 border-gray-200 pl-3 space-y-1">
            <div className="text-xs text-gray-500">{f.icon}</div>
            <EditableField
              label={t('lp.fields.heading')}
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
              label={t('lp.fields.body')}
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
      <VariantSection title={t('lp.sections.socialProof', { count: v.socialProof.testimonials.length })} onRegenerate={() => regenerate('socialProof')} regenerating={regenSection === 'socialProof'}>
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
        <VariantSection title={t('lp.sections.pricing', { count: v.pricing.tiers.length })}>
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
      <VariantSection title={t('lp.sections.faq', { count: v.faq.items.length })} onRegenerate={() => regenerate('faq')} regenerating={regenSection === 'faq'}>
        {v.faq.items.map((q, i) => (
          <details key={i} className="text-xs">
            <summary className="font-medium text-gray-800 cursor-pointer">{q.question}</summary>
            <p className="text-gray-600 mt-1 pl-3">{q.answer}</p>
          </details>
        ))}
      </VariantSection>

      {/* FINAL CTA */}
      <VariantSection title={t('lp.sections.finalCta')} onRegenerate={() => regenerate('finalCta')} regenerating={regenSection === 'finalCta'}>
        <EditableField
          label={t('lp.fields.heading')}
          value={v.finalCta.heading}
          onChange={(val) => setV({ ...v, finalCta: { ...v.finalCta, heading: val } })}
          fontClass="text-sm font-medium text-gray-900"
        />
        <EditableField
          label={t('lp.fields.primaryCta')}
          value={v.finalCta.primaryCta}
          onChange={(val) => setV({ ...v, finalCta: { ...v.finalCta, primaryCta: val } })}
          fontClass="text-sm font-medium text-teal-700"
        />
        {v.finalCta.riskReducer ? (
          <p className="text-xs text-gray-500 italic">{v.finalCta.riskReducer}</p>
        ) : null}
      </VariantSection>
        </div>
      </details>

      <button
        type="button"
        onClick={() => onChoose(v)}
        disabled={disabled}
        className={`mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50`}
      >
        {disabled ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{t('common.saving')}</>
        ) : (
          <><CheckCircle2 className="h-4 w-4" />{t('lp.chooseThisVariant')}</>
        )}
      </button>
    </div>
    </EditDeliverableCtx.Provider>
  );
}

function VariantSection({
  title,
  children,
  onRegenerate,
  regenerating,
}: {
  title: string;
  children: React.ReactNode;
  /** P1b — wanneer aanwezig: toon een "↻ regenereer"-knop die alleen deze sectie
   *  opnieuw laat schrijven. */
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const { t } = useTranslation('campaigns-canvas-accordion');
  return (
    <div className="space-y-2 pb-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-teal-700 disabled:opacity-50 transition-colors"
            title={t('lp.regenerateSection')}
          >
            {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {regenerating ? t('common.working') : t('common.regenerate')}
          </button>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** Levert deliverableId aan alle geneste EditableFields zodat de P1c-micro-
 *  transforms werken zonder elke call-site te wijzigen. */
const EditDeliverableCtx = createContext<string | undefined>(undefined);

// Labels live in the i18n catalog (lp.microTransforms.<action>), resolved at render.
const MICRO_TRANSFORMS: ReadonlyArray<{ action: 'shorter' | 'urgent' | 'brand_voice' }> = [
  { action: 'shorter' },
  { action: 'urgent' },
  { action: 'brand_voice' },
];

function EditableField({
  label,
  value,
  onChange,
  multiline,
  compact,
  fontClass,
  deliverableId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  compact?: boolean;
  fontClass?: string;
  /** P1c — enables tone/length micro-transforms (Korter/Urgenter/Brand voice). */
  deliverableId?: string;
}) {
  const { t } = useTranslation('campaigns-canvas-accordion');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ctxDeliverableId = useContext(EditDeliverableCtx);
  const dId = deliverableId ?? ctxDeliverableId;
  const { mutate: transform, isPending: isTransforming } = useInlineTransform(dId ?? '');

  // eslint-disable-next-line react-hooks/set-state-in-effect -- state-reset bij value-change uit parent
  useEffect(() => { setDraft(value); }, [value]);

  const save = () => {
    if (draft.trim() !== value) onChange(draft.trim());
    setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); };
  const applyTransform = (action: 'shorter' | 'urgent' | 'brand_voice') => {
    const text = draft.trim();
    if (!text || !dId) return;
    transform(
      { selectedText: text, action },
      { onSuccess: (data) => { if (data?.transformedText) setDraft(data.transformedText.trim()); } },
    );
  };

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
          <div className="flex items-center gap-1 text-xs flex-wrap">
            <button onClick={save} className="text-teal-700 font-medium hover:underline">{t('common.save')}</button>
            <span className="text-gray-400">·</span>
            <button onClick={cancel} className="text-gray-500 hover:underline">{t('common.cancel')}</button>
            {dId ? (
              <>
                <span className="text-gray-300 mx-1">|</span>
                {isTransforming ? (
                  <span className="inline-flex items-center gap-1 text-gray-400"><Loader2 className="h-3 w-3 animate-spin" />{t('common.aiWorking')}</span>
                ) : (
                  MICRO_TRANSFORMS.map((mt) => (
                    <button
                      key={mt.action}
                      type="button"
                      onClick={() => applyTransform(mt.action)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-700 transition-colors"
                      title={t('lp.microTransforms.aiTitle', { label: t(`lp.microTransforms.${mt.action}`) })}
                    >
                      <Sparkles className="h-2.5 w-2.5" />{t(`lp.microTransforms.${mt.action}`)}
                    </button>
                  ))
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2 group">
          <span className={fontClass ?? 'text-sm text-gray-800'}>{value}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-teal-700 transition-opacity flex-shrink-0"
            title={t('common.edit')}
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

