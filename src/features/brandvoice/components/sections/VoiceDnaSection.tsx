"use client";

import { useEffect, useState } from "react";
import { Mic2, RefreshCcw, AlertCircle, Globe, Sparkles, Loader2, CheckCircle, Eye, Lightbulb } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/shared";
import { AiContentBanner } from "../AiContentBanner";
import { EditableStringList } from "@/features/brandstyle/components/EditableStringList";
import { useUpdateVoiceguide, useRecomputeCentroid } from "../../hooks";
import { useSuggestedLocale } from "@/hooks/useSuggestedLocale";
import type { BrandVoiceguide, ToneAxis, ToneDimensions } from "../../types/voiceguide.types";

/** Parse "OBSERVED:" or "RECOMMENDED:" prefix from a guideline string (verhuisd uit Brandstyle ToneOfVoiceSection, ADR 2026-05-15). */
function parseGuidelinePrefix(text: string): { prefix: "observed" | "recommended" | null; content: string } {
  const upper = text.trimStart().toUpperCase();
  if (upper.startsWith("OBSERVED:")) return { prefix: "observed", content: text.replace(/^OBSERVED:\s*/i, "") };
  if (upper.startsWith("RECOMMENDED:")) return { prefix: "recommended", content: text.replace(/^RECOMMENDED:\s*/i, "") };
  return { prefix: null, content: text };
}

/** Visual badge for OBSERVED/RECOMMENDED guidelines */
function GuidelineBadge({ type }: { type: "observed" | "recommended" }) {
  const { t } = useTranslation("brandvoice");
  if (type === "observed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600 flex-shrink-0">
        <Eye className="w-3 h-3" />
        {t("voiceDna.guidelineBadge.observed")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 flex-shrink-0">
      <Lightbulb className="w-3 h-3" />
      {t("voiceDna.guidelineBadge.recommended")}
    </span>
  );
}

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

const ACTIVE_SOURCE_LABEL_KEY: Record<
  "voiceguide" | "workspace-default" | "fallback",
  string
> = {
  voiceguide: "voiceDna.activeSource.voiceguide",
  "workspace-default": "voiceDna.activeSource.workspaceDefault",
  fallback: "voiceDna.activeSource.fallback",
};

interface VoiceDnaSectionProps {
  voiceguide: BrandVoiceguide;
}

const TONE_AXES: { key: ToneAxis; leftKey: string; rightKey: string }[] = [
  { key: "formalCasual", leftKey: "voiceDna.tone.formalLeft", rightKey: "voiceDna.tone.formalRight" },
  { key: "seriousFunny", leftKey: "voiceDna.tone.seriousLeft", rightKey: "voiceDna.tone.seriousRight" },
  { key: "respectfulIrreverent", leftKey: "voiceDna.tone.respectfulLeft", rightKey: "voiceDna.tone.respectfulRight" },
  { key: "matterOfFactEnthusiastic", leftKey: "voiceDna.tone.matterLeft", rightKey: "voiceDna.tone.matterRight" },
];

const DEFAULT_TONE: ToneDimensions = {
  formalCasual: 4,
  seriousFunny: 4,
  respectfulIrreverent: 4,
  matterOfFactEnthusiastic: 4,
};

export function VoiceDnaSection({ voiceguide }: VoiceDnaSectionProps) {
  const { t } = useTranslation("brandvoice");
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
      setRecomputeError(e instanceof Error ? e.message : t("voiceDna.centroid.recomputeError"));
    }
  };

  const dirty =
    (voiceguide.voiceDescription ?? "") !== description ||
    JSON.stringify(voiceguide.toneDimensions ?? DEFAULT_TONE) !== JSON.stringify(tone) ||
    (voiceguide.contentLocale ?? null) !== contentLocale;

  return (
    <div className="space-y-6">
      {/* Voice description */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Mic2 className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900">{t("voiceDna.description.title")}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {t("voiceDna.description.help")}
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder={t("voiceDna.description.placeholder")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      {/* Content locale — F-VAL pijler-3 heuristic-pack-keuze */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-900">{t("voiceDna.locale.title")}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {t("voiceDna.locale.help")}
        </p>

        {/* Currently-active status: toont welke locale F-VAL momenteel
            gebruikt + uit welke laag van de fallback die komt. Verborgen
            wanneer resolver-call faalde (UI is eerlijk over onbekende state). */}
        {suggested.data?.activeLocale && suggested.data.activeSource && (
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="text-gray-500">{t("voiceDna.locale.currentlyActive")}</span>
            <span className="font-medium text-gray-900">
              {suggested.data.activeLocale}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium border bg-gray-50 text-gray-600 border-gray-200">
              {t(ACTIVE_SOURCE_LABEL_KEY[suggested.data.activeSource])}
            </span>
          </div>
        )}

        {/* Unsaved-cue staat los van de active-row zodat het ook zichtbaar
            blijft wanneer de resolver-call (nog) niet beschikbaar is. */}
        {(voiceguide.contentLocale ?? null) !== contentLocale && (
          <div className="mb-2 text-xs text-amber-700 italic">
            {t("voiceDna.locale.unsaved")}
          </div>
        )}

        <select
          id="content-locale-select"
          aria-label={t("voiceDna.locale.selectAriaLabel")}
          value={contentLocale ?? ""}
          onChange={(e) =>
            setContentLocale((e.target.value as ContentLocale | "") || null)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">{t("voiceDna.locale.workspaceDefaultOption")}</option>
          {LOCALE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Auto-detected suggestion — informatief, geen knop. Gebruiker
            kiest zelf in dropdown of de detection overgenomen wordt. */}
        {(() => {
          if (suggested.isPending) {
            return (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("voiceDna.locale.detecting")}
              </div>
            );
          }
          if (suggested.isError) {
            return (
              <p className="mt-3 text-xs text-amber-700 italic">
                {t("voiceDna.locale.detectionUnavailable")}
              </p>
            );
          }
          const data = suggested.data;
          if (!data?.locale) {
            return (
              <p className="mt-3 text-xs text-gray-400 italic">
                {t("voiceDna.locale.noSignal")}
              </p>
            );
          }
          return (
            <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-gray-600">{t("voiceDna.locale.autoDetected")}</span>
              <span className="font-medium text-gray-800">{data.locale}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${CONFIDENCE_BADGE[data.confidence]}`}
              >
                {data.confidence}
              </span>
              <span className="text-gray-400">
                {t("voiceDna.locale.sources", {
                  count: data.sourceCount,
                  chars: data.totalChars.toLocaleString(),
                })}
              </span>
            </div>
          );
        })()}
      </div>

      {/* 4-axis tone sliders */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("voiceDna.tone.title")}</h3>
        <p className="text-xs text-gray-500 mb-4">
          {t("voiceDna.tone.help")}
        </p>
        <div className="space-y-5">
          {TONE_AXES.map(({ key, leftKey, rightKey }) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{t(leftKey)}</span>
                <span className="font-mono text-gray-400">{tone[key]}</span>
                <span>{t(rightKey)}</span>
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

      {/* Content Guidelines — verhuisd uit Brandstyle (ADR 2026-05-15) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <EditableStringList
          title={t("voiceDna.contentGuidelines.title")}
          items={voiceguide.contentGuidelines}
          canEdit={true}
          isSaving={update.isPending}
          placeholder={t("voiceDna.contentGuidelines.placeholder")}
          onSave={(items) => update.mutate({ contentGuidelines: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <ol className="space-y-3">
                {items.map((g, i) => {
                  const { prefix, content } = parseGuidelinePrefix(g);
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        {prefix && <GuidelineBadge type={prefix} />}
                        <span>{content}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-gray-400">{t("voiceDna.contentGuidelines.empty")}</p>
            )
          }
        </EditableStringList>
      </div>

      {/* Writing Guidelines — verhuisd uit Brandstyle (ADR 2026-05-15) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <EditableStringList
          title={t("voiceDna.writingGuidelines.title")}
          items={voiceguide.writingGuidelines}
          canEdit={true}
          isSaving={update.isPending}
          placeholder={t("voiceDna.writingGuidelines.placeholder")}
          onSave={(items) => update.mutate({ writingGuidelines: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((g, i) => {
                  const { prefix, content } = parseGuidelinePrefix(g);
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col gap-1">
                        {prefix && <GuidelineBadge type={prefix} />}
                        <span>{content}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">{t("voiceDna.writingGuidelines.empty")}</p>
            )
          }
        </EditableStringList>
      </div>

      {/* Centroid status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("voiceDna.centroid.title")}</h3>
            <p className="text-xs text-gray-500 max-w-md">
              {t("voiceDna.centroid.help")}
            </p>
            {voiceguide.centroidComputedAt ? (
              <p className="text-xs text-gray-700 mt-2">
                <Trans
                  i18nKey="voiceDna.centroid.computed"
                  ns="brandvoice"
                  count={voiceguide.writingSamples.length}
                  values={{ date: new Date(voiceguide.centroidComputedAt).toLocaleString() }}
                  components={{ b: <strong /> }}
                />
              </p>
            ) : (
              <p className="text-xs text-amber-700 mt-2">
                {t("voiceDna.centroid.notComputed")}
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
            {t("voiceDna.centroid.recompute")}
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
            {t("voiceDna.save")}
          </Button>
        </div>
      )}

      <AiContentBanner section="voice-dna" savedForAi={voiceguide.voiceDnaSavedForAi} />
    </div>
  );
}
