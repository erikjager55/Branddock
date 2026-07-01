"use client";

import { Upload, Sparkles, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";

/** Choice screen between training with own images or AI-generated (synthetic) images */
export function TrainingModeChoice() {
  const { t } = useTranslation("consistent-models");
  const { setTrainingMode } = useConsistentModelStore();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("trainingChoice.title")}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {t("trainingChoice.subtitle")}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Own Images */}
          <button
            type="button"
            onClick={() => setTrainingMode("own")}
            className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-teal-300 hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
              <Upload className="h-7 w-7" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-gray-900">
                {t("trainingChoice.ownTitle")}
              </h3>
              <p className="mt-1.5 text-xs text-gray-500">
                {t("trainingChoice.ownDescription")}
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
              {t("trainingChoice.getStarted")} <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          {/* Synthetic Images */}
          <button
            type="button"
            onClick={() => setTrainingMode("synthetic")}
            className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-teal-300 hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-gray-900">
                {t("trainingChoice.syntheticTitle")}
              </h3>
              <p className="mt-1.5 text-xs text-gray-500">
                {t("trainingChoice.syntheticDescription")}
              </p>
            </div>
            <div className="mt-auto flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
              {t("trainingChoice.getStarted")} <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
