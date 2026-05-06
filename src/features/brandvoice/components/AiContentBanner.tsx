"use client";

import { Sparkles, EyeOff } from "lucide-react";
import { Button } from "@/components/shared";
import { useSaveSectionForAi } from "../hooks";
import type { SaveForAiSection } from "../types/voiceguide.types";

interface AiContentBannerProps {
  section: SaveForAiSection;
  savedForAi: boolean;
}

/**
 * Voiceguide variant of the brandstyle AiContentBanner.
 * Difference: voiceguide defaults are mostly ON (4 of 5 sections), so the
 * banner doubles as a toggle — not just an "enable" CTA.
 */
export function AiContentBanner({ section, savedForAi }: AiContentBannerProps) {
  const save = useSaveSectionForAi();

  if (savedForAi) {
    return (
      <div className="mt-6 flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 font-medium">
            Saved for AI content generation
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => save.mutate({ section, value: false })}
          isLoading={save.isPending}
        >
          <EyeOff className="w-3.5 h-3.5 mr-1.5" />
          Disable
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex items-center justify-between px-4 py-3 bg-primary-50 border border-primary-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm text-primary-700">
          Include this section in AI content generation
        </span>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => save.mutate({ section, value: true })}
        isLoading={save.isPending}
      >
        Enable
      </Button>
    </div>
  );
}
