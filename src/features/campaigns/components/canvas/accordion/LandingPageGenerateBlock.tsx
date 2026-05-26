'use client';

import React, { useState, useMemo } from 'react';
import { Loader2, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { STUDIO } from '@/lib/constants/design-tokens';

interface LandingPageGenerateBlockProps {
  deliverableId: string;
  onAdvance: () => void;
}

/**
 * Step 2 vervanger voor PUCK_WEBPAGE_TYPES content-types (web-page-builder
 * spec §4b paradigma B). Vervangt de multi-variant grid door 1 generate-block.
 *
 * **2026-05-26 update**: alle briefing-input (objective, value-prop,
 * target-objection, conversion-goal, etc.) komt uit Step 1 — Step 2 vraagt
 * NIETS extra. Per user-feedback hoort die info in de brief-stap, niet in
 * variant-iteratie. Step 2 is nu een review + generate-trigger:
 *   1. Toont samenvatting van brief-velden die de generator gaat gebruiken
 *   2. Derive optionele secties (problem-articulatie / pricing) uit brief
 *   3. Single CTA → POST /api/landing-pages/[id]/generate-structured-variant
 *   4. Auto-advance naar Step 3 op succes
 *
 * Geen multi-variant ABCD-flow — paradigma-shift bewust per spec §1 #5
 * single-CTA + §3 cognitieve fundamenten (1 sterke pagina > 4 zwakke varianten).
 * Refinement gebeurt via auto-iterate (Phase 6) op de Puck-tree.
 */
export function LandingPageGenerateBlock({
  deliverableId,
  onAdvance,
}: LandingPageGenerateBlockProps) {
  const setStructuredVariant = useCanvasStore((s) => s.setStructuredVariant);
  const existingVariant = useCanvasStore((s) => s.structuredVariant);
  const brief = useCanvasStore((s) => s.brief);
  const contentTypeInputs = useCanvasStore((s) => s.contentTypeInputs);
  const setActiveStep = useCanvasStore((s) => s.setActiveStep);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build de generator-prompt deterministisch uit Step 1 brief + inputs.
  // Volgorde matched de cognitive priority: doel + waarde-belofte → bezwaren →
  // conversie-actie → trust-signalen.
  const builtPrompt = useMemo(() => {
    const parts: string[] = [];
    if (brief.objective?.trim()) {
      parts.push(`Doel: ${brief.objective.trim()}`);
    }
    if (brief.keyMessage?.trim()) {
      parts.push(`Kernboodschap: ${brief.keyMessage.trim()}`);
    }
    const valueProp = contentTypeInputs.valueProposition;
    if (typeof valueProp === 'string' && valueProp.trim()) {
      parts.push(`Value proposition: ${valueProp.trim()}`);
    }
    const targetObj = contentTypeInputs.targetObjection;
    if (typeof targetObj === 'string' && targetObj.trim()) {
      parts.push(`Belangrijkste bezwaar om weg te nemen: ${targetObj.trim()}`);
    }
    const conversionGoal = contentTypeInputs.conversionGoal;
    if (typeof conversionGoal === 'string' && conversionGoal.trim()) {
      parts.push(`Conversie-doel: ${conversionGoal.trim()}`);
    }
    const trafficSource = contentTypeInputs.trafficSource;
    if (typeof trafficSource === 'string' && trafficSource.trim()) {
      parts.push(`Primaire traffic-bron: ${trafficSource.trim()}`);
    }
    const socialProof = contentTypeInputs.socialProof;
    if (Array.isArray(socialProof) && socialProof.length > 0) {
      parts.push(`Beschikbare social proof: ${socialProof.join(', ')}`);
    }
    if (brief.callToAction?.trim()) {
      parts.push(`Gewenste CTA-tekst: ${brief.callToAction.trim()}`);
    }
    if (brief.toneDirection?.trim()) {
      parts.push(`Tone-direction: ${brief.toneDirection.trim()}`);
    }
    return parts.join('\n');
  }, [brief, contentTypeInputs]);

  // Optionele secties: afgeleid uit brief, geen extra checkboxes nodig.
  const { includeProblem, includePricing } = useMemo(() => {
    const targetObj = contentTypeInputs.targetObjection;
    const hasObjection = typeof targetObj === 'string' && targetObj.trim().length > 0;
    const conversionGoal = contentTypeInputs.conversionGoal;
    const PRICING_GOALS = new Set(['Purchase', 'Free Trial']);
    const wantsPricing = typeof conversionGoal === 'string' && PRICING_GOALS.has(conversionGoal);
    return { includeProblem: hasObjection, includePricing: wantsPricing };
  }, [contentTypeInputs]);

  // Validation: zonder minimaal objective + value-prop kan generator niet werken.
  const briefIncomplete = !brief.objective?.trim() && !contentTypeInputs.valueProposition;

  const handleGenerate = async () => {
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
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { variant: unknown };
      setStructuredVariant(data.variant);
      onAdvance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generatie mislukt');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasExisting = existingVariant !== null;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-teal-900">
            Web-page builder — single structured variant
          </p>
          <p className="text-xs text-teal-800 mt-1">
            Op basis van je brief uit Step 1 genereren we 1 schema-valide
            pagina-structuur die direct in de drag-drop editor opent.
            Refinement via auto-iterate / strict-rewrite — geen variant-vergelijking.
          </p>
        </div>
      </div>

      {hasExisting && !isGenerating ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">Eerder gegenereerde pagina aanwezig</p>
          <p className="text-xs text-emerald-800 mt-1">
            Ga naar Step 3 om de huidige versie te bewerken, of regenereer
            hieronder met de huidige brief.
          </p>
        </div>
      ) : null}

      {/* Brief-summary */}
      {briefIncomplete ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Brief incompleet</p>
              <p className="text-xs text-amber-800 mt-1">
                Vul eerst minimaal Doel of Value Proposition in Step 1 vóór de
                landing-page gegenereerd kan worden.
              </p>
              <button
                type="button"
                onClick={() => setActiveStep('context')}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline hover:text-amber-700"
              >
                <ArrowLeft className="h-3 w-3" />
                Terug naar Step 1
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Brief-velden die de generator gebruikt:
          </p>
          <div className="space-y-1.5 text-xs text-gray-600">
            {brief.objective?.trim() && (
              <BriefRow label="Doel" value={brief.objective} />
            )}
            {typeof contentTypeInputs.valueProposition === 'string' &&
              contentTypeInputs.valueProposition.trim() && (
                <BriefRow
                  label="Value proposition"
                  value={contentTypeInputs.valueProposition}
                />
              )}
            {typeof contentTypeInputs.targetObjection === 'string' &&
              contentTypeInputs.targetObjection.trim() && (
                <BriefRow
                  label="Belangrijkste bezwaar"
                  value={contentTypeInputs.targetObjection}
                />
              )}
            {typeof contentTypeInputs.conversionGoal === 'string' &&
              contentTypeInputs.conversionGoal.trim() && (
                <BriefRow
                  label="Conversie-doel"
                  value={contentTypeInputs.conversionGoal}
                />
              )}
            {brief.callToAction?.trim() && (
              <BriefRow label="Gewenste CTA-tekst" value={brief.callToAction} />
            )}
            {brief.toneDirection?.trim() && (
              <BriefRow label="Tone" value={brief.toneDirection} />
            )}
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
            onClick={() => setActiveStep('context')}
            className="mt-3 inline-flex items-center gap-1 text-xs text-gray-600 underline hover:text-gray-900"
          >
            <ArrowLeft className="h-3 w-3" />
            Brief aanpassen in Step 1
          </button>
        </div>
      )}

      {/* Error */}
      {error && !briefIncomplete ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Generatie mislukt</p>
            <p className="text-xs text-red-800 mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || briefIncomplete}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Genereren — kan 20-40 seconden duren...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {hasExisting ? 'Regenereren uit brief' : 'Genereer landing-page'}
          </>
        )}
      </button>
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
