'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Loader2, Sparkles, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2, ImageIcon } from 'lucide-react';
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
 * Step 2 voor PUCK_WEBPAGE_TYPES (web-page-builder spec §4b paradigma B).
 *
 * Twee-fasen UI:
 *   Fase A — geen variant nog: brief-summary uit Step 1 + "Genereer" knop
 *   Fase B — variant gegenereerd: 8-section copy preview + optionele
 *     hero-image generatie + "Bevestig & ga naar editor" / "Regenereer"
 *
 * Geen multi-variant ABCD-flow — per spec §1 #5 single-CTA discipline.
 * Refinement via auto-iterate (Phase 6) op de Puck-tree in Step 3.
 *
 * 2026-05-26: gemaakt om copy + image-suggestions in Step 2 te tonen
 * (eerste versie alleen click-through). Briefing-input komt uit Step 1.
 */
export function LandingPageGenerateBlock({
  deliverableId,
  onAdvance,
}: LandingPageGenerateBlockProps) {
  const setStructuredVariant = useCanvasStore((s) => s.setStructuredVariant);
  const existingVariant = useCanvasStore((s) => s.structuredVariant) as
    | LandingPageVariantContent
    | null;
  const brief = useCanvasStore((s) => s.brief);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const setActiveStep = useCanvasStore((s) => s.setActiveStep);
  const contextStack = useCanvasStore((s) => s.contextStack);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
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
          body: JSON.stringify({ userPrompt: builtPrompt, includeProblem, includePricing }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { variant: LandingPageVariantContent };
      setStructuredVariant(data.variant);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generatie mislukt');
    } finally {
      setIsGenerating(false);
    }
  }, [briefIncomplete, builtPrompt, deliverableId, includePricing, includeProblem, setStructuredVariant]);

  const handleGenerateVisual = useCallback(async () => {
    if (!existingVariant) return;
    setIsGeneratingVisual(true);
    setVisualError(null);
    try {
      const heroVisualInstruction = `Hero-visual voor landing-page: ${existingVariant.hero.headline}. Stijl: ${existingVariant.hero.subhead}`;
      const result = await generateCanvasVisual(deliverableId, {
        instruction: heroVisualInstruction,
        aspectRatio: '16:9',
        count: 1,
      });
      const variants = result.variants ?? [];
      if (variants.length > 0) {
        const mapped = variants.map((v, i) => ({
          index: i,
          url: v.url,
          prompt: v.prompt ?? '',
          isSelected: i === 0,
        }));
        setImageVariants(mapped);
        // Persist heroVisualUrl in structuredVariant + re-derive puckData
        const firstUrl = variants[0]?.url;
        if (firstUrl) {
          const updated: LandingPageVariantContent = {
            ...existingVariant,
            hero: { ...existingVariant.hero, heroVisualUrl: firstUrl },
          };
          setStructuredVariant(updated);
          const puckData = variantToPuckDataFromStructured(updated, contextStack);
          await fetch(`/api/studio/${deliverableId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: { structuredVariant: updated, puckData } }),
          });
        }
      }
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Visual-generatie mislukt');
    } finally {
      setIsGeneratingVisual(false);
    }
  }, [contextStack, deliverableId, existingVariant, setImageVariants, setStructuredVariant]);

  // ─── Fase A — geen variant nog ───────────────────────────
  if (!existingVariant) {
    return (
      <div className="space-y-6">
        <IntroBanner />
        <BriefSummaryCard
          brief={brief}
          contentTypeInputs={contentTypeInputs}
          includeProblem={includeProblem}
          includePricing={includePricing}
          briefIncomplete={briefIncomplete}
          onEditBrief={() => setActiveStep('context')}
        />
        {error && !briefIncomplete ? <ErrorBanner message={error} /> : null}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || briefIncomplete}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Genereren — kan 20-40 seconden duren...</>
          ) : (
            <><Sparkles className="h-4 w-4" />Genereer landing-page</>
          )}
        </button>
      </div>
    );
  }

  // ─── Fase B — variant gegenereerd, preview + image + confirm ──
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Landing-page gegenereerd</p>
          <p className="text-xs text-emerald-800">
            Review de copy hieronder. Genereer optioneel een hero-visual. Bevestig daarna om door te gaan naar de visuele editor.
          </p>
        </div>
      </div>

      {/* Hero */}
      <SectionCard title="1. Hero">
        <FieldRow label="Headline" value={existingVariant.hero.headline} accent />
        <FieldRow label="Subhead" value={existingVariant.hero.subhead} />
        <FieldRow label="Primary CTA" value={existingVariant.hero.primaryCta} />
        {existingVariant.hero.secondaryCta ? (
          <FieldRow label="Secondary CTA" value={existingVariant.hero.secondaryCta} />
        ) : null}
        {existingVariant.hero.heroVisualUrl ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Hero-visual</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingVariant.hero.heroVisualUrl}
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
            {visualError ? (
              <p className="text-xs text-red-700 mt-2">{visualError}</p>
            ) : null}
          </div>
        )}
      </SectionCard>

      {/* Trust strip */}
      <SectionCard title={`2. Trust-strip (${existingVariant.trust.type})`}>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
          {existingVariant.trust.items.map((item, i) => (
            <li key={i}>{item.label}</li>
          ))}
        </ul>
      </SectionCard>

      {/* Problem (conditional) */}
      {existingVariant.problem ? (
        <SectionCard title="3. Probleem-articulatie">
          <FieldRow label="Heading" value={existingVariant.problem.heading} accent />
          <p className="text-xs font-medium text-gray-700 mt-2 mb-1">Pijn-bullets</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
            {existingVariant.problem.painBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <FieldRow label="Brug naar oplossing" value={existingVariant.problem.bridgingSentence} />
        </SectionCard>
      ) : null}

      {/* Features */}
      <SectionCard title="4. Features">
        <FieldRow label="Section-heading" value={existingVariant.features.sectionHeading} accent />
        <div className="space-y-2 mt-2">
          {existingVariant.features.items.map((f, i) => (
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

      {/* Social proof */}
      <SectionCard title="5. Social proof">
        {existingVariant.socialProof.testimonials.map((t, i) => (
          <div key={i} className="rounded border border-gray-200 p-2 text-sm mb-2 last:mb-0">
            <p className="italic text-gray-700">&ldquo;{t.quote}&rdquo;</p>
            <p className="text-xs text-gray-500 mt-1">
              — {t.authorName}, {t.authorRole} · {t.authorCompany}
              {t.outcome ? ` — ${t.outcome}` : ''}
            </p>
          </div>
        ))}
        {existingVariant.socialProof.impactStats && existingVariant.socialProof.impactStats.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-700 mb-1">Impact stats</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {existingVariant.socialProof.impactStats.map((s, i) => (
                <div key={i} className="rounded border border-gray-200 p-2 text-center">
                  <p className="text-lg font-bold text-teal-700">{s.value}</p>
                  <p className="text-xs text-gray-600">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SectionCard>

      {/* Pricing (conditional) */}
      {existingVariant.pricing ? (
        <SectionCard title="6. Pricing (3 tiers, decoy)">
          <div className="grid grid-cols-3 gap-2">
            {existingVariant.pricing.tiers.map((t, i) => (
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
                  {t.features.map((f, j) => (
                    <li key={j}>• {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {/* FAQ */}
      <SectionCard title={`7. FAQ (${existingVariant.faq.items.length} items)`}>
        <div className="space-y-2">
          {existingVariant.faq.items.map((q, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium text-gray-900">{q.question}</p>
              <p className="text-gray-600 text-xs mt-0.5">{q.answer}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Final CTA */}
      <SectionCard title="8. Final CTA">
        <FieldRow label="Heading" value={existingVariant.finalCta.heading} accent />
        <FieldRow label="Risk-reducer" value={existingVariant.finalCta.riskReducer} />
        <FieldRow label="Primary CTA" value={existingVariant.finalCta.primaryCta} />
        {existingVariant.hero.primaryCta === existingVariant.finalCta.primaryCta ? (
          <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Single-CTA discipline: identiek aan hero
          </p>
        ) : null}
      </SectionCard>

      {/* Actions */}
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
            <><RefreshCw className="h-4 w-4" />Regenereer uit brief</>
          )}
        </button>
        <button
          type="button"
          onClick={onAdvance}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium ${STUDIO.generateButton}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Bevestig & ga naar editor
        </button>
      </div>
    </div>
  );
}

// ─── Sub-componenten ──────────────────────────────────────

function IntroBanner() {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3 flex items-start gap-3">
      <Sparkles className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-teal-900">Web-page builder — single structured variant</p>
        <p className="text-xs text-teal-800 mt-1">
          Op basis van je brief uit Step 1 genereren we 1 schema-valide pagina-structuur.
          Refinement gebeurt via auto-iterate / strict-rewrite — geen variant-vergelijking.
        </p>
      </div>
    </div>
  );
}

function BriefSummaryCard({
  brief,
  contentTypeInputs,
  includeProblem,
  includePricing,
  briefIncomplete,
  onEditBrief,
}: {
  brief: { objective: string; keyMessage: string; toneDirection: string; callToAction: string };
  contentTypeInputs: Record<string, string | string[] | number | boolean>;
  includeProblem: boolean;
  includePricing: boolean;
  briefIncomplete: boolean;
  onEditBrief: () => void;
}) {
  if (briefIncomplete) {
    return (
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
              onClick={onEditBrief}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline hover:text-amber-700"
            >
              <ArrowLeft className="h-3 w-3" />Terug naar Step 1
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-sm font-medium text-gray-700 mb-2">Brief-velden die de generator gebruikt:</p>
      <div className="space-y-1.5 text-xs text-gray-600">
        {brief.objective?.trim() && <BriefRow label="Doel" value={brief.objective} />}
        {typeof contentTypeInputs.valueProposition === 'string' && contentTypeInputs.valueProposition.trim() && (
          <BriefRow label="Value proposition" value={contentTypeInputs.valueProposition} />
        )}
        {typeof contentTypeInputs.targetObjection === 'string' && contentTypeInputs.targetObjection.trim() && (
          <BriefRow label="Belangrijkste bezwaar" value={contentTypeInputs.targetObjection} />
        )}
        {typeof contentTypeInputs.conversionGoal === 'string' && contentTypeInputs.conversionGoal.trim() && (
          <BriefRow label="Conversie-doel" value={contentTypeInputs.conversionGoal} />
        )}
        {brief.callToAction?.trim() && <BriefRow label="Gewenste CTA-tekst" value={brief.callToAction} />}
        {brief.toneDirection?.trim() && <BriefRow label="Tone" value={brief.toneDirection} />}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
        <p>
          <span className="font-medium text-gray-700">Probleem-articulatie:</span>{' '}
          {includeProblem ? 'aan (target-objection ingevuld)' : 'uit (geen target-objection)'}
        </p>
        <p>
          <span className="font-medium text-gray-700">Pricing-sectie:</span>{' '}
          {includePricing
            ? `aan (conversie-doel = ${contentTypeInputs.conversionGoal})`
            : 'uit (geen koop-actie)'}
        </p>
      </div>
      <button
        type="button"
        onClick={onEditBrief}
        className="mt-3 inline-flex items-center gap-1 text-xs text-gray-600 underline hover:text-gray-900"
      >
        <ArrowLeft className="h-3 w-3" />Brief aanpassen in Step 1
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

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-700 flex-shrink-0">{label}:</span>
      <span className="text-gray-600 line-clamp-2">{value}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2 text-sm text-red-900">
      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Generatie mislukt</p>
        <p className="text-xs text-red-800 mt-1">{message}</p>
      </div>
    </div>
  );
}
