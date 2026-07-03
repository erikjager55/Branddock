"use client";

import { useMemo } from "react";
import { Mic2, Sparkles, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Badge } from "@/components/shared";
import type { BrandVoiceguide } from "../types/voiceguide.types";

interface VoiceguideHeaderProps {
  voiceguide: BrandVoiceguide;
  onAnalyze?: () => void;
}

/**
 * Page-header for the voiceguide. Shows source badge, savedForAi count,
 * centroid status pill, and a CTA to launch the analyzer.
 */
export function VoiceguideHeader({ voiceguide, onAnalyze }: VoiceguideHeaderProps) {
  const { t } = useTranslation("brandvoice");
  const savedCount = useMemo(() => {
    let n = 0;
    if (voiceguide.voiceDnaSavedForAi) n++;
    if (voiceguide.vocabularySavedForAi) n++;
    if (voiceguide.channelTonesSavedForAi) n++;
    if (voiceguide.antiPatternsSavedForAi) n++;
    if (voiceguide.referencesSavedForAi) n++;
    return n;
  }, [voiceguide]);

  const centroidLabel = useMemo(() => {
    if (!voiceguide.centroidComputedAt) return t("header.centroid.notComputed");
    const sampleCount = voiceguide.writingSamples.length;
    const date = new Date(voiceguide.centroidComputedAt);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    const ago =
      days === 0 ? t("header.centroid.today") : t("header.centroid.daysAgo", { count: days });
    return t("header.centroid.summary", { count: sampleCount, ago });
  }, [t, voiceguide.centroidComputedAt, voiceguide.writingSamples.length]);

  const sourceLabel =
    voiceguide.source === "extracted"
      ? t("header.source.extracted")
      : voiceguide.source === "analyzer"
        ? t("header.source.analyzer")
        : t("header.source.manual");

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Mic2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("header.title")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("header.subtitle")}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="default" className="text-xs">{sourceLabel}</Badge>
              <Badge variant="success" icon={Sparkles} className="text-xs">
                {t("header.savedForAi", { saved: savedCount })}
              </Badge>
              <Badge variant="info" className="text-xs">{centroidLabel}</Badge>
            </div>
          </div>
        </div>
        {onAnalyze && (
          <Button variant="primary" size="sm" onClick={onAnalyze}>
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            {t("header.analyzeWebsite")}
          </Button>
        )}
      </div>
    </div>
  );
}
