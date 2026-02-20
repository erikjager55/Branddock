"use client";

import { useState } from "react";
import { Globe, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { useAnalyzeUrl } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";

export function WebsiteUrlInput() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const analyzeUrl = useAnalyzeUrl();
  const { startAnalysis } = useBrandstyleStore();

  const handleAnalyze = () => {
    setError(null);

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    analyzeUrl.mutate(url, {
      onSuccess: (data) => {
        startAnalysis(data.jobId);
      },
      onError: () => {
        setError("Failed to start analysis. Please try again.");
      },
    });
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Globe className="w-4 h-4" />
          Enter your website URL
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
              placeholder="https://your-brand.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
            Analyze
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          We'll scan your website to extract colors, typography, and brand style elements.
        </p>
      </div>
    </Card>
  );
}
