'use client';

import React, { useState } from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { STUDIO } from '@/lib/constants/design-tokens';

interface LandingPageGenerateBlockProps {
  deliverableId: string;
  onAdvance: () => void;
}

/**
 * Step 2 vervanger voor PUCK_WEBPAGE_TYPES content-types (web-page-builder
 * spec §4b paradigma B). Vervangt de multi-variant grid door 1 vorm met
 * user-prompt veld → single structured-variant generatie.
 *
 * Flow:
 *   1. User vult prompt + toggelt optionele secties (problem / pricing)
 *   2. Submit → POST /api/landing-pages/[id]/generate-structured-variant
 *   3. Resultaat: structuredVariant + puckData opgeslagen in
 *      deliverable.settings; structuredVariant in canvas-store gehydrateerd
 *   4. Auto-advance naar Step 3 zodat Puck-builder direct opent
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

  const [userPrompt, setUserPrompt] = useState('');
  const [includeProblem, setIncludeProblem] = useState(true);
  const [includePricing, setIncludePricing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (userPrompt.trim().length < 5) {
      setError('Beschrijf in minimaal 5 tekens wat deze pagina moet bereiken.');
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
            userPrompt: userPrompt.trim(),
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
      {/* Intro-banner */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-teal-900">
            Web-page builder — single structured variant
          </p>
          <p className="text-xs text-teal-800 mt-1">
            Voor web-pagina&apos;s genereren we 1 schema-valide pagina-structuur die
            direct in de drag-drop editor opent. Refinement gebeurt daar via
            auto-iterate of strict-rewrite — geen variant-vergelijking.
          </p>
        </div>
      </div>

      {hasExisting && !isGenerating ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">Eerder gegenereerde pagina aanwezig</p>
          <p className="text-xs text-emerald-800 mt-1">
            Ga naar Step 3 om de huidige versie te bewerken, of genereer hieronder opnieuw met een nieuwe prompt.
          </p>
        </div>
      ) : null}

      {/* User prompt */}
      <div>
        <label
          htmlFor="lp-prompt"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Wat moet deze landing-page bereiken?
        </label>
        <textarea
          id="lp-prompt"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="bv. Pilot-launch voor product X richten op marketing-managers in B2B SaaS die de eerste 30 dagen gratis willen testen"
          rows={4}
          disabled={isGenerating}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          De generator gebruikt je brand-context (voice, kleuren, persona) en de
          spec-driven anatomie (8 secties, single-CTA discipline, readability-gate).
        </p>
      </div>

      {/* Optionele secties */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Optionele secties</p>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeProblem}
            onChange={(e) => setIncludeProblem(e.target.checked)}
            disabled={isGenerating}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span>
            <span className="font-medium">Probleem-articulatie</span>
            <span className="text-xs text-gray-500 block">
              Aanbevolen voor B2B / considered purchases. Skip voor impulse-koop /
              D2C.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includePricing}
            onChange={(e) => setIncludePricing(e.target.checked)}
            disabled={isGenerating}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span>
            <span className="font-medium">Pricing-sectie (3 tiers, decoy)</span>
            <span className="text-xs text-gray-500 block">
              Alleen aan voor pagina&apos;s waar prijs een bekende koop-barrière is.
              Skip voor lead-gen pages zonder zelf-checkout.
            </span>
          </span>
        </label>
      </div>

      {/* Error */}
      {error ? (
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
        disabled={isGenerating || userPrompt.trim().length < 5}
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
            {hasExisting ? 'Opnieuw genereren' : 'Genereer landing-page'}
          </>
        )}
      </button>
    </div>
  );
}
