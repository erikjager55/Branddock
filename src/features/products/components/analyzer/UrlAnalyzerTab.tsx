"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button, Input } from "@/components/shared";
import { normaliseUserUrl, INVALID_URL_MESSAGE } from "@/lib/utils/normalise-url";
import { useAnalyzeUrl } from "../../hooks";
import { useProductsStore } from "../../stores/useProductsStore";
import { WhatWeExtractGrid } from "./WhatWeExtractGrid";

export function UrlAnalyzerTab() {
  const { t } = useTranslation("products");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const analyzeUrl = useAnalyzeUrl();
  const { setProcessingModalOpen, setAnalyzeResultData } = useProductsStore();

  const handleSubmit = () => {
    setError(null);
    const normalised = normaliseUserUrl(url);
    if (!normalised) {
      setError(INVALID_URL_MESSAGE);
      return;
    }
    if (normalised !== url) setUrl(normalised);

    // Open modal immediately, then fire API call
    setProcessingModalOpen(true);

    analyzeUrl.mutate(
      normalised,
      {
        onSuccess: (data) => {
          // Only set result if modal is still open (user hasn't cancelled)
          if (useProductsStore.getState().isProcessingModalOpen) {
            setAnalyzeResultData(data);
          }
        },
        onError: (err) => {
          setProcessingModalOpen(false);
          setError(err instanceof Error ? err.message : t("analyzer.url.error"));
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          label={t("analyzer.url.label")}
          placeholder={t("analyzer.url.placeholder")}
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
          {t("analyzer.url.analyzeButton")}
        </Button>
      </div>

      <WhatWeExtractGrid />
    </div>
  );
}
