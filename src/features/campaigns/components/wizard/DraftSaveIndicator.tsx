"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";

/**
 * Formats a timestamp as a relative phrase ("just now", "2m ago", "1h ago").
 * Designed for the save indicator — resolution is seconds/minutes/hours.
 */
function formatRelativeTime(iso: string, t: TFunction): string {
  const savedAt = new Date(iso).getTime();
  if (Number.isNaN(savedAt)) return t("draftSave.justNow");
  const elapsedMs = Date.now() - savedAt;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  if (elapsedSec < 5) return t("draftSave.justNow");
  if (elapsedSec < 60) return t("draftSave.secondsAgo", { seconds: elapsedSec });
  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) return t("draftSave.minutesAgo", { minutes: elapsedMin });
  const elapsedHr = Math.floor(elapsedMin / 60);
  return t("draftSave.hoursAgo", { hours: elapsedHr });
}

/**
 * Compact auto-save status indicator for the campaign wizard.
 * Shows one of: saving spinner, "Saved Xs ago", or an error message.
 * Renders nothing when idle (no draft yet, first open).
 */
export function DraftSaveIndicator() {
  const { t } = useTranslation("campaigns-wizard");
  const status = useCampaignWizardStore((s) => s.draftSaveStatus);
  const lastSavedAt = useCampaignWizardStore((s) => s.draftLastSavedAt);
  const error = useCampaignWizardStore((s) => s.draftSaveError);

  // Re-render every 15s so "Saved Xs ago" stays accurate without polling.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "saved" || !lastSavedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(interval);
  }, [status, lastSavedAt]);

  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{t("draftSave.saving")}</span>
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Check className="h-3.5 w-3.5 text-emerald-500" />
        <span>
          {t("draftSave.saved", {
            time: lastSavedAt ? formatRelativeTime(lastSavedAt, t) : t("draftSave.justNow"),
          })}
        </span>
      </div>
    );
  }

  // status === "error"
  return (
    <div
      className="flex items-center gap-1.5 text-xs text-red-600"
      role="alert"
      title={error ?? undefined}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      <span className="max-w-[240px] truncate">{error || t("draftSave.saveFailed")}</span>
    </div>
  );
}
