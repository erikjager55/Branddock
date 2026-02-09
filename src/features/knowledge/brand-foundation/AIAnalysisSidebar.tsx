"use client";

import { Card } from "@/components/ui/Card";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { AIAnalysis } from "@/types/brand-asset";

interface AIAnalysisSidebarProps {
  analyses?: AIAnalysis[];
  loading?: boolean;
}

export function AIAnalysisSidebar({
  analyses = [],
  loading = false,
}: AIAnalysisSidebarProps) {
  if (loading) {
    return (
      <aside className="w-80 flex-shrink-0">
        <div className="sticky top-20 space-y-4">
          <Card padding="md" className="animate-pulse">
            <div className="h-4 bg-surface-dark rounded mb-4 w-32"></div>
            <div className="space-y-2">
              <div className="h-3 bg-surface-dark rounded"></div>
              <div className="h-3 bg-surface-dark rounded w-5/6"></div>
              <div className="h-3 bg-surface-dark rounded w-4/6"></div>
            </div>
          </Card>
        </div>
      </aside>
    );
  }

  if (analyses.length === 0) {
    return (
      <aside className="w-80 flex-shrink-0">
        <div className="sticky top-20">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-text-dark">
                AI Analysis
              </h3>
            </div>
            <p className="text-sm text-text-dark/60">
              No AI analysis available yet. Analysis will be generated
              automatically for published assets.
            </p>
          </Card>
        </div>
      </aside>
    );
  }

  const brandAlignment = analyses.find(
    (a) => a.analysisType === "BRAND_ALIGNMENT"
  );
  const accessibility = analyses.find(
    (a) => a.analysisType === "ACCESSIBILITY"
  );
  const recommendations = analyses.find(
    (a) => a.analysisType === "USAGE_RECOMMENDATION"
  );

  return (
    <aside className="w-80 flex-shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Brand Alignment */}
        {brandAlignment && (
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-text-dark">
                Brand Alignment
              </h3>
            </div>
            {brandAlignment.confidence && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-dark/60">Score</span>
                  <span className="font-medium text-text-dark">
                    {Math.round(brandAlignment.confidence * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${brandAlignment.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-sm text-text-dark/80">
              {(brandAlignment.content as any).summary ||
                "Analysis results will appear here"}
            </p>
          </Card>
        )}

        {/* Accessibility */}
        {accessibility && (
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <h3 className="text-sm font-semibold text-text-dark">
                Accessibility
              </h3>
            </div>
            <p className="text-sm text-text-dark/80">
              {(accessibility.content as any).summary ||
                "Accessibility check completed"}
            </p>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations && (
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-secondary" />
              <h3 className="text-sm font-semibold text-text-dark">
                Recommendations
              </h3>
            </div>
            <ul className="space-y-2">
              {((recommendations.content as any).items || []).map(
                (item: string, index: number) => (
                  <li
                    key={index}
                    className="text-sm text-text-dark/80 flex items-start gap-2"
                  >
                    <span className="text-secondary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
          </Card>
        )}
      </div>
    </aside>
  );
}
