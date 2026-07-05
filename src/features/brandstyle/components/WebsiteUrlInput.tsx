"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { normaliseUserUrl, INVALID_URL_MESSAGE } from "@/lib/utils/normalise-url";
import { useAnalyzeUrl } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";

export function WebsiteUrlInput() {
  const { t } = useTranslation("brandstyle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const analyzeUrl = useAnalyzeUrl();
  const { startAnalysis } = useBrandstyleStore();

  const handleAnalyze = () => {
    setError(null);

    const normalised = normaliseUserUrl(url);
    if (!normalised) {
      setError(INVALID_URL_MESSAGE);
      return;
    }

    // Show the normalised URL back in the field so the user sees what's submitted.
    if (normalised !== url) setUrl(normalised);

    analyzeUrl.mutate(normalised, {
      onSuccess: (data) => {
        startAnalysis(data.jobId);
      },
      onError: () => {
        setError(t("errors.startAnalysis"));
      },
    });
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Globe className="w-4 h-4" />
          {t("urlInput.label")}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="url"
              data-testid="url-input"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url) handleAnalyze();
              }}
              placeholder={t("urlInput.placeholder")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {error && (
              <p data-testid="error-message" className="mt-1.5 text-xs text-red-500">{error}</p>
            )}
          </div>
          <Button
            variant="primary"
            icon={Sparkles}
            onClick={handleAnalyze}
            isLoading={analyzeUrl.isPending}
            disabled={!url}
            data-testid="analyze-button"
          >
            {t("urlInput.analyze")}
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          {t("urlInput.hint")}
        </p>
      </div>
    </Card>
  );
}
