"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Building2, Target, Swords, BarChart3 } from "lucide-react";
import { Button, Input } from "@/components/shared";
import { normaliseUserUrl, INVALID_URL_MESSAGE } from "@/lib/utils/normalise-url";
import { useAnalyzeCompetitorUrl } from "../../hooks";
import { useCompetitorsStore } from "../../stores/useCompetitorsStore";
import type { AnalyzeJobResponse } from "../../types/competitor.types";

/** URL analyzer tab for competitor analysis */
export function UrlAnalyzerTab() {
  const { t } = useTranslation("competitors");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const analyzeUrl = useAnalyzeCompetitorUrl();
  const { openProcessingModal, setAnalyzeResultData } = useCompetitorsStore();

  const handleSubmit = () => {
    setError(null);
    const normalised = normaliseUserUrl(url);
    if (!normalised) {
      setError(INVALID_URL_MESSAGE);
      return;
    }
    if (normalised !== url) setUrl(normalised);

    openProcessingModal();

    analyzeUrl.mutate(normalised, {
      onSuccess: (data: AnalyzeJobResponse) => {
        if (useCompetitorsStore.getState().isProcessingModalOpen) {
          setAnalyzeResultData(data);
        }
      },
      onError: (err) => {
        useCompetitorsStore.getState().closeProcessingModal();
        setError(
          err instanceof Error ? err.message : t("url.analyzeError"),
        );
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          label={t("url.label")}
          placeholder={t("url.placeholder")}
          icon={Globe}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />

        <Button
          variant="cta"
          icon={Globe}
          onClick={handleSubmit}
          isLoading={analyzeUrl.isPending}
        >
          {t("url.analyzeButton")}
        </Button>
      </div>

      {/* What we extract grid */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          {t("url.whatWeExtract")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Building2, label: t("url.extract.companyInfoLabel"), desc: t("url.extract.companyInfoDesc") },
            { icon: Target, label: t("url.extract.positioningLabel"), desc: t("url.extract.positioningDesc") },
            { icon: Swords, label: t("url.extract.strengthsWeaknessesLabel"), desc: t("url.extract.strengthsWeaknessesDesc") },
            { icon: BarChart3, label: t("url.extract.competitiveScoreLabel"), desc: t("url.extract.competitiveScoreDesc") },
          ].map((item) => (
            <div key={item.label} className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
                <item.icon className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
