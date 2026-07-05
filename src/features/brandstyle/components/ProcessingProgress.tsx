"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { CheckCircle, Circle, Loader2, AlertCircle, RotateCcw, FileText, Globe } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { useAnalysisStatus } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";

/** The refuse-mode message emitted by analysis-engine.ts when the scraper
 *  found nothing usable. Detected as a substring so we can render dedicated
 *  guidance instead of a flat error message. */
const REFUSE_MODE_PREFIX = "Could not extract enough brand colors";

interface ProcessingProgressProps {
  jobId: string;
  onComplete: () => void;
}

/**
 * Shows real-time analysis progress by polling the status endpoint.
 * Steps are updated by the analysis engine, not simulated.
 */
export function ProcessingProgress({ jobId, onComplete }: ProcessingProgressProps) {
  const { t } = useTranslation("brandstyle");
  const { data, error: fetchError } = useAnalysisStatus(jobId);
  const { stopAnalysis } = useBrandstyleStore();

  useEffect(() => {
    if (data?.status === "COMPLETE") {
      const timer = setTimeout(() => {
        stopAnalysis();
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [data?.status, onComplete, stopAnalysis]);

  const isError = data?.status === "ERROR" || !!fetchError;

  const steps = data?.steps ?? [
    { name: t("processing.steps.scanning"), status: "pending" as const },
    { name: t("processing.steps.palette"), status: "pending" as const },
    { name: t("processing.steps.typography"), status: "pending" as const },
    { name: t("processing.steps.components"), status: "pending" as const },
    { name: t("processing.steps.generating"), status: "pending" as const },
  ];

  return (
    <Card data-testid="processing-progress">
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {isError ? t("processing.failedTitle") : t("processing.title")}
        </h3>
        <p className="text-sm text-gray-500">
          {isError ? t("processing.failedSubtitle") : t("processing.subtitle")}
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {isError && step.status === "active" ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : step.status === "complete" ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : step.status === "active" ? (
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300" />
            )}
            <span
              className={`text-sm ${
                isError && step.status === "active"
                  ? "text-red-600 font-medium"
                  : step.status === "complete"
                    ? "text-emerald-600 font-medium"
                    : step.status === "active"
                      ? "text-primary font-medium"
                      : "text-gray-400"
              }`}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {isError && (
        <ErrorPanel error={data?.error ?? null} onRetry={stopAnalysis} t={t} />
      )}
    </Card>
  );
}

/**
 * Error display that recognises the refuse-mode message from the analysis
 * pipeline ("Could not extract enough brand colors…") and renders dedicated
 * guidance + action buttons. Falls back to a plain message for other errors.
 */
function ErrorPanel({
  error,
  onRetry,
  t,
}: {
  error: string | null;
  onRetry: () => void;
  t: TFunction<"brandstyle">;
}) {
  const isRefuseMode = error?.startsWith(REFUSE_MODE_PREFIX) ?? false;

  if (isRefuseMode) {
    return (
      <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {t("processing.refuseTitle")}
            </p>
            <p className="mt-1 text-sm text-amber-800 leading-relaxed">
              {t("processing.refuseBody")}
            </p>
          </div>
        </div>

        <div className="ml-8 space-y-2">
          <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase">
            {t("processing.refuseTryThese")}
          </p>
          <div className="space-y-1.5 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>{t("processing.refusePdfTip")}</span>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>{t("processing.refuseLandingTip")}</span>
            </div>
          </div>
        </div>

        <div className="ml-8">
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
            {t("actions.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-red-50 rounded-lg space-y-3">
      <p className="text-sm text-red-600">
        {error || t("processing.genericError")}
      </p>
      <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
        {t("actions.tryAgain")}
      </Button>
    </div>
  );
}
