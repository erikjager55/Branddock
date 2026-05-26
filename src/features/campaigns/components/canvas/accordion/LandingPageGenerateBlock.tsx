'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Loader2, Sparkles, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2, ImageIcon,
} from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { generateCanvasVisual } from '../../../api/canvas.api';
import { variantToPuckDataFromStructured } from '../medium/variant-to-puck-data';
import type { LandingPageVariantContent } from '@/lib/landing-pages/variant-schema';
import { STUDIO } from '@/lib/constants/design-tokens';

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

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);

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

  const handleGenerate = useCallback(async () => {
    if (briefIncomplete) {
      setError('Vul eerst Doel of Value Proposition in Step 1.');
      return;
    }
    setIsGenerating(true);
    setError(null);
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
      const data = (await res.json()) as { variants: LandingPageVariantContent[] };
      setStructuredVariantOptions(data.variants);
      // Reset chosen variant zodat user-keuze opnieuw moet plaatsvinden
      setStructuredVariant(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generatie mislukt');
    } finally {
      setIsGenerating(false);
    }
  }, [briefIncomplete, builtPrompt, deliverableId, includePricing, includeProblem, setStructuredVariant, setStructuredVariantOptions]);

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

  const handleChooseVariant = useCallback(async (variant: LandingPageVariantContent) => {
    setIsChoosing(true);
    setError(null);
    try {
      const puckData = variantToPuckDataFromStructured(variant, contextStack);
      const patchRes = await fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { structuredVariant: variant, puckData },
        }),
      });
      if (!patchRes.ok) {
        throw new Error(`Persist mislukt: HTTP ${patchRes.status}`);
      }
      setStructuredVariant(variant);
      // Fetch /context expliciet zodat contextStack.puckData synchroon
      // ververst is vóór user naar Step 3 doorklikt. PuckPageBuilder
      // useMemo[] leest contextStack op first-mount — als die stale is
      // zien we de gekozen variant niet in Step 3.
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Variant-keuze opslaan mislukt');
    } finally {
      setIsChoosing(false);
    }
  }, [contextStack, deliverableId, setContextStack, setStructuredVariant]);

  const handleGenerateVisual = useCallback(async () => {
    if (!chosenVariant) return;
    setIsGeneratingVisual(true);
    setVisualError(null);
    try {
      const heroVisualInstruction = `Hero-visual voor landing-page: ${chosenVariant.hero.headline}. Stijl: ${chosenVariant.hero.subhead}`;
      const result = await generateCanvasVisual(deliverableId, {
        instruction: heroVisualInstruction,
        aspectRatio: '16:9',
        count: 1,
      });
      const variants = result.variants ?? [];
      if (variants.length > 0) {
        const mapped = variants.map((v, i) => ({
          index: i, url: v.url, prompt: v.prompt ?? '', isSelected: i === 0,
        }));
        setImageVariants(mapped);
        const firstUrl = variants[0]?.url;
        if (firstUrl) {
          const updated: LandingPageVariantContent = {
            ...chosenVariant,
            hero: { ...chosenVariant.hero, heroVisualUrl: firstUrl },
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
        }
      }
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Visual-generatie mislukt');
    } finally {
      setIsGeneratingVisual(false);
    }
  }, [contextStack, deliverableId, chosenVariant, setImageVariants, setStructuredVariant]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {variantOptions.map((v, i) => (
            <VariantCompareCard
              key={i}
              variant={v}
              label={i === 0 ? 'Variant A — conservative' : 'Variant B — creative'}
              accent={i === 0 ? 'emerald' : 'violet'}
              disabled={isChoosing}
              onChoose={() => void handleChooseVariant(v)}
            />
          ))}
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        <div className="flex justify-center">
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
        </div>
      </div>
    );
  }

  // No-data fallback
  if (!chosenVariant) {
    return null;
  }

  // ─── Variant gekozen — full preview + hero-visual + advance ─
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Variant gekozen</p>
          <p className="text-xs text-emerald-800">
            Review hieronder. Genereer optioneel een hero-visual. Bevestig daarna om door te gaan naar de visuele editor.
          </p>
        </div>
        {variantOptions && variantOptions.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              setStructuredVariant(null);
            }}
            className="text-xs font-medium text-emerald-900 underline hover:text-emerald-700 flex-shrink-0"
          >
            Andere variant kiezen
          </button>
        ) : null}
      </div>

      <SectionCard title="1. Hero">
        <FieldRow label="Headline" value={chosenVariant.hero.headline} accent />
        <FieldRow label="Subhead" value={chosenVariant.hero.subhead} />
        <FieldRow label="Primary CTA" value={chosenVariant.hero.primaryCta} />
        {chosenVariant.hero.secondaryCta ? (
          <FieldRow label="Secondary CTA" value={chosenVariant.hero.secondaryCta} />
        ) : null}
        {chosenVariant.hero.heroVisualUrl ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Hero-visual</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chosenVariant.hero.heroVisualUrl}
              alt="Hero visual"
              className="w-full max-w-md rounded-lg border border-gray-200"
            />
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3">
            <button
              type="button"
              onClick={handleGenerateVisual}
              disabled={isGeneratingVisual}
              className="inline-flex items-center gap-2 text-sm text-teal-700 font-medium hover:text-teal-900 disabled:opacity-50"
            >
              {isGeneratingVisual ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Hero-visual genereren...</>
              ) : (
                <><ImageIcon className="h-4 w-4" />Genereer hero-visual (AI, ~20s)</>
              )}
            </button>
            {visualError ? <p className="text-xs text-red-700 mt-2">{visualError}</p> : null}
          </div>
        )}
      </SectionCard>

      <SectionCard title={`2. Trust-strip (${chosenVariant.trust.type})`}>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
          {chosenVariant.trust.items.map((item, i) => <li key={i}>{item.label}</li>)}
        </ul>
      </SectionCard>

      {chosenVariant.problem ? (
        <SectionCard title="3. Probleem-articulatie">
          <FieldRow label="Heading" value={chosenVariant.problem.heading} accent />
          <p className="text-xs font-medium text-gray-700 mt-2 mb-1">Pijn-bullets</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
            {chosenVariant.problem.painBullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          <FieldRow label="Brug naar oplossing" value={chosenVariant.problem.bridgingSentence} />
        </SectionCard>
      ) : null}

      <SectionCard title="4. Features">
        <FieldRow label="Section-heading" value={chosenVariant.features.sectionHeading} accent />
        <div className="space-y-2 mt-2">
          {chosenVariant.features.items.map((f, i) => (
            <div key={i} className="rounded border border-gray-200 p-2 text-sm">
              <p className="font-medium text-gray-900">
                {f.icon ? <span className="text-xs text-teal-600 mr-2">[{f.icon}]</span> : null}
                {f.heading}
              </p>
              <p className="text-gray-600 text-xs mt-0.5">{f.body}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="5. Social proof">
        {chosenVariant.socialProof.testimonials.map((t, i) => (
          <div key={i} className="rounded border border-gray-200 p-2 text-sm mb-2 last:mb-0">
            <p className="italic text-gray-700">&ldquo;{t.quote}&rdquo;</p>
            <p className="text-xs text-gray-500 mt-1">
              — {t.authorName}, {t.authorRole} · {t.authorCompany}
              {t.outcome ? ` — ${t.outcome}` : ''}
            </p>
          </div>
        ))}
        {chosenVariant.socialProof.impactStats && chosenVariant.socialProof.impactStats.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-700 mb-1">Impact stats</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {chosenVariant.socialProof.impactStats.map((s, i) => (
                <div key={i} className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-lg font-bold text-teal-700">{s.value}</p>
                  <p className="text-xs text-gray-600">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SectionCard>

      {chosenVariant.pricing ? (
        <SectionCard title="6. Pricing (3 tiers, decoy)">
          <div className="grid grid-cols-3 gap-2">
            {chosenVariant.pricing.tiers.map((t, i) => (
              <div
                key={i}
                className={`rounded border p-2 text-sm ${
                  t.highlighted ? 'border-teal-400 bg-teal-50' : 'border-gray-200'
                }`}
              >
                {t.highlighted ? (
                  <p className="text-xs text-teal-700 font-medium uppercase">Aanbevolen</p>
                ) : null}
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-lg font-bold text-gray-900">{t.price}</p>
                <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
                  {t.features.map((f, j) => <li key={j}>• {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title={`7. FAQ (${chosenVariant.faq.items.length} items)`}>
        <div className="space-y-2">
          {chosenVariant.faq.items.map((q, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium text-gray-900">{q.question}</p>
              <p className="text-gray-600 text-xs mt-0.5">{q.answer}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="8. Final CTA">
        <FieldRow label="Heading" value={chosenVariant.finalCta.heading} accent />
        <FieldRow label="Risk-reducer" value={chosenVariant.finalCta.riskReducer} />
        <FieldRow label="Primary CTA" value={chosenVariant.finalCta.primaryCta} />
        {chosenVariant.hero.primaryCta === chosenVariant.finalCta.primaryCta ? (
          <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />Single-CTA discipline: identiek aan hero
          </p>
        ) : null}
      </SectionCard>

      <div className="flex flex-col sm:flex-row gap-2 sticky bottom-0 bg-gradient-to-t from-white via-white to-white/0 pt-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Regenereren...</>
          ) : (
            <><RefreshCw className="h-4 w-4" />Genereer 2 nieuwe varianten</>
          )}
        </button>
        <button
          type="button"
          onClick={onAdvance}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
        >
          <CheckCircle2 className="h-4 w-4" />Bevestig & ga naar editor
        </button>
      </div>
    </div>
  );
}

// ─── Sub-componenten ──────────────────────────────────────

function VariantCompareCard({
  variant,
  label,
  accent,
  disabled,
  onChoose,
}: {
  variant: LandingPageVariantContent;
  label: string;
  accent: 'emerald' | 'violet';
  disabled: boolean;
  onChoose: () => void;
}) {
  const ringClass = accent === 'emerald' ? 'border-emerald-200' : 'border-violet-200';
  const tagClass =
    accent === 'emerald'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-violet-100 text-violet-800';
  return (
    <div className={`rounded-lg border-2 ${ringClass} bg-white p-4 flex flex-col gap-3`}>
      <div>
        <span className={`inline-block text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded ${tagClass}`}>
          {label}
        </span>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Headline</p>
          <p className="text-base font-semibold text-gray-900">{variant.hero.headline}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Subhead</p>
          <p className="text-sm text-gray-700">{variant.hero.subhead}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Primary CTA</p>
          <p className="text-sm font-medium text-teal-700">{variant.hero.primaryCta}</p>
        </div>
        {variant.problem ? (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Probleem-framing</p>
            <p className="text-sm text-gray-700 italic">{variant.problem.heading}</p>
          </div>
        ) : null}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Features ({variant.features.items.length})</p>
          <ul className="text-xs text-gray-600 list-disc list-inside">
            {variant.features.items.slice(0, 3).map((f, i) => (
              <li key={i}>{f.heading}</li>
            ))}
            {variant.features.items.length > 3 ? (
              <li className="text-gray-400">+ {variant.features.items.length - 3} meer...</li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">FAQ ({variant.faq.items.length})</p>
          <p className="text-xs text-gray-600 line-clamp-2">
            {variant.faq.items.map((q) => q.question).join(' · ')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-gray-100">
          <span>{variant.problem ? 'Probleem ✓' : 'Probleem —'}</span>
          <span>{variant.pricing ? 'Pricing ✓' : 'Pricing —'}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onChoose}
        disabled={disabled}
        className={`mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50`}
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
