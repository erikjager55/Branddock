"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button, Input } from "@/components/shared";
import { useAnalyzeUrl } from "../../hooks";
import { useProductsStore } from "../../stores/useProductsStore";
import { WhatWeExtractGrid } from "./WhatWeExtractGrid";

interface UrlAnalyzerTabProps {
  onNavigateToDetail: (id: string) => void;
}

export function UrlAnalyzerTab({ onNavigateToDetail }: UrlAnalyzerTabProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const analyzeUrl = useAnalyzeUrl();
  const { setProcessingModalOpen, setAnalyzeResultData } = useProductsStore();

  const handleSubmit = () => {
    setError(null);
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    analyzeUrl.mutate(
      normalizedUrl,
      {
        onSuccess: (data) => {
          setAnalyzeResultData(data);
          setProcessingModalOpen(true);
        },
        onError: () => {
          setError("Failed to start analysis. Please try again.");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Product page URL"
          placeholder="https://example.com/product-page"
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
          Analyze
        </Button>
      </div>

      <WhatWeExtractGrid />
    </div>
  );
}
