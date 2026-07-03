"use client";

import { Loader2, Check, Globe, FileText, Sparkles, Wand2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  VoiceAnalysisProgress,
  VoiceAnalysisStatus,
} from "../../types/voiceguide.types";

interface Step {
  id: VoiceAnalysisStatus;
  labelKey: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { id: "PENDING", labelKey: "analyzer.processing.steps.queued", icon: Loader2 },
  { id: "SCRAPING", labelKey: "analyzer.processing.steps.collecting", icon: Globe },
  { id: "EXTRACTING", labelKey: "analyzer.processing.steps.preparing", icon: FileText },
  { id: "ANALYZING", labelKey: "analyzer.processing.steps.analyzing", icon: Sparkles },
  { id: "COMPLETED", labelKey: "analyzer.processing.steps.ready", icon: Wand2 },
];

const ORDER: VoiceAnalysisStatus[] = ["PENDING", "SCRAPING", "EXTRACTING", "ANALYZING", "COMPLETED"];

interface VoiceAnalyzerProcessingProps {
  progress: VoiceAnalysisProgress;
}

export function VoiceAnalyzerProcessing({ progress }: VoiceAnalyzerProcessingProps) {
  const { t } = useTranslation("brandvoice");
  const currentIdx = ORDER.indexOf(progress.status);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{t("analyzer.processing.title")}</h3>
      <p className="text-xs text-gray-500 mb-4">
        {t("analyzer.processing.subtitle")}
      </p>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-5 overflow-hidden">
        <div
          className="h-full bg-teal-500 transition-all"
          style={{ width: `${Math.max(progress.progress, 5)}%` }}
        />
      </div>

      <ul className="space-y-3">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const Icon = step.icon;
          const label = t(step.labelKey);
          return (
            <li key={step.id} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDone
                    ? "bg-emerald-100 text-emerald-600"
                    : isCurrent
                      ? "bg-teal-100 text-teal-600"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isCurrent
                    ? "text-gray-900 font-medium"
                    : isDone
                      ? "text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {label}
              </span>
              {isCurrent && progress.currentStep && progress.currentStep !== label && (
                <span className="text-xs text-gray-400 ml-auto">{progress.currentStep}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
