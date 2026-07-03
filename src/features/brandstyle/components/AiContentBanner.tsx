"use client";

import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared";
import { useSaveForAi } from "../hooks/useBrandstyleHooks";
import type { SaveForAiSection } from "../types/brandstyle.types";

interface AiContentBannerProps {
  section: SaveForAiSection;
  savedForAi: boolean;
}

export function AiContentBanner({ section, savedForAi }: AiContentBannerProps) {
  const { t } = useTranslation("brandstyle");
  const saveForAi = useSaveForAi();

  if (savedForAi) {
    return (
      <div data-testid="ai-content-banner" className="mt-6 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        <span className="text-sm text-emerald-700 font-medium">
          {t("aiBanner.saved")}
        </span>
      </div>
    );
  }

  return (
    <div data-testid="ai-content-banner" className="mt-6 flex items-center justify-between px-4 py-3 bg-primary-50 border border-primary-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm text-primary-700">
          {t("aiBanner.info")}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => saveForAi.mutate(section)}
          isLoading={saveForAi.isPending}
        >
          {t("aiBanner.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
