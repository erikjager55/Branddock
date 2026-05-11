"use client";

import { useEffect, useState } from "react";
import { Mic2, RefreshCcw, AlertCircle, Type, Globe, Sparkles, Loader2 } from "lucide-react";
import { Button, CrossLinkCard } from "@/components/shared";
import { AiContentBanner } from "../AiContentBanner";
import { useUpdateVoiceguide, useRecomputeCentroid } from "../../hooks";
import { useBrandstyleStore } from "@/features/brandstyle/stores/useBrandstyleStore";
import { useSuggestedLocale } from "@/hooks/useSuggestedLocale";
import type { BrandVoiceguide, ToneAxis, ToneDimensions } from "../../types/voiceguide.types";

type ContentLocale = NonNullable<BrandVoiceguide["contentLocale"]>;

/** Locale-options voor de picker — match met SUPPORTED_LOCALES in locale-resolver.ts. */
const LOCALE_OPTIONS: { code: ContentLocale; label: string }[] = [
  { code: "nl-NL", label: "Nederlands (Nederland)" },
  { code: "nl-BE", label: "Nederlands (België)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "de-DE", label: "Deutsch (Deutschland)" },
];

const CONFIDENCE_BADGE: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

interface VoiceDnaSectionProps {
  voiceguide: BrandVoiceguide;
  /** Cross-module navigator. When provided, renders a "style guidelines live
   * in Brandstyle" cross-link card at the top of the section. */
  onNavigate?: (section: string) => void;
}

const TONE_AXES: { key: ToneAxis; left: string; right: string }[] = [
  { key: "formalCasual", left: "Formal", right: "Casual" },
  { key: "seriousFunny", left: "Serious", right: "Funny" },
  { key: "respectfulIrreverent", left: "Respectful", right: "Irreverent" },
  { key: "matterOfFactEnthusiastic", left: "Matter-of-fact", right: "Enthusiastic" },
];

const DEFAULT_TONE: ToneDimensions = {
  formalCasual: 4,
  seriousFunny: 4,
  respectfulIrreverent: 4,
  matterOfFactEnthusiastic: 4,
};

export function VoiceDnaSection({ voiceguide, onNavigate }: VoiceDnaSectionProps) {
  const update = useUpdateVoiceguide();
  const recompute = useRecomputeCentroid();
  const suggested = useSuggestedLocale();
  const [description, setDescription] = useState(voiceguide.voiceDescription ?? "");
  const [tone, setTone] = useState<ToneDimensions>(voiceguide.toneDimensions ?? DEFAULT_TONE);
  const [contentLocale, setContentLocale] = useState<ContentLocale | null>(
    voiceguide.contentLocale ?? null,
  );
  const [recomputeError, setRecomputeError] = useState<string | null>(null);

  // Sync incoming when row updates externally
  useEffect(() => {
    setDescription(voiceguide.voiceDescription ?? "");
  }, [voiceguide.voiceDescription]);
  useEffect(() => {
    setTone(voiceguide.toneDimensions ?? DEFAULT_TONE);
  }, [voiceguide.toneDimensions]);
  useEffect(() => {
    setContentLocale(voiceguide.contentLocale ?? null);
  }, [voiceguide.contentLocale]);

  const handleSave = () => {
    update.mutate({
      voiceDescription: description,
      toneDimensions: tone,
      contentLocale,
    });
  };

  const handleRecompute = async () => {
    setRecomputeError(null);
    try {
      await recompute.mutateAsync();
    } catch (e) {
      setRecomputeError(e instanceof Error ? e.message : "Recompute failed");
    }
  };

  const dirty =
    (voiceguide.voiceDescription ?? "") !== description ||
    JSON.stringify(voiceguide.toneDimensions ?? DEFAULT_TONE) !== JSON.stringify(tone) ||
    (voiceguide.contentLocale ?? null) !== contentLocale;

  return (
    <div className="space-y-6">
      {/* Cross-link to brandstyle tone-of-voice (BV-WIRE) */}
      {onNavigate && (
        <CrossLinkCard
          icon={Type}
          accent="violet"
          title="Style guidelines live in Brandstyle"
          description="Do/don't examples and writing guidelines for human writers are managed on the Brandstyle Tone of Voice tab. This page captures the machine-readable voice signals used by AI generation."
          ctaLabel="Open Brandstyle"
          onClick={() => {
            // Pre-set the destination tab so the user lands directly on
            // Tone of Voice (brandstyle's default tab is brand_assets).
            useBrandstyleStore.getState().setActiveTab("tone_of_voice");
            onNavigate("brandstyle-guide");
          }}
        />
      )}

      {/* Voice description */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Mic2 className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900">Voice description</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          One paragraph that captures how the brand sounds. Used as the top-of-prompt
          voice instruction in every AI generation.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="We sound like a knowledgeable friend — warm, direct, and curious. Never academic, never salesy."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      {/* Content locale — F-VAL pijler-3 heuristic-pack-keuze */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900">Content locale</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Bepaalt welke F-VAL heuristic-pack wordt gebruikt voor cliché-detectie
          en welke taal-instructie de AI krijgt bij content-generatie. Laat
          leeg om de workspace-default te volgen.
        </p>
        <select
          value={contentLocale ?? ""}
          onChange={(e) =>
            setContentLocale((e.target.value as ContentLocale | "") || null)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">— Workspace-default —</option>
          {LOCALE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Auto-detected suggestion */}
        {suggested.isPending ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Detecteren op basis van brand-content...
          </div>
        ) : suggested.data?.locale ? (
          <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-gray-600">Auto-detected:</span>
            <span className="font-medium text-gray-800">{suggested.data.locale}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${CONFIDENCE_BADGE[suggested.data.confidence]}`}
            >
              {suggested.data.confidence}
            </span>
            <span className="text-gray-400">
              · {suggested.data.sourceCount} sources, {suggested.data.totalChars.toLocaleString()} chars
            </span>
            {suggested.data.locale !== contentLocale && (
              <button
                type="button"
                onClick={() => setContentLocale(suggested.data?.locale ?? null)}
                className="ml-auto text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Use suggested
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-400 italic">
            Geen taal-signaal gedetecteerd — voeg writing-samples of brand-assets toe.
          </p>
        )}
      </div>

      {/* 4-axis tone sliders */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Tone of voice</h3>
        <p className="text-xs text-gray-500 mb-4">
          Nielsen Norman Group 4-axis baseline. Each slider runs 1-7 with 4 = neutral.
          Channel-specific adjustments live in the Channel Tones tab.
        </p>
        <div className="space-y-5">
          {TONE_AXES.map(({ key, left, right }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{left}</span>
                <span className="font-mono text-gray-400">{tone[key]}</span>
                <span>{right}</span>
              </div>
              <input
                type="range"
                min={1}
                max={7}
                step={1}
                value={tone[key]}
                onChange={(e) =>
                  setTone((t) => ({ ...t, [key]: Number(e.target.value) }))
                }
                className="w-full accent-teal-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Centroid status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Voice centroid</h3>
            <p className="text-xs text-gray-500 max-w-md">
              An OpenAI text-embedding-3-small vector averaged across your writing samples.
              Used by Pillar 1 of the F-VAL fidelity scorer to detect off-voice content.
            </p>
            {voiceguide.centroidComputedAt ? (
              <p className="text-xs text-gray-700 mt-2">
                Computed from <strong>{voiceguide.writingSamples.length}</strong> samples on{" "}
                {new Date(voiceguide.centroidComputedAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-amber-700 mt-2">
                Not yet computed. Add writing samples (References tab) and run recompute.
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecompute}
            isLoading={recompute.isPending}
            disabled={voiceguide.writingSamples.length === 0}
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
            Recompute
          </Button>
        </div>
        {recomputeError && (
          <div className="mt-3 flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{recomputeError}</span>
          </div>
        )}
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <Button variant="primary" size="md" onClick={handleSave} isLoading={update.isPending}>
            Save Voice DNA
          </Button>
        </div>
      )}

      <AiContentBanner section="voice-dna" savedForAi={voiceguide.voiceDnaSavedForAi} />
    </div>
  );
}
