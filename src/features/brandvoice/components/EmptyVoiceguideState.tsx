"use client";

import { useState } from "react";
import { Mic2, ArrowRightCircle, Wand2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared";
import { useMigrateFromPersonality, useUpdateVoiceguide } from "../hooks";

interface EmptyVoiceguideStateProps {
  onAnalyze: () => void;
}

/**
 * Empty-state shown when a workspace has no BrandVoiceguide row yet.
 *
 * Three paths:
 *  1. Migrate from Brand Personality (extracts voice-velden into a new row)
 *  2. Run the website analyzer (BV-3)
 *  3. Start from scratch (PATCH with default empty fields)
 */
export function EmptyVoiceguideState({ onAnalyze }: EmptyVoiceguideStateProps) {
  const { t } = useTranslation("brandvoice");
  const migrate = useMigrateFromPersonality();
  const update = useUpdateVoiceguide();
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    setError(null);
    try {
      await migrate.mutateAsync(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("empty.migrate.error"));
    }
  };

  const handleStartFromScratch = async () => {
    setError(null);
    try {
      // Trigger upsert with empty defaults — server creates the row.
      await update.mutateAsync({ source: "manual" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("empty.scratch.error"));
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t("empty.title")}</h2>
          <p className="text-sm text-gray-500">
            {t("empty.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-6">
        <button
          onClick={handleMigrate}
          disabled={migrate.isPending}
          className="text-left p-4 rounded-lg border-2 border-teal-200 bg-teal-50/40 hover:bg-teal-50 transition-colors disabled:opacity-60"
        >
          <ArrowRightCircle className="w-5 h-5 text-teal-600 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t("empty.migrate.title")}
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            {t("empty.migrate.description")}
          </p>
          <span className="inline-block mt-2 text-xs text-teal-700 font-medium">
            {migrate.isPending ? t("empty.migrate.pending") : t("empty.migrate.cta")}
          </span>
        </button>

        <button
          onClick={onAnalyze}
          className="text-left p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
        >
          <Wand2 className="w-5 h-5 text-primary mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t("empty.analyze.title")}
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            {t("empty.analyze.description")}
          </p>
          <span className="inline-block mt-2 text-xs text-primary-700 font-medium">{t("empty.analyze.cta")}</span>
        </button>

        <button
          onClick={handleStartFromScratch}
          disabled={update.isPending}
          className="text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <Plus className="w-5 h-5 text-gray-700 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">{t("empty.scratch.title")}</h3>
          <p className="text-xs text-gray-600 mt-1">
            {t("empty.scratch.description")}
          </p>
          <span className="inline-block mt-2 text-xs text-gray-700 font-medium">
            {update.isPending ? t("empty.scratch.pending") : t("empty.scratch.cta")}
          </span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {t("empty.tip")}
        </p>
      </div>
    </div>
  );
}
