"use client";

import { useEffect, useRef } from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared";
import { StyleProfileCard } from "./StyleProfileCard";
import { useAnalyzeStyle } from "../../hooks";
import type { ConsistentModelDetail } from "../../types/consistent-model.types";
import type { IllustrationStyleProfile } from "@/lib/consistent-models/style-profile.types";

interface IllustrationStyleSectionProps {
  model: ConsistentModelDetail;
}

/** Illustration style analysis results (read-only) */
export function IllustrationStyleSection({
  model,
}: IllustrationStyleSectionProps) {
  const profile = model.styleProfile as IllustrationStyleProfile | null;
  const isAnalyzing = model.styleAnalysisStatus === "ANALYZING";
  const analysisFailed = model.styleAnalysisStatus === "FAILED";
  const hasImages = model.referenceImages.length > 0;

  const analyzeStyle = useAnalyzeStyle(model.id);

  // Auto-start analysis when arriving at this step without a profile
  const isStaleAnalyzing = isAnalyzing && !analyzeStyle.isPending;
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!hasImages || profile || isStaleAnalyzing || analyzeStyle.isPending) return;
    autoStartedRef.current = true;
    analyzeStyle.mutate(undefined);
  }, [hasImages, profile, isStaleAnalyzing, analyzeStyle]);

  const handleAnalyze = () => {
    analyzeStyle.mutate(undefined);
  };

  return (
    <div className="space-y-4">
      {/* AI Style Analysis Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            AI Style Analysis
          </h3>
          {profile && (
            <span className="text-xs text-gray-500">
              v{model.styleProfileVersion}
            </span>
          )}
        </div>

        {!hasImages && (
          <p className="text-sm text-gray-500">
            Upload reference illustrations first, then analyze the style automatically.
          </p>
        )}

        {hasImages && !profile && !isAnalyzing && !analyzeStyle.isPending && !analysisFailed && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Analyze your {model.referenceImages.length} reference image{model.referenceImages.length !== 1 ? "s" : ""} to
              automatically detect the illustration style — colors, lines, shading, shapes, and more.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAnalyze}
              disabled={!hasImages}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Analyze Illustration Style
            </Button>
          </div>
        )}

        {(isAnalyzing || analyzeStyle.isPending) && (
          <div className="flex items-center gap-3 py-4">
            {analyzeStyle.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Analyzing illustration style...
                  </p>
                  <p className="text-xs text-gray-500">
                    Extracting colors, line weights, shading, and composition from {model.referenceImages.length} images
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-md bg-amber-50 p-3 w-full">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-700">
                    A previous analysis may have timed out or failed without completing.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAnalyze}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Retry Analysis
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {analysisFailed && !analyzeStyle.isPending && (
          <div className="flex items-start gap-3 rounded-md bg-red-50 p-3">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-700">
                Style analysis failed. {analyzeStyle.error?.message ?? "Please try again."}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAnalyze}
                className="mt-2"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Retry Analysis
              </Button>
            </div>
          </div>
        )}

        {analyzeStyle.isError && !analysisFailed && (
          <div className="flex items-start gap-3 rounded-md bg-red-50 p-3 mt-3">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">
              {analyzeStyle.error?.message ?? "Analysis failed"}
            </p>
          </div>
        )}
      </div>

      {/* Style Profile Results (read-only) */}
      {profile && (
        <div className="space-y-3">
          <StyleProfileCard profile={profile} />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzeStyle.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Re-analyze
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
