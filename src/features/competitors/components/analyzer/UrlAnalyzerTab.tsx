"use client";

import { useState } from "react";
import { Globe, Building2, Target, Swords, BarChart3 } from "lucide-react";
import { Button, Input } from "@/components/shared";
import { useAnalyzeCompetitorUrl } from "../../hooks";
import { useCompetitorsStore } from "../../stores/useCompetitorsStore";
import type { AnalyzeJobResponse } from "../../types/competitor.types";

/** URL analyzer tab for competitor analysis */
export function UrlAnalyzerTab() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const analyzeUrl = useAnalyzeCompetitorUrl();
  const { openProcessingModal, setAnalyzeResultData } = useCompetitorsStore();

  const handleSubmit = () => {
    setError(null);
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    openProcessingModal();

    analyzeUrl.mutate(normalizedUrl, {
      onSuccess: (data: AnalyzeJobResponse) => {
        if (useCompetitorsStore.getState().isProcessingModalOpen) {
          setAnalyzeResultData(data);
        }
      },
      onError: (err) => {
        useCompetitorsStore.getState().closeProcessingModal();
        setError(
          err instanceof Error ? err.message : "Failed to analyze URL. Please try again.",
        );
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Competitor website URL"
          placeholder="https://competitor.com"
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
          Analyze Competitor
        </Button>
      </div>

      {/* What we extract grid */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          What we extract from competitor websites
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Building2, label: "Company info", desc: "Name, tagline, founding year, headquarters" },
            { icon: Target, label: "Positioning", desc: "Value proposition, target audience, differentiators" },
            { icon: Swords, label: "Strengths & weaknesses", desc: "SWOT analysis, competitive advantages" },
            { icon: BarChart3, label: "Competitive score", desc: "AI-scored threat level from 0-100" },
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
